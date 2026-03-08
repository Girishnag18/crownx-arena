import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Crown, Sparkles, Star, Shield, Target } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AchievementsPanel from "@/components/gamification/AchievementsPanel";
import { useNavigate } from "react-router-dom";

const rankGradient: Record<string, string> = {
  Bronze: "from-amber-700/25 via-amber-800/10 to-transparent",
  Silver: "from-slate-300/20 via-slate-400/8 to-transparent",
  Gold: "from-yellow-500/20 via-amber-500/8 to-transparent",
  Platinum: "from-cyan-400/20 via-blue-500/8 to-transparent",
  Diamond: "from-violet-400/20 via-purple-500/8 to-transparent",
  "Crown Master": "from-primary/25 via-amber-500/10 to-transparent",
};

const rankBorderColor: Record<string, string> = {
  Bronze: "border-amber-600/30",
  Silver: "border-slate-400/30",
  Gold: "border-yellow-500/30",
  Platinum: "border-cyan-400/30",
  Diamond: "border-violet-400/30",
  "Crown Master": "border-primary/40",
};

const rankEmoji: Record<string, string> = {
  Bronze: "🥉", Silver: "🥈", Gold: "🥇", Platinum: "💎", Diamond: "💠", "Crown Master": "👑",
};

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
};

const stagger = {
  show: { transition: { staggerChildren: 0.06 } },
};

interface ProfileData {
  wins: number;
  win_streak: number;
  puzzles_solved: number;
  crown_score: number;
  games_played: number;
  rank_tier: string;
  level: number;
  xp: number;
  username: string | null;
}

const Achievements = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    if (!authLoading && !user) { navigate("/auth"); return; }
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("wins, win_streak, puzzles_solved, crown_score, games_played, rank_tier, level, xp, username")
        .eq("id", user.id)
        .single();
      if (data) setProfile(data as unknown as ProfileData);
    };
    load();
  }, [user, authLoading, navigate]);

  const rank = profile?.rank_tier || "Bronze";
  const totalXp = profile?.xp || 0;
  const level = profile?.level || 1;
  const xpInLevel = totalXp % 500;
  const xpForNext = 500;

  // Summary stats for the hero
  const summaryStats = [
    { label: "Games", value: profile?.games_played || 0, icon: Target },
    { label: "Wins", value: profile?.wins || 0, icon: Trophy },
    { label: "Streak", value: profile?.win_streak || 0, icon: Sparkles },
    { label: "CrownScore", value: profile?.crown_score || 400, icon: Crown },
  ];

  return (
    <div className="page-container">
      <div className="container mx-auto max-w-4xl">
        <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-2.5">

          {/* ═══════════ HERO HEADER ═══════════ */}
          <motion.div
            variants={fadeUp}
            className={`relative rounded-xl border ${rankBorderColor[rank] || "border-border/40"} bg-gradient-to-br ${rankGradient[rank] || rankGradient.Bronze} overflow-hidden`}
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.08),transparent_50%)]" />
            <div className="absolute top-0 right-0 w-48 h-48 bg-[radial-gradient(circle,hsl(var(--primary)/0.05),transparent_70%)]" />

            <div className="relative p-4 sm:p-5">
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className="relative shrink-0">
                  <div className="absolute -inset-1.5 rounded-xl bg-gradient-to-br from-primary/20 via-primary/5 to-transparent blur-md" />
                  <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border-2 border-primary/30 flex items-center justify-center">
                    <Trophy className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
                  </div>
                </div>

                {/* Title & rank */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="font-display font-black text-xl sm:text-2xl tracking-tight">Achievements</h1>
                    <span className="inline-flex items-center gap-1 text-[10px] bg-primary/15 border border-primary/25 text-primary font-display font-bold px-2 py-0.5 rounded-full">
                      <Sparkles className="w-2.5 h-2.5" />
                      Lvl {level}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 mt-1">
                    <span className="inline-flex items-center gap-1.5 text-sm font-display font-bold">
                      {rankEmoji[rank]} {rank}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span className="text-xs text-muted-foreground">Track your progress & unlock rewards</span>
                  </div>

                  {/* XP mini bar */}
                  <div className="mt-2.5 max-w-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Level {level} Progress</span>
                      <span className="text-[9px] text-muted-foreground">{xpInLevel}/{xpForNext} XP</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary/60 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
                        initial={{ width: 0 }}
                        animate={{ width: `${(xpInLevel / xpForNext) * 100}%` }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary stat chips */}
              <div className="flex gap-1.5 mt-3.5">
                {summaryStats.map((s) => (
                  <div key={s.label} className="flex-1 rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm px-2 py-1.5 text-center hover:border-primary/20 transition-colors">
                    <s.icon className="w-3 h-3 text-primary mx-auto mb-0.5" />
                    <div className="font-display text-xs font-bold leading-none">{s.value}</div>
                    <div className="text-[7px] text-muted-foreground mt-0.5 uppercase tracking-wider">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* ═══════════ ACHIEVEMENTS PANEL ═══════════ */}
          <motion.div variants={fadeUp} className="rounded-xl border border-border/30 bg-card/60 backdrop-blur-sm p-4 sm:p-5">
            <AchievementsPanel
              wins={profile?.wins || 0}
              winStreak={profile?.win_streak || 0}
              puzzlesSolved={profile?.puzzles_solved || 0}
              crownScore={profile?.crown_score || 0}
              gamesPlayed={profile?.games_played || 0}
            />
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
};

export default Achievements;
