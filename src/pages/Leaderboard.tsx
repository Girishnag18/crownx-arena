import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LeaderboardPlayer {
  id: string;
  username: string | null;
  crown_score: number;
  wins: number;
  losses: number;
}

const Leaderboard = () => {
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);

  const loadLeaderboard = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, crown_score, wins, losses")
      .order("crown_score", { ascending: false })
      .limit(100);

    if (error) {
      return;
    }

    setPlayers((data || []) as LeaderboardPlayer[]);
  };

  useEffect(() => {
    loadLeaderboard();

    const leaderboardChannel = supabase
      .channel("leaderboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, loadLeaderboard)
      .subscribe();

    return () => {
      supabase.removeChannel(leaderboardChannel);
    };
  }, []);

  const filtered = useMemo(
    () => players.filter((p) => (p.username || "Player").toLowerCase().includes(query.toLowerCase())),
    [players, query],
  );

  return (
    <main className="container max-w-5xl py-24 px-4">
      <h1 className="text-4xl font-bold mb-4">Leaderboards</h1>
      <p className="text-muted-foreground mb-8">Global, weekly and monthly competitive ladders with animated transitions.</p>
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search player" className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-3" />
      </div>
      <div className="space-y-3">
        {filtered.map((p, idx) => (
          <motion.div layout key={p.id} className="glass-card p-4 flex items-center justify-between" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div>
              <p className="font-semibold">#{idx + 1} {p.username || "Player"}</p>
              <p className="text-sm text-muted-foreground">{p.wins}W / {p.losses}L</p>
            </div>
            <p className="text-xl font-bold text-primary">{p.crown_score}</p>
          </motion.div>
        ))}
      </div>
    </main>
  );
};

export default Leaderboard;
