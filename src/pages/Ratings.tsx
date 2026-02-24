import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, Trophy, TrendingUp, TrendingDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface RatingSnapshot {
  crown_score: number;
  wins: number;
  losses: number;
}

const Ratings = () => {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<RatingSnapshot | null>(null);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("crown_score, wins, losses")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setSnapshot(data as RatingSnapshot);
      }
    };

    load();

    const channel = supabase
      .channel(`ratings-live-${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` }, load)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const totalGames = (snapshot?.wins || 0) + (snapshot?.losses || 0);
  const winRate = totalGames === 0 ? 0 : Math.round(((snapshot?.wins || 0) / totalGames) * 100);
  const tier = useMemo(() => {
    const score = snapshot?.crown_score || 0;
    if (score >= 1800) return "Grand Crown";
    if (score >= 1500) return "Elite";
    if (score >= 1200) return "Contender";
    return "Starter";
  }, [snapshot?.crown_score]);

  return (
    <main className="container max-w-5xl py-24 px-4">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="w-7 h-7 text-primary" />
        <h1 className="text-3xl md:text-5xl font-black">Rating Overview</h1>
      </div>
      <p className="text-muted-foreground mb-8">Responsive live overview of your rank performance. Updates instantly when your profile rating changes.</p>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <motion.article layout className="glass-card p-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs text-muted-foreground mb-2">Current Rating</p>
          <p className="text-3xl font-black text-primary">{snapshot?.crown_score ?? "--"}</p>
        </motion.article>
        <motion.article layout className="glass-card p-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs text-muted-foreground mb-2">Tier</p>
          <p className="text-2xl font-bold">{tier}</p>
        </motion.article>
        <motion.article layout className="glass-card p-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-400" />Wins</p>
          <p className="text-2xl font-bold">{snapshot?.wins ?? 0}</p>
        </motion.article>
        <motion.article layout className="glass-card p-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-2"><TrendingDown className="w-4 h-4 text-destructive" />Losses</p>
          <p className="text-2xl font-bold">{snapshot?.losses ?? 0}</p>
        </motion.article>
      </section>

      <section className="glass-card p-6 mt-6">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold flex items-center gap-2"><Trophy className="w-4 h-4 text-primary" />Win Rate</p>
          <p className="font-bold">{winRate}%</p>
        </div>
        <div className="h-3 rounded-full bg-secondary overflow-hidden">
          <motion.div className="h-full bg-primary" initial={{ width: 0 }} animate={{ width: `${winRate}%` }} transition={{ duration: 0.5 }} />
        </div>
      </section>
    </main>
  );
};

export default Ratings;
