import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";

const players = Array.from({ length: 20 }).map((_, i) => ({
  id: `${i + 1}`,
  username: `Player_${i + 1}`,
  elo: 2500 - i * 37,
  wins: 180 - i * 3,
  losses: 40 + i,
}));

const Leaderboard = () => {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => players.filter((p) => p.username.toLowerCase().includes(query.toLowerCase())),
    [query],
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
              <p className="font-semibold">#{idx + 1} {p.username}</p>
              <p className="text-sm text-muted-foreground">{p.wins}W / {p.losses}L</p>
            </div>
            <p className="text-xl font-bold text-primary">{p.elo}</p>
          </motion.div>
        ))}
      </div>
    </main>
  );
};

export default Leaderboard;
