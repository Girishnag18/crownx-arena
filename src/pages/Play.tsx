import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Chess, Square } from "chess.js";
import { motion } from "framer-motion";
import { Crown, RotateCcw, Flag, Wifi, WifiOff, LoaderCircle, Swords, Shield, Volume2, VolumeX, ArrowUpRight, ArrowUpRightIcon, Monitor, Shuffle } from "lucide-react";
import { generateChess960Fen } from "@/utils/chess960";
import { useAuth } from "@/contexts/AuthContext";
import { getSkillLevel } from "@/components/ProfileCard";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useOnlineGame } from "@/hooks/useOnlineGame";
import ChessBoard from "@/components/chess/ChessBoard";
import GameReview from "@/components/chess/GameReview";
import AICoach from "@/components/chess/AICoach";
import ReportButton from "@/components/chess/ReportButton";
import VoiceChess from "@/components/chess/VoiceChess";
import OpeningExplorer from "@/components/chess/OpeningExplorer";
import GameChat from "@/components/chess/GameChat";
import { TIME_CONTROLS, type TimeControl, TimeControlSelector, useChessClock, ClockFace } from "@/components/chess/ChessClock";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { soundManager } from "@/services/soundManager";
import { stockfish } from "@/services/stockfishService";

const Play = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const onlineGameId = searchParams.get("game");
  const mode = searchParams.get("mode");
  const isRankedAI = searchParams.get("ranked") === "true";
  const variant = searchParams.get("variant");
  const isChess960 = variant === "chess960";
  const { profile } = useAuth();
  const playerElo = profile?.crown_score || 400;
  const aiElo = playerElo + 20;

  const [chess960Fen] = useState(() => isChess960 ? generateChess960Fen() : null);
  const [localGame, setLocalGame] = useState(() => new Chess(chess960Fen || undefined));
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [syncAgo, setSyncAgo] = useState("just now");
  const [resignPending, setResignPending] = useState(false);
  const [computerColor] = useState<"w" | "b">(() => (Math.random() > 0.5 ? "w" : "b"));
  const [maxBoardSizePx, setMaxBoardSizePx] = useState<number | null>(null);
  const [aiAccuracy, setAiAccuracy] = useState(92);
  const [showCheckmateBanner, setShowCheckmateBanner] = useState(false);
  const [showPostGameReview, setShowPostGameReview] = useState(false);
  const [showEngineReview, setShowEngineReview] = useState(false);
  const [showAICoach, setShowAICoach] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [engineArrows, setEngineArrows] = useState<Array<{ from: string; to: string; color?: string }>>([]);
  const [showArrows, setShowArrows] = useState(true);
  const [localBottomColor, setLocalBottomColor] = useState<"w" | "b">("w");
  const [streamerMode, setStreamerMode] = useState(false);
  const [timeControl, setTimeControl] = useState<TimeControl | null>(() => {
    const tc = searchParams.get("tc");
    return tc ? TIME_CONTROLS.find((t) => t.label === tc) || null : null;
  });
  const [clockGameOver, setClockGameOver] = useState(false);
  const prevMoveCountRef = useRef(0);

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

  const searchBestMove = useCallback((position: Chess, depth: number, alpha: number, beta: number, maximizing: boolean): number => {
    if (depth === 0 || position.isGameOver()) return scorePosition(position);

    const moves = position.moves({ verbose: true });
    if (maximizing) {
      let best = -Infinity;
      for (const candidate of moves) {
        const simulated = new Chess(position.fen());
        simulated.move({ from: candidate.from, to: candidate.to, promotion: candidate.promotion });
        const tacticalBoost = (candidate.captured ? 35 : 0) + (candidate.san.includes("+") ? 25 : 0);
        const val = searchBestMove(simulated, depth - 1, alpha, beta, false) + tacticalBoost;
        best = Math.max(best, val);
        alpha = Math.max(alpha, val);
        if (beta <= alpha) break;
      }
      return best;
    }

    let best = Infinity;
    for (const candidate of moves) {
      const simulated = new Chess(position.fen());
      simulated.move({ from: candidate.from, to: candidate.to, promotion: candidate.promotion });
      const tacticalPenalty = (candidate.captured ? 30 : 0) + (candidate.san.includes("+") ? 20 : 0);
      const val = searchBestMove(simulated, depth - 1, alpha, beta, true) - tacticalPenalty;
      best = Math.min(best, val);
      beta = Math.min(beta, val);
      if (beta <= alpha) break;
    }
    return best;
  }, [scorePosition]);

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
    const newFen = isChess960 ? generateChess960Fen() : undefined;
    setLocalGame(new Chess(newFen));
    setLastMove(null);
    setMoveHistory([]);
    setShowCheckmateBanner(false);
    setShowPostGameReview(false);
    setLocalBottomColor("w");
    setClockGameOver(false);
  };

  const handleTimeUp = useCallback((side: "w" | "b") => {
    setClockGameOver(true);
    soundManager.play("gameEnd");
  }, []);

  const game = isOnline && online.game ? online.game : localGame;
  const isInCheck = game.isCheck();
  const isGameOver = isOnline ? online.isGameOver : (game.isGameOver() || clockGameOver);

  useEffect(() => {
    if (!isComputerGame || isGameOver) return;
    if (game.turn() !== computerColor) return;

    const timer = window.setTimeout(() => {
      const moves = game.moves({ verbose: true });
      if (moves.length === 0) return;
      const searchDepth = aiAccuracy >= 95 ? 3 : 2;
      const evaluated = moves.map((candidate) => {
        const simulated = new Chess(game.fen());
        simulated.move({ from: candidate.from, to: candidate.to, promotion: candidate.promotion });
        return {
          move: candidate,
          score: searchBestMove(simulated, searchDepth, -Infinity, Infinity, false),
        };
      }).sort((a, b) => b.score - a.score);

      const bestWindow = Math.max(1, Math.ceil(((100 - aiAccuracy) / 140) * Math.min(3, evaluated.length)));
      const pick = evaluated[Math.floor(Math.random() * bestWindow)].move;
      handleLocalMove(pick.from as Square, pick.to as Square, pick.promotion);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [aiAccuracy, computerColor, game, handleLocalMove, isComputerGame, isGameOver, searchBestMove]);

  useEffect(() => {
    if (!isComputerGame || isGameOver) return;
    setAiAccuracy(Math.floor(Math.random() * 11) + 88);
  }, [game, isComputerGame, isGameOver]);

  // Sound effects for moves
  useEffect(() => {
    const currentMoves = isOnline && online.gameData?.moves
      ? (online.gameData.moves as any[]).length
      : moveHistory.length;

    if (currentMoves > prevMoveCountRef.current && prevMoveCountRef.current > 0) {
      if (game.isCheckmate()) {
        soundManager.play("gameEnd");
      } else if (game.isCheck()) {
        soundManager.play("check");
      } else {
        // Check last move type
        const history = game.history({ verbose: true });
        const lastHistoryMove = history[history.length - 1];
        if (lastHistoryMove?.captured) {
          soundManager.play("capture");
        } else if (lastHistoryMove?.flags.includes("k") || lastHistoryMove?.flags.includes("q")) {
          soundManager.play("castle");
        } else if (lastHistoryMove?.promotion) {
          soundManager.play("promote");
        } else {
          soundManager.play("move");
        }
      }
    }
    prevMoveCountRef.current = currentMoves;
  }, [game, isOnline, online.gameData?.moves, moveHistory.length]);

  // Engine best-move arrow
  useEffect(() => {
    if (!showArrows || isGameOver) {
      setEngineArrows([]);
      return;
    }
    let cancelled = false;
    const fen = game.fen();
    stockfish.getBestMove(fen, 10).then((bestMove) => {
      if (cancelled || !bestMove || bestMove.length < 4) return;
      const from = bestMove.slice(0, 2);
      const to = bestMove.slice(2, 4);
      setEngineArrows([{ from, to }]);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [game, showArrows, isGameOver]);

  useEffect(() => {
    if (!game.isCheckmate()) {
      setShowCheckmateBanner(false);
      setShowPostGameReview(false);
      return;
    }

    setShowCheckmateBanner(true);
    const timer = window.setTimeout(() => {
      setShowCheckmateBanner(false);
      setShowPostGameReview(true);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [game]);

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
    if (clockGameOver) return `Time's up! ${game.turn() === "w" ? "Black" : "White"} wins on time!`;
    if (game.isCheckmate()) return `Checkmate! ${game.turn() === "w" ? "Black" : "White"} wins!`;
    if (game.isStalemate()) return "Stalemate — Draw";
    if (game.isDraw()) return "Draw";
    if (isInCheck) return `${game.turn() === "w" ? "White" : "Black"} is in check!`;
    return `${game.turn() === "w" ? "White" : "Black"} to move`;
  }, [game, isInCheck, isOnline, online, user, clockGameOver]);

  const displayMoves = isOnline && online.gameData?.moves
    ? (online.gameData.moves as Array<{ san: string }>).map((m) => m.san)
    : moveHistory;

  const clockActiveSide = (game.isGameOver() || clockGameOver) ? null : game.turn();
  const { whiteMs, blackMs } = useChessClock(
    timeControl,
    clockActiveSide,
    displayMoves.length > 0,
    isGameOver,
    handleTimeUp,
  );

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

  const flipped = (isOnline && online.playerColor === "b") || (isComputerGame && computerColor === "w") || (!isOnline && !isComputerGame && localBottomColor === "b");
  const boardSizeClass = "max-w-[96vw]";
  const localTopName = localBottomColor === "w" ? "Black Player" : "White Player";
  const localBottomName = localBottomColor === "w" ? "White Player" : "Black Player";

  const topPlayerName = isOnline
    ? `${online.opponentName} (${(online.playerColor === "w" ? online.blackPlayer?.crown_score : online.whitePlayer?.crown_score) ?? 400})`
    : isComputerGame
      ? `${computerColor === "b" ? `AI (${aiElo})` : `You (${playerElo})`}`
      : localTopName;

  const bottomPlayerName = isOnline
    ? `${online.playerName} (${(online.playerColor === "w" ? online.whitePlayer?.crown_score : online.blackPlayer?.crown_score) ?? 400})`
    : isComputerGame
      ? `${computerColor === "w" ? `AI (${aiElo})` : `You (${playerElo})`}`
      : localBottomName;

  const topAvatar = isOnline
    ? (online.playerColor === "w" ? online.blackPlayer?.avatar_url : online.whitePlayer?.avatar_url)
    : null;
  const bottomAvatar = isOnline
    ? (online.playerColor === "w" ? online.whitePlayer?.avatar_url : online.blackPlayer?.avatar_url)
    : null;

  const topTitle = isOnline
    ? (online.playerColor === "w" ? online.blackPlayer?.equippedTitle : online.whitePlayer?.equippedTitle)
    : null;
  const bottomTitle = isOnline
    ? (online.playerColor === "w" ? online.whitePlayer?.equippedTitle : online.blackPlayer?.equippedTitle)
    : null;

  const PlayerLabel = ({ name, avatarUrl, title, isTop }: { name: string; avatarUrl?: string | null; title?: { name: string; icon: string } | null; isTop?: boolean }) => (
    <div className="flex items-center gap-2 min-w-0">
      <Avatar className="w-7 h-7 sm:w-8 sm:h-8 border-2 border-border/50 shrink-0">
        <AvatarImage src={avatarUrl || undefined} alt={name} />
        <AvatarFallback className="text-[10px] bg-secondary font-display font-bold">{name.slice(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <span className="font-display font-bold text-xs sm:text-sm truncate block">{name}</span>
        {title && (
          <span className="text-[9px] text-primary/80 font-semibold">
            {title.icon} {title.name}
          </span>
        )}
      </div>
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
    <div className="min-h-screen bg-background pt-14 sm:pt-18 pb-16 lg:pb-8 px-2 sm:px-4">
      <div className="container mx-auto max-w-[1500px]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-5">
          <div className="lg:col-span-9 flex flex-col items-center">
            {/* Top player bar */}
            <div className={`w-full ${boardSizeClass} mb-1.5 sm:mb-2.5 rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm px-3 sm:px-4 py-2 sm:py-2.5`}>
              <div className="flex items-center justify-between">
                <PlayerLabel name={topPlayerName} avatarUrl={topAvatar} title={topTitle} isTop />
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex gap-0.5 text-sm sm:text-base opacity-80" title="Captured pieces">
                    {capturedPieces.capturedByBlack.length === 0
                      ? <span className="text-[10px] text-muted-foreground/50">—</span>
                      : capturedPieces.capturedByBlack.slice(0, 8).map((piece, index) => <span key={`cap-black-${index}`}>{piece}</span>)}
                  </div>
                  {timeControl && (
                    <ClockFace
                      ms={flipped ? whiteMs : blackMs}
                      isActive={clockActiveSide === (flipped ? "w" : "b")}
                      side={flipped ? "w" : "b"}
                    />
                  )}
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
                arrows={showArrows ? engineArrows : []}
                premovesEnabled={isOnline}
                playerColor={isOnline ? online.playerColor : null}
                streamerMode={streamerMode}
              />
            </motion.div>

            {showCheckmateBanner && (
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

            {/* Bottom player bar */}
            <div className={`w-full ${boardSizeClass} mt-1.5 sm:mt-2.5 rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm px-3 sm:px-4 py-2 sm:py-2.5`}>
              <div className="flex items-center justify-between">
                <PlayerLabel name={bottomPlayerName} avatarUrl={bottomAvatar} title={bottomTitle} />
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex gap-0.5 text-sm sm:text-base opacity-80" title="Captured pieces">
                    {capturedPieces.capturedByWhite.length === 0
                      ? <span className="text-[10px] text-muted-foreground/50">—</span>
                      : capturedPieces.capturedByWhite.slice(0, 8).map((piece, index) => <span key={`cap-white-${index}`}>{piece}</span>)}
                  </div>
                  {timeControl && (
                    <ClockFace
                      ms={flipped ? blackMs : whiteMs}
                      isActive={clockActiveSide === (flipped ? "b" : "w")}
                      side={flipped ? "b" : "w"}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Controls bar */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`mt-2 sm:mt-3 flex items-center justify-between w-full ${boardSizeClass}`}
            >
              <div className={`flex items-center gap-1.5 text-xs sm:text-sm font-display font-bold ${isInCheck ? "text-destructive" : "text-foreground"} min-w-0`}>
                {!isOnline && (
                  <div className={`w-3 h-3 rounded-full shrink-0 border ${game.turn() === "w" ? "bg-white border-border/60" : "bg-foreground/80 border-transparent"}`} />
                )}
                {(isOnline && online.pendingMove) && <LoaderCircle className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />}
                {isChess960 && <span className="text-primary flex items-center gap-0.5"><Shuffle className="w-3 h-3" />960</span>}
                <span className="truncate">{gameStatus}</span>
              </div>
              <div className="flex gap-1.5 shrink-0">
                {isOnline && !online.isGameOver && (
                  <button
                    onClick={async () => {
                      if (!window.confirm("Are you sure to resign?")) return;
                      setResignPending(true);
                      await online.resign();
                      setResignPending(false);
                    }}
                    disabled={resignPending}
                    className="rounded-lg border border-border/40 bg-card/60 p-2 sm:px-3 sm:py-2 hover:border-destructive/40 hover:bg-destructive/5 transition-all text-destructive disabled:opacity-60"
                    title="Resign"
                  >
                    {resignPending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                  </button>
                )}
                {[
                  { icon: ArrowUpRight, active: showArrows, toggle: () => setShowArrows(!showArrows), label: showArrows ? "Hide engine arrows" : "Show engine arrows" },
                  { icon: soundEnabled ? Volume2 : VolumeX, active: false, toggle: () => { setSoundEnabled(!soundEnabled); soundManager.setEnabled(!soundEnabled); }, label: soundEnabled ? "Mute" : "Unmute" },
                ].map(({ icon: Icon, active, toggle, label }) => (
                  <button
                    key={label}
                    onClick={toggle}
                    className={`rounded-lg border border-border/40 bg-card/60 p-2 sm:px-3 sm:py-2 hover:border-primary/30 hover:bg-primary/5 transition-all ${active ? "text-primary border-primary/30" : "text-muted-foreground"}`}
                    title={label}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
                <button
                  onClick={() => setStreamerMode(!streamerMode)}
                  className={`rounded-lg border border-border/40 bg-card/60 p-2 sm:px-3 sm:py-2 hover:border-primary/30 hover:bg-primary/5 transition-all hidden sm:flex ${streamerMode ? "text-primary border-primary/30" : "text-muted-foreground"}`}
                  title={streamerMode ? "Exit streamer mode" : "Streamer mode"}
                >
                  <Monitor className="w-4 h-4" />
                </button>
                {!isOnline && (
                  <button
                    onClick={resetLocalGame}
                    className="rounded-lg border border-border/40 bg-card/60 p-2 sm:px-3 sm:py-2 hover:border-primary/30 hover:bg-primary/5 transition-all text-muted-foreground"
                    title="New Game"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          </div>
            </motion.div>
          </div>

          {/* Side panel */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-3 space-y-3"
          >
            {/* Game info card */}
            <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-4 sm:p-5 space-y-3">
              <h3 className="font-display font-bold text-sm flex items-center gap-2">
                <Crown className="w-4 h-4 text-primary" />
                {isOnline ? "Live Match" : isComputerGame ? "vs Computer" : "Local Game"}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isOnline
                  ? `Playing as ${online.playerColor === "w" ? "White" : "Black"} · ${online.playerName} vs ${online.opponentName}`
                  : isComputerGame
                    ? `You are ${computerColor === "w" ? "Black" : "White"} · AI accuracy: ${aiAccuracy}%`
                    : `Pass-and-play · ${localBottomColor === "w" ? "White" : "Black"} at bottom`}
              </p>
              {timeControl && (
                <div className="rounded-lg bg-secondary/40 border border-border/30 px-3 py-2 text-xs flex items-center justify-between">
                  <span className="text-muted-foreground">Time control</span>
                  <span className="font-display font-bold text-primary">{timeControl.label}</span>
                </div>
              )}
              {isOnline && (
                <div className="rounded-lg bg-secondary/40 border border-border/30 px-3 py-2 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Status</span>
                    <span className={`flex items-center gap-1.5 font-medium ${online.syncState === "live" ? "text-emerald-400" : "text-destructive"}`}>
                      {online.syncState === "live" ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                      {online.syncState === "live" ? "Live" : "Reconnecting"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Last sync</span>
                    <span className="text-foreground/80">{syncAgo}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Latest move / board info */}
            <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-4 sm:p-5">
              <h3 className="font-display font-bold text-sm mb-1.5 flex items-center gap-2">
                <Swords className="w-4 h-4 text-primary" />Board Info
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">Last move is highlighted on the board.</p>
              {!isOnline && !isComputerGame && (
                <button
                  onClick={() => setLocalBottomColor((prev) => (prev === "w" ? "b" : "w"))}
                  className="mt-3 w-full rounded-lg border border-border/40 bg-secondary/40 px-3 py-2 text-xs font-display font-bold hover:bg-secondary/60 transition-colors"
                >
                  Switch Seat ({localBottomColor === "w" ? "Black" : "White"} at bottom)
                </button>
              )}
            </div>

            <OpeningExplorer moves={displayMoves} />

            {!isGameOver && (
              <VoiceChess
                game={game}
                onMove={isOnline ? handleOnlineMove : handleLocalMove}
                disabled={isOnline ? !online.isMyTurn || online.isGameOver : (isComputerGame ? game.turn() === computerColor : false)}
              />
            )}

            {isOnline && onlineGameId && (
              <GameChat gameId={onlineGameId} />
            )}

            {/* Move History */}
            <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-4 sm:p-5">
              <h3 className="font-display font-bold text-sm mb-3">Move History</h3>
              <div className="max-h-64 overflow-y-auto space-y-0.5 text-sm font-mono">
                {movePairs.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No moves yet</p>
                )}
                {movePairs.map((pair) => (
                  <div key={pair.num} className="flex items-center gap-2 py-1 px-1.5 rounded-md hover:bg-secondary/30 transition-colors">
                    <span className="text-muted-foreground/60 w-6 text-right text-xs tabular-nums">{pair.num}.</span>
                    <span className="w-16 text-foreground">{pair.white}</span>
                    <span className="w-16 text-foreground/80">{pair.black || ""}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Game Over panel */}
            {isGameOver && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl border border-primary/25 bg-primary/5 p-5 sm:p-6 text-center space-y-4 shadow-[0_0_30px_-10px_hsl(var(--primary)/0.3)]"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto">
                  <Crown className="w-7 h-7 text-primary" />
                </div>
                <p className="font-display font-bold text-lg">{gameStatus}</p>

                <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                  <span>{displayMoves.length} moves</span>
                  {timeControl && <span>{timeControl.label}</span>}
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  {isOnline ? (
                    <>
                      <button
                        onClick={() => navigate("/lobby")}
                        className="w-full bg-primary text-primary-foreground font-display font-bold text-xs tracking-wider py-2.5 rounded-lg hover:opacity-90 transition-opacity"
                      >
                        Find New Match
                      </button>
                      <button
                        onClick={() => setShowEngineReview(true)}
                        className="w-full rounded-lg border border-primary/30 text-primary font-display font-bold text-xs tracking-wider py-2.5 hover:bg-primary/10 transition-colors"
                      >
                        Analyze Game
                      </button>
                      <button
                        onClick={() => setShowAICoach(true)}
                        className="w-full rounded-lg border border-border/40 text-foreground font-display font-bold text-xs tracking-wider py-2.5 hover:bg-secondary/50 transition-colors"
                      >
                        AI Coach Review
                      </button>
                      <button
                        onClick={() => navigate("/lobby")}
                        className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5"
                      >
                        Back to Lobby
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={resetLocalGame}
                        className="w-full bg-primary text-primary-foreground font-display font-bold text-xs tracking-wider py-2.5 rounded-lg hover:opacity-90 transition-opacity"
                      >
                        Rematch
                      </button>
                      <button
                        onClick={() => setShowEngineReview(true)}
                        className="w-full rounded-lg border border-primary/30 text-primary font-display font-bold text-xs tracking-wider py-2.5 hover:bg-primary/10 transition-colors"
                      >
                        Analyze Game
                      </button>
                      <button
                        onClick={() => setShowAICoach(true)}
                        className="w-full rounded-lg border border-border/40 text-foreground font-display font-bold text-xs tracking-wider py-2.5 hover:bg-secondary/50 transition-colors"
                      >
                        AI Coach Review
                      </button>
                      <button
                        onClick={() => navigate("/lobby")}
                        className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5"
                      >
                        Play Online Instead
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {isGameOver && showPostGameReview && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-primary/20 bg-card/60 backdrop-blur-sm p-5"
              >
                <p className="font-display font-bold text-sm">Post-Game Analysis</p>
                <p className="text-xs text-muted-foreground mt-1 mb-3">Get a full engine-powered review of your game.</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setShowEngineReview(true)} className="rounded-lg bg-primary/10 text-primary text-xs font-display font-bold px-3 py-2 hover:bg-primary/20 transition-colors">Engine Review</button>
                  <button onClick={() => setShowAICoach(true)} className="rounded-lg bg-primary/10 text-primary text-xs font-display font-bold px-3 py-2 hover:bg-primary/20 transition-colors">AI Coach</button>
                  {isOnline && online.gameData && (
                    <ReportButton
                      gameId={online.gameData.id}
                      reportedPlayerId={
                        online.playerColor === "w"
                          ? online.gameData.player_black
                          : online.gameData.player_white
                      }
                    />
                  )}
                  <button onClick={() => navigate("/lobby")} className="rounded-lg bg-secondary/60 text-xs font-display font-bold px-3 py-2 hover:bg-secondary/80 transition-colors">Back to Lobby</button>
                  <button
                    onClick={() => {
                      if (window.confirm("Need a rematch?")) {
                        if (isOnline) navigate("/lobby");
                        else resetLocalGame();
                      }
                    }}
                    className="rounded-lg bg-secondary/60 text-xs font-display font-bold px-3 py-2 hover:bg-secondary/80 transition-colors"
                  >
                    Rematch
                  </button>
                </div>
              </motion.div>
            )}

            {isGameOver && showEngineReview && (
              <GameReview
                moves={
                  isOnline && online.gameData?.moves
                    ? (online.gameData.moves as Array<{ from: string; to: string; san: string; promotion?: string }>)
                    : moveHistory.map((san) => ({ from: "", to: "", san }))
                }
                playerColor={isOnline ? (online.playerColor || "w") : (isComputerGame ? (computerColor === "w" ? "b" : "w") : "w")}
                onClose={() => setShowEngineReview(false)}
              />
            )}

            {isGameOver && showAICoach && (
              <AICoach
                moves={
                  isOnline && online.gameData?.moves
                    ? (online.gameData.moves as Array<{ san: string; classification?: string }>)
                    : moveHistory.map((san) => ({ san }))
                }
                playerColor={isOnline ? (online.playerColor || "w") : (isComputerGame ? (computerColor === "w" ? "b" : "w") : "w")}
                accuracy={0}
                blunders={0}
                mistakes={0}
                inaccuracies={0}
                brilliants={0}
                onClose={() => setShowAICoach(false)}
              />
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Play;
