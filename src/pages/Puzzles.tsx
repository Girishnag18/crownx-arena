import { useState, useEffect, useCallback, useMemo } from "react";
import { Chess, Square } from "chess.js";
import { motion } from "framer-motion";
import { Flame, Trophy, Target, CheckCircle2, XCircle, ChevronRight, Crown, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import ChessBoard from "@/components/chess/ChessBoard";
import { soundManager } from "@/services/soundManager";
import PullToRefresh from "@/components/common/PullToRefresh";

interface Puzzle {
  id: string;
  fen: string;
  solution: string[];
  rating: number;
  themes: string[];
}

interface PuzzleStats {
  puzzle_rating: number;
  puzzle_streak: number;
  puzzles_solved: number;
}

const Puzzles = () => {
  const { user } = useAuth();
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [game, setGame] = useState<Chess | null>(null);
  const [moveIndex, setMoveIndex] = useState(0);
  const [status, setStatus] = useState<"solving" | "correct" | "wrong" | "loading">("loading");
  const [stats, setStats] = useState<PuzzleStats>({ puzzle_rating: 1200, puzzle_streak: 0, puzzles_solved: 0 });
  const [leaderboard, setLeaderboard] = useState<Array<{ username: string; puzzles_solved: number; puzzle_rating: number }>>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [solvedIds, setSolvedIds] = useState<Set<string>>(new Set());
  const [startTime, setStartTime] = useState<number>(0);

  const loadStats = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("profiles")
      .select("puzzle_rating, puzzle_streak, puzzles_solved")
      .eq("id", user.id)
      .single();
    if (data) setStats(data);
  }, [user]);

  const loadLeaderboard = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("profiles")
      .select("username, puzzles_solved, puzzle_rating")
      .order("puzzles_solved", { ascending: false })
      .limit(10);
    if (data) setLeaderboard(data);
  }, []);

  const loadSolvedIds = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("puzzle_attempts")
      .select("puzzle_id")
      .eq("user_id", user.id)
      .eq("solved", true);
    if (data) setSolvedIds(new Set(data.map((d: any) => d.puzzle_id)));
  }, [user]);

  const loadRandomPuzzle = useCallback(async () => {
    setStatus("loading");

    // Get all puzzles, pick one not yet solved
    const { data: puzzles } = await (supabase as any)
      .from("puzzles")
      .select("id, fen, solution, rating, themes")
      .order("rating", { ascending: true });

    if (!puzzles || puzzles.length === 0) {
      toast.error("No puzzles available");
      return;
    }

    // Prefer unsolved puzzles near user's rating
    const unsolved = puzzles.filter((p: Puzzle) => !solvedIds.has(p.id));
    const pool = unsolved.length > 0 ? unsolved : puzzles;

    // Pick weighted random near puzzle_rating
    const sorted = pool.sort((a: Puzzle, b: Puzzle) =>
      Math.abs(a.rating - stats.puzzle_rating) - Math.abs(b.rating - stats.puzzle_rating)
    );
    const pick = sorted[Math.floor(Math.random() * Math.min(5, sorted.length))];

    setPuzzle(pick);
    const newGame = new Chess(pick.fen);
    setGame(newGame);
    setMoveIndex(0);
    setLastMove(null);
    setStatus("solving");
    setStartTime(Date.now());
  }, [solvedIds, stats.puzzle_rating]);

  useEffect(() => {
    loadStats();
    loadLeaderboard();
    loadSolvedIds();
  }, [loadStats, loadLeaderboard, loadSolvedIds]);

  useEffect(() => {
    if (solvedIds !== null && status === "loading") {
      loadRandomPuzzle();
    }
  }, [solvedIds]);

  const playerColor = useMemo(() => {
    if (!puzzle) return "w";
    // The side to move in the FEN is the one that needs to find the solution
    const fen = puzzle.fen;
    return fen.split(" ")[1] as "w" | "b";
  }, [puzzle]);

  const handleMove = useCallback(async (from: Square, to: Square, promotion?: string): Promise<boolean> => {
    if (!game || !puzzle || status !== "solving") return false;

    const expectedSan = puzzle.solution[moveIndex];
    const gameCopy = new Chess(game.fen());

    try {
      const move = gameCopy.move({ from, to, promotion: promotion || undefined });
      if (!move) return false;

      // Check if move matches expected solution
      if (move.san === expectedSan) {
        setGame(gameCopy);
        setLastMove({ from, to });
        soundManager.play(move.captured ? "capture" : "move");

        const nextIndex = moveIndex + 1;

        if (nextIndex >= puzzle.solution.length) {
          // Puzzle solved!
          setStatus("correct");
          soundManager.play("gameEnd");

          if (user) {
            const timeTaken = Math.round((Date.now() - startTime) / 1000);
            const ratingGain = Math.max(5, Math.round((puzzle.rating - stats.puzzle_rating) / 10) + 10);

            await Promise.all([
              (supabase as any).from("puzzle_attempts").insert({
                user_id: user.id,
                puzzle_id: puzzle.id,
                solved: true,
                time_seconds: timeTaken,
              }),
              (supabase as any).from("profiles").update({
                puzzle_rating: stats.puzzle_rating + ratingGain,
                puzzle_streak: stats.puzzle_streak + 1,
                puzzles_solved: stats.puzzles_solved + 1,
              }).eq("id", user.id),
            ]);

            setStats((prev) => ({
              puzzle_rating: prev.puzzle_rating + ratingGain,
              puzzle_streak: prev.puzzle_streak + 1,
              puzzles_solved: prev.puzzles_solved + 1,
            }));
            setSolvedIds((prev) => new Set([...prev, puzzle.id]));
            loadLeaderboard();
          }

          toast.success(`Puzzle solved! +${Math.max(5, Math.round((puzzle.rating - stats.puzzle_rating) / 10) + 10)} rating`);
        } else {
          setMoveIndex(nextIndex);
        }

        return true;
      } else {
        // Wrong move
        setStatus("wrong");
        soundManager.play("check");

        if (user) {
          const ratingLoss = Math.min(15, Math.max(3, Math.round((stats.puzzle_rating - puzzle.rating) / 10) + 5));

          await Promise.all([
            (supabase as any).from("puzzle_attempts").insert({
              user_id: user.id,
              puzzle_id: puzzle.id,
              solved: false,
            }),
            (supabase as any).from("profiles").update({
              puzzle_rating: Math.max(100, stats.puzzle_rating - ratingLoss),
              puzzle_streak: 0,
            }).eq("id", user.id),
          ]);

          setStats((prev) => ({
            ...prev,
            puzzle_rating: Math.max(100, prev.puzzle_rating - ratingLoss),
            puzzle_streak: 0,
          }));
        }

        toast.error(`Wrong! The correct move was ${expectedSan}`);
        return false;
      }
    } catch {
      return false;
    }
  }, [game, puzzle, moveIndex, status, user, stats, startTime, loadLeaderboard]);

  const getDifficultyLevel = (rating: number): { label: string; color: string; bg: string } => {
    if (rating <= 800) return { label: "Beginner", color: "text-emerald-400", bg: "bg-emerald-500/10" };
    if (rating <= 1100) return { label: "Intermediate", color: "text-blue-400", bg: "bg-blue-500/10" };
    if (rating <= 1400) return { label: "Advanced", color: "text-violet-400", bg: "bg-violet-500/10" };
    if (rating <= 1700) return { label: "Expert", color: "text-orange-400", bg: "bg-orange-500/10" };
    return { label: "Master", color: "text-primary", bg: "bg-primary/10" };
  };

  const themeLabels: Record<string, string> = {
    "mate-in-1": "Mate in 1",
    "back-rank": "Back Rank",
    "scholar-mate": "Scholar's Mate",
    "tactics": "Tactics",
    "capture": "Capture",
    "opening": "Opening",
    "center-control": "Center Control",
    "pawn-break": "Pawn Break",
    "pin": "Pin",
    "development": "Development",
    "castling": "Castling",
    "italian-game": "Italian Game",
    "quiet-move": "Quiet Move",
    "ruy-lopez": "Ruy López",
    "exchange": "Exchange",
    "nimzo-indian": "Nimzo-Indian",
    "safety": "King Safety",
    "endgame": "Endgame",
    "bishop": "Bishop",
    "attacking-queen": "Attacking Queen",
    "sacrifice": "Sacrifice",
    "kings-indian-classical": "King's Indian",
    "en-passant": "En Passant",
    "positional": "Positional",
  };

  const handlePullRefresh = useCallback(async () => {
    await Promise.all([loadStats(), loadLeaderboard(), loadSolvedIds()]);
    await loadRandomPuzzle();
  }, [loadStats, loadLeaderboard, loadSolvedIds, loadRandomPuzzle]);

  return (
    <div className="page-container">
      <PullToRefresh onRefresh={handlePullRefresh}>
      <div className="page-content page-content--wide">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-6">
          {/* Board */}
          <div className="lg:col-span-8 flex flex-col items-center">
            {/* Puzzle info bar */}
            <div className="w-full max-w-[96vw] mb-2 sm:mb-3 rounded-lg border border-border/60 bg-secondary/20 px-3 sm:px-4 py-2 sm:py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-primary" />
                  <div>
                    <h1 className="font-display font-bold text-sm flex items-center gap-2">
                      {puzzle ? (
                        <>
                          Puzzle • Rating {puzzle.rating}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getDifficultyLevel(puzzle.rating).bg} ${getDifficultyLevel(puzzle.rating).color}`}>
                            {getDifficultyLevel(puzzle.rating).label}
                          </span>
                        </>
                      ) : "Loading..."}
                    </h1>
                    <p className="text-xs text-muted-foreground">
                      {playerColor === "w" ? "White" : "Black"} to move
                      {puzzle && ` • ${puzzle.solution.length} move${puzzle.solution.length > 1 ? "s" : ""}`}
                    </p>
                  </div>
                </div>
                {puzzle && (
                  <div className="flex gap-1 flex-wrap">
                    {puzzle.themes.slice(0, 3).map((t) => (
                      <span key={t} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-display font-bold">
                        {themeLabels[t] || t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {game && (
              <ChessBoard
                game={game}
                onMove={handleMove}
                flipped={playerColor === "b"}
                disabled={status !== "solving"}
                lastMove={lastMove}
                sizeClassName="max-w-[96vw]"
              />
            )}

            {/* Result banner */}
            {status === "correct" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 w-full max-w-[96vw] rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="font-display font-bold text-sm">Correct!</span>
                </div>
                <button
                  onClick={loadRandomPuzzle}
                  className="bg-primary text-primary-foreground font-display font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1"
                >
                  Next Puzzle <ChevronRight className="w-3 h-3" />
                </button>
              </motion.div>
            )}

            {status === "wrong" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 w-full max-w-[96vw] rounded-lg border border-destructive/30 bg-destructive/10 p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-destructive" />
                  <span className="font-display font-bold text-sm">Incorrect — streak reset</span>
                </div>
                <button
                  onClick={loadRandomPuzzle}
                  className="bg-primary text-primary-foreground font-display font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1"
                >
                  Try Another <ChevronRight className="w-3 h-3" />
                </button>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-4">
            {/* Stats */}
            <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-5 border-glow">
              <h2 className="font-display font-bold text-sm mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Your Puzzle Stats
              </h2>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-secondary/50 rounded-lg p-3 text-center">
                  <div className="font-display text-lg font-bold">{stats.puzzle_rating}</div>
                  <div className="text-[10px] text-muted-foreground">Rating</div>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3 text-center">
                  <div className="font-display text-lg font-bold flex items-center justify-center gap-1">
                    <Flame className="w-4 h-4 text-orange-400" />
                    {stats.puzzle_streak}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Streak</div>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3 text-center">
                  <div className="font-display text-lg font-bold">{stats.puzzles_solved}</div>
                  <div className="text-[10px] text-muted-foreground">Solved</div>
                </div>
              </div>
            </motion.div>

            {/* Hint */}
            {puzzle && status === "solving" && (
              <div className="glass-card p-4 border border-primary/20">
                <p className="text-xs text-muted-foreground">
                  <span className="font-display font-bold text-foreground">Hint:</span>{" "}
                  Find the best move for {playerColor === "w" ? "White" : "Black"}.
                  {moveIndex > 0 && ` Move ${moveIndex + 1} of ${puzzle.solution.length}`}
                </p>
              </div>
            )}

            {/* Leaderboard */}
            <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="glass-card p-5">
              <h2 className="font-display font-bold text-sm mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                Puzzle Leaderboard
              </h2>
              {leaderboard.length === 0 ? (
                <p className="text-xs text-muted-foreground">No puzzle solvers yet</p>
              ) : (
                <div className="space-y-1">
                  {leaderboard.map((entry, i) => (
                    <div key={i} className={`flex items-center justify-between py-2 px-2 rounded text-sm ${i < 3 ? "bg-primary/5" : ""}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold w-5 text-right text-muted-foreground">
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                        </span>
                        <span className="font-semibold text-sm">{entry.username || "Player"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-bold text-foreground">{entry.puzzle_rating}</span>
                        <span>{entry.puzzles_solved} solved</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
      </PullToRefresh>
    </div>
  );
};

export default Puzzles;
