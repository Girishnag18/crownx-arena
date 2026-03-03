import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { TrendingUp, TrendingDown, Minus, Trophy, Target, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface EloHistoryEntry {
  id: string;
  elo_before: number;
  elo_after: number;
  elo_delta: number;
  recorded_at: string;
  game_id: string | null;
}

interface PerformanceTabProps {
  playerId: string;
  currentElo: number;
}

const PerformanceTab = ({ playerId, currentElo }: PerformanceTabProps) => {
  const [history, setHistory] = useState<EloHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      const { data } = await supabase
        .from("elo_history")
        .select("*")
        .eq("player_id", playerId)
        .order("recorded_at", { ascending: true })
        .limit(100);

      if (data) setHistory(data as unknown as EloHistoryEntry[]);
      setLoading(false);
    };

    fetchHistory();

    const channel = supabase
      .channel(`elo-history-${playerId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "elo_history",
        filter: `player_id=eq.${playerId}`,
      }, (payload) => {
        setHistory((prev) => [...prev, payload.new as unknown as EloHistoryEntry]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [playerId]);

  const chartData = history.map((entry, i) => ({
    game: i + 1,
    elo: entry.elo_after,
    delta: entry.elo_delta,
    date: new Date(entry.recorded_at).toLocaleDateString(),
  }));

  // Add current as starting point if no history
  if (chartData.length === 0 && !loading) {
    chartData.push({ game: 0, elo: currentElo, delta: 0, date: "Now" });
  }

  const peakElo = history.length > 0 ? Math.max(...history.map((h) => h.elo_after)) : currentElo;
  const recentGames = history.slice(-10);
  const recentWins = recentGames.filter((g) => g.elo_delta > 0).length;
  const recentLosses = recentGames.filter((g) => g.elo_delta < 0).length;
  const recentDraws = recentGames.filter((g) => g.elo_delta === 0).length;
  const avgDelta = recentGames.length > 0 ? Math.round(recentGames.reduce((s, g) => s + g.elo_delta, 0) / recentGames.length) : 0;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card p-4 text-center">
          <Trophy className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-xl font-display font-bold text-primary">{currentElo}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Current</p>
        </div>
        <div className="glass-card p-4 text-center">
          <Target className="w-5 h-5 text-accent mx-auto mb-1" />
          <p className="text-xl font-display font-bold">{peakElo}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Peak</p>
        </div>
        <div className="glass-card p-4 text-center">
          <Zap className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
          <p className="text-xl font-display font-bold">{history.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Games Tracked</p>
        </div>
        <div className="glass-card p-4 text-center">
          {avgDelta > 0 ? <TrendingUp className="w-5 h-5 text-emerald-500 mx-auto mb-1" /> :
           avgDelta < 0 ? <TrendingDown className="w-5 h-5 text-destructive mx-auto mb-1" /> :
           <Minus className="w-5 h-5 text-muted-foreground mx-auto mb-1" />}
          <p className={`text-xl font-display font-bold ${avgDelta > 0 ? "text-emerald-500" : avgDelta < 0 ? "text-destructive" : ""}`}>
            {avgDelta > 0 ? "+" : ""}{avgDelta}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Δ (Last 10)</p>
        </div>
      </div>

      {/* Chart */}
      <div className="glass-card p-4">
        <h3 className="font-display font-bold text-sm mb-4">CrownScore™ Progress</h3>
        {chartData.length <= 1 ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
            Play some games to see your Elo history here.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="eloGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(45, 100%, 50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(45, 100%, 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 15%, 16%)" />
              <XAxis dataKey="game" tick={{ fill: "hsl(225, 10%, 50%)", fontSize: 11 }} label={{ value: "Game #", position: "insideBottom", offset: -2, fill: "hsl(225, 10%, 50%)", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(225, 10%, 50%)", fontSize: 11 }} domain={["dataMin - 30", "dataMax + 30"]} />
              <Tooltip
                contentStyle={{
                  background: "hsl(225, 20%, 8%)",
                  border: "1px solid hsl(225, 15%, 20%)",
                  borderRadius: "0.5rem",
                  fontSize: 12,
                }}
                labelFormatter={(v) => `Game #${v}`}
                formatter={(value: number, name: string) => {
                  if (name === "elo") return [value, "CrownScore"];
                  return [value, name];
                }}
              />
              <Area type="monotone" dataKey="elo" stroke="hsl(45, 100%, 50%)" fill="url(#eloGradient)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "hsl(45, 100%, 50%)" }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recent Form */}
      {recentGames.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="font-display font-bold text-sm mb-3">Recent Form (Last 10)</h3>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-muted-foreground">W{recentWins} / D{recentDraws} / L{recentLosses}</span>
          </div>
          <div className="flex gap-1">
            {recentGames.map((g) => (
              <div
                key={g.id}
                className={`flex-1 h-8 rounded-sm flex items-center justify-center text-[10px] font-bold ${
                  g.elo_delta > 0 ? "bg-emerald-500/20 text-emerald-400" :
                  g.elo_delta < 0 ? "bg-destructive/20 text-destructive" :
                  "bg-muted text-muted-foreground"
                }`}
                title={`${g.elo_delta > 0 ? "+" : ""}${g.elo_delta}`}
              >
                {g.elo_delta > 0 ? "+" : ""}{g.elo_delta}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceTab;
