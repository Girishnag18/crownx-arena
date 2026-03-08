import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AchievementsPanel from "@/components/gamification/AchievementsPanel";
import { useNavigate } from "react-router-dom";

const Achievements = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{
    wins: number;
    win_streak: number;
    puzzles_solved: number;
    crown_score: number;
    games_played: number;
  } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) { navigate("/auth"); return; }
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("wins, win_streak, puzzles_solved, crown_score, games_played")
        .eq("id", user.id)
        .single();
      if (data) setProfile(data as any);
    };
    load();
  }, [user, authLoading, navigate]);

  return (
    <div className="min-h-screen bg-background pt-16 sm:pt-18 pb-16 lg:pb-4 px-2 sm:px-4">
      <div className="container mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display font-black text-xl tracking-tight">Achievements</h1>
              <p className="text-xs text-muted-foreground">Track your progress and unlock rewards</p>
            </div>
          </div>

          <div className="rounded-xl border border-border/30 bg-card/60 backdrop-blur-sm p-4 sm:p-5">
            <AchievementsPanel
              wins={profile?.wins || 0}
              winStreak={profile?.win_streak || 0}
              puzzlesSolved={profile?.puzzles_solved || 0}
              crownScore={profile?.crown_score || 0}
              gamesPlayed={profile?.games_played || 0}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Achievements;
