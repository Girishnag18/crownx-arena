import { useState, useCallback, useMemo } from "react";
import { Chess, Square, Move } from "chess.js";
import { motion, AnimatePresence } from "framer-motion";

const PIECE_UNICODE: Record<string, string> = {
  wp: "♙", wn: "♘", wb: "♗", wr: "♖", wq: "♕", wk: "♔",
  bp: "♟", bn: "♞", bb: "♝", br: "♜", bq: "♛", bk: "♚",
};

const PIECE_SPRITES: Record<string, string> = {
  wp: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wp.png",
  wn: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wn.png",
  wb: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wb.png",
  wr: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wr.png",
  wq: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wq.png",
  wk: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wk.png",
  bp: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bp.png",
  bn: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bn.png",
  bb: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bb.png",
  br: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/br.png",
  bq: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bq.png",
  bk: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bk.png",
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

interface ChessBoardProps {
  game: Chess;
  onMove: (from: Square, to: Square, promotion?: string) => boolean | Promise<boolean>;
  flipped?: boolean;
  disabled?: boolean;
  lastMove?: { from: Square; to: Square } | null;
  sizeClassName?: string;
  maxBoardSizePx?: number;
}

const ChessBoard = ({ game, onMove, flipped = false, disabled = false, lastMove, sizeClassName, maxBoardSizePx }: ChessBoardProps) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [promotionPending, setPromotionPending] = useState<{ from: Square; to: Square } | null>(null);

  const files = flipped ? [...FILES].reverse() : FILES;
  const ranks = flipped ? [...RANKS].reverse() : RANKS;

  const isInCheck = game.isCheck();

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

  const handleSquareClick = useCallback((square: Square) => {
    if (disabled || promotionPending) return;

    const piece = game.get(square);

    if (piece && piece.color === game.turn()) {
      setSelectedSquare(square);
      const moves = game.moves({ square, verbose: true }) as Move[];
      setLegalMoves(moves.map((m) => m.to as Square));
      return;
    }

    if (selectedSquare) {
      const selectedPiece = game.get(selectedSquare);
      if (
        selectedPiece?.type === "p" &&
        ((selectedPiece.color === "w" && square[1] === "8") ||
          (selectedPiece.color === "b" && square[1] === "1"))
      ) {
        setPromotionPending({ from: selectedSquare, to: square });
        return;
      }

      const result = onMove(selectedSquare, square);
      if (result instanceof Promise) {
        result.finally(() => {
          setSelectedSquare(null);
          setLegalMoves([]);
        });
      } else {
        setSelectedSquare(null);
        setLegalMoves([]);
      }
    }
  }, [game, selectedSquare, onMove, disabled, promotionPending]);

  const handlePromotion = useCallback((piece: string) => {
    if (promotionPending) {
      onMove(promotionPending.from, promotionPending.to, piece);
      setPromotionPending(null);
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  }, [promotionPending, onMove]);

  return (
    <div
      className={`relative w-full aspect-square ${sizeClassName || "max-w-[min(80vw,560px)]"}`}
      style={maxBoardSizePx ? { maxWidth: `${maxBoardSizePx}px` } : undefined}
    >
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

      <div className="chess-board-shell grid grid-cols-8 grid-rows-8 w-full h-full rounded-xl overflow-hidden border border-glass-border/60 shadow-2xl">
        {ranks.map((rank, ri) =>
          files.map((file, fi) => {
            const square = (file + rank) as Square;
            const piece = game.get(square);
            const origRi = RANKS.indexOf(rank);
            const origFi = FILES.indexOf(file);
            const isLight = (origRi + origFi) % 2 === 0;
            const isSelected = selectedSquare === square;
            const isLegal = legalMoves.includes(square);
            const isLastMove = lastMove?.from === square || lastMove?.to === square;
            const isMoveDestination = lastMove?.to === square;
            const isKingInCheck = kingSquare === square;

            return (
              <button
                key={square}
                onClick={() => handleSquareClick(square)}
                className={`board-square relative flex items-center justify-center transition-all duration-300 ${
                  isLight ? "chess-board-light" : "chess-board-dark"
                } ${isSelected ? "!bg-primary/35" : ""} ${
                  isLastMove ? "!bg-yellow-300/60" : ""
                } ${isKingInCheck ? "!bg-destructive/45" : ""}`}
              >
                {isMoveDestination && (
                  <motion.div
                    className="absolute inset-[14%] rounded-full border-2 border-yellow-400/80"
                    initial={{ scale: 0.7, opacity: 0.2 }}
                    animate={{ scale: 1.15, opacity: 0 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "easeOut" }}
                  />
                )}
                {isLegal && !piece && (
                  <div className="absolute w-[28%] h-[28%] rounded-full bg-black/15" />
                )}
                {isLegal && piece && (
                  <div className="absolute inset-[5%] rounded-full border-[3px] border-yellow-500/45" />
                )}
                {piece && (
                  <motion.img
                    layout
                    initial={{ scale: 0.9, opacity: 0.85 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 220, damping: 16, mass: 0.7 }}
                    src={PIECE_SPRITES[piece.color + piece.type]}
                    alt={`${piece.color === "w" ? "white" : "black"} ${piece.type}`}
                    draggable={false}
                    className="w-[82%] h-[82%] object-contain select-none"
                    style={{ filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.35))" }}
                  />
                )}
                {fi === 0 && (
                  <span className={`absolute top-0.5 left-1 text-[0.55rem] font-bold ${isLight ? "text-amber-900/60" : "text-amber-100/60"}`}>
                    {rank}
                  </span>
                )}
                {ri === 7 && (
                  <span className={`absolute bottom-0.5 right-1 text-[0.55rem] font-bold ${isLight ? "text-amber-900/60" : "text-amber-100/60"}`}>
                    {file}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChessBoard;
