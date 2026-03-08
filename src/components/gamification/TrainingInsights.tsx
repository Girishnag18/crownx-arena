import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BrainCircuit, Target, TrendingDown, TrendingUp, Loader2, BookOpen, Puzzle, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface GameAnalysis {
  result_type: string;
  winner_id: string | null;
  duration_seconds: number | null;
  game_mode: string;
  created_at: string;
}

interface InsightData {
  totalGames: number;
  winRate: number;
  avgDuration: number;
  shortGameLosses: number;
  longGameWinRate: number;
  recentForm: string;
  weakPhase: string;
  suggestion: string;
}

const TrainingInsights = ({ userId }: { userId: string }) => {
  const [insights, setInsights] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, [userId]);

  const loadInsights = async () => {
    setLoading(true);

    const { data: games } = await supabase
      .from("games")
      .select("result_type, winner_id, duration_seconds, game_mode, created_at")
      .or(`player_white.eq.${userId},player_black.eq.${userId}`)
      .neq("result_type", "pending")
      .neq("result_type", "in_progress")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!games || games.length < 3) {
      setLoading(false);
      return;
    }

    const typedGames = games as unknown as GameAnalysis[];
    const totalGames = typedGames.length;
    const wins = typedGames.filter(g => g.winner_id === userId).length;
    const losses = typedGames.filter(g => g.winner_id && g.winner_id !== userId).length;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

    const durations = typedGames.filter(g => g.duration_seconds).map(g => g.duration_seconds!);
    const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

    // Short game losses (under 60 moves / ~3 min = opening weakness)
    const shortGames = typedGames.filter(g => g.duration_seconds && g.duration_seconds < 180);
    const shortGameLosses = shortGames.filter(g => g.winner_id && g.winner_id !== userId).length;

    // Long game win rate (endgame strength)
    const longGames = typedGames.filter(g => g.duration_seconds && g.duration_seconds > 600);
    const longGameWins = longGames.filter(g => g.winner_id === userId).length;
    const longGameWinRate = longGames.length > 0 ? Math.round((longGameWins / longGames.length) * 100) : 0;

    // Recent form (last 5)
    const recent5 = typedGames.slice(0, 5);
    const recentWins = recent5.filter(g => g.winner_id === userId).length;
    const recentForm = recentWins >= 4 ? "🔥 Hot streak" : recentWins >= 3 ? "📈 Good form" : recentWins >= 2 ? "➡️ Neutral" : "📉 Cold streak";

    // Determine weak phase
    let weakPhase = "Opening";
    let suggestion = "Study common openings to avoid early blunders";

    if (shortGameLosses > totalGames * 0.3) {
      weakPhase = "Opening";
      suggestion = "Practice opening fundamentals — try the Opening Trainer";
    } else if (longGameWinRate < 40 && longGames.length >= 3) {
      weakPhase = "Endgame";
      suggestion = "Focus on endgame puzzles — king & pawn endings first";
    } else if (winRate < 45) {
      weakPhase = "Tactics";
      suggestion = "Solve daily puzzles to sharpen tactical awareness";
    } else {
      weakPhase = "Time management";
      suggestion = "Practice with timed games to improve decision speed";
    }

    setInsights({
      totalGames,
      winRate,
      avgDuration,
      shortGameLosses,
      longGameWinRate,
      recentForm,
      weakPhase,
      suggestion,
    });
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border/40 bg-card/60 p-5 flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
      </div>
    );
  }

  if (!insights) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
        <BrainCircuit className="w-4 h-4 text-primary" />
        <h3 className="font-display font-bold text-sm">Training Insights</h3>
        <span className="text-[9px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full ml-auto">
          AI-Powered
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Form & Phase */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-secondary/40 p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Recent Form</p>
            <p className="font-display font-bold text-sm mt-1">{insights.recentForm}</p>
          </div>
          <div className="rounded-lg bg-secondary/40 p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Weak Area</p>
            <p className="font-display font-bold text-sm mt-1 flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-destructive" />
              {insights.weakPhase}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Win Rate", value: `${insights.winRate}%`, icon: Target, trend: insights.winRate >= 50 },
            { label: "Avg Game", value: `${Math.floor(insights.avgDuration / 60)}m`, icon: Zap, trend: true },
            { label: "Endgame", value: `${insights.longGameWinRate}%`, icon: BookOpen, trend: insights.longGameWinRate >= 50 },
          ].map(s => (
            <div key={s.label} className="rounded-lg bg-secondary/30 p-2.5 text-center">
              <s.icon className="w-3.5 h-3.5 text-primary mx-auto mb-1" />
              <p className="font-display font-bold text-sm">{s.value}</p>
              <p className="text-[9px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* AI Suggestion */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 flex items-start gap-2.5">
          <Puzzle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Recommended Focus</p>
            <p className="text-xs text-muted-foreground mt-0.5">{insights.suggestion}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TrainingInsights;
