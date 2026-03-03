import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Chess, Square } from "chess.js";
import { motion } from "framer-motion";
import { Crown, RotateCcw, Flag, Wifi, WifiOff, LoaderCircle, Swords } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useOnlineGame } from "@/hooks/useOnlineGame";
import { supabase } from "@/integrations/supabase/client";
import ChessBoard from "@/components/chess/ChessBoard";
import EvaluationBar from "@/components/chess/EvaluationBar";
import AnalysisPanel, { type MoveAnalysisItem } from "@/components/chess/AnalysisPanel";
import InGameChat from "@/components/chat/InGameChat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { trackArenaEvent } from "@/services/arenaAnalytics";
import { BoardTheme, PieceTheme, PIECE_UNICODE } from "@/utils/chessThemes";

type EngineBestMoveResponse = {
  type: "bestMove";
  move: { from: string; to: string; promotion?: string } | null;
  evalCp: number;
  using: "stockfish" | "fallback";
};

type EngineEvalResponse = {
  type: "evaluate";
  evalCp: number;
  using: "stockfish" | "fallback";
};

type LocalMove = { from: string; to: string; san: string; promotion?: string | null };

const Play = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const onlineGameId = searchParams.get("game");
  const mode = searchParams.get("mode");

  const playerElo = profile?.crown_score || 400;
  const aiElo = playerElo + 20;

  const [localGame, setLocalGame] = useState(new Chess());
  const [localMoves, setLocalMoves] = useState<LocalMove[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [syncAgo, setSyncAgo] = useState("just now");
  const [resignPending, setResignPending] = useState(false);
  const [computerColor] = useState<"w" | "b">(() => (Math.random() > 0.5 ? "w" : "b"));
  const [maxBoardSizePx, setMaxBoardSizePx] = useState<number | null>(null);
  const [aiAccuracy, setAiAccuracy] = useState(92);
  const [showCheckmateBanner, setShowCheckmateBanner] = useState(false);
  const [showPostGameReview, setShowPostGameReview] = useState(false);
  const [localBottomColor, setLocalBottomColor] = useState<"w" | "b">("w");
  const [localResult, setLocalResult] = useState<{ type: "resignation"; winnerColor: "w" | "b"; loserColor: "w" | "b" } | null>(null);
  const [nextLiveGameId, setNextLiveGameId] = useState<string | null>(null);
  const [evalCp, setEvalCp] = useState<number | null>(0);
  const [engineBackend, setEngineBackend] = useState<"stockfish" | "fallback" | null>(null);
  const [analysisItems, setAnalysisItems] = useState<MoveAnalysisItem[]>([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [boardTheme, setBoardTheme] = useState<BoardTheme>("wood");
  const [pieceTheme, setPieceTheme] = useState<PieceTheme>("neo");

  const aiWorkerRef = useRef<Worker | null>(null);
  const aiTurnRequestRef = useRef(0);
  const pendingBestMoveRef = useRef<((data: EngineBestMoveResponse) => void) | null>(null);
  const pendingEvalRef = useRef<((data: EngineEvalResponse) => void) | null>(null);
  const evalQueueRef = useRef(Promise.resolve());

  const online = useOnlineGame(onlineGameId);
  const isOnline = !!onlineGameId;
  const isComputerGame = !isOnline && mode === "computer";
  const isSpectator = isOnline && online.isSpectator;

  useEffect(() => {
    const nextBoardTheme = (localStorage.getItem("chess-board-theme") as BoardTheme) || "wood";
    const nextPieceTheme = (localStorage.getItem("chess-piece-theme") as PieceTheme) || "neo";
    setBoardTheme(nextBoardTheme);
    setPieceTheme(nextPieceTheme);
  }, []);

  useEffect(() => {
    const worker = new Worker(new URL("../utils/chess-ai-worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<EngineBestMoveResponse | EngineEvalResponse>) => {
      const data = event.data;
      if (data.type === "bestMove") {
        pendingBestMoveRef.current?.(data);
      } else {
        pendingEvalRef.current?.(data);
      }
    };
    aiWorkerRef.current = worker;
    return () => {
      worker.terminate();
      aiWorkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (isOnline && isSpectator && user?.id && onlineGameId) {
      void trackArenaEvent(user.id, "spectate_open", { game_id: onlineGameId });
    }
  }, [isOnline, isSpectator, onlineGameId, user?.id]);

  useEffect(() => {
    if (!isSpectator || !onlineGameId) return;
    const loadNextLive = async () => {
      const liveFeedClient = supabase as unknown as {
        from: (table: string) => {
          select: (fields: string) => {
            neq: (col: string, value: string) => {
              order: (col2: string, opts: { ascending: boolean }) => {
                limit: (count: number) => Promise<{ data: Array<{ id: string }> | null }>;
              };
            };
          };
        };
      };
      const { data } = await liveFeedClient
        .from("live_games_feed")
        .select("id")
        .neq("id", onlineGameId)
        .order("created_at", { ascending: false })
        .limit(1);
      setNextLiveGameId((data && data.length > 0) ? data[0].id : null);
    };
    void loadNextLive();
  }, [isSpectator, onlineGameId]);

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
      const horizontalPadding = viewportWidth >= 1024 ? 300 : 32;
      const verticalReserved = viewportWidth >= 1024 ? 220 : 280;
      const sizeFromWidth = viewportWidth - horizontalPadding;
      const sizeFromHeight = viewportHeight - verticalReserved;
      const computed = Math.max(280, Math.min(sizeFromWidth, sizeFromHeight, 920));
      setMaxBoardSizePx(computed);
    };
    calculateBoardSize();
    window.addEventListener("resize", calculateBoardSize);
    return () => window.removeEventListener("resize", calculateBoardSize);
  }, []);

  const evaluateFen = useCallback((fen: string, depth = 10) => {
    return new Promise<{ evalCp: number; using: "stockfish" | "fallback" }>((resolve) => {
      const run = async () => {
        if (!aiWorkerRef.current) {
          resolve({ evalCp: 0, using: "fallback" });
          return;
        }
        await new Promise<void>((done) => {
          const timeout = window.setTimeout(() => {
            pendingEvalRef.current = null;
            resolve({ evalCp: 0, using: "fallback" });
            done();
          }, 5000);

          pendingEvalRef.current = (data) => {
            window.clearTimeout(timeout);
            pendingEvalRef.current = null;
            resolve({ evalCp: data.evalCp, using: data.using });
            done();
          };

          aiWorkerRef.current!.postMessage({ type: "evaluate", fen, depth });
        });
      };

      evalQueueRef.current = evalQueueRef.current.then(run).catch(run);
    });
  }, []);

  const handleLocalMove = useCallback((from: Square, to: Square, promotion?: string): boolean => {
    const gameCopy = new Chess(localGame.fen());
    try {
      const move = gameCopy.move({ from, to, promotion: promotion || undefined });
      if (move) {
        setLocalGame(gameCopy);
        setLastMove({ from, to });
        setLocalMoves((prev) => [...prev, { from, to, san: move.san, promotion: promotion ?? null }]);
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
    setLocalMoves([]);
    setLastMove(null);
    setShowCheckmateBanner(false);
    setShowPostGameReview(false);
    setLocalBottomColor("w");
    setLocalResult(null);
    setAnalysisItems([]);
    setEvalCp(0);
  };

  const game = isOnline && online.game ? online.game : localGame;
  const isInCheck = game.isCheck();
  const isGameOver = isOnline ? online.isGameOver : (game.isGameOver() || !!localResult);

  useEffect(() => {
    let cancelled = false;
    void evaluateFen(game.fen()).then((result) => {
      if (cancelled) return;
      setEvalCp(result.evalCp);
      setEngineBackend(result.using);
    });
    return () => {
      cancelled = true;
    };
  }, [evaluateFen, game]);

  useEffect(() => {
    if (!isComputerGame || isGameOver) return;
    if (game.turn() !== computerColor) return;

    const requestId = aiTurnRequestRef.current + 1;
    aiTurnRequestRef.current = requestId;
    let settled = false;
    const legalMoves = game.moves({ verbose: true });

    const fallbackMove = () => {
      if (settled || legalMoves.length === 0 || aiTurnRequestRef.current !== requestId) return;
      settled = true;
      const pick = legalMoves[Math.floor(Math.random() * legalMoves.length)];
      handleLocalMove(pick.from as Square, pick.to as Square, pick.promotion);
    };

    const hardDeadlineTimer = window.setTimeout(fallbackMove, 5000);
    const timer = window.setTimeout(() => {
      if (!aiWorkerRef.current) {
        fallbackMove();
        return;
      }
      const searchDepth = aiAccuracy >= 95 ? 8 : 6;
      pendingBestMoveRef.current = (data) => {
        if (settled || aiTurnRequestRef.current !== requestId) return;
        settled = true;
        window.clearTimeout(hardDeadlineTimer);
        setEvalCp(data.evalCp);
        setEngineBackend(data.using);
        if (data.move) {
          handleLocalMove(data.move.from as Square, data.move.to as Square, data.move.promotion);
          return;
        }
        fallbackMove();
      };
      aiWorkerRef.current.postMessage({
        type: "bestMove",
        fen: game.fen(),
        depth: searchDepth,
        aiAccuracy,
        computerColor,
      });
    }, 150);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(hardDeadlineTimer);
      settled = true;
      pendingBestMoveRef.current = null;
    };
  }, [aiAccuracy, computerColor, game, handleLocalMove, isComputerGame, isGameOver]);

  useEffect(() => {
    if (!isComputerGame || isGameOver) return;
    setAiAccuracy(Math.floor(Math.random() * 11) + 88);
  }, [game, isComputerGame, isGameOver]);

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

  const moveObjects = useMemo(() => {
    if (isOnline && online.gameData?.moves) {
      return (online.gameData.moves as Array<{ from: string; to: string; san: string; promotion?: string | null }>).map((m) => ({
        from: m.from,
        to: m.to,
        san: m.san,
        promotion: m.promotion ?? null,
      }));
    }
    return localMoves;
  }, [isOnline, online.gameData?.moves, localMoves]);

  useEffect(() => {
    if (!isGameOver || moveObjects.length === 0) return;
    let cancelled = false;

    const buildAnalysis = async () => {
      setAnalysisLoading(true);
      const analysis: MoveAnalysisItem[] = [];
      const replay = new Chess();

      for (let i = 0; i < moveObjects.length; i += 1) {
        const moverColor = replay.turn();
        const beforeEval = (await evaluateFen(replay.fen(), 10)).evalCp;
        replay.move({
          from: moveObjects[i].from,
          to: moveObjects[i].to,
          promotion: moveObjects[i].promotion ?? undefined,
        });
        const afterEval = (await evaluateFen(replay.fen(), 10)).evalCp;
        const moverPerspectiveBefore = moverColor === "w" ? beforeEval : -beforeEval;
        const moverPerspectiveAfter = moverColor === "w" ? afterEval : -afterEval;
        const loss = Math.max(0, moverPerspectiveBefore - moverPerspectiveAfter);
        let label: MoveAnalysisItem["label"] = "Best";
        if (loss >= 180) label = "Blunder";
        else if (loss >= 90) label = "Mistake";
        else if (loss >= 40) label = "Inaccuracy";

        analysis.push({
          ply: i + 1,
          san: moveObjects[i].san,
          evalBefore: beforeEval,
          evalAfter: afterEval,
          loss,
          label,
        });
      }

      if (!cancelled) {
        setAnalysisItems(analysis);
        setAnalysisLoading(false);
      }
    };

    void buildAnalysis();
    return () => {
      cancelled = true;
    };
  }, [evaluateFen, isGameOver, moveObjects]);

  const gameStatus = useMemo(() => {
    if (!isOnline && localResult?.type === "resignation") {
      if (isComputerGame) return "You resigned";
      return `${localResult.loserColor === "w" ? "White" : "Black"} resigned - ${localResult.winnerColor === "w" ? "White" : "Black"} wins`;
    }
    if (isOnline && online.gameData) {
      const rt = online.gameData.result_type;
      if (rt === "checkmate") {
        if (isSpectator) return "Checkmate";
        const won = online.gameData.winner_id === user?.id;
        return won ? "You win by checkmate!" : "You lost by checkmate";
      }
      if (rt === "resignation") {
        if (isSpectator) return "Game ended by resignation";
        const won = online.gameData.winner_id === user?.id;
        return won ? "Opponent resigned - You win!" : "You resigned";
      }
      if (rt === "stalemate") return "Stalemate - Draw";
      if (rt === "draw") return "Draw";
      if (rt === "in_progress") {
        return isSpectator ? `${game.turn() === "w" ? "White" : "Black"} to move` : (online.isMyTurn ? "Your turn" : "Opponent's turn");
      }
    }
    if (game.isCheckmate()) return `Checkmate! ${game.turn() === "w" ? "Black" : "White"} wins!`;
    if (game.isStalemate()) return "Stalemate - Draw";
    if (game.isDraw()) return "Draw";
    if (isInCheck) return `${game.turn() === "w" ? "White" : "Black"} is in check!`;
    return `${game.turn() === "w" ? "White" : "Black"} to move`;
  }, [game, isComputerGame, isInCheck, isOnline, isSpectator, localResult, online, user]);

  const resignLocalGame = () => {
    if (!window.confirm("Are you sure to resign?")) return;
    const loserColor: "w" | "b" = isComputerGame ? (computerColor === "w" ? "b" : "w") : game.turn();
    const winnerColor: "w" | "b" = loserColor === "w" ? "b" : "w";
    setLocalResult({ type: "resignation", winnerColor, loserColor });
    setShowCheckmateBanner(false);
    setShowPostGameReview(true);
  };

  const displayMoves = moveObjects.map((m) => m.san);
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
    if (moveObjects.length > 0) {
      const last = moveObjects[moveObjects.length - 1];
      return { from: last.from as Square, to: last.to as Square };
    }
    return lastMove;
  }, [moveObjects, lastMove]);

  const capturedPieces = useMemo(() => {
    const initialCounts: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const current = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };
    const pieceGlyph: Record<string, string> = {
      wp: PIECE_UNICODE.wp, wn: PIECE_UNICODE.wn, wb: PIECE_UNICODE.wb, wr: PIECE_UNICODE.wr, wq: PIECE_UNICODE.wq,
      bp: PIECE_UNICODE.bp, bn: PIECE_UNICODE.bn, bb: PIECE_UNICODE.bb, br: PIECE_UNICODE.br, bq: PIECE_UNICODE.bq,
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
    ? isSpectator
      ? `${online.blackPlayer?.username || "Black"} (${online.blackPlayer?.crown_score ?? 400})`
      : `${online.opponentName} (${(online.playerColor === "w" ? online.blackPlayer?.crown_score : online.whitePlayer?.crown_score) ?? 400})`
    : isComputerGame
      ? `${computerColor === "b" ? `AI (${aiElo})` : `You (${playerElo})`}`
      : localTopName;

  const bottomPlayerName = isOnline
    ? isSpectator
      ? `${online.whitePlayer?.username || "White"} (${online.whitePlayer?.crown_score ?? 400})`
      : `${online.playerName} (${(online.playerColor === "w" ? online.whitePlayer?.crown_score : online.blackPlayer?.crown_score) ?? 400})`
    : isComputerGame
      ? `${computerColor === "w" ? `AI (${aiElo})` : `You (${playerElo})`}`
      : localBottomName;

  const topAvatar = isOnline
    ? isSpectator
      ? online.blackPlayer?.avatar_url
      : (online.playerColor === "w" ? online.blackPlayer?.avatar_url : online.whitePlayer?.avatar_url)
    : null;
  const bottomAvatar = isOnline
    ? isSpectator
      ? online.whitePlayer?.avatar_url
      : (online.playerColor === "w" ? online.whitePlayer?.avatar_url : online.blackPlayer?.avatar_url)
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
      <div className="container mx-auto max-w-[1580px]">
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

            <div className={`w-full ${boardSizeClass} flex items-start justify-center gap-3`}>
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <ChessBoard
                  game={game}
                  onMove={isOnline ? handleOnlineMove : handleLocalMove}
                  flipped={flipped}
                  disabled={isOnline ? !online.isMyTurn || online.isGameOver || online.pendingMove : (!!localResult || (isComputerGame ? game.turn() === computerColor : false))}
                  lastMove={derivedLastMove}
                  sizeClassName={boardSizeClass}
                  maxBoardSizePx={maxBoardSizePx || undefined}
                  boardTheme={boardTheme}
                  pieceTheme={pieceTheme}
                />
              </motion.div>
              <div className="hidden sm:block">
                <EvaluationBar evalCp={evalCp} />
              </div>
            </div>

            {showCheckmateBanner && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/45 backdrop-blur-sm">
                <motion.div initial={{ y: 20 }} animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }} className="rounded-2xl border border-primary/50 bg-card/95 px-12 py-8 text-center">
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

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={`mt-4 flex items-center justify-between w-full ${boardSizeClass}`}>
              <div className={`flex items-center gap-2 text-sm font-display font-bold ${isInCheck ? "text-destructive" : "text-foreground"}`}>
                {isSpectator && <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">Spectating</span>}
                {isSpectator && nextLiveGameId && (
                  <button onClick={() => navigate(`/play?game=${nextLiveGameId}&spectate=true`)} className="rounded border border-border/70 bg-secondary/40 px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground">
                    Next Live
                  </button>
                )}
                {!isOnline && <div className={`w-3 h-3 rounded-full ${game.turn() === "w" ? "bg-white border border-border" : "bg-gray-900"}`} />}
                {(isOnline && online.pendingMove) && <LoaderCircle className="w-4 h-4 animate-spin text-primary" />}
                {gameStatus}
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-md border border-border/60 bg-secondary/40 px-2 py-1 text-[11px] text-muted-foreground">
                  Engine: {engineBackend ?? "starting"}
                </span>
                {!isGameOver && !isSpectator && (
                  <button
                    onClick={async () => {
                      if (isOnline) {
                        if (!window.confirm("Are you sure to resign?")) return;
                        setResignPending(true);
                        await online.resign();
                        setResignPending(false);
                        return;
                      }
                      resignLocalGame();
                    }}
                    disabled={isOnline && resignPending}
                    className="glass-card px-3 py-2 hover:border-destructive/30 transition-colors text-destructive disabled:opacity-60"
                    title="Resign"
                  >
                    {isOnline && resignPending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                  </button>
                )}
                {!isOnline && (
                  <button onClick={resetLocalGame} className="glass-card px-3 py-2 hover:border-primary/30 transition-colors" title="New Game">
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-3 space-y-4">
            <div className="glass-card p-5 border-glow space-y-3">
              <h3 className="font-display font-bold text-sm flex items-center gap-2">
                <Crown className="w-4 h-4 text-primary" />
                {isOnline ? `Live match: ${online.whitePlayer?.username || "White"} vs ${online.blackPlayer?.username || "Black"}` : "Local Game"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isOnline
                  ? isSpectator
                    ? "Spectating this live match in read-only mode."
                    : `You are playing as ${online.playerColor === "w" ? "White" : "Black"}.`
                  : isComputerGame
                    ? `You are ${computerColor === "w" ? "Black" : "White"}. Computer is ${computerColor === "w" ? "White" : "Black"}.`
                    : `Pass-and-play mode: ${localBottomColor === "w" ? "White" : "Black"} at the bottom.`}
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
              <p className="text-xs text-muted-foreground">Most recent move is highlighted on board.</p>
              {!isOnline && !isComputerGame && (
                <button onClick={() => setLocalBottomColor((prev) => (prev === "w" ? "b" : "w"))} className="mt-3 w-full border rounded-lg px-3 py-2 text-xs font-display font-bold">
                  Switch Seat (show {localBottomColor === "w" ? "Black" : "White"} at bottom)
                </button>
              )}
            </div>

            <div className="glass-card p-5">
              <h3 className="font-display font-bold text-sm mb-3">Move History</h3>
              <div className="max-h-64 overflow-y-auto space-y-1 text-sm font-mono">
                {movePairs.length === 0 && <p className="text-xs text-muted-foreground italic">No moves yet</p>}
                {movePairs.map((pair) => (
                  <div key={pair.num} className="flex items-center gap-2 py-0.5">
                    <span className="text-muted-foreground w-6 text-right text-xs">{pair.num}.</span>
                    <span className="w-16 text-foreground">{pair.white}</span>
                    <span className="w-16 text-foreground">{pair.black || ""}</span>
                  </div>
                ))}
              </div>
            </div>

            {isOnline && !isSpectator && user?.id && (
              <InGameChat
                gameId={onlineGameId!}
                userId={user.id}
                username={online.playerName || profile?.username || "Player"}
              />
            )}

            {isGameOver && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-5 border-glow gold-glow text-center">
                <Crown className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="font-display font-bold text-lg mb-3">{gameStatus}</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button onClick={isOnline ? () => navigate("/lobby") : resetLocalGame} className="bg-primary text-primary-foreground font-display font-bold text-xs tracking-wider px-6 py-2.5 rounded-lg gold-glow hover:scale-105 transition-transform">
                    {isOnline ? "BACK TO LOBBY" : "PLAY AGAIN"}
                  </button>
                </div>
              </motion.div>
            )}

            {isGameOver && showPostGameReview && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 border border-primary/30 space-y-3">
                <p className="font-display font-bold text-sm">Analysis Mode</p>
                {analysisLoading ? (
                  <p className="text-xs text-muted-foreground">Running engine analysis...</p>
                ) : (
                  <AnalysisPanel items={analysisItems} />
                )}
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => navigate("/dashboard?section=history")} className="bg-primary/15 text-primary text-xs font-display font-bold px-3 py-2 rounded-md">FULL REVIEW</button>
                  <button onClick={() => navigate("/lobby")} className="bg-secondary text-xs font-display font-bold px-3 py-2 rounded-md">BACK TO LOBBY</button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Play;
