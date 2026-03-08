import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Chess, Square } from "chess.js";
import { motion } from "framer-motion";
<<<<<<< HEAD
<<<<<<< HEAD
import { Crown, RotateCcw, Flag, Wifi, WifiOff, LoaderCircle, Swords } from "lucide-react";
=======
import { Crown, RotateCcw, Flag, Wifi, WifiOff, LoaderCircle, Swords, Shield, Volume2, VolumeX, ArrowUpRight, ArrowUpRightIcon, Monitor, Shuffle } from "lucide-react";
=======
import { Crown, RotateCcw, Flag, Wifi, WifiOff, LoaderCircle, Swords, Shield, Volume2, VolumeX, ArrowUpRight, ArrowUpRightIcon, Monitor, Shuffle, Handshake, XCircle, Undo2 } from "lucide-react";
import { ResignConfirmDialog, GameOverPopup, type RematchState } from "@/components/chess/ResignDialog";
import { supabase } from "@/integrations/supabase/client";
>>>>>>> 6124c122ca56d8d3ef82a2f3bf8390aac2ea3aad
import { generateChess960Fen } from "@/utils/chess960";
>>>>>>> d3c51e24423dfa38cc6a6faefc281915d357437d
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useOnlineGame } from "@/hooks/useOnlineGame";
import { supabase } from "@/integrations/supabase/client";
import ChessBoard from "@/components/chess/ChessBoard";
<<<<<<< HEAD
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
=======
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
>>>>>>> d3c51e24423dfa38cc6a6faefc281915d357437d

type AIDifficulty = "beginner" | "intermediate" | "advanced";

interface AILevelConfig { depth: number; thinkMs: [number, number]; useStockfish: boolean; topN: number; noiseCP: number }

const AI_CONFIG: Record<AIDifficulty, AILevelConfig> = {
  beginner:     { depth: 2,  thinkMs: [300, 800],  useStockfish: false, topN: 5, noiseCP: 200 },
  intermediate: { depth: 12, thinkMs: [500, 1400], useStockfish: true,  topN: 3, noiseCP: 60 },
  advanced:     { depth: 18, thinkMs: [700, 2000], useStockfish: true,  topN: 2, noiseCP: 15 },
};

const STREAK_KEY = "chess_ai_streak"; // positive = player winning streak, negative = losing streak

function getAdaptiveConfig(base: AILevelConfig, streak: number): AILevelConfig {
  const clampedStreak = Math.max(-5, Math.min(5, streak));
  const depthAdj = Math.round(clampedStreak * 1);
  const noiseAdj = clampedStreak * -8; // win streak → less noise; lose streak → more noise

  return {
    ...base,
    depth: Math.max(1, Math.min(22, base.depth + depthAdj)),
    noiseCP: Math.max(5, Math.min(300, base.noiseCP + noiseAdj)),
  };
}

function loadStreak(): number {
  try { return parseInt(localStorage.getItem(STREAK_KEY) || "0") || 0; } catch { return 0; }
}

function saveStreak(streak: number) {
  try { localStorage.setItem(STREAK_KEY, String(streak)); } catch {}
}

const Play = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const onlineGameId = searchParams.get("game");
  const mode = searchParams.get("mode");
<<<<<<< HEAD

  const playerElo = profile?.crown_score || 400;
  const aiElo = playerElo + 20;

  const [localGame, setLocalGame] = useState(new Chess());
  const [localMoves, setLocalMoves] = useState<LocalMove[]>([]);
=======
  const isRankedAI = searchParams.get("ranked") === "true";
  const variant = searchParams.get("variant");
  const isChess960 = variant === "chess960";
  const difficulty = (searchParams.get("difficulty") as AIDifficulty) || "intermediate";
  const [aiStreak, setAiStreak] = useState(loadStreak);
  const aiConfig = useMemo(() => getAdaptiveConfig(AI_CONFIG[difficulty] || AI_CONFIG.intermediate, aiStreak), [difficulty, aiStreak]);
  const { profile } = useAuth();
  const playerElo = profile?.crown_score || 400;

  const [chess960Fen] = useState(() => isChess960 ? generateChess960Fen() : null);
  const [localGame, setLocalGame] = useState(() => new Chess(chess960Fen || undefined));
>>>>>>> d3c51e24423dfa38cc6a6faefc281915d357437d
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [syncAgo, setSyncAgo] = useState("just now");
  const [resignPending, setResignPending] = useState(false);
  const [showResignDialog, setShowResignDialog] = useState(false);
  const [showGameOverPopup, setShowGameOverPopup] = useState(false);
  const [computerColor] = useState<"w" | "b">(() => (Math.random() > 0.5 ? "w" : "b"));
  const [maxBoardSizePx, setMaxBoardSizePx] = useState<number | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [aiThinkProgress, setAiThinkProgress] = useState(0);
  const aiThinkTimerRef = useRef<number | null>(null);
  const [showCheckmateBanner, setShowCheckmateBanner] = useState(false);
  const [showPostGameReview, setShowPostGameReview] = useState(false);
  const [showEngineReview, setShowEngineReview] = useState(false);
  const [showAICoach, setShowAICoach] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [engineArrows] = useState<Array<{ from: string; to: string; color?: string }>>([]);
  const [localBottomColor, setLocalBottomColor] = useState<"w" | "b">("w");
<<<<<<< HEAD
  const [localResult, setLocalResult] = useState<{ type: "resignation"; winnerColor: "w" | "b"; loserColor: "w" | "b" } | null>(null);
  const [nextLiveGameId, setNextLiveGameId] = useState<string | null>(null);
  const [evalCp, setEvalCp] = useState<number | null>(0);
  const [engineBackend, setEngineBackend] = useState<"stockfish" | "fallback" | null>(null);
  const [analysisItems, setAnalysisItems] = useState<MoveAnalysisItem[]>([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisSource, setAnalysisSource] = useState<"local" | "server" | null>(null);
  const [boardTheme, setBoardTheme] = useState<BoardTheme>("wood");
  const [pieceTheme, setPieceTheme] = useState<PieceTheme>("neo");
  const analysisEnqueuedRef = useRef<string | null>(null);
  const analysisSourceRef = useRef<"local" | "server" | null>(null);

  const aiWorkerRef = useRef<Worker | null>(null);
  const aiTurnRequestRef = useRef(0);
  const pendingBestMoveRef = useRef<((data: EngineBestMoveResponse) => void) | null>(null);
  const pendingEvalRef = useRef<((data: EngineEvalResponse) => void) | null>(null);
  const evalQueueRef = useRef(Promise.resolve());
=======
  const [streamerMode, setStreamerMode] = useState(false);
  const [timeControl, setTimeControl] = useState<TimeControl | null>(() => {
    const tc = searchParams.get("tc");
    return tc ? TIME_CONTROLS.find((t) => t.label === tc) || null : null;
  });
  const [clockGameOver, setClockGameOver] = useState(false);
  const [onlineClockWhiteMs, setOnlineClockWhiteMs] = useState<number | null>(null);
  const [onlineClockBlackMs, setOnlineClockBlackMs] = useState<number | null>(null);
  const prevMoveCountRef = useRef(0);
<<<<<<< HEAD
>>>>>>> d3c51e24423dfa38cc6a6faefc281915d357437d
=======
  const [rematchState, setRematchState] = useState<RematchState>("idle");
  const rematchChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [drawOfferState, setDrawOfferState] = useState<"idle" | "sent" | "received">("idle");
  const [takebackState, setTakebackState] = useState<"idle" | "sent" | "received">("idle");
>>>>>>> 6124c122ca56d8d3ef82a2f3bf8390aac2ea3aad

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
<<<<<<< HEAD
    setLocalGame(new Chess());
    setLocalMoves([]);
=======
    const newFen = isChess960 ? generateChess960Fen() : undefined;
    setLocalGame(new Chess(newFen));
>>>>>>> d3c51e24423dfa38cc6a6faefc281915d357437d
    setLastMove(null);
    setShowCheckmateBanner(false);
    setShowPostGameReview(false);
    setLocalBottomColor("w");
<<<<<<< HEAD
    setLocalResult(null);
    setAnalysisItems([]);
    analysisSourceRef.current = null;
    setAnalysisSource(null);
    setEvalCp(0);
=======
    setClockGameOver(false);
<<<<<<< HEAD
>>>>>>> d3c51e24423dfa38cc6a6faefc281915d357437d
=======
    streakUpdatedRef.current = false;
>>>>>>> 6124c122ca56d8d3ef82a2f3bf8390aac2ea3aad
  };

  const handleTimeUp = useCallback((side: "w" | "b") => {
    setClockGameOver(true);
    soundManager.play("gameEnd");
  }, []);

  const game = isOnline && online.game ? online.game : localGame;
  const isInCheck = game.isCheck();
