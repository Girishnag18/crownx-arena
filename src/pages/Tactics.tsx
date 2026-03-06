import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess, Square } from "chess.js";
import {
  ArrowLeft,
  Brain,
  Flame,
  Gauge,
  Lightbulb,
  Medal,
  RotateCcw,
  Sparkles,
  TimerReset,
  Trophy,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import ChessBoard from "@/components/chess/ChessBoard";
import { TACTIC_PUZZLES, type TacticPuzzle } from "@/data/tactics";
import { type BoardTheme, type PieceTheme } from "@/utils/chessThemes";

type TrainingMode = "study" | "rush";

const RUSH_DURATION_SECONDS = 180;
const RUSH_BEST_KEY = "tactics-best-rush-score";
const STUDY_BEST_STREAK_KEY = "tactics-best-study-streak";

const buildShuffledOrder = (preferredIndex?: number) => {
  const indices = TACTIC_PUZZLES.map((_, index) => index);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  if (preferredIndex === undefined) return indices;

  const withoutPreferred = indices.filter((index) => index !== preferredIndex);
  return [preferredIndex, ...withoutPreferred];
};

const getDailyPuzzleIndex = () => {
  const startOfYear = new Date(new Date().getFullYear(), 0, 0);
  const diff = Date.now() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / 86_400_000);
  return dayOfYear % TACTIC_PUZZLES.length;
};

const formatClock = (seconds: number) => {
  const mm = Math.floor(Math.max(0, seconds) / 60);
  const ss = Math.max(0, seconds) % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
};

const parseUciMove = (uci: string) => ({
  from: uci.slice(0, 2) as Square,
  to: uci.slice(2, 4) as Square,
  promotion: uci.length > 4 ? uci.slice(4, 5) : undefined,
});

const getSanForMove = (fen: string, uci: string) => {
  try {
    const game = new Chess(fen);
    const move = parseUciMove(uci);
    return game.move(move)?.san ?? uci;
  } catch {
    return uci;
  }
};

const buildSolutionPreview = (puzzle: TacticPuzzle) => {
  const replay = new Chess(puzzle.fen);
  return puzzle.solution
    .map((uci) => {
      try {
        return replay.move(parseUciMove(uci))?.san ?? uci;
      } catch {
        return uci;
      }
    })
    .join(" ");
};

