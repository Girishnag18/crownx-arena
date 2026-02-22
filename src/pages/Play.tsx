import { useState, useCallback, useMemo, useEffect } from "react";
import { Chess, Square, Move } from "chess.js";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, RotateCcw, Flag, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const PIECE_UNICODE: Record<string, string> = {
  wp: "♙", wn: "♘", wb: "♗", wr: "♖", wq: "♕", wk: "♔",
  bp: "♟", bn: "♞", bb: "♝", br: "♜", bq: "♛", bk: "♚",
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

const Play = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [game, setGame] = useState(new Chess());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [promotionPending, setPromotionPending] = useState<{ from: Square; to: Square } | null>(null);


  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  const makeMove = useCallback((from: Square, to: Square, promotion?: string) => {
    const gameCopy = new Chess(game.fen());
    try {
      const move = gameCopy.move({ from, to, promotion: promotion || undefined });
      if (move) {
        setGame(gameCopy);
        setLastMove({ from, to });
        setMoveHistory((prev) => [...prev, move.san]);
        setSelectedSquare(null);
        setLegalMoves([]);
        return true;
      }
    } catch {
      // invalid move
    }
    return false;
  }, [game]);

  const handleSquareClick = useCallback((square: Square) => {
    if (promotionPending) return;

    const piece = game.get(square);

    // If a piece of current turn is clicked, select it
    if (piece && piece.color === game.turn()) {
      setSelectedSquare(square);
      const moves = game.moves({ square, verbose: true }) as Move[];
      setLegalMoves(moves.map((m) => m.to as Square));
      return;
    }

    // If a square is already selected, try to move
    if (selectedSquare) {
      // Check for promotion
      const selectedPiece = game.get(selectedSquare);
      if (
        selectedPiece?.type === "p" &&
        ((selectedPiece.color === "w" && square[1] === "8") ||
          (selectedPiece.color === "b" && square[1] === "1"))
      ) {
        setPromotionPending({ from: selectedSquare, to: square });
        return;
      }

      if (!makeMove(selectedSquare, square)) {
        setSelectedSquare(null);
        setLegalMoves([]);
      }
    }
  }, [game, selectedSquare, makeMove, promotionPending]);

  const handlePromotion = useCallback((piece: string) => {
    if (promotionPending) {
      makeMove(promotionPending.from, promotionPending.to, piece);
      setPromotionPending(null);
    }
  }, [promotionPending, makeMove]);

  const resetGame = () => {
    setGame(new Chess());
    setSelectedSquare(null);
    setLegalMoves([]);
    setLastMove(null);
    setMoveHistory([]);
    setPromotionPending(null);
  };

  const isInCheck = game.isCheck();
  const isGameOver = game.isGameOver();
  const gameStatus = useMemo(() => {
    if (game.isCheckmate()) return `Checkmate! ${game.turn() === "w" ? "Black" : "White"} wins!`;
    if (game.isStalemate()) return "Stalemate — Draw";
    if (game.isDraw()) return "Draw";
    if (isInCheck) return `${game.turn() === "w" ? "White" : "Black"} is in check!`;
    return `${game.turn() === "w" ? "White" : "Black"} to move`;
  }, [game, isInCheck]);

  const kingSquare = useMemo(() => {
    if (!isInCheck) return null;
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const sq = (FILES[f] + RANKS[r]) as Square;
        const p = game.get(sq);
        if (p && p.type === "k" && p.color === game.turn()) return sq;
      }
    }
    return null;
  }, [game, isInCheck]);

  // Format move history into pairs
  const movePairs = useMemo(() => {
    const pairs: { num: number; white: string; black?: string }[] = [];
    for (let i = 0; i < moveHistory.length; i += 2) {
      pairs.push({
        num: Math.floor(i / 2) + 1,
        white: moveHistory[i],
        black: moveHistory[i + 1],
      });
    }
    return pairs;
  }, [moveHistory]);

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Board */}
          <div className="lg:col-span-8 flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full max-w-[min(80vw,560px)] aspect-square"
            >
              {/* Promotion overlay */}
              <AnimatePresence>
                {promotionPending && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-20 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-xl"
                  >
                    <div className="glass-card p-6 border-glow">
                      <p className="font-display text-sm font-bold mb-4 text-center">Promote to:</p>
                      <div className="flex gap-3">
                        {["q", "r", "b", "n"].map((p) => (
                          <button
                            key={p}
                            onClick={() => handlePromotion(p)}
                            className="w-14 h-14 rounded-lg bg-secondary hover:bg-primary/20 hover:border-primary/40 border border-border flex items-center justify-center text-3xl transition-colors"
                          >
                            {PIECE_UNICODE[(game.turn() + p)]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-8 grid-rows-8 w-full h-full rounded-xl overflow-hidden border-2 border-glass-border/50 shadow-2xl">
                {RANKS.map((rank, ri) =>
                  FILES.map((file, fi) => {
                    const square = (file + rank) as Square;
                    const piece = game.get(square);
                    const isLight = (ri + fi) % 2 === 0;
                    const isSelected = selectedSquare === square;
                    const isLegal = legalMoves.includes(square);
                    const isLastMove = lastMove?.from === square || lastMove?.to === square;
                    const isKingInCheck = kingSquare === square;

                    return (
                      <button
                        key={square}
                        onClick={() => handleSquareClick(square)}
                        className={`relative flex items-center justify-center transition-colors ${
                          isLight ? "chess-board-light" : "chess-board-dark"
                        } ${isSelected ? "!bg-primary/50" : ""} ${
                          isLastMove ? (isLight ? "!bg-yellow-300/50" : "!bg-yellow-700/50") : ""
                        } ${isKingInCheck ? "!bg-destructive/60" : ""}`}
                      >
                        {/* Legal move indicator */}
                        {isLegal && !piece && (
                          <div className="absolute w-[30%] h-[30%] rounded-full bg-foreground/20" />
                        )}
                        {isLegal && piece && (
                          <div className="absolute inset-[5%] rounded-full border-[3px] border-foreground/30" />
                        )}

                        {/* Piece */}
                        {piece && (
                          <span
                            className={`text-[clamp(1.5rem,5vw,3rem)] leading-none select-none drop-shadow-md ${
                              piece.color === "w" ? "text-white" : "text-gray-900"
                            }`}
                            style={{ filter: piece.color === "w" ? "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" : "drop-shadow(0 1px 2px rgba(255,255,255,0.3))" }}
                          >
                            {PIECE_UNICODE[piece.color + piece.type]}
                          </span>
                        )}

                        {/* Coordinates */}
                        {fi === 0 && (
                          <span className={`absolute top-0.5 left-1 text-[0.55rem] font-bold ${isLight ? "text-amber-900/50" : "text-amber-100/50"}`}>
                            {rank}
                          </span>
                        )}
                        {ri === 7 && (
                          <span className={`absolute bottom-0.5 right-1 text-[0.55rem] font-bold ${isLight ? "text-amber-900/50" : "text-amber-100/50"}`}>
                            {file}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>

            {/* Status bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4 flex items-center justify-between w-full max-w-[min(80vw,560px)]"
            >
              <div className={`flex items-center gap-2 text-sm font-display font-bold ${isInCheck ? "text-destructive" : "text-foreground"}`}>
                <div className={`w-3 h-3 rounded-full ${game.turn() === "w" ? "bg-white border border-border" : "bg-gray-900"}`} />
                {gameStatus}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={resetGame}
                  className="glass-card px-3 py-2 hover:border-primary/30 transition-colors"
                  title="New Game"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-4 space-y-4"
          >
            {/* Game info */}
            <div className="glass-card p-5 border-glow">
              <h3 className="font-display font-bold text-sm mb-3 flex items-center gap-2">
                <Crown className="w-4 h-4 text-primary" />
                Local Game
              </h3>
              <p className="text-xs text-muted-foreground">
                Play against a friend on the same device. Take turns making moves on the board.
              </p>
            </div>

            {/* Move history */}
            <div className="glass-card p-5">
              <h3 className="font-display font-bold text-sm mb-3">Move History</h3>
              <div className="max-h-64 overflow-y-auto space-y-1 text-sm font-mono">
                {movePairs.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No moves yet</p>
                )}
                {movePairs.map((pair) => (
                  <div key={pair.num} className="flex items-center gap-2 py-0.5">
                    <span className="text-muted-foreground w-6 text-right text-xs">{pair.num}.</span>
                    <span className="w-16 text-foreground">{pair.white}</span>
                    <span className="w-16 text-foreground">{pair.black || ""}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Game over actions */}
            {isGameOver && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-5 border-glow gold-glow text-center"
              >
                <Crown className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="font-display font-bold text-lg mb-3">{gameStatus}</p>
                <button
                  onClick={resetGame}
                  className="bg-primary text-primary-foreground font-display font-bold text-xs tracking-wider px-6 py-2.5 rounded-lg gold-glow hover:scale-105 transition-transform"
                >
                  PLAY AGAIN
                </button>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Play;
