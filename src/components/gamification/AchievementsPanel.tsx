import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Star, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";

interface Achievement {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  xp_reward: number;
  category: string;
}

interface PlayerAchievement {
  achievement_id: string;
  unlocked_at: string;
}

interface AchievementsPanelProps {
  wins?: number;
  winStreak?: number;
  puzzlesSolved?: number;
  crownScore?: number;
  gamesPlayed?: number;
}

// Achievement unlock conditions
const UNLOCK_CONDITIONS: Record<string, (stats: AchievementsPanelProps) => boolean> = {
  first_game: (s) => (s.gamesPlayed || 0) >= 1,
  win_5: (s) => (s.wins || 0) >= 5,
  win_25: (s) => (s.wins || 0) >= 25,
  win_100: (s) => (s.wins || 0) >= 100,
  streak_3: (s) => (s.winStreak || 0) >= 3,
  streak_5: (s) => (s.winStreak || 0) >= 5,
  streak_10: (s) => (s.winStreak || 0) >= 10,
  puzzle_10: (s) => (s.puzzlesSolved || 0) >= 10,
  puzzle_50: (s) => (s.puzzlesSolved || 0) >= 50,
  puzzle_100: (s) => (s.puzzlesSolved || 0) >= 100,
  elo_500: (s) => (s.crownScore || 0) >= 500,
  elo_800: (s) => (s.crownScore || 0) >= 800,
  elo_1200: (s) => (s.crownScore || 0) >= 1200,
  elo_1600: (s) => (s.crownScore || 0) >= 1600,
};

const AchievementsPanel = ({ wins = 0, winStreak = 0, puzzlesSolved = 0, crownScore = 0, gamesPlayed = 0 }: AchievementsPanelProps) => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [newUnlock, setNewUnlock] = useState<Achievement | null>(null);

  const stats = { wins, winStreak, puzzlesSolved, crownScore, gamesPlayed };

  const loadAchievements = useCallback(async () => {
    const { data: allAchievements } = await (supabase.from("achievements" as any).select("*") as any);
    if (allAchievements) setAchievements(allAchievements as Achievement[]);

    if (!user) return;

    const { data: playerAchievements } = await (supabase
      .from("player_achievements" as any)
      .select("achievement_id") as any)
      .eq("user_id", user.id);

    const unlockedIds = new Set((playerAchievements || []).map((pa: PlayerAchievement) => pa.achievement_id));
    setUnlocked(unlockedIds);
  }, [user]);

  // Check and unlock new achievements
  const checkUnlocks = useCallback(async () => {
    if (!user || achievements.length === 0) return;

    for (const achievement of achievements) {
      if (unlocked.has(achievement.id)) continue;

      const condition = UNLOCK_CONDITIONS[achievement.key];
      if (condition && condition(stats)) {
        // Unlock it
        const { error } = await (supabase.from("player_achievements" as any).insert({
          user_id: user.id,
          achievement_id: achievement.id,
        } as any) as any);

        if (!error) {
          setUnlocked((prev) => new Set([...prev, achievement.id]));
          setNewUnlock(achievement);

          // Award XP
          const { data: profile } = await supabase
            .from("profiles")
            .select("xp, level")
            .eq("id", user.id)
            .single();

          if (profile) {
            const newXp = (profile.xp || 0) + achievement.xp_reward;
            const newLevel = Math.floor(newXp / 500) + 1;
            await supabase
              .from("profiles")
              .update({ xp: newXp, level: newLevel })
              .eq("id", user.id);
          }

          // Auto-dismiss after 3s
          setTimeout(() => setNewUnlock(null), 3500);
        }
      }
    }
  }, [user, achievements, unlocked, stats]);

  useEffect(() => {
    loadAchievements();
  }, [loadAchievements]);

  useEffect(() => {
    if (achievements.length > 0) checkUnlocks();
  }, [achievements.length, wins, winStreak, puzzlesSolved, crownScore, gamesPlayed]);

  const unlockedCount = unlocked.size;
  const totalCount = achievements.length;
  const progress = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  // Group by category
  const categories = Array.from(new Set(achievements.map((a) => a.category)));

  return (
    <>
      {/* Achievement unlock animation */}
      <AnimatePresence>
        {newUnlock && (
          <motion.div
            initial={{ opacity: 0, y: -60, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.9 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="glass-card border-glow gold-glow px-6 py-4 flex items-center gap-4 shadow-2xl">
              <motion.span
                className="text-4xl"
                animate={{ rotate: [0, -15, 15, -10, 10, 0], scale: [1, 1.3, 1] }}
                transition={{ duration: 0.8 }}
              >
                {newUnlock.icon}
              </motion.span>
              <div>
                <p className="text-xs text-primary font-display font-bold tracking-wider">ACHIEVEMENT UNLOCKED!</p>
                <p className="font-display font-bold text-sm">{newUnlock.title}</p>
                <p className="text-xs text-muted-foreground">{newUnlock.description}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Zap className="w-3 h-3 text-primary" />
                  <span className="text-xs text-primary font-bold">+{newUnlock.xp_reward} XP</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panel */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Achievements
          </h3>
          <span className="text-xs text-muted-foreground">{unlockedCount}/{totalCount}</span>
        </div>

        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          <p className="text-[10px] text-muted-foreground text-right">{progress.toFixed(0)}% complete</p>
        </div>

        {categories.map((category) => {
          const categoryAchievements = achievements.filter((a) => a.category === category);
          return (
            <div key={category} className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{category}</p>
              <div className="grid grid-cols-1 gap-1.5">
                {categoryAchievements.map((achievement) => {
                  const isUnlocked = unlocked.has(achievement.id);
                  return (
                    <div
                      key={achievement.id}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                        isUnlocked
                          ? "bg-primary/10 border border-primary/20"
                          : "bg-secondary/30 border border-border/40 opacity-60"
                      }`}
                    >
                      <span className={`text-xl ${isUnlocked ? "" : "grayscale"}`}>{achievement.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-display font-bold truncate">{achievement.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{achievement.description}</p>
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <Star className={`w-3 h-3 ${isUnlocked ? "text-primary" : "text-muted-foreground/40"}`} />
                        <span className="text-[10px] text-muted-foreground">{achievement.xp_reward}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default AchievementsPanel;