<<<<<<< HEAD
<<<<<<< HEAD
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
=======
  const isGameOver = isOnline ? online.isGameOver : (game.isGameOver() || clockGameOver);
>>>>>>> d3c51e24423dfa38cc6a6faefc281915d357437d
=======
  const isGameOver = isOnline ? (online.isGameOver || clockGameOver) : (game.isGameOver() || clockGameOver || resignPending);
>>>>>>> 6124c122ca56d8d3ef82a2f3bf8390aac2ea3aad

  // Show game over popup when online game ends
  useEffect(() => {
    if (isOnline && online.isGameOver) {
      const timer = setTimeout(() => setShowGameOverPopup(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, online.isGameOver]);

  // AI move logic — uses Stockfish for intermediate/advanced, minimax fallback for beginner
  useEffect(() => {
    if (!isComputerGame || isGameOver) return;
    if (game.turn() !== computerColor) return;

<<<<<<< HEAD
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
=======
    let cancelled = false;
    setAiThinking(true);
    setAiThinkProgress(0);

    const thinkDelay = aiConfig.thinkMs[0] + Math.random() * (aiConfig.thinkMs[1] - aiConfig.thinkMs[0]);

    // Animate progress bar during think time
    const startTime = performance.now();
    const progressInterval = window.setInterval(() => {
      const elapsed = performance.now() - startTime;
      const pct = Math.min(95, (elapsed / thinkDelay) * 90); // Cap at 95% until move is made
      setAiThinkProgress(pct);
    }, 50);
    aiThinkTimerRef.current = progressInterval;

    const pickWeighted = (candidates: Array<{ move: any; score: number }>) => {
      // Add controlled noise and pick weighted by score
      const noised = candidates.map(c => ({
        ...c,
        noisyScore: c.score + (Math.random() - 0.5) * aiConfig.noiseCP,
      }));
      noised.sort((a, b) => b.noisyScore - a.noisyScore);
      // Always pick from topN candidates to maintain realism
      const pool = noised.slice(0, Math.min(aiConfig.topN, noised.length));
      // Weight towards best: exponential decay
      const weights = pool.map((_, i) => Math.exp(-i * 0.8));
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      let r = Math.random() * totalWeight;
      for (let i = 0; i < pool.length; i++) {
        r -= weights[i];
        if (r <= 0) return pool[i].move;
      }
      return pool[0].move;
    };

    const makeAIMove = async () => {
      const moves = game.moves({ verbose: true });
      if (moves.length === 0) return;

      if (aiConfig.useStockfish) {
        try {
          // Evaluate top N moves by trying each and getting Stockfish eval
          const startTime = performance.now();
          const evaluations = await Promise.all(
            moves.map(async (candidate) => {
              const sim = new Chess(game.fen());
              sim.move({ from: candidate.from, to: candidate.to, promotion: candidate.promotion });
              const ev = await stockfish.evaluate(sim.fen(), Math.max(6, aiConfig.depth - 4));
              // Negate because eval is from opponent's perspective after our move
              return { move: candidate, score: -ev.score };
            })
          );

          const elapsed = performance.now() - startTime;
          const remaining = Math.max(0, thinkDelay - elapsed);
          await new Promise(r => setTimeout(r, remaining));
          if (cancelled) return;
>>>>>>> 6124c122ca56d8d3ef82a2f3bf8390aac2ea3aad

          evaluations.sort((a, b) => b.score - a.score);
          const pick = pickWeighted(evaluations);
          handleLocalMove(pick.from as Square, pick.to as Square, pick.promotion);
        } catch {
          // Fallback: pick a reasonable move
          await new Promise(r => setTimeout(r, thinkDelay));
          if (cancelled) return;
          const captures = moves.filter(m => m.captured);
          const pick = captures.length > 0 ? captures[Math.floor(Math.random() * captures.length)] : moves[Math.floor(Math.random() * moves.length)];
          handleLocalMove(pick.from as Square, pick.to as Square, pick.promotion);
        }
      } else {
        // Beginner: use minimax with low depth
        await new Promise(r => setTimeout(r, thinkDelay));
        if (cancelled) return;

        const evaluated = moves.map((candidate) => {
          const simulated = new Chess(game.fen());
          simulated.move({ from: candidate.from, to: candidate.to, promotion: candidate.promotion });
          return {
            move: candidate,
            score: searchBestMove(simulated, aiConfig.depth, -Infinity, Infinity, false),
          };
        }).sort((a, b) => b.score - a.score);

        const pick = pickWeighted(evaluated);
        handleLocalMove(pick.from as Square, pick.to as Square, pick.promotion);
      }

      if (aiThinkTimerRef.current) clearInterval(aiThinkTimerRef.current);
      setAiThinkProgress(100);
      setTimeout(() => {
        setAiThinking(false);
        setAiThinkProgress(0);
      }, 150);
    };

    makeAIMove();
    return () => {
      cancelled = true;
      if (aiThinkTimerRef.current) clearInterval(aiThinkTimerRef.current);
    };
  }, [computerColor, game, handleLocalMove, isComputerGame, isGameOver, searchBestMove, aiConfig]);

<<<<<<< HEAD
  useEffect(() => {
    if (!isOnline || !online.gameData?.id || !isGameOver || !user?.id) return;
    if (analysisEnqueuedRef.current === online.gameData.id) return;
    analysisEnqueuedRef.current = online.gameData.id;

    const rpc = supabase as unknown as {
      rpc: (name: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    };

    void rpc.rpc("enqueue_game_analysis", {
      target_game: online.gameData.id,
      p_priority: 80,
    });
  }, [isGameOver, isOnline, online.gameData?.id, user?.id]);
=======
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

  // Rematch broadcast channel for online games
  useEffect(() => {
    if (!isOnline || !onlineGameId || !user) return;

    const channel = supabase.channel(`rematch-${onlineGameId}`)
      .on("broadcast", { event: "rematch_offer" }, ({ payload }) => {
        if (payload.from !== user.id) {
          setRematchState("offered");
        }
      })
      .on("broadcast", { event: "rematch_accept" }, ({ payload }) => {
        if (payload.gameId) {
          navigate(`/play?game=${payload.gameId}`, { replace: true });
        }
      })
      .on("broadcast", { event: "rematch_decline" }, ({ payload }) => {
        if (payload.from !== user.id) {
          setRematchState("declined");
        }
      })
      .on("broadcast", { event: "draw_offer" }, ({ payload }) => {
        if (payload.from !== user.id) {
          setDrawOfferState("received");
        }
      })
      .on("broadcast", { event: "draw_accept" }, ({ payload }) => {
        if (payload.from !== user.id) {
          // Opponent accepted — game will update via realtime subscription
          setDrawOfferState("idle");
        }
      })
      .on("broadcast", { event: "draw_decline" }, ({ payload }) => {
        if (payload.from !== user.id) {
          setDrawOfferState("idle");
        }
      })
      .on("broadcast", { event: "takeback_request" }, ({ payload }) => {
        if (payload.from !== user.id) {
          setTakebackState("received");
        }
      })
      .on("broadcast", { event: "takeback_accept" }, ({ payload }) => {
        if (payload.from !== user.id) {
          setTakebackState("idle");
        }
      })
      .on("broadcast", { event: "takeback_decline" }, ({ payload }) => {
        if (payload.from !== user.id) {
          setTakebackState("idle");
        }
      })
      .subscribe();

    rematchChannelRef.current = channel;
    return () => {
      rematchChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [onlineGameId, isOnline, user, navigate]);

  const handleOfferRematch = useCallback(async () => {
    if (!rematchChannelRef.current || !user) return;
    setRematchState("waiting");
    await rematchChannelRef.current.send({
      type: "broadcast",
      event: "rematch_offer",
      payload: { from: user.id },
    });
  }, [user]);

  const handleAcceptRematch = useCallback(async () => {
    if (!online.gameData || !user || !rematchChannelRef.current) return;
    // Swap colors
    const oldWhite = online.gameData.player_white;
    const oldBlack = online.gameData.player_black;
    const newWhite = oldBlack;
    const newBlack = oldWhite;

    const { data: newGame, error } = await supabase
      .from("games")
      .insert({
        player1_id: newWhite,
        player2_id: newBlack,
        player_white: newWhite,
        player_black: newBlack,
        game_mode: "private",
        result_type: "in_progress",
        current_fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        moves: [],
      })
      .select()
      .single();

    if (error || !newGame) return;

    // Notify opponent of new game
    await rematchChannelRef.current.send({
      type: "broadcast",
      event: "rematch_accept",
      payload: { gameId: newGame.id },
    });

    // Navigate self
    navigate(`/play?game=${newGame.id}`, { replace: true });
  }, [online.gameData, user, navigate]);

  const handleDeclineRematch = useCallback(async () => {
    if (!rematchChannelRef.current || !user) return;
    setRematchState("idle");
    await rematchChannelRef.current.send({
      type: "broadcast",
      event: "rematch_decline",
      payload: { from: user.id },
    });
  }, [user]);

  const handleOfferDraw = useCallback(async () => {
    if (!rematchChannelRef.current || !user) return;
    setDrawOfferState("sent");
    await rematchChannelRef.current.send({
      type: "broadcast",
      event: "draw_offer",
      payload: { from: user.id },
    });
  }, [user]);

  const handleAcceptDraw = useCallback(async () => {
    if (!rematchChannelRef.current || !user) return;
    setDrawOfferState("idle");
    await rematchChannelRef.current.send({
      type: "broadcast",
      event: "draw_accept",
      payload: { from: user.id },
    });
    await online.acceptDraw();
  }, [user, online]);

  const handleDeclineDraw = useCallback(async () => {
    if (!rematchChannelRef.current || !user) return;
    setDrawOfferState("idle");
    await rematchChannelRef.current.send({
      type: "broadcast",
      event: "draw_decline",
      payload: { from: user.id },
    });
  }, [user]);

  const handleRequestTakeback = useCallback(async () => {
    if (!rematchChannelRef.current || !user) return;
    setTakebackState("sent");
    await rematchChannelRef.current.send({
      type: "broadcast",
      event: "takeback_request",
      payload: { from: user.id },
    });
  }, [user]);

  const handleAcceptTakeback = useCallback(async () => {
    if (!rematchChannelRef.current || !user) return;
    setTakebackState("idle");
    await rematchChannelRef.current.send({
      type: "broadcast",
      event: "takeback_accept",
      payload: { from: user.id },
    });
    await online.performTakeback();
  }, [user, online]);

  const handleDeclineTakeback = useCallback(async () => {
    if (!rematchChannelRef.current || !user) return;
    setTakebackState("idle");
    await rematchChannelRef.current.send({
      type: "broadcast",
      event: "takeback_decline",
      payload: { from: user.id },
    });
  }, [user]);

  const streakUpdatedRef = useRef(false);
  useEffect(() => {
    if (!isComputerGame || streakUpdatedRef.current) return;
    const gameOver = game.isGameOver() || clockGameOver || resignPending;
    if (!gameOver) return;

    streakUpdatedRef.current = true;
    let newStreak = aiStreak;

    if (game.isCheckmate()) {
      // The side whose turn it is lost
      const playerLost = game.turn() !== computerColor;
      newStreak = playerLost ? Math.min(aiStreak - 1, -1) : Math.max(aiStreak + 1, 1);
    } else if (clockGameOver) {
      const playerLostOnTime = game.turn() !== computerColor;
      newStreak = playerLostOnTime ? Math.min(aiStreak - 1, -1) : Math.max(aiStreak + 1, 1);
    } else if (resignPending) {
      newStreak = Math.min(aiStreak - 1, -1); // player resigned = loss
    } else {
      // Draw resets streak toward 0
      newStreak = aiStreak > 0 ? aiStreak - 1 : aiStreak < 0 ? aiStreak + 1 : 0;
    }
<<<<<<< HEAD
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
>>>>>>> d3c51e24423dfa38cc6a6faefc281915d357437d
=======

    setAiStreak(newStreak);
    saveStreak(newStreak);
  }, [game, clockGameOver, resignPending, isComputerGame, computerColor, aiStreak]);
>>>>>>> 6124c122ca56d8d3ef82a2f3bf8390aac2ea3aad

  useEffect(() => {
    if (!game.isCheckmate() && !clockGameOver) {
      setShowCheckmateBanner(false);
      setShowPostGameReview(false);
      setShowGameOverPopup(false);
      return;
    }
    setShowCheckmateBanner(true);
    const timer = window.setTimeout(() => {
      setShowCheckmateBanner(false);
      setShowPostGameReview(true);
<<<<<<< HEAD
    }, 5000);
=======
      setShowGameOverPopup(true);
    }, 3000);

>>>>>>> 6124c122ca56d8d3ef82a2f3bf8390aac2ea3aad
    return () => window.clearTimeout(timer);
  }, [game, clockGameOver]);

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
    if (isGameOver) return;
    analysisSourceRef.current = null;
    setAnalysisSource(null);
    setAnalysisItems([]);
    setAnalysisLoading(false);
  }, [isGameOver, onlineGameId]);

  const loadServerAnalysis = useCallback(async () => {
    if (!isOnline || !online.gameData?.id || moveObjects.length === 0) return false;

    const { data } = await supabase
      .from("game_engine_analysis")
      .select("ply, eval_cp_before, eval_cp_after, cpl, tags")
      .eq("game_id", online.gameData.id)
      .order("ply", { ascending: true });

    if (!data || data.length === 0) return false;

    const mapped: MoveAnalysisItem[] = data.map((row) => {
      const tag = Array.isArray(row.tags) ? row.tags[0] : null;
      const label: MoveAnalysisItem["label"] = tag === "blunder"
        ? "Blunder"
        : tag === "mistake"
          ? "Mistake"
          : tag === "inaccuracy"
            ? "Inaccuracy"
            : "Best";

      return {
        ply: row.ply,
        san: moveObjects[row.ply - 1]?.san || `Ply ${row.ply}`,
        evalBefore: row.eval_cp_before ?? 0,
        evalAfter: row.eval_cp_after ?? 0,
        loss: row.cpl ?? 0,
        label,
      };
    });

    analysisSourceRef.current = "server";
    setAnalysisItems(mapped);
    setAnalysisLoading(false);
    setAnalysisSource("server");
    return true;
  }, [isOnline, moveObjects, online.gameData?.id]);

  useEffect(() => {
    if (!isOnline || !isGameOver || !online.gameData?.id || moveObjects.length === 0) return;

    let cancelled = false;
    let timeoutId: number | null = null;
    let attempts = 0;

    const poll = async () => {
      const found = await loadServerAnalysis();
      if (cancelled || found) return;
      attempts += 1;
      if (attempts >= 8) return;
      timeoutId = window.setTimeout(() => {
        void poll();
      }, 4000);
    };

    void poll();
    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [isGameOver, isOnline, loadServerAnalysis, moveObjects.length, online.gameData?.id]);

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

      if (!cancelled && analysisSourceRef.current !== "server") {
        setAnalysisItems(analysis);
        setAnalysisLoading(false);
        analysisSourceRef.current = analysisSourceRef.current ?? "local";
        setAnalysisSource((prev) => prev ?? "local");
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
      if (rt === "timeout") {
<<<<<<< HEAD
        if (isSpectator) return "Game ended on time";
        const won = online.gameData.winner_id === user?.id;
        return won ? "You win on time!" : "You lost on time";
      }
      if (rt === "stalemate") return "Stalemate - Draw";
      if (rt === "draw") return "Draw";
      if (rt === "in_progress") {
        return isSpectator ? `${game.turn() === "w" ? "White" : "Black"} to move` : (online.isMyTurn ? "Your turn" : "Opponent's turn");
=======
        const won = online.gameData.winner_id === user?.id;
        return won ? "Opponent ran out of time — You win!" : "You ran out of time";
      }
      if (rt === "stalemate") return "Stalemate — Draw";
      if (rt === "draw") return "Draw by agreement";
      if (rt === "aborted") return "Game aborted";
      if (rt === "in_progress") {
        if (clockGameOver) {
          const timedOutSide = (onlineClockWhiteMs ?? 1) <= 0 ? "w" : "b";
          const won = (online.playerColor === "w" && timedOutSide === "b") || (online.playerColor === "b" && timedOutSide === "w");
          return won ? "Opponent ran out of time — You win!" : "You ran out of time";
        }
        return online.isMyTurn ? "Your turn" : "Opponent's turn";
>>>>>>> 6124c122ca56d8d3ef82a2f3bf8390aac2ea3aad
      }
    }
    if (clockGameOver) return `Time's up! ${game.turn() === "w" ? "Black" : "White"} wins on time!`;
    if (game.isCheckmate()) return `Checkmate! ${game.turn() === "w" ? "Black" : "White"} wins!`;
    if (game.isStalemate()) return "Stalemate - Draw";
    if (game.isDraw()) return "Draw";
    if (isInCheck) return `${game.turn() === "w" ? "White" : "Black"} is in check!`;
    if (isComputerGame && aiThinking) return "AI is thinking…";
    return `${game.turn() === "w" ? "White" : "Black"} to move`;
<<<<<<< HEAD
<<<<<<< HEAD
  }, [game, isComputerGame, isInCheck, isOnline, isSpectator, localResult, online, user]);
=======
  }, [game, isInCheck, isOnline, online, user, clockGameOver]);
