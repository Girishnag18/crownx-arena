import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Star, Zap, Lock, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

const ACHIEVEMENT_TARGETS: Record<string, { getter: (s: AchievementsPanelProps) => number; target: number }> = {
  first_game: { getter: (s) => s.gamesPlayed || 0, target: 1 },
  win_5: { getter: (s) => s.wins || 0, target: 5 },
  win_25: { getter: (s) => s.wins || 0, target: 25 },
  win_100: { getter: (s) => s.wins || 0, target: 100 },
  streak_3: { getter: (s) => s.winStreak || 0, target: 3 },
  streak_5: { getter: (s) => s.winStreak || 0, target: 5 },
  streak_10: { getter: (s) => s.winStreak || 0, target: 10 },
  puzzle_10: { getter: (s) => s.puzzlesSolved || 0, target: 10 },
  puzzle_50: { getter: (s) => s.puzzlesSolved || 0, target: 50 },
  puzzle_100: { getter: (s) => s.puzzlesSolved || 0, target: 100 },
  elo_500: { getter: (s) => s.crownScore || 0, target: 500 },
  elo_800: { getter: (s) => s.crownScore || 0, target: 800 },
  elo_1200: { getter: (s) => s.crownScore || 0, target: 1200 },
  elo_1600: { getter: (s) => s.crownScore || 0, target: 1600 },
};

const UNLOCK_CONDITIONS: Record<string, (stats: AchievementsPanelProps) => boolean> = Object.fromEntries(
  Object.entries(ACHIEVEMENT_TARGETS).map(([key, { getter, target }]) => [
    key,
    (s: AchievementsPanelProps) => getter(s) >= target,
  ])
);

const categoryIcons: Record<string, string> = {
  games: "🎮",
  wins: "🏆",
  streak: "🔥",
  puzzles: "🧩",
  rating: "⭐",
};

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: i * 0.03, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  }),
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

    const unlockedIds = new Set<string>((playerAchievements || []).map((pa: PlayerAchievement) => pa.achievement_id));
    setUnlocked(unlockedIds);
  }, [user]);

  const checkUnlocks = useCallback(async () => {
    if (!user || achievements.length === 0) return;

    for (const achievement of achievements) {
      if (unlocked.has(achievement.id)) continue;

      const condition = UNLOCK_CONDITIONS[achievement.key];
      if (condition && condition(stats)) {
        const { error } = await (supabase.from("player_achievements" as any).insert({
          user_id: user.id,
          achievement_id: achievement.id,
        } as any) as any);

        if (!error) {
          setUnlocked((prev) => new Set([...prev, achievement.id]));
          setNewUnlock(achievement);

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

  const categories = Array.from(new Set(achievements.map((a) => a.category)));

  return (
    <>
      {/* Achievement unlock toast */}
      <AnimatePresence>
        {newUnlock && (
          <motion.div
            initial={{ opacity: 0, y: -60, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.9 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="rounded-xl border border-primary/30 bg-card/95 backdrop-blur-xl px-6 py-4 flex items-center gap-4 shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.3)]">
              <motion.span
                className="text-4xl"
                animate={{ rotate: [0, -15, 15, -10, 10, 0], scale: [1, 1.3, 1] }}
                transition={{ duration: 0.8 }}
              >
                {newUnlock.icon}
              </motion.span>
              <div>
                <p className="text-[10px] text-primary font-display font-bold tracking-widest uppercase">Achievement Unlocked!</p>
                <p className="font-display font-bold text-sm">{newUnlock.title}</p>
                <p className="text-[10px] text-muted-foreground">{newUnlock.description}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Zap className="w-3 h-3 text-primary" />
                  <span className="text-[10px] text-primary font-bold">+{newUnlock.xp_reward} XP</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-5">
        {/* Overall progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display font-bold text-sm flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              Overall Progress
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-display font-bold text-primary">{unlockedCount}</span>
              <span className="text-[10px] text-muted-foreground">/ {totalCount} unlocked</span>
            </div>
          </div>

          <div className="relative h-3 rounded-full bg-secondary/50 overflow-hidden border border-border/20">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-primary/80 to-primary/60"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
            />
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-white/20 to-transparent"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
              style={{ mixBlendMode: "overlay" }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground text-right mt-1 font-medium">{progress.toFixed(0)}% complete</p>
        </div>

        {/* Categories */}
        {categories.map((category, catIdx) => {
          const categoryAchievements = achievements.filter((a) => a.category === category);
          const catUnlocked = categoryAchievements.filter((a) => unlocked.has(a.id)).length;

          return (
            <div key={category}>
              {/* Category header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{categoryIcons[category.toLowerCase()] || "🏅"}</span>
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-display font-bold">{category}</p>
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {catUnlocked}/{categoryAchievements.length}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {categoryAchievements.map((achievement, i) => {
                  const isUnlocked = unlocked.has(achievement.id);
                  const target = ACHIEVEMENT_TARGETS[achievement.key];
                  const current = target ? Math.min(target.getter(stats), target.target) : 0;
                  const pct = target ? Math.round((current / target.target) * 100) : 0;

                  return (
                    <motion.div
                      key={achievement.id}
                      custom={catIdx * 4 + i}
                      variants={fadeUp}
                      initial="hidden"
                      animate="show"
                      whileHover={{ scale: 1.01, y: -1 }}
                      className={`relative rounded-xl px-3.5 py-3 transition-all overflow-hidden group ${
                        isUnlocked
                          ? "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/25 shadow-[0_2px_12px_-4px_hsl(var(--primary)/0.15)]"
                          : "bg-card/40 border border-border/30 hover:border-border/50"
                      }`}
                    >
                      {/* Subtle glow for unlocked */}
                      {isUnlocked && (
                        <div className="absolute top-0 right-0 w-20 h-20 bg-[radial-gradient(circle,hsl(var(--primary)/0.08),transparent_70%)]" />
                      )}

                      <div className="relative flex items-center gap-3">
                        {/* Icon container */}
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                          isUnlocked
                            ? "bg-primary/15 border border-primary/20"
                            : "bg-secondary/40 border border-border/30"
                        }`}>
                          {isUnlocked ? (
                            <span className="text-xl">{achievement.icon}</span>
                          ) : (
                            <Lock className="w-4 h-4 text-muted-foreground/40" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className={`text-xs font-display font-bold truncate ${isUnlocked ? "text-foreground" : "text-muted-foreground"}`}>
                              {achievement.title}
                            </p>
                            {isUnlocked && <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />}
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{achievement.description}</p>

                          {/* Progress bar for locked */}
                          {!isUnlocked && target && (
                            <div className="mt-1.5">
                              <div className="h-1.5 rounded-full bg-secondary/60 overflow-hidden">
                                <motion.div
                                  className="h-full rounded-full bg-gradient-to-r from-primary/50 to-primary/30"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.7, ease: "easeOut", delay: (catIdx * 4 + i) * 0.03 }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right side badge */}
                        <div className="flex flex-col items-end gap-0.5 shrink-0">
                          {isUnlocked ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                              <Star className="w-2.5 h-2.5 fill-primary" />
                              {achievement.xp_reward} XP
                            </span>
                          ) : target ? (
                            <span className="text-[10px] text-muted-foreground font-display font-bold tabular-nums">
                              {current}/{target.target}
                            </span>
                          ) : (
                            <Star className="w-3 h-3 text-muted-foreground/30" />
                          )}
                        </div>
                      </div>
                    </motion.div>
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