const Tactics = () => {
  const navigate = useNavigate();
  const dailyPuzzleIndex = useMemo(getDailyPuzzleIndex, []);
  const nextPuzzleTimerRef = useRef<number | null>(null);

  const [mode, setMode] = useState<TrainingMode>("study");
  const [queue, setQueue] = useState<number[]>(TACTIC_PUZZLES.map((_, index) => index));
  const [cursor, setCursor] = useState(0);
  const [game, setGame] = useState(() => new Chess(TACTIC_PUZZLES[0].fen));
  const [step, setStep] = useState(0);
  const [solved, setSolved] = useState(false);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [message, setMessage] = useState("Find the strongest move.");
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [hintOpen, setHintOpen] = useState(false);
  const [solvedCount, setSolvedCount] = useState(0);
  const [mistakeCount, setMistakeCount] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestRun, setBestRun] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(RUSH_DURATION_SECONDS);
  const [bestRushScore, setBestRushScore] = useState(0);
  const [bestStudyStreak, setBestStudyStreak] = useState(0);
  const [boardTheme, setBoardTheme] = useState<BoardTheme>("emerald");
  const [pieceTheme, setPieceTheme] = useState<PieceTheme>("neo");

  const currentPuzzle = TACTIC_PUZZLES[queue[cursor] ?? 0];
  const playerToMove = useMemo(() => new Chess(currentPuzzle.fen).turn(), [currentPuzzle.fen]);
  const solutionPreview = useMemo(() => buildSolutionPreview(currentPuzzle), [currentPuzzle]);
  const expectedMoveLabel = useMemo(
    () => getSanForMove(game.fen(), currentPuzzle.solution[step] ?? ""),
    [currentPuzzle.solution, game, step],
  );

  const accuracy = useMemo(() => {
    const totalGuesses = solvedCount + mistakeCount;
    if (totalGuesses === 0) return 100;
    return Math.round((solvedCount / totalGuesses) * 100);
  }, [mistakeCount, solvedCount]);

  const loadPuzzle = useCallback((nextCursor: number, nextQueue = queue, nextMode: TrainingMode = mode) => {
    const nextPuzzle = TACTIC_PUZZLES[nextQueue[nextCursor] ?? 0];
    setCursor(nextCursor);
    setGame(new Chess(nextPuzzle.fen));
    setStep(0);
    setSolved(false);
    setWrongAttempts(0);
    setHintOpen(false);
    setSessionFinished(false);
    setMessage(nextMode === "rush" ? "Solve quickly. Every second matters." : "Find the strongest move.");
  }, [mode, queue]);

  const resetSessionStats = useCallback(() => {
    setSolvedCount(0);
    setMistakeCount(0);
    setCurrentStreak(0);
    setBestRun(0);
    setScore(0);
    setTimeLeft(RUSH_DURATION_SECONDS);
    setSessionFinished(false);
  }, []);

  const startStudy = useCallback((preferredIndex?: number) => {
    const nextQueue = preferredIndex === undefined
      ? TACTIC_PUZZLES.map((_, index) => index)
      : [preferredIndex, ...TACTIC_PUZZLES.map((_, index) => index).filter((index) => index !== preferredIndex)];
    setMode("study");
    setQueue(nextQueue);
    resetSessionStats();
    loadPuzzle(0, nextQueue, "study");
  }, [loadPuzzle, resetSessionStats]);

  const startRush = useCallback((preferredIndex?: number) => {
    const nextQueue = buildShuffledOrder(preferredIndex);
    setMode("rush");
    setQueue(nextQueue);
    resetSessionStats();
    loadPuzzle(0, nextQueue, "rush");
    setMessage("Puzzle Rush is live. Keep the streak going.");
  }, [loadPuzzle, resetSessionStats]);

  const goToNextPuzzle = useCallback(() => {
    const nextCursor = cursor + 1 >= queue.length ? 0 : cursor + 1;
    loadPuzzle(nextCursor);
  }, [cursor, loadPuzzle, queue.length]);

  const handleSolve = useCallback((finalGame: Chess) => {
    const nextSolved = solvedCount + 1;
    const nextStreak = currentStreak + 1;
    const nextBestRun = Math.max(bestRun, nextStreak);
    const baseScore = Math.max(70, Math.round(currentPuzzle.rating * 0.18));
    const rushBonus = mode === "rush" ? Math.max(0, Math.floor(timeLeft / 6)) : 0;
    const penalty = wrongAttempts * 12;
    const earned = Math.max(40, baseScore + rushBonus - penalty);

    setGame(finalGame);
    setSolved(true);
    setSolvedCount(nextSolved);
    setCurrentStreak(nextStreak);
    setBestRun(nextBestRun);
    setMessage(mode === "rush" ? `Correct. +${earned} points.` : "Solved. Review the line or load the next puzzle.");
    if (mode === "rush") {
      setScore((prev) => prev + earned);
      if (nextPuzzleTimerRef.current) window.clearTimeout(nextPuzzleTimerRef.current);
      nextPuzzleTimerRef.current = window.setTimeout(() => {
        if (timeLeft > 0) goToNextPuzzle();
      }, 1100);
    } else if (nextStreak > bestStudyStreak) {
      setBestStudyStreak(nextStreak);
      localStorage.setItem(STUDY_BEST_STREAK_KEY, String(nextStreak));
    }
  }, [bestRun, bestStudyStreak, currentPuzzle.rating, currentStreak, goToNextPuzzle, mode, solvedCount, timeLeft, wrongAttempts]);

  const onMove = useCallback((from: Square, to: Square, promotion?: string) => {
    if (solved || sessionFinished) return false;

    const attempted = `${from}${to}${promotion || ""}`.toLowerCase();
    const expected = currentPuzzle.solution[step];
    if (attempted !== expected) {
      setWrongAttempts((prev) => prev + 1);
      setMistakeCount((prev) => prev + 1);
      setCurrentStreak(0);
      setMessage(wrongAttempts >= 1 ? "Not quite. Open the hint if you need it." : "Not best. Try again.");
      return false;
    }

    const nextGame = new Chess(game.fen());
    try {
      nextGame.move({ from, to, promotion: promotion || undefined });
    } catch {
      return false;
    }

    let nextStep = step + 1;
    while (nextStep < currentPuzzle.solution.length && nextGame.turn() !== playerToMove) {
      const reply = parseUciMove(currentPuzzle.solution[nextStep]);
      nextGame.move(reply);
      nextStep += 1;
    }

    setGame(nextGame);
    setStep(nextStep);
    if (nextStep >= currentPuzzle.solution.length) {
      handleSolve(nextGame);
    } else {
      setMessage("Correct. Finish the line.");
    }
    return true;
  }, [currentPuzzle.solution, game, handleSolve, playerToMove, sessionFinished, solved, step, wrongAttempts]);

  useEffect(() => {
    const storedRush = Number(localStorage.getItem(RUSH_BEST_KEY) || 0);
    const storedStudy = Number(localStorage.getItem(STUDY_BEST_STREAK_KEY) || 0);
    setBestRushScore(Number.isFinite(storedRush) ? storedRush : 0);
    setBestStudyStreak(Number.isFinite(storedStudy) ? storedStudy : 0);
    setBoardTheme((localStorage.getItem("chess-board-theme") as BoardTheme) || "emerald");
    setPieceTheme((localStorage.getItem("chess-piece-theme") as PieceTheme) || "neo");
  }, []);

  useEffect(() => {
    return () => {
      if (nextPuzzleTimerRef.current) {
        window.clearTimeout(nextPuzzleTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (mode !== "rush" || sessionFinished) return;

    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          setSessionFinished(true);
          setMessage("Rush complete. Review your score and start another run.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [mode, sessionFinished]);

  useEffect(() => {
    if (mode !== "rush" || !sessionFinished) return;
    if (score > bestRushScore) {
      setBestRushScore(score);
      localStorage.setItem(RUSH_BEST_KEY, String(score));
    }
  }, [bestRushScore, mode, score, sessionFinished]);

  return (
    <div className="min-h-screen bg-background px-4 pb-14 pt-20">
      <div className="container mx-auto max-w-7xl space-y-6">
        <div className="relative overflow-hidden rounded-[28px] border border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(234,179,8,0.18),transparent_30%),linear-gradient(135deg,rgba(19,24,37,0.95),rgba(11,18,28,0.95))] p-5 md:p-7">
          <div className="absolute inset-y-0 right-0 w-64 bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.14),transparent_60%)]" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/30 px-3 py-1.5 text-xs text-muted-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Tactical Training
              </div>
              <h1 className="font-display text-3xl font-black md:text-4xl">Train like a live puzzle rush, not a static demo.</h1>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
                Inspired by the fast feedback loops popular on Chess.com: mix quick puzzle rush runs, study mode, a daily featured tactic, and cleaner board themes.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-3">
                <p className="text-muted-foreground">Solved</p>
                <p className="mt-1 font-display text-xl font-bold">{solvedCount}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-3">
                <p className="text-muted-foreground">Accuracy</p>
                <p className="mt-1 font-display text-xl font-bold">{accuracy}%</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-3">
                <p className="text-muted-foreground">Best Rush</p>
                <p className="mt-1 font-display text-xl font-bold">{bestRushScore}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-3">
                <p className="text-muted-foreground">Best Study Streak</p>
                <p className="mt-1 font-display text-xl font-bold">{bestStudyStreak}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <button
                type="button"
                onClick={() => startStudy()}
                className={`rounded-2xl border p-4 text-left transition-colors ${
                  mode === "study" ? "border-primary/40 bg-primary/10" : "border-border/70 bg-secondary/20 hover:border-primary/20"
                }`}
              >
                <div className="mb-3 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  <span className="font-display text-sm font-bold">Study Mode</span>
                </div>
                <p className="text-sm text-muted-foreground">Work through curated puzzles, inspect the line, and build streaks without a clock.</p>
              </button>

              <button
                type="button"
                onClick={() => startRush()}
                className={`rounded-2xl border p-4 text-left transition-colors ${
                  mode === "rush" ? "border-amber-500/40 bg-amber-500/10" : "border-border/70 bg-secondary/20 hover:border-amber-500/25"
                }`}
              >
                <div className="mb-3 flex items-center gap-2">
                  <Flame className="h-4 w-4 text-amber-300" />
                  <span className="font-display text-sm font-bold">Puzzle Rush</span>
                </div>
                <p className="text-sm text-muted-foreground">Three minutes, shuffled puzzles, live timer, and score pressure on every solve.</p>
              </button>

              <button
                type="button"
                onClick={() => startStudy(dailyPuzzleIndex)}
                className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-left transition-colors hover:border-emerald-400/40"
              >
                <div className="mb-3 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-emerald-300" />
                  <span className="font-display text-sm font-bold">Daily Puzzle</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Today: <span className="text-foreground">{TACTIC_PUZZLES[dailyPuzzleIndex].title}</span> · {TACTIC_PUZZLES[dailyPuzzleIndex].rating}
                </p>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-border/70 bg-secondary/30 px-3 py-1">
                    {mode === "rush" ? "Rush session" : "Study session"}
                  </span>
                  <span className="rounded-full border border-border/70 bg-secondary/30 px-3 py-1">
                    Puzzle {cursor + 1} / {queue.length}
                  </span>
                  <span className="rounded-full border border-border/70 bg-secondary/30 px-3 py-1">
                    Theme: {currentPuzzle.theme}
                  </span>
                  <span className="rounded-full border border-border/70 bg-secondary/30 px-3 py-1">
                    Rating: {currentPuzzle.rating}
                  </span>
                  {mode === "rush" && (
                    <span className={`rounded-full border px-3 py-1 ${timeLeft <= 20 ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-amber-500/40 bg-amber-500/10 text-amber-200"}`}>
                      {formatClock(timeLeft)}
                    </span>
                  )}
                </div>

                <div className="rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,rgba(20,27,40,0.96),rgba(11,17,28,0.98))] p-4 md:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Current tactic</p>
                      <h2 className="font-display text-2xl font-bold">{currentPuzzle.title}</h2>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-2 text-right">
                      <p className="text-[11px] text-muted-foreground">Live session</p>
                      <p className="font-display text-lg font-bold">{mode === "rush" ? score : currentStreak}</p>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <ChessBoard
                      game={game}
                      onMove={onMove}
                      flipped={playerToMove === "b"}
                      disabled={solved || sessionFinished}
                      boardTheme={boardTheme}
                      pieceTheme={pieceTheme}
                      sizeClassName="max-w-[min(92vw,760px)]"
                    />
                  </div>

                  <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-border/70 bg-background/35 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Coach</p>
                      <p className="mt-1 text-sm">{message}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (mode === "rush") {
                            startRush(queue[0]);
                          } else {
                            loadPuzzle(cursor);
                          }
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-secondary/30 px-3 py-2 text-xs font-display font-bold"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => setHintOpen((prev) => !prev)}
                        className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-display font-bold text-primary"
                      >
                        <Lightbulb className="h-3.5 w-3.5" />
                        {hintOpen ? "Hide Hint" : "Hint"}
                      </button>
                      {mode === "study" && (
                        <button
                          type="button"
                          onClick={goToNextPuzzle}
                          className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-display font-bold text-emerald-300"
                        >
                          Next Puzzle
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="glass-card rounded-2xl p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-primary" />
                    <p className="font-display text-sm font-bold">Session Pulse</p>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between rounded-xl border border-border/70 bg-secondary/20 px-3 py-2">
                      <span className="text-muted-foreground">Streak</span>
                      <span className="font-display font-bold">{currentStreak}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-border/70 bg-secondary/20 px-3 py-2">
                      <span className="text-muted-foreground">Best this run</span>
                      <span className="font-display font-bold">{bestRun}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-border/70 bg-secondary/20 px-3 py-2">
                      <span className="text-muted-foreground">Mistakes</span>
                      <span className="font-display font-bold">{mistakeCount}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-border/70 bg-secondary/20 px-3 py-2">
                      <span className="text-muted-foreground">Rush timer</span>
                      <span className="font-display font-bold">{formatClock(timeLeft)}</span>
                    </div>
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Medal className="h-4 w-4 text-amber-300" />
                    <p className="font-display text-sm font-bold">Puzzle Notes</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{currentPuzzle.description}</p>
                  <div className="mt-3 rounded-xl border border-border/70 bg-secondary/20 p-3 text-xs">
                    <p className="font-display font-bold text-foreground">Featured line</p>
                    <p className="mt-1 text-muted-foreground">{solutionPreview}</p>
                  </div>
                  {hintOpen && (
                    <div className="mt-3 rounded-xl border border-primary/20 bg-primary/10 p-3 text-xs">
                      <p className="font-display font-bold text-primary">Hint</p>
                      <p className="mt-1 text-foreground/90">{currentPuzzle.hint}</p>
                      <p className="mt-2 text-muted-foreground">Current move cue: {expectedMoveLabel}</p>
                    </div>
                  )}
                </div>

                <div className="glass-card rounded-2xl p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <TimerReset className="h-4 w-4 text-emerald-300" />
                    <p className="font-display text-sm font-bold">Puzzle Queue</p>
                  </div>
                  <div className="space-y-2">
                    {queue.map((puzzleIndex, index) => {
                      const puzzle = TACTIC_PUZZLES[puzzleIndex];
                      const active = index === cursor;
                      return (
                        <button
                          key={puzzle.id}
                          type="button"
                          onClick={() => mode === "study" && loadPuzzle(index)}
                          disabled={mode === "rush"}
                          className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                            active
                              ? "border-primary/40 bg-primary/10"
                              : "border-border/70 bg-secondary/20 hover:border-primary/20"
                          } ${mode === "rush" ? "cursor-default opacity-80" : ""}`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-display font-bold">{puzzle.title}</p>
                              <p className="text-[11px] text-muted-foreground">{puzzle.theme}</p>
                            </div>
                            <span className="rounded-full border border-border/70 bg-background/40 px-2 py-1 text-[11px]">
                              {puzzle.rating}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="glass-card rounded-2xl p-5">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="font-display text-sm font-bold">Why this trainer is stronger now</p>
              </div>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Real session state instead of three static puzzles: rush timer, streaks, score, and daily featured tactic.</p>
                <p>Theme-aware board rendering now matches your saved board and piece settings.</p>
                <p>Multi-move tactical lines auto-play the opponent replies so the training feels closer to a live tactics flow.</p>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-5">
              <div className="mb-3 flex items-center gap-2">
                <Brain className="h-4 w-4 text-emerald-300" />
                <p className="font-display text-sm font-bold">Recommended flow</p>
              </div>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Use Puzzle Rush before online games to warm up calculation speed and board vision.</p>
                <p>Use Study Mode when you want to inspect the line and build a clean streak without time pressure.</p>
                <p>Load the Daily Puzzle when you want one quick drill from the current rotation.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tactics;
