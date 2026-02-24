import { useState, useCallback, useMemo, useEffect } from "react";
import { Chess, Square } from "chess.js";
import { motion } from "framer-motion";
import { Crown, RotateCcw, Flag, Wifi, WifiOff, LoaderCircle, Swords } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useOnlineGame } from "@/hooks/useOnlineGame";
import ChessBoard from "@/components/chess/ChessBoard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Play = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const onlineGameId = searchParams.get("game");
  const mode = searchParams.get("mode");

  const [localGame, setLocalGame] = useState(new Chess());
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [syncAgo, setSyncAgo] = useState("just now");
  const [resignPending, setResignPending] = useState(false);
  const [computerColor] = useState<"w" | "b">(() => (Math.random() > 0.5 ? "w" : "b"));
  const [maxBoardSizePx, setMaxBoardSizePx] = useState<number | null>(null);
  const [aiAccuracy, setAiAccuracy] = useState(80);

  const online = useOnlineGame(onlineGameId);
  const isOnline = !!onlineGameId;
  const isComputerGame = !isOnline && mode === "computer";

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!isOnline || !online.lastSyncedAt) return;

    const formatSyncAge = () => {
      const diffSeconds = Math.max(0, Math.floor((Date.now() - online.lastSyncedAt!.getTime()) / 1000));
      if (diffSeconds < 1) {
        setSyncAgo("just now");
        return;
      }
      setSyncAgo(`${diffSeconds}s ago`);
    };

    formatSyncAge();
    const interval = window.setInterval(formatSyncAge, 1000);

    return () => window.clearInterval(interval);
  }, [isOnline, online.lastSyncedAt]);

  useEffect(() => {
    const calculateBoardSize = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const horizontalPadding = viewportWidth >= 1024 ? 220 : 32;
      const verticalReserved = viewportWidth >= 1024 ? 220 : 280;
      const sizeFromWidth = viewportWidth - horizontalPadding;
      const sizeFromHeight = viewportHeight - verticalReserved;
      const computed = Math.max(280, Math.min(sizeFromWidth, sizeFromHeight, 980));
      setMaxBoardSizePx(computed);
    };

    calculateBoardSize();
    window.addEventListener("resize", calculateBoardSize);
    return () => window.removeEventListener("resize", calculateBoardSize);
  }, []);

  const scorePosition = useCallback((position: Chess) => {
    const pieceValues: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20_000 };
    if (position.isCheckmate()) {
      return position.turn() === computerColor ? -100_000 : 100_000;
    }
    if (position.isDraw() || position.isStalemate() || position.isInsufficientMaterial()) {
      return 0;
    }

    let evaluation = 0;
    for (const row of position.board()) {
      for (const piece of row) {
        if (!piece) continue;
        const value = pieceValues[piece.type] || 0;
        evaluation += piece.color === computerColor ? value : -value;
      }
    }

    const mobility = position.moves().length;
    evaluation += position.turn() === computerColor ? mobility * 2 : -mobility * 2;
    return evaluation;
  }, [computerColor]);

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
    } catch {
      // invalid move
    }
    return false;
  }, [localGame]);

  const handleOnlineMove = useCallback(async (from: Square, to: Square, promotion?: string): Promise<boolean> => {
    return online.makeMove(from, to, promotion);
  }, [online]);

  const resetLocalGame = () => {
    setLocalGame(new Chess());
    setLastMove(null);
    setMoveHistory([]);
  };

  const game = isOnline && online.game ? online.game : localGame;
  const isInCheck = game.isCheck();
  const isGameOver = isOnline ? online.isGameOver : game.isGameOver();

  useEffect(() => {
    if (!isComputerGame || isGameOver) return;
    if (game.turn() !== computerColor) return;

    const timer = window.setTimeout(() => {
      const moves = game.moves({ verbose: true });
      if (moves.length === 0) return;
      const evaluated = moves.map((candidate) => {
        const simulated = new Chess(game.fen());
        simulated.move({ from: candidate.from, to: candidate.to, promotion: candidate.promotion });
        return {
          move: candidate,
          score: scorePosition(simulated),
        };
      }).sort((a, b) => b.score - a.score);

      const bestWindow = Math.max(1, Math.ceil(((100 - aiAccuracy) / 100) * Math.min(6, evaluated.length)));
      const pick = evaluated[Math.floor(Math.random() * bestWindow)].move;
      handleLocalMove(pick.from as Square, pick.to as Square, pick.promotion);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [aiAccuracy, computerColor, game, handleLocalMove, isComputerGame, isGameOver, scorePosition]);

  useEffect(() => {
    if (!isComputerGame || isGameOver) return;
    setAiAccuracy(Math.floor(Math.random() * 41) + 50);
  }, [game, isComputerGame, isGameOver]);

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

  const displayMoves = isOnline && online.gameData?.moves
    ? (online.gameData.moves as Array<{ san: string }>).map((m) => m.san)
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

  const derivedLastMove = useMemo(() => {
    if (isOnline && online.gameData?.moves) {
      const moves = online.gameData.moves as Array<{ from: string; to: string }>;
      if (moves.length > 0) {
        const last = moves[moves.length - 1];
        return { from: last.from as Square, to: last.to as Square };
      }
    }
    return lastMove;
  }, [isOnline, online.gameData, lastMove]);

  const capturedPieces = useMemo(() => {
    const initialCounts: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const current = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };
    const pieceGlyph: Record<string, string> = {
      wp: "♙", wn: "♘", wb: "♗", wr: "♖", wq: "♕",
      bp: "♟", bn: "♞", bb: "♝", br: "♜", bq: "♛",
    };

    for (const row of game.board()) {
      for (const piece of row) {
        if (!piece || piece.type === "k") continue;
        current[piece.color][piece.type] += 1;
      }
    }

    const order = ["q", "r", "b", "n", "p"];
    const capturedByWhite: string[] = [];
    const capturedByBlack: string[] = [];

    for (const pieceType of order) {
      const blackMissing = initialCounts[pieceType] - current.b[pieceType];
      const whiteMissing = initialCounts[pieceType] - current.w[pieceType];
      for (let i = 0; i < blackMissing; i += 1) capturedByWhite.push(pieceGlyph[`b${pieceType}`]);
      for (let i = 0; i < whiteMissing; i += 1) capturedByBlack.push(pieceGlyph[`w${pieceType}`]);
    }

    return { capturedByWhite, capturedByBlack };
  }, [game]);

  const flipped = (isOnline && online.playerColor === "b") || (isComputerGame && computerColor === "w");
  const boardSizeClass = "max-w-[96vw]";

  const topPlayerName = isOnline
    ? `${online.opponentName} (${(online.playerColor === "w" ? online.blackPlayer?.crown_score : online.whitePlayer?.crown_score) ?? 1200})`
    : isComputerGame
      ? `${computerColor === "b" ? "Computer" : "You"} (${computerColor === "b" ? 1300 : 1200})`
      : "Black (1200)";

  const bottomPlayerName = isOnline
    ? `${online.playerName} (${(online.playerColor === "w" ? online.whitePlayer?.crown_score : online.blackPlayer?.crown_score) ?? 1200})`
    : isComputerGame
      ? `${computerColor === "w" ? "Computer" : "You"} (${computerColor === "w" ? 1300 : 1200})`
      : "White (1200)";

  const topAvatar = isOnline
    ? (online.playerColor === "w" ? online.blackPlayer?.avatar_url : online.whitePlayer?.avatar_url)
    : null;
  const bottomAvatar = isOnline
    ? (online.playerColor === "w" ? online.whitePlayer?.avatar_url : online.blackPlayer?.avatar_url)
    : null;

  const PlayerLabel = ({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) => (
    <div className="flex items-center gap-2">
      <Avatar className="w-7 h-7 border border-border/70">
        <AvatarImage src={avatarUrl || undefined} alt={name} />
        <AvatarFallback className="text-[10px] bg-secondary">{name.slice(0, 1)}</AvatarFallback>
      </Avatar>
      <span className="font-display font-bold">{name}</span>
    </div>
  );

  if (isOnline && online.loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-20">
        <Crown className="w-12 h-12 text-primary animate-pulse-gold" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-[1500px]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-9 flex flex-col items-center">
            <div className={`w-full ${boardSizeClass} mb-3 rounded-lg border border-border/60 bg-secondary/20 px-4 py-2`}>
              <div className="flex items-center justify-between text-sm">
                <PlayerLabel name={topPlayerName} avatarUrl={topAvatar} />
                <div className="flex gap-1 text-lg" title="Pieces captured by this side">
                  {capturedPieces.capturedByBlack.length === 0
                    ? <span className="text-xs text-muted-foreground">No captures</span>
                    : capturedPieces.capturedByBlack.map((piece, index) => <span key={`cap-black-${index}`}>{piece}</span>)}
                </div>
              </div>
            </div>

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <ChessBoard
                game={game}
                onMove={isOnline ? handleOnlineMove : handleLocalMove}
                flipped={flipped}
                disabled={isOnline ? !online.isMyTurn || online.isGameOver || online.pendingMove : (isComputerGame ? game.turn() === computerColor : false)}
                lastMove={derivedLastMove}
                sizeClassName={boardSizeClass}
                maxBoardSizePx={maxBoardSizePx || undefined}
              />
            </motion.div>

            {game.isCheckmate() && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/45 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ y: 20 }}
                  animate={{ y: [0, -8, 0], boxShadow: ["0 0 10px rgba(255,215,0,.2)", "0 0 45px rgba(255,215,0,.8)", "0 0 10px rgba(255,215,0,.2)"] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="rounded-2xl border border-primary/50 bg-card/95 px-12 py-8 text-center"
                >
                  <p className="font-display text-4xl md:text-6xl font-black text-primary tracking-wide">CHECKMATE</p>
                  <p className="text-sm text-muted-foreground mt-2">Tactical finish!</p>
                </motion.div>
              </motion.div>
            )}

            <div className={`w-full ${boardSizeClass} mt-3 rounded-lg border border-border/60 bg-secondary/20 px-4 py-2`}>
              <div className="flex items-center justify-between text-sm">
                <PlayerLabel name={bottomPlayerName} avatarUrl={bottomAvatar} />
                <div className="flex gap-1 text-lg" title="Pieces captured by this side">
                  {capturedPieces.capturedByWhite.length === 0
                    ? <span className="text-xs text-muted-foreground">No captures</span>
                    : capturedPieces.capturedByWhite.map((piece, index) => <span key={`cap-white-${index}`}>{piece}</span>)}
                </div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`mt-4 flex items-center justify-between w-full ${boardSizeClass}`}
            >
              <div className={`flex items-center gap-2 text-sm font-display font-bold ${isInCheck ? "text-destructive" : "text-foreground"}`}>
                {!isOnline && (
                  <div className={`w-3 h-3 rounded-full ${game.turn() === "w" ? "bg-white border border-border" : "bg-gray-900"}`} />
                )}
                {(isOnline && online.pendingMove) && <LoaderCircle className="w-4 h-4 animate-spin text-primary" />}
                {gameStatus}
              </div>
              <div className="flex gap-2">
                {isOnline && !online.isGameOver && (
                  <button
                    onClick={async () => {
                      if (!window.confirm("Are you sure to resign?")) return;
                      setResignPending(true);
                      await online.resign();
                      setResignPending(false);
                    }}
                    disabled={resignPending}
                    className="glass-card px-3 py-2 hover:border-destructive/30 transition-colors text-destructive disabled:opacity-60"
                    title="Resign"
                  >
                    {resignPending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
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

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-3 space-y-4"
          >
            <div className="glass-card p-5 border-glow space-y-3">
              <h3 className="font-display font-bold text-sm flex items-center gap-2">
                <Crown className="w-4 h-4 text-primary" />
                {isOnline ? `Live match: ${online.playerName} vs ${online.opponentName}` : "Local Game"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isOnline
                  ? `You are playing as ${online.playerColor === "w" ? "White" : "Black"}. Points update in real-time as profile score changes.`
                  : isComputerGame
                    ? `You are ${computerColor === "w" ? "Black" : "White"}. Computer is ${computerColor === "w" ? "White" : "Black"}. Tactical AI accuracy this move: ${aiAccuracy}%.`
                    : "Play against a friend on the same device."}
              </p>
              {isOnline && (
                <div className="rounded-lg border border-border/60 bg-secondary/30 p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-display">
                    <span className="text-muted-foreground">Realtime sync</span>
                    <span className={`flex items-center gap-1.5 ${online.syncState === "live" ? "text-emerald-400" : "text-destructive"}`}>
                      {online.syncState === "live" ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                      {online.syncState === "live" ? "Connected" : "Reconnecting"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Last sync</span>
                    <span className="text-foreground/90">{syncAgo}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="glass-card p-5 border border-primary/20">
              <h3 className="font-display font-bold text-sm mb-2 flex items-center gap-2"><Swords className="w-4 h-4 text-primary" />Latest move</h3>
              <p className="text-xs text-muted-foreground">The most recent move is highlighted in yellow on the board so you can instantly see your opponent's last move.</p>
            </div>

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
