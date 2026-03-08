import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Calendar, Flame, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const DailyPuzzleCard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hasDailyPuzzle, setHasDailyPuzzle] = useState(false);
  const [dailySolved, setDailySolved] = useState(false);
  const [streak, setStreakDays] = useState(0);

  useEffect(() => {
    const check = async () => {
      // Check if daily puzzle exists for today
      const today = new Date().toISOString().split("T")[0];
      const { data: daily } = await (supabase
        .from("daily_puzzles" as any)
        .select("puzzle_id") as any)
        .eq("active_date", today)
        .maybeSingle();

      setHasDailyPuzzle(!!daily);

      if (!user || !daily) return;

      // Check if user solved today's daily
      const { data: attempt } = await (supabase
        .from("puzzle_attempts" as any)
        .select("solved") as any)
        .eq("user_id", user.id)
        .eq("puzzle_id", daily.puzzle_id)
        .eq("solved", true)
        .maybeSingle();

      setDailySolved(!!attempt);

      // Load puzzle streak from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("puzzle_streak")
        .eq("id", user.id)
        .single();

      if (profile) setStreakDays(profile.puzzle_streak || 0);
    };

    check();
  }, [user]);

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate("/puzzles")}
      className="w-full glass-card p-4 text-left group transition-all hover:border-primary/30"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
          <Calendar className="w-5 h-5 text-accent-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="font-display font-bold text-sm">Daily Puzzle</h3>
          <p className="text-xs text-muted-foreground">
            {dailySolved ? "✅ Completed today!" : hasDailyPuzzle ? "New puzzle available" : "Solve puzzles to build your streak"}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {streak > 0 && (
            <div className="flex items-center gap-1 bg-destructive/15 text-destructive px-2 py-0.5 rounded-full">
              <Flame className="w-3 h-3" />
              <span className="text-[10px] font-bold">{streak}</span>
            </div>
          )}
          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </motion.button>
  );
};

export default DailyPuzzleCard;
