import { useState, useCallback, useMemo, useEffect } from "react";
import { Chess, Square } from "chess.js";
import { motion } from "framer-motion";
import { Crown, RotateCcw, Flag } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useOnlineGame } from "@/hooks/useOnlineGame";
import ChessBoard from "@/components/chess/ChessBoard";

const Play = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const onlineGameId = searchParams.get("game");

  // Local game state
  const [localGame, setLocalGame] = useState(new Chess());
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);

  // Online game
  const online = useOnlineGame(onlineGameId);
  const isOnline = !!onlineGameId;

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  // Local move handler
  const handleLocalMove = useCallback((from: Square, to: Square, promotion?: string): boolean => {
    const gameCopy = new Chess(localGame.fen());
    try {
      const move = gameCopy.move({ from, to, promotion: promotion || undefined });
      if (move) {
        setLocalGame(gameCopy);
        setLastMove({ from, to });
        setMoveHistory((prev) => [...prev, move.san]);
        return true;
      }
    } catch { /* invalid */ }
    return false;
  }, [localGame]);

  // Online move handler
  const handleOnlineMove = useCallback(async (from: Square, to: Square, promotion?: string): Promise<boolean> => {
    return online.makeMove(from, to, promotion);
  }, [online]);

  const resetLocalGame = () => {
    setLocalGame(new Chess());
    setLastMove(null);
    setMoveHistory([]);
  };

  // Derive game state
  const game = isOnline && online.game ? online.game : localGame;
  const isInCheck = game.isCheck();
  const isGameOver = isOnline ? online.isGameOver : game.isGameOver();

  const gameStatus = useMemo(() => {
    if (isOnline && online.gameData) {
      const rt = online.gameData.result_type;
      if (rt === "checkmate") {
        const won = online.gameData.winner_id === user?.id;
        return won ? "You win by checkmate!" : "You lost by checkmate";
      }
      if (rt === "resignation") {
        const won = online.gameData.winner_id === user?.id;
        return won ? "Opponent resigned — You win!" : "You resigned";
      }
      if (rt === "stalemate") return "Stalemate — Draw";
      if (rt === "draw") return "Draw";
      if (rt === "in_progress") {
        return online.isMyTurn ? "Your turn" : "Opponent's turn";
      }
    }
    if (game.isCheckmate()) return `Checkmate! ${game.turn() === "w" ? "Black" : "White"} wins!`;
    if (game.isStalemate()) return "Stalemate — Draw";
    if (game.isDraw()) return "Draw";
    if (isInCheck) return `${game.turn() === "w" ? "White" : "Black"} is in check!`;
    return `${game.turn() === "w" ? "White" : "Black"} to move`;
  }, [game, isInCheck, isOnline, online, user]);

  // Move pairs
  const displayMoves = isOnline && online.gameData?.moves
    ? (online.gameData.moves as any[]).map((m: any) => m.san)
    : moveHistory;

  const movePairs = useMemo(() => {
    const pairs: { num: number; white: string; black?: string }[] = [];
    for (let i = 0; i < displayMoves.length; i += 2) {
      pairs.push({
        num: Math.floor(i / 2) + 1,
        white: displayMoves[i],
        black: displayMoves[i + 1],
      });
    }
    return pairs;
  }, [displayMoves]);

  // Derive last move for online
  const derivedLastMove = useMemo(() => {
    if (isOnline && online.gameData?.moves) {
      const moves = online.gameData.moves as any[];
      if (moves.length > 0) {
        const last = moves[moves.length - 1];
        return { from: last.from as Square, to: last.to as Square };
      }
    }
    return lastMove;
  }, [isOnline, online.gameData, lastMove]);

  const flipped = isOnline && online.playerColor === "b";

  if (isOnline && online.loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-20">
        <Crown className="w-12 h-12 text-primary animate-pulse-gold" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Board */}
          <div className="lg:col-span-8 flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <ChessBoard
                game={game}
                onMove={isOnline ? handleOnlineMove : handleLocalMove}
                flipped={flipped}
                disabled={isOnline ? !online.isMyTurn || online.isGameOver : false}
                lastMove={derivedLastMove}
              />
            </motion.div>

            {/* Status bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4 flex items-center justify-between w-full max-w-[min(80vw,560px)]"
            >
              <div className={`flex items-center gap-2 text-sm font-display font-bold ${isInCheck ? "text-destructive" : "text-foreground"}`}>
                {!isOnline && (
                  <div className={`w-3 h-3 rounded-full ${game.turn() === "w" ? "bg-white border border-border" : "bg-gray-900"}`} />
                )}
                {gameStatus}
              </div>
              <div className="flex gap-2">
                {isOnline && !online.isGameOver && (
                  <button
                    onClick={online.resign}
                    className="glass-card px-3 py-2 hover:border-destructive/30 transition-colors text-destructive"
                    title="Resign"
                  >
                    <Flag className="w-4 h-4" />
                  </button>
                )}
                {!isOnline && (
                  <button
                    onClick={resetLocalGame}
                    className="glass-card px-3 py-2 hover:border-primary/30 transition-colors"
                    title="New Game"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
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
                {isOnline ? `vs ${online.opponentName}` : "Local Game"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isOnline
                  ? `You are playing as ${online.playerColor === "w" ? "White" : "Black"}`
                  : "Play against a friend on the same device."}
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

            {/* Game over */}
            {isGameOver && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-5 border-glow gold-glow text-center"
              >
                <Crown className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="font-display font-bold text-lg mb-3">{gameStatus}</p>
                <button
                  onClick={isOnline ? () => navigate("/lobby") : resetLocalGame}
                  className="bg-primary text-primary-foreground font-display font-bold text-xs tracking-wider px-6 py-2.5 rounded-lg gold-glow hover:scale-105 transition-transform"
                >
                  {isOnline ? "BACK TO LOBBY" : "PLAY AGAIN"}
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
