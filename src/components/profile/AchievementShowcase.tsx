import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Trophy, Lock } from "lucide-react";

interface Achievement {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  xp_reward: number;
}

interface UnlockedAchievement {
  achievement_id: string;
  unlocked_at: string;
}

interface AchievementShowcaseProps {
  playerId: string;
}

const AchievementShowcase = ({ playerId }: AchievementShowcaseProps) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unlocked, setUnlocked] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: allAch }, { data: playerAch }] = await Promise.all([
        supabase.from("achievements").select("*").order("category"),
        (supabase as any).from("player_achievements")
          .select("achievement_id, unlocked_at")
          .eq("user_id", playerId),
      ]);

      if (allAch) setAchievements(allAch as unknown as Achievement[]);

      const map = new Map<string, string>();
      ((playerAch || []) as UnlockedAchievement[]).forEach((a) =>
        map.set(a.achievement_id, a.unlocked_at)
      );
      setUnlocked(map);
      setLoading(false);
    };
    load();
  }, [playerId]);

  if (loading) {
    return (
      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card p-4 animate-pulse h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  const unlockedCount = unlocked.size;
  const totalCount = achievements.length;
  const progress = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  // Group by category
  const categories = Array.from(new Set(achievements.map((a) => a.category)));

  return (
    <div className="space-y-6">
      {/* Progress summary */}
      <div className="glass-card p-4 border-glow">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <span className="font-display font-bold text-sm">Achievements</span>
          </div>
          <span className="text-xs text-muted-foreground">{unlockedCount}/{totalCount} unlocked</span>
        </div>
        <div className="w-full bg-secondary/60 rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-2 rounded-full bg-primary"
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">{progress}% complete</p>
      </div>

      {/* By category */}
      {categories.map((cat) => {
        const catAchievements = achievements.filter((a) => a.category === cat);
        return (
          <div key={cat}>
            <p className="text-xs uppercase tracking-wider font-display font-bold text-muted-foreground mb-2">
              {cat}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {catAchievements.map((ach) => {
                const isUnlocked = unlocked.has(ach.id);
                const unlockedAt = isUnlocked ? unlocked.get(ach.id) : null;

                return (
                  <motion.div
                    key={ach.id}
                    whileHover={{ scale: 1.02 }}
                    className={`rounded-lg border p-3 text-center transition-all ${
                      isUnlocked
                        ? "border-primary/30 bg-primary/5"
                        : "border-border/30 bg-secondary/20 opacity-50"
                    }`}
                  >
                    <div className="text-2xl mb-1">
                      {isUnlocked ? ach.icon : <Lock className="w-5 h-5 text-muted-foreground mx-auto" />}
                    </div>
                    <p className="font-display font-bold text-[11px] leading-tight">{ach.title}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5 line-clamp-2">{ach.description}</p>
                    {isUnlocked && (
                      <p className="text-[9px] text-primary font-bold mt-1">+{ach.xp_reward} XP</p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AchievementShowcase;