>>>>>>> d3c51e24423dfa38cc6a6faefc281915d357437d
=======
  }, [game, isInCheck, isOnline, online, user, clockGameOver, onlineClockWhiteMs, onlineClockBlackMs]);
>>>>>>> 6124c122ca56d8d3ef82a2f3bf8390aac2ea3aad

  const resignLocalGame = () => {
    if (!window.confirm("Are you sure to resign?")) return;
    const loserColor: "w" | "b" = isComputerGame ? (computerColor === "w" ? "b" : "w") : game.turn();
    const winnerColor: "w" | "b" = loserColor === "w" ? "b" : "w";
    setLocalResult({ type: "resignation", winnerColor, loserColor });
    setShowCheckmateBanner(false);
    setShowPostGameReview(true);
  };

<<<<<<< HEAD
<<<<<<< HEAD
  const displayMoves = moveObjects.map((m) => m.san);
=======
=======
  // For online games, derive timeControl from game data
  const effectiveTimeControl = useMemo(() => {
    if (isOnline && online.gameData) {
      const gd = online.gameData as any;
      if (gd.duration_seconds) {
        const inc = gd.increment_seconds ?? 0;
        const match = TIME_CONTROLS.find(
          (t) => t.initialSeconds === gd.duration_seconds && t.incrementSeconds === inc
        );
        return match || {
          label: `${gd.duration_seconds / 60}+${inc}`,
          category: "rapid" as const,
          initialSeconds: gd.duration_seconds,
          incrementSeconds: inc,
        };
      }
      return null;
    }
    return timeControl;
  }, [isOnline, online.gameData, timeControl]);

  // Synced online clock: count down locally from DB-authoritative values
  useEffect(() => {
    if (!isOnline || !online.gameData) return;
    const gd = online.gameData as any;
    if (gd.white_time_ms == null || gd.black_time_ms == null) return;

    // Set base times from DB
    setOnlineClockWhiteMs(gd.white_time_ms);
    setOnlineClockBlackMs(gd.black_time_ms);
  }, [isOnline, online.gameData?.white_time_ms, online.gameData?.black_time_ms]);

  // Local countdown for online clock
  useEffect(() => {
    if (!isOnline || !online.gameData || isGameOver) return;
    const gd = online.gameData as any;
    if (gd.white_time_ms == null || gd.black_time_ms == null || !gd.last_move_at) return;

    const activeTurn = game.turn();
    const lastMoveTime = new Date(gd.last_move_at).getTime();

    const opponentColor = online.playerColor === "w" ? "b" : "w";
    let claimed = false;

    const tick = () => {
      const elapsed = Date.now() - lastMoveTime;
      if (activeTurn === "w") {
        const remaining = Math.max(0, gd.white_time_ms - elapsed);
        setOnlineClockWhiteMs(remaining);
        if (remaining <= 0) {
          setClockGameOver(true);
          soundManager.play("gameEnd");
          if (!claimed && activeTurn === opponentColor) {
            claimed = true;
            online.claimTimeout();
          }
          return;
        }
      } else {
        const remaining = Math.max(0, gd.black_time_ms - elapsed);
        setOnlineClockBlackMs(remaining);
        if (remaining <= 0) {
          setClockGameOver(true);
          soundManager.play("gameEnd");
          if (!claimed && activeTurn === opponentColor) {
            claimed = true;
            online.claimTimeout();
          }
          return;
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    let rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isOnline, online.gameData?.white_time_ms, online.gameData?.black_time_ms, online.gameData?.last_move_at, game, isGameOver]);

>>>>>>> 6124c122ca56d8d3ef82a2f3bf8390aac2ea3aad
  const clockActiveSide = (game.isGameOver() || clockGameOver) ? null : game.turn();
  const { whiteMs: localWhiteMs, blackMs: localBlackMs } = useChessClock(
    isOnline ? null : timeControl, // Only use local clock for non-online games
    clockActiveSide,
    displayMoves.length > 0,
    isGameOver,
    handleTimeUp,
  );

<<<<<<< HEAD
>>>>>>> d3c51e24423dfa38cc6a6faefc281915d357437d
=======
  // Use synced clock for online, local clock otherwise
  const whiteMs = isOnline ? (onlineClockWhiteMs ?? 0) : localWhiteMs;
  const blackMs = isOnline ? (onlineClockBlackMs ?? 0) : localBlackMs;
  const showClock = isOnline ? !!effectiveTimeControl : !!timeControl;

>>>>>>> 6124c122ca56d8d3ef82a2f3bf8390aac2ea3aad
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

  const diffLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  const topPlayerName = isOnline
    ? isSpectator
      ? `${online.blackPlayer?.username || "Black"} (${online.blackPlayer?.crown_score ?? 400})`
      : `${online.opponentName} (${(online.playerColor === "w" ? online.blackPlayer?.crown_score : online.whitePlayer?.crown_score) ?? 400})`
    : isComputerGame
      ? `${computerColor === "b" ? `${diffLabel} AI` : `You (${playerElo})`}`
      : localTopName;

  const bottomPlayerName = isOnline
    ? isSpectator
      ? `${online.whitePlayer?.username || "White"} (${online.whitePlayer?.crown_score ?? 400})`
      : `${online.playerName} (${(online.playerColor === "w" ? online.whitePlayer?.crown_score : online.blackPlayer?.crown_score) ?? 400})`
    : isComputerGame
      ? `${computerColor === "w" ? `${diffLabel} AI` : `You (${playerElo})`}`
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

  const topTitle = isOnline
    ? (online.playerColor === "w" ? online.blackPlayer?.equippedTitle : online.whitePlayer?.equippedTitle)
    : null;
  const bottomTitle = isOnline
    ? (online.playerColor === "w" ? online.whitePlayer?.equippedTitle : online.blackPlayer?.equippedTitle)
    : null;

  const PlayerLabel = ({ name, avatarUrl, title, isTop }: { name: string; avatarUrl?: string | null; title?: { name: string; icon: string } | null; isTop?: boolean }) => (
    <div className="flex items-center gap-2.5 min-w-0">
      <Avatar className="w-8 h-8 sm:w-9 sm:h-9 border-2 border-border/40 shrink-0 shadow-sm">
        <AvatarImage src={avatarUrl || undefined} alt={name} />
        <AvatarFallback className="text-[10px] bg-gradient-to-br from-secondary to-secondary/60 font-display font-bold">{name.slice(0, 1).toUpperCase()}</AvatarFallback>
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

  const formatClock = (ms: number | null) => {
    if (ms === null) return "--:--";
    const total = Math.max(0, Math.floor(ms / 1000));
    const mm = Math.floor(total / 60);
    const ss = total % 60;
    return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  };

  const topClock = isOnline
    ? (isSpectator
      ? formatClock(online.clock.black)
      : formatClock(online.playerColor === "w" ? online.clock.black : online.clock.white))
    : null;
  const bottomClock = isOnline
    ? (isSpectator
      ? formatClock(online.clock.white)
      : formatClock(online.playerColor === "w" ? online.clock.white : online.clock.black))
    : null;

  const timeControlLabel = useMemo(() => {
    if (!isOnline || !online.gameData) {
      return isComputerGame ? "Adaptive AI" : "Local board";
    }

    const base = online.gameData.duration_seconds
      ? `${Math.round(online.gameData.duration_seconds / 60)}m`
      : "No clock";

    if (online.gameData.time_control_mode === "fischer" && online.gameData.increment_ms > 0) {
      return `${base} + ${Math.round(online.gameData.increment_ms / 1000)}s`;
    }
    if (online.gameData.time_control_mode === "delay" && online.gameData.delay_ms > 0) {
      return `${base} delay ${Math.round(online.gameData.delay_ms / 1000)}s`;
    }
    if (online.gameData.time_control_mode === "bronstein" && online.gameData.delay_ms > 0) {
      return `${base} bronstein ${Math.round(online.gameData.delay_ms / 1000)}s`;
    }
    return base;
  }, [isComputerGame, isOnline, online.gameData]);

  if (isOnline && online.loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-20">
        <div className="glass-card p-8 flex flex-col items-center gap-3 gold-glow">
          <Crown className="w-12 h-12 text-primary animate-pulse" />
          <p className="text-sm text-muted-foreground font-display">Loading match…</p>
        </div>
      </div>
    );
  }

  return (
<<<<<<< HEAD
<<<<<<< HEAD
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-[1580px]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-9 flex flex-col items-center">
            <div className={`w-full ${boardSizeClass} mb-3 rounded-lg border border-border/60 bg-secondary/20 px-4 py-2`}>
              <div className="flex items-center justify-between text-sm">
                <PlayerLabel name={topPlayerName} avatarUrl={topAvatar} />
                <div className="flex items-center gap-3">
                  {isOnline && <span className="rounded border border-border/70 bg-background/60 px-2 py-1 text-xs font-mono">{topClock}</span>}
                  <div className="flex gap-1 text-lg" title="Pieces captured by this side">
                  {capturedPieces.capturedByBlack.length === 0
                    ? <span className="text-xs text-muted-foreground">No captures</span>
                    : capturedPieces.capturedByBlack.map((piece, index) => <span key={`cap-black-${index}`}>{piece}</span>)}
                  </div>
=======
    <div className="min-h-screen bg-background pt-16 sm:pt-20 pb-16 lg:pb-12 px-2 sm:px-4">
      <div className="container mx-auto max-w-[1500px]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-6">
          <div className="lg:col-span-9 flex flex-col items-center">
            {/* Top player bar */}
            <div className={`w-full ${boardSizeClass} mb-1.5 sm:mb-3 rounded-lg border border-border/60 bg-secondary/20 px-2 sm:px-4 py-1.5 sm:py-2`}>
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <PlayerLabel name={topPlayerName} avatarUrl={topAvatar} title={topTitle} />
                <div className="flex items-center gap-1.5 sm:gap-3">
                  <div className="flex gap-0.5 text-sm sm:text-lg" title="Pieces captured by this side">
                    {capturedPieces.capturedByBlack.length === 0
                      ? <span className="text-[10px] sm:text-xs text-muted-foreground">—</span>
                      : capturedPieces.capturedByBlack.slice(0, 8).map((piece, index) => <span key={`cap-black-${index}`}>{piece}</span>)}
=======
    <div className="min-h-screen bg-background pt-14 sm:pt-16 pb-24 lg:pb-4 relative">
      {/* Subtle ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/3 blur-[140px]" />
      </div>

      <div className="mx-auto max-w-[1400px] px-2 sm:px-4 lg:px-6">
        <div className="flex flex-col lg:flex-row lg:gap-5 lg:items-start lg:justify-center">

          {/* ── LEFT: Board Column ── */}
          <div className="flex flex-col items-center w-full lg:w-auto lg:flex-shrink-0">
            {/* Top Player Bar */}
            <div className="w-full max-w-[min(92vw,640px)] mb-1 sm:mb-1.5">
              <div className="flex items-center justify-between px-1 sm:px-2 py-1.5 sm:py-2">
                <PlayerLabel name={topPlayerName} avatarUrl={topAvatar} title={topTitle} isTop />
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex gap-0.5 text-sm opacity-80" title="Captured pieces">
                    {(flipped ? capturedPieces.capturedByWhite : capturedPieces.capturedByBlack).length === 0
                      ? <span className="text-[10px] text-muted-foreground/40">—</span>
                      : (flipped ? capturedPieces.capturedByWhite : capturedPieces.capturedByBlack).slice(0, 8).map((piece, index) => <span key={`cap-top-${index}`}>{piece}</span>)}
>>>>>>> 6124c122ca56d8d3ef82a2f3bf8390aac2ea3aad
                  </div>
                  {showClock && (
                    <ClockFace
                      ms={flipped ? whiteMs : blackMs}
                      isActive={clockActiveSide === (flipped ? "w" : "b")}
                      side={flipped ? "w" : "b"}
                    />
                  )}
>>>>>>> d3c51e24423dfa38cc6a6faefc281915d357437d
                </div>
              </div>
            </div>

<<<<<<< HEAD
<<<<<<< HEAD
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
=======
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
=======
            {/* Chess Board */}
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
>>>>>>> 6124c122ca56d8d3ef82a2f3bf8390aac2ea3aad
              <ChessBoard
                game={game}
                onMove={isOnline ? handleOnlineMove : handleLocalMove}
                flipped={flipped}
                disabled={isOnline ? !online.isMyTurn || online.isGameOver || online.pendingMove : (isComputerGame ? game.turn() === computerColor : false)}
                lastMove={derivedLastMove}
                sizeClassName="max-w-[min(92vw,640px)]"
                maxBoardSizePx={maxBoardSizePx || undefined}
                arrows={engineArrows}
                premovesEnabled={isOnline}
                playerColor={isOnline ? online.playerColor : null}
                streamerMode={streamerMode}
              />
            </motion.div>
>>>>>>> d3c51e24423dfa38cc6a6faefc281915d357437d

            {/* Checkmate banner overlay */}
            {showCheckmateBanner && (
<<<<<<< HEAD
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/45 backdrop-blur-sm">
                <motion.div initial={{ y: 20 }} animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }} className="rounded-2xl border border-primary/50 bg-card/95 px-12 py-8 text-center">
=======
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ y: 20 }}
                  animate={{ y: [0, -8, 0], boxShadow: ["0 0 10px rgba(255,215,0,.2)", "0 0 45px rgba(255,215,0,.8)", "0 0 10px rgba(255,215,0,.2)"] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="rounded-2xl border border-primary/50 bg-card/95 px-12 py-8 text-center"
                >
>>>>>>> 6124c122ca56d8d3ef82a2f3bf8390aac2ea3aad
                  <p className="font-display text-4xl md:text-6xl font-black text-primary tracking-wide">CHECKMATE</p>
                  <p className="text-sm text-muted-foreground mt-2">Tactical finish!</p>
                </motion.div>
              </motion.div>
            )}

<<<<<<< HEAD
<<<<<<< HEAD
            <div className={`w-full ${boardSizeClass} mt-3 rounded-lg border border-border/60 bg-secondary/20 px-4 py-2`}>
              <div className="flex items-center justify-between text-sm">
                <PlayerLabel name={bottomPlayerName} avatarUrl={bottomAvatar} />
                <div className="flex items-center gap-3">
                  {isOnline && <span className="rounded border border-border/70 bg-background/60 px-2 py-1 text-xs font-mono">{bottomClock}</span>}
                  <div className="flex gap-1 text-lg" title="Pieces captured by this side">
                  {capturedPieces.capturedByWhite.length === 0
                    ? <span className="text-xs text-muted-foreground">No captures</span>
                    : capturedPieces.capturedByWhite.map((piece, index) => <span key={`cap-white-${index}`}>{piece}</span>)}
                  </div>
=======
            {/* Bottom player bar */}
            <div className={`w-full ${boardSizeClass} mt-1.5 sm:mt-3 rounded-lg border border-border/60 bg-secondary/20 px-2 sm:px-4 py-1.5 sm:py-2`}>
              <div className="flex items-center justify-between text-xs sm:text-sm">
=======
            {/* Bottom Player Bar */}
            <div className="w-full max-w-[min(92vw,640px)] mt-1 sm:mt-1.5">
              <div className="flex items-center justify-between px-1 sm:px-2 py-1.5 sm:py-2">
>>>>>>> 6124c122ca56d8d3ef82a2f3bf8390aac2ea3aad
                <PlayerLabel name={bottomPlayerName} avatarUrl={bottomAvatar} title={bottomTitle} />
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex gap-0.5 text-sm opacity-80" title="Captured pieces">
                    {(flipped ? capturedPieces.capturedByBlack : capturedPieces.capturedByWhite).length === 0
                      ? <span className="text-[10px] text-muted-foreground/40">—</span>
                      : (flipped ? capturedPieces.capturedByBlack : capturedPieces.capturedByWhite).slice(0, 8).map((piece, index) => <span key={`cap-bot-${index}`}>{piece}</span>)}
                  </div>
                  {showClock && (
                    <ClockFace
                      ms={flipped ? blackMs : whiteMs}
                      isActive={clockActiveSide === (flipped ? "b" : "w")}
                      side={flipped ? "b" : "w"}
                    />
                  )}
>>>>>>> d3c51e24423dfa38cc6a6faefc281915d357437d
                </div>
              </div>
            </div>

<<<<<<< HEAD
<<<<<<< HEAD
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
=======
            {/* Controls bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`mt-2 sm:mt-4 flex items-center justify-between w-full ${boardSizeClass}`}
            >
              <div className={`flex items-center gap-1.5 text-xs sm:text-sm font-display font-bold ${isInCheck ? "text-destructive" : "text-foreground"} min-w-0`}>
                {!isOnline && (
                  <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0 ${game.turn() === "w" ? "bg-white border border-border" : "bg-gray-900"}`} />
                )}
                {(isOnline && online.pendingMove) && <LoaderCircle className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />}
                {isChess960 && <span className="text-primary flex items-center gap-0.5"><Shuffle className="w-3 h-3" />960</span>}
                <span className="truncate">{gameStatus}</span>
              </div>
              <div className="flex gap-1 sm:gap-2 shrink-0">
                {isOnline && !online.isGameOver && (
>>>>>>> d3c51e24423dfa38cc6a6faefc281915d357437d
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
<<<<<<< HEAD
                    disabled={isOnline && resignPending}
                    className="glass-card px-3 py-2 hover:border-destructive/30 transition-colors text-destructive disabled:opacity-60"
=======
                    disabled={resignPending}
                    className="glass-card p-2 sm:px-3 sm:py-2 hover:border-destructive/30 transition-colors text-destructive disabled:opacity-60"
>>>>>>> d3c51e24423dfa38cc6a6faefc281915d357437d
                    title="Resign"
                  >
                    {isOnline && resignPending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                  </button>
                )}
                <button
                  onClick={() => setShowArrows(!showArrows)}
                  className={`glass-card p-2 sm:px-3 sm:py-2 hover:border-primary/30 transition-colors ${showArrows ? "text-primary" : ""}`}
                  title={showArrows ? "Hide engine arrows" : "Show engine arrows"}
                >
                  <ArrowUpRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setSoundEnabled(!soundEnabled); soundManager.setEnabled(!soundEnabled); }}
                  className="glass-card p-2 sm:px-3 sm:py-2 hover:border-primary/30 transition-colors"
                  title={soundEnabled ? "Mute sounds" : "Unmute sounds"}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setStreamerMode(!streamerMode)}
                  className={`glass-card p-2 sm:px-3 sm:py-2 hover:border-primary/30 transition-colors hidden sm:flex ${streamerMode ? "text-primary border-primary/40" : ""}`}
                  title={streamerMode ? "Exit streamer mode" : "Streamer mode"}
                >
                  <Monitor className="w-4 h-4" />
                </button>
                {!isOnline && (
<<<<<<< HEAD
                  <button onClick={resetLocalGame} className="glass-card px-3 py-2 hover:border-primary/30 transition-colors" title="New Game">
=======
                  <button
                    onClick={resetLocalGame}
                    className="glass-card p-2 sm:px-3 sm:py-2 hover:border-primary/30 transition-colors"
                    title="New Game"
                  >
>>>>>>> d3c51e24423dfa38cc6a6faefc281915d357437d
                    <RotateCcw className="w-4 h-4" />
=======
            {/* Incoming draw offer banner */}
            {isOnline && drawOfferState === "received" && !online.isGameOver && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-[min(92vw,640px)] mt-2 rounded-lg bg-card/80 border border-border/40 px-3 sm:px-4 py-2.5 flex items-center justify-between"
              >
                <div className="flex items-center gap-2 text-sm font-display">
                  <Handshake className="w-4 h-4 text-primary" />
                  <span className="font-semibold">{online.opponentName}</span>
                  <span className="text-muted-foreground">offers a draw</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAcceptDraw} className="rounded-md bg-primary/15 text-primary px-3 py-1.5 text-xs font-bold hover:bg-primary/25 transition-colors">Accept</button>
                  <button onClick={handleDeclineDraw} className="rounded-md bg-secondary/60 text-muted-foreground px-3 py-1.5 text-xs font-bold hover:bg-destructive/10 hover:text-destructive transition-colors">Decline</button>
                </div>
              </motion.div>
            )}

            {/* Incoming takeback request banner */}
            {isOnline && takebackState === "received" && !online.isGameOver && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-[min(92vw,640px)] mt-2 rounded-lg bg-card/80 border border-border/40 px-3 sm:px-4 py-2.5 flex items-center justify-between"
              >
                <div className="flex items-center gap-2 text-sm font-display">
                  <Undo2 className="w-4 h-4 text-primary" />
                  <span className="font-semibold">{online.opponentName}</span>
                  <span className="text-muted-foreground">requests a takeback</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAcceptTakeback} className="rounded-md bg-primary/15 text-primary px-3 py-1.5 text-xs font-bold hover:bg-primary/25 transition-colors">Accept</button>
                  <button onClick={handleDeclineTakeback} className="rounded-md bg-secondary/60 text-muted-foreground px-3 py-1.5 text-xs font-bold hover:bg-destructive/10 hover:text-destructive transition-colors">Decline</button>
                </div>
              </motion.div>
            )}

            {/* Controls Bar */}
            <div className="w-full max-w-[min(92vw,640px)] mt-2 sm:mt-3">
              <div className="flex items-center justify-between">
                {/* Status */}
                <div className={`flex items-center gap-1.5 text-xs sm:text-sm font-display font-semibold ${isInCheck ? "text-destructive" : "text-foreground"} min-w-0`}>
                  {!isOnline && !aiThinking && (
                    <div className={`w-3 h-3 rounded-full shrink-0 border ${game.turn() === "w" ? "bg-white border-border/60" : "bg-gray-800 border-transparent"}`} />
                  )}
                  {(isOnline && online.pendingMove) && <LoaderCircle className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />}
                  {isChess960 && <span className="text-primary flex items-center gap-0.5"><Shuffle className="w-3 h-3" />960</span>}
                  {isComputerGame && aiThinking ? (
                    <div className="flex items-center gap-2 min-w-0">
                      <Monitor className="w-3.5 h-3.5 text-primary shrink-0 animate-pulse" />
                      <span className="truncate text-muted-foreground">Analyzing…</span>
                      <div className="w-16 sm:w-24 h-1.5 rounded-full bg-muted/50 overflow-hidden shrink-0">
                        <motion.div className="h-full rounded-full bg-primary/70" initial={{ width: "0%" }} animate={{ width: `${aiThinkProgress}%` }} transition={{ duration: 0.1, ease: "linear" }} />
                      </div>
                    </div>
                  ) : (
                    <span className="truncate">{gameStatus}</span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-1 sm:gap-1.5 shrink-0">
                  {/* Takeback */}
                  {isOnline && !online.isGameOver && ((online.gameData?.moves as any[])?.length ?? 0) > 0 && (
                    <button onClick={handleRequestTakeback} disabled={takebackState !== "idle"}
                      className={`game-action-btn ${takebackState === "sent" ? "text-primary border-primary/30 bg-primary/10 cursor-not-allowed" : ""}`}
                      title={takebackState === "sent" ? "Takeback requested…" : "Request takeback"}>
                      <Undo2 className="w-4 h-4" />
                    </button>
                  )}
                  {/* Draw */}
                  {isOnline && !online.isGameOver && (
                    <button onClick={handleOfferDraw} disabled={drawOfferState !== "idle"}
                      className={`game-action-btn ${drawOfferState === "sent" ? "text-primary border-primary/30 bg-primary/10 cursor-not-allowed" : ""}`}
                      title={drawOfferState === "sent" ? "Draw offered…" : "Offer draw"}>
                      <Handshake className="w-4 h-4" />
                    </button>
                  )}
                  {/* Abort */}
                  {isOnline && !online.isGameOver && ((online.gameData?.moves as any[])?.length ?? 0) < 2 && (
                    <button onClick={() => online.abortGame()} className="game-action-btn" title="Abort game">
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                  {/* Resign (online) */}
                  {isOnline && !online.isGameOver && (
                    <button onClick={() => setShowResignDialog(true)} className="game-action-btn hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive" title="Resign">
                      <Flag className="w-4 h-4" />
                    </button>
                  )}
                  {/* Resign (local/computer) */}
                  {!isOnline && !isGameOver && (isComputerGame || displayMoves.length > 0) && (
                    <button onClick={() => setShowResignDialog(true)} className="game-action-btn hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive" title="Resign">
                      <Flag className="w-4 h-4" />
                    </button>
                  )}
                  {/* Sound toggle */}
                  <button onClick={() => { setSoundEnabled(!soundEnabled); soundManager.setEnabled(!soundEnabled); }}
                    className={`game-action-btn ${!soundEnabled ? "text-muted-foreground/50" : ""}`}
                    title={soundEnabled ? "Mute" : "Unmute"}>
                    {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>
                  {/* Streamer mode */}
                  <button onClick={() => setStreamerMode(!streamerMode)}
                    className={`game-action-btn hidden sm:flex ${streamerMode ? "text-primary border-primary/30" : ""}`}
                    title={streamerMode ? "Exit streamer mode" : "Streamer mode"}>
                    <Monitor className="w-4 h-4" />
>>>>>>> 6124c122ca56d8d3ef82a2f3bf8390aac2ea3aad
                  </button>
                  {/* New game (local) */}
                  {!isOnline && (
                    <button onClick={resetLocalGame} className="game-action-btn" title="New Game">
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Move History (mobile: below controls) */}
            <div className="w-full max-w-[min(92vw,640px)] mt-3 lg:hidden">
              <div className="rounded-lg bg-card/60 border border-border/30 p-3">
                <h3 className="font-display font-bold text-xs text-muted-foreground uppercase tracking-wider mb-2">Moves</h3>
                <div className="max-h-28 overflow-y-auto">
                  {movePairs.length === 0 ? (
                    <p className="text-xs text-muted-foreground/60 italic">No moves yet</p>
                  ) : (
                    <div className="flex flex-wrap gap-x-1 gap-y-0.5 text-xs font-mono">
                      {movePairs.map((pair) => (
                        <span key={pair.num} className="whitespace-nowrap">
                          <span className="text-muted-foreground/50">{pair.num}.</span>
                          <span className="text-foreground ml-0.5">{pair.white}</span>
                          {pair.black && <span className="text-foreground/75 ml-0.5">{pair.black}</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

<<<<<<< HEAD
<<<<<<< HEAD
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-3 space-y-4">
            <div className="glass-card p-5 border-glow space-y-3">
=======
          {/* Side panel - collapsible on mobile */}
=======
          {/* ── RIGHT: Side Panel (desktop) ── */}
>>>>>>> 6124c122ca56d8d3ef82a2f3bf8390aac2ea3aad
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            className="hidden lg:block lg:w-[320px] xl:w-[360px] lg:flex-shrink-0 space-y-3 mt-0"
          >
<<<<<<< HEAD
            <div className="glass-card p-3 sm:p-5 border-glow space-y-2 sm:space-y-3">
>>>>>>> d3c51e24423dfa38cc6a6faefc281915d357437d
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
<<<<<<< HEAD
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-border/60 bg-secondary/20 px-3 py-2">
                  <p className="text-muted-foreground">Time control</p>
                  <p className="mt-1 font-display font-bold">{timeControlLabel}</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-secondary/20 px-3 py-2">
                  <p className="text-muted-foreground">Mode</p>
                  <p className="mt-1 font-display font-bold">
                    {isOnline ? (isSpectator ? "Spectate" : "Ranked live") : isComputerGame ? "Vs computer" : "Local board"}
                  </p>
                </div>
              </div>
=======
              {timeControl && (
                <div className="rounded-lg border border-border/60 bg-secondary/30 p-3 text-xs">
                  <span className="text-muted-foreground">Time control: </span>
                  <span className="font-display font-bold text-primary">{timeControl.label}</span>
                  <span className="text-muted-foreground"> ({timeControl.category})</span>
=======
            {/* Game Info */}
            <div className="rounded-lg bg-card/60 border border-border/30 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-primary" />
                <h3 className="font-display font-bold text-sm">
                  {isOnline ? "Live Match" : isComputerGame ? "vs Computer" : "Local Game"}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isOnline
                  ? `Playing as ${online.playerColor === "w" ? "White" : "Black"} · ${online.playerName} vs ${online.opponentName}`
                  : isComputerGame
                    ? `You are ${computerColor === "w" ? "Black" : "White"} · ${diffLabel}${aiStreak !== 0 ? ` · Streak: ${aiStreak > 0 ? `🔥${aiStreak}W` : `${Math.abs(aiStreak)}L`}` : ""}`
                    : `Pass-and-play · ${localBottomColor === "w" ? "White" : "Black"} at bottom`}
              </p>
              {(effectiveTimeControl || timeControl) && (
                <div className="rounded-md bg-secondary/40 border border-border/20 px-3 py-2 text-xs flex items-center justify-between">
                  <span className="text-muted-foreground">Time control</span>
                  <span className="font-display font-bold text-primary">{(effectiveTimeControl || timeControl)!.label}</span>
>>>>>>> 6124c122ca56d8d3ef82a2f3bf8390aac2ea3aad
                </div>
              )}
>>>>>>> d3c51e24423dfa38cc6a6faefc281915d357437d
              {isOnline && (
                <div className="flex items-center justify-between text-xs rounded-md bg-secondary/30 px-3 py-1.5">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`flex items-center gap-1.5 font-medium ${online.syncState === "live" ? "text-emerald-400" : "text-destructive"}`}>
                    {online.syncState === "live" ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                    {online.syncState === "live" ? "Live" : "Reconnecting"}
                  </span>
                </div>
              )}
<<<<<<< HEAD
            </div>

            <div className="glass-card p-5 border border-primary/20">
              <h3 className="font-display font-bold text-sm mb-2 flex items-center gap-2"><Swords className="w-4 h-4 text-primary" />Latest move</h3>
              <p className="text-xs text-muted-foreground">Most recent move is highlighted on board.</p>
              {!isOnline && !isComputerGame && (
                <button onClick={() => setLocalBottomColor((prev) => (prev === "w" ? "b" : "w"))} className="mt-3 w-full border rounded-lg px-3 py-2 text-xs font-display font-bold">
                  Switch Seat (show {localBottomColor === "w" ? "Black" : "White"} at bottom)
=======
              {!isOnline && !isComputerGame && (
                <button
                  onClick={() => setLocalBottomColor((prev) => (prev === "w" ? "b" : "w"))}
                  className="w-full rounded-md border border-border/30 bg-secondary/40 px-3 py-2 text-xs font-display font-bold hover:bg-secondary/60 transition-colors"
                >
                  Flip Board
>>>>>>> 6124c122ca56d8d3ef82a2f3bf8390aac2ea3aad
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

<<<<<<< HEAD
            <div className="glass-card p-5">
              <h3 className="font-display font-bold text-sm mb-3">Move History</h3>
              <div className="max-h-64 overflow-y-auto space-y-1 text-sm font-mono">
                {movePairs.length === 0 && <p className="text-xs text-muted-foreground italic">No moves yet</p>}
                {movePairs.map((pair) => (
                  <div key={pair.num} className="flex items-center gap-2 py-0.5">
                    <span className="text-muted-foreground w-6 text-right text-xs">{pair.num}.</span>
                    <span className="w-16 text-foreground">{pair.white}</span>
                    <span className="w-16 text-foreground">{pair.black || ""}</span>
=======
            {/* Move History (desktop) */}
            <div className="rounded-lg bg-card/60 border border-border/30 p-4">
              <h3 className="font-display font-bold text-xs text-muted-foreground uppercase tracking-wider mb-3">Move History</h3>
              <div className="max-h-72 overflow-y-auto">
                {movePairs.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 italic">No moves yet</p>
                ) : (
                  <div className="space-y-0">
                    {movePairs.map((pair) => (
                      <div
                        key={pair.num}
                        className={`flex items-center text-sm font-mono py-1 px-2 rounded-sm ${pair.num % 2 === 0 ? 'bg-secondary/20' : ''}`}
                      >
                        <span className="text-muted-foreground/50 w-7 text-right text-xs tabular-nums shrink-0">{pair.num}.</span>
                        <span className="w-16 ml-2 text-foreground font-medium">{pair.white}</span>
                        <span className="w-16 text-foreground/70">{pair.black || ""}</span>
                      </div>
                    ))}
>>>>>>> 6124c122ca56d8d3ef82a2f3bf8390aac2ea3aad
                  </div>
                )}
              </div>
            </div>

<<<<<<< HEAD
            {isOnline && !isSpectator && user?.id && (
              <InGameChat
                gameId={onlineGameId!}
                userId={user.id}
                username={online.playerName || profile?.username || "Player"}
              />
            )}

=======
            {/* Game Over panel */}
>>>>>>> 6124c122ca56d8d3ef82a2f3bf8390aac2ea3aad
            {isGameOver && (
<<<<<<< HEAD
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-5 border-glow gold-glow text-center">
                <Crown className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="font-display font-bold text-lg mb-3">{gameStatus}</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button onClick={isOnline ? () => navigate("/lobby") : resetLocalGame} className="bg-primary text-primary-foreground font-display font-bold text-xs tracking-wider px-6 py-2.5 rounded-lg gold-glow hover:scale-105 transition-transform">
                    {isOnline ? "BACK TO LOBBY" : "PLAY AGAIN"}
                  </button>
=======
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-5 sm:p-6 text-center space-y-4 border-glow gold-glow"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/25 to-primary/5 border border-primary/20 flex items-center justify-center mx-auto gold-glow">
                  <Crown className="w-8 h-8 text-primary" />
                </div>
                <p className="font-display font-bold text-lg">{gameStatus}</p>

                <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                  <span>{displayMoves.length} moves</span>
                  {(effectiveTimeControl || timeControl) && <span>{(effectiveTimeControl || timeControl)!.label}</span>}
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  {isOnline ? (
                    <>
                      <button
                        onClick={() => navigate("/lobby")}
                        className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-display font-bold text-xs tracking-wider py-2.5 rounded-lg transition-all gold-glow hover:shadow-lg hover:shadow-primary/25"
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
                        className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-display font-bold text-xs tracking-wider py-2.5 rounded-lg transition-all gold-glow hover:shadow-lg hover:shadow-primary/25"
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
>>>>>>> d3c51e24423dfa38cc6a6faefc281915d357437d
                </div>
              </motion.div>
            )}

            {isGameOver && showPostGameReview && (
<<<<<<< HEAD
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 border border-primary/30 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-display font-bold text-sm">Analysis Mode</p>
                  {analysisSource && (
                    <span className={`rounded-full border px-2 py-1 text-[11px] ${
                      analysisSource === "server"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border-border/70 bg-secondary/30 text-muted-foreground"
                    }`}>
                      {analysisSource === "server" ? "Server review" : "Local quick review"}
                    </span>
                  )}
                </div>
                {analysisLoading ? (
                  <p className="text-xs text-muted-foreground">Running engine analysis...</p>
                ) : (
                  <AnalysisPanel items={analysisItems} />
                )}
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => navigate("/dashboard?section=history")} className="bg-primary/15 text-primary text-xs font-display font-bold px-3 py-2 rounded-md">FULL REVIEW</button>
=======
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-5"
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
<<<<<<< HEAD
>>>>>>> d3c51e24423dfa38cc6a6faefc281915d357437d
                  <button onClick={() => navigate("/lobby")} className="bg-secondary text-xs font-display font-bold px-3 py-2 rounded-md">BACK TO LOBBY</button>
=======
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
>>>>>>> 6124c122ca56d8d3ef82a2f3bf8390aac2ea3aad
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

      {/* Resign confirmation dialog */}
      <ResignConfirmDialog
        open={showResignDialog}
        onCancel={() => setShowResignDialog(false)}
        onConfirmResign={async () => {
          setShowResignDialog(false);
          if (isOnline) {
            setResignPending(true);
            await online.resign();
            setResignPending(false);
          } else {
            // Local resign — mark game over
            setResignPending(true);
            setClockGameOver(true);
            soundManager.play("gameEnd");
            setShowGameOverPopup(true);
          }
        }}
      />

      {/* Game Over popup */}
      <GameOverPopup
        open={showGameOverPopup}
        result={gameStatus}
        moveCount={displayMoves.length}
        timeControlLabel={timeControl?.label}
        isOnline={isOnline}
        rematchState={rematchState}
        onNewGame={() => {
          setShowGameOverPopup(false);
          navigate("/lobby");
        }}
        onRematch={() => {
          if (isOnline) {
            handleOfferRematch();
          } else {
            setShowGameOverPopup(false);
            resetLocalGame();
          }
        }}
        onAcceptRematch={() => {
          handleAcceptRematch();
        }}
        onDeclineRematch={() => {
          handleDeclineRematch();
        }}
        onAnalyze={() => {
          setShowGameOverPopup(false);
          setShowEngineReview(true);
        }}
        onAICoach={() => {
          setShowGameOverPopup(false);
          setShowAICoach(true);
        }}
        onBackToLobby={() => {
          setShowGameOverPopup(false);
          navigate("/lobby");
        }}
      />
    </div>
  );
};

export default Play;
