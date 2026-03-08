import { useState, useEffect, useCallback } from "react";
import { Chess, Square } from "chess.js";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, CheckCircle2, XCircle, ChevronRight, Flame, RotateCcw, Filter, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import ChessBoard from "@/components/chess/ChessBoard";
import { Progress } from "@/components/ui/progress";

interface OpeningLine {
  id: string;
  name: string;
  eco: string;
  color: string;
  moves: string[];
  description: string;
  difficulty: string;
  category: string;
}

interface ProgressData {
  line_id: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  correct_streak: number;
  next_review_at: string;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-emerald-500/20 text-emerald-400",
  intermediate: "bg-amber-500/20 text-amber-400",
  advanced: "bg-destructive/20 text-destructive",
};

const OpeningTrainer = () => {
  const { user } = useAuth();
  const [lines, setLines] = useState<OpeningLine[]>([]);
  const [progress, setProgress] = useState<Map<string, ProgressData>>(new Map());
  const [selectedLine, setSelectedLine] = useState<OpeningLine | null>(null);
  const [game, setGame] = useState<Chess | null>(null);
  const [moveIndex, setMoveIndex] = useState(0);
  const [drillStatus, setDrillStatus] = useState<"waiting" | "correct" | "wrong" | "complete">("waiting");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
  const [filterColor, setFilterColor] = useState<string>("all");
  const [dueCount, setDueCount] = useState(0);

  const loadData = useCallback(async () => {
    const { data: lineData } = await (supabase.from("opening_lines" as any).select("*").order("name") as any);
    if (lineData) setLines(lineData as OpeningLine[]);

    if (!user) return;

    const { data: progressData } = await (supabase
      .from("opening_progress" as any)
      .select("*") as any)
      .eq("user_id", user.id);

    const progressMap = new Map<string, ProgressData>();
    for (const p of (progressData || []) as ProgressData[]) {
      progressMap.set(p.line_id, p);
    }
    setProgress(progressMap);

    // Count due reviews
    const now = new Date().toISOString();
    const due = (progressData || []).filter((p: ProgressData) => p.next_review_at <= now).length;
    setDueCount(due);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const startDrill = (line: OpeningLine) => {
    setSelectedLine(line);
    const newGame = new Chess();
    setGame(newGame);
    setMoveIndex(0);
    setDrillStatus("waiting");

    // If player plays white and opening starts with white's move, or vice versa
    // Play opponent's moves automatically first
    if (line.color === "b" && line.moves.length > 0) {
      // Play white's first move automatically
      try {
        newGame.move(line.moves[0]);
        setGame(new Chess(newGame.fen()));
        setMoveIndex(1);
      } catch {}
    }
  };

  const handleMove = useCallback(
    (from: Square, to: Square, promotion?: string): boolean => {
      if (!game || !selectedLine || drillStatus === "complete" || drillStatus === "wrong") return false;

      const expectedSan = selectedLine.moves[moveIndex];
      if (!expectedSan) return false;

      const gameCopy = new Chess(game.fen());
      try {
        const move = gameCopy.move({ from, to, promotion: promotion || undefined });
        if (!move) return false;

        if (move.san === expectedSan) {
          setGame(gameCopy);
          setDrillStatus("correct");

          const nextIndex = moveIndex + 1;

          // Check if drill is complete
          if (nextIndex >= selectedLine.moves.length) {
            setDrillStatus("complete");
            setMoveIndex(nextIndex);
            handleDrillComplete(true);
            return true;
          }

          // Play opponent's response automatically
          if (nextIndex < selectedLine.moves.length) {
            const opponentMove = selectedLine.moves[nextIndex];
            setTimeout(() => {
              try {
                gameCopy.move(opponentMove);
                setGame(new Chess(gameCopy.fen()));
                setMoveIndex(nextIndex + 1);
                setDrillStatus("waiting");

                // Check if that was the last move
                if (nextIndex + 1 >= selectedLine.moves.length) {
                  setDrillStatus("complete");
                  handleDrillComplete(true);
                }
              } catch {}
            }, 400);
          }

          return true;
        } else {
          setDrillStatus("wrong");
          handleDrillComplete(false);
          return false;
        }
      } catch {
        return false;
      }
    },
    [game, selectedLine, moveIndex, drillStatus]
  );

  const handleDrillComplete = async (success: boolean) => {
    if (!user || !selectedLine) return;

    const existing = progress.get(selectedLine.id);

    // SM-2 spaced repetition algorithm
    let easeFactor = existing?.ease_factor || 2.5;
    let interval = existing?.interval_days || 1;
    let repetitions = existing?.repetitions || 0;
    let correctStreak = existing?.correct_streak || 0;

    if (success) {
      correctStreak++;
      repetitions++;
      if (repetitions === 1) interval = 1;
      else if (repetitions === 2) interval = 6;
      else interval = Math.round(interval * easeFactor);
      easeFactor = Math.max(1.3, easeFactor + 0.1);
    } else {
      correctStreak = 0;
      repetitions = 0;
      interval = 1;
      easeFactor = Math.max(1.3, easeFactor - 0.2);
    }

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    const upsertData = {
      user_id: user.id,
      line_id: selectedLine.id,
      ease_factor: easeFactor,
      interval_days: interval,
      repetitions,
      correct_streak: correctStreak,
      last_reviewed_at: new Date().toISOString(),
      next_review_at: nextReview.toISOString(),
    };

    if (existing) {
      await (supabase.from("opening_progress" as any).update(upsertData as any) as any)
        .eq("user_id", user.id)
        .eq("line_id", selectedLine.id);
    } else {
      await (supabase.from("opening_progress" as any).insert(upsertData as any) as any);
    }

    // Update local state
    setProgress((prev) => {
      const newMap = new Map(prev);
      newMap.set(selectedLine.id, upsertData as ProgressData);
      return newMap;
    });

    if (success) {
      toast.success(`${selectedLine.name} mastered! Next review in ${interval} day${interval > 1 ? "s" : ""}`);
    }
  };

  const retryDrill = () => {
    if (selectedLine) startDrill(selectedLine);
  };

  const filteredLines = lines.filter((line) => {
    if (filterDifficulty !== "all" && line.difficulty !== filterDifficulty) return false;
    if (filterColor !== "all" && line.color !== filterColor) return false;
    return true;
  });

  const now = new Date().toISOString();
  const dueLines = filteredLines.filter((line) => {
    const p = progress.get(line.id);
    return !p || p.next_review_at <= now;
  });

  // Drill view
  if (selectedLine && game) {
    const totalMoves = selectedLine.moves.length;
    const playerMoves = selectedLine.moves.filter((_, i) =>
      selectedLine.color === "w" ? i % 2 === 0 : i % 2 === 1
    ).length;
    const completedPlayerMoves = Math.floor(moveIndex / 2) + (moveIndex % 2 === 0 && selectedLine.color === "w" ? 0 : selectedLine.color === "b" ? 0 : 1);
    const drillProgress = (moveIndex / totalMoves) * 100;

    return (
      <div className="min-h-screen bg-background pt-20 pb-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <button
            onClick={() => { setSelectedLine(null); setGame(null); }}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            ← Back to openings
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 flex flex-col items-center">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <ChessBoard
                  game={game}
                  onMove={handleMove}
                  flipped={selectedLine.color === "b"}
                  disabled={drillStatus === "complete" || drillStatus === "wrong"}
                  sizeClassName="max-w-[min(80vw,480px)]"
                />
              </motion.div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="glass-card p-5 border-glow">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <h3 className="font-display font-bold text-sm">{selectedLine.name}</h3>
                  <span className="text-[10px] text-muted-foreground">{selectedLine.eco}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{selectedLine.description}</p>

                <Progress value={drillProgress} className="h-2 mb-2" />
                <p className="text-[10px] text-muted-foreground">
                  Move {moveIndex}/{totalMoves} · Playing as {selectedLine.color === "w" ? "White" : "Black"}
                </p>
              </div>

              <AnimatePresence mode="wait">
                {drillStatus === "waiting" && (
                  <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-5">
                    <p className="text-sm font-display font-bold">Your turn</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Play the correct move in the {selectedLine.name} opening.
                    </p>
                  </motion.div>
                )}

                {drillStatus === "correct" && (
                  <motion.div key="correct" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-5 border-emerald-500/30 border">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle2 className="w-5 h-5" />
                      <p className="font-display font-bold text-sm">Correct!</p>
                    </div>
                  </motion.div>
                )}

                {drillStatus === "wrong" && (
                  <motion.div key="wrong" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-5 border-destructive/30 border">
                    <div className="flex items-center gap-2 text-destructive mb-2">
                      <XCircle className="w-5 h-5" />
                      <p className="font-display font-bold text-sm">Incorrect</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Expected: <span className="font-mono font-bold text-foreground">{selectedLine.moves[moveIndex]}</span>
                    </p>
                    <button onClick={retryDrill} className="mt-3 flex items-center gap-1.5 bg-primary/15 text-primary text-xs font-display font-bold px-3 py-2 rounded-md">
                      <RotateCcw className="w-3.5 h-3.5" /> Try Again
                    </button>
                  </motion.div>
                )}

                {drillStatus === "complete" && (
                  <motion.div key="complete" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-5 border-glow gold-glow text-center">
                    <motion.div
                      animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.6 }}
                      className="text-4xl mb-2"
                    >
                      🎯
                    </motion.div>
                    <p className="font-display font-bold text-lg">Opening Complete!</p>
                    <p className="text-xs text-muted-foreground mt-1">You played the {selectedLine.name} perfectly.</p>
                    <div className="flex gap-2 justify-center mt-4">
                      <button onClick={retryDrill} className="bg-secondary text-xs font-display font-bold px-4 py-2 rounded-md">
                        Drill Again
                      </button>
                      <button onClick={() => { setSelectedLine(null); setGame(null); }} className="bg-primary text-primary-foreground text-xs font-display font-bold px-4 py-2 rounded-md">
                        Next Opening
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Move sequence reference */}
              <div className="glass-card p-5">
                <h4 className="font-display font-bold text-xs mb-2 text-muted-foreground uppercase tracking-wider">Move Sequence</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedLine.moves.map((move, i) => {
                    const isPlayed = i < moveIndex;
                    const isCurrent = i === moveIndex;
                    const isPlayerMove = selectedLine.color === "w" ? i % 2 === 0 : i % 2 === 1;
                    return (
                      <span
                        key={i}
                        className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                          isPlayed
                            ? "bg-primary/20 text-primary"
                            : isCurrent
                            ? "bg-accent/30 text-accent-foreground font-bold ring-1 ring-primary/40"
                            : isPlayerMove
                            ? "bg-secondary/60 text-foreground/50"
                            : "bg-muted/40 text-muted-foreground/50"
                        }`}
                      >
                        {i % 2 === 0 && <span className="text-muted-foreground mr-0.5">{Math.floor(i / 2) + 1}.</span>}
                        {isPlayed || isCurrent ? move : "?"}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold mb-2">Opening Trainer</h1>
            <p className="text-sm text-muted-foreground">Master chess openings with spaced repetition drills</p>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-card p-3 text-center">
              <p className="font-display font-bold text-lg">{lines.length}</p>
              <p className="text-[10px] text-muted-foreground">Openings</p>
            </div>
            <div className="glass-card p-3 text-center">
              <p className="font-display font-bold text-lg">{progress.size}</p>
              <p className="text-[10px] text-muted-foreground">Practiced</p>
            </div>
            <div className="glass-card p-3 text-center border-primary/30">
              <p className="font-display font-bold text-lg text-primary">{dueCount}</p>
              <p className="text-[10px] text-muted-foreground">Due for review</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground" />
            {["all", "beginner", "intermediate", "advanced"].map((d) => (
              <button
                key={d}
                onClick={() => setFilterDifficulty(d)}
                className={`text-xs px-2.5 py-1 rounded-full font-display font-bold transition-colors ${
                  filterDifficulty === d ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                }`}
              >
                {d === "all" ? "All Levels" : d}
              </button>
            ))}
            <span className="text-border">|</span>
            {[
              { value: "all", label: "Both" },
              { value: "w", label: "♔ White" },
              { value: "b", label: "♚ Black" },
            ].map((c) => (
              <button
                key={c.value}
                onClick={() => setFilterColor(c.value)}
                className={`text-xs px-2.5 py-1 rounded-full font-display font-bold transition-colors ${
                  filterColor === c.value ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Opening list */}
          <div className="space-y-2">
            {filteredLines.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No openings match your filters.</p>
            )}
            {filteredLines.map((line) => {
              const prog = progress.get(line.id);
              const isDue = !prog || prog.next_review_at <= now;
              const streak = prog?.correct_streak || 0;

              return (
                <motion.button
                  key={line.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => startDrill(line)}
                  className={`w-full glass-card p-4 text-left transition-all ${
                    isDue ? "hover:border-primary/30" : "hover:border-border/60 opacity-75"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary/60 flex items-center justify-center text-lg flex-shrink-0">
                      {line.color === "w" ? "♔" : "♚"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-bold text-sm">{line.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{line.eco}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${DIFFICULTY_COLORS[line.difficulty] || ""}`}>
                          {line.difficulty}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{line.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground">{line.moves.length} moves</span>
                        {streak > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] text-primary">
                            <Flame className="w-3 h-3" />{streak}
                          </span>
                        )}
                        {isDue && (
                          <span className="flex items-center gap-0.5 text-[10px] text-primary font-bold">
                            <Zap className="w-3 h-3" />Due
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default OpeningTrainer;
