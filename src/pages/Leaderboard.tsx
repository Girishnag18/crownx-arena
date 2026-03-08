import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, Crown, Trophy, Clock, Medal, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

interface LeaderboardPlayer {
  id: string;
  username: string | null;
  avatar_url: string | null;
  crown_score: number;
  wins: number;
  losses: number;
}

interface Season {
  id: string;
  name: string;
  season_number: number;
  starts_at: string;
  ends_at: string;
  status: string;
  reward_1st: number;
  reward_2nd: number;
  reward_3rd: number;
}

interface SeasonEntry {
  user_id: string;
  score: number;
  games_played: number;
  wins: number;
  username?: string;
  avatar_url?: string | null;
}

const PODIUM_STYLES = [
  "border-amber-400/60 bg-amber-500/10",
  "border-slate-400/60 bg-slate-400/10",
  "border-orange-600/60 bg-orange-600/10",
];
const PODIUM_ICONS = ["🥇", "🥈", "🥉"];

const Leaderboard = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [friendPlayers, setFriendPlayers] = useState<LeaderboardPlayer[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [seasonEntries, setSeasonEntries] = useState<SeasonEntry[]>([]);

  const loadLeaderboard = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, crown_score, wins, losses")
      .order("crown_score", { ascending: false })
      .limit(100);
    setPlayers((data || []) as LeaderboardPlayer[]);
  };

  const loadSeasons = async () => {
    const { data } = await supabase
      .from("leaderboard_seasons" as any)
      .select("*")
      .order("season_number", { ascending: false });
    const s = (data || []) as unknown as Season[];
    setSeasons(s);
    const active = s.find(ss => ss.status === "active");
    setActiveSeason(active || null);
  };

  const loadSeasonEntries = async (seasonId: string) => {
    const { data } = await supabase
      .from("season_entries" as any)
      .select("user_id, score, games_played, wins")
      .eq("season_id", seasonId)
      .order("score", { ascending: false })
      .limit(100);

    if (!data || (data as any[]).length === 0) {
      setSeasonEntries([]);
      return;
    }

    const userIds = (data as any[]).map(e => e.user_id);
    const { data: profiles } = await supabase.from("profiles").select("id, username, avatar_url").in("id", userIds);
    const pMap = new Map(profiles?.map(p => [p.id, p]) || []);

    setSeasonEntries((data as any[]).map(e => ({
      ...e,
      username: pMap.get(e.user_id)?.username || "Player",
      avatar_url: pMap.get(e.user_id)?.avatar_url,
    })));
  };

  useEffect(() => {
    loadLeaderboard();
    loadSeasons();

    const channel = supabase
      .channel("leaderboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, loadLeaderboard)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (activeSeason) loadSeasonEntries(activeSeason.id);
  }, [activeSeason?.id]);

  const getTimeRemaining = (until: string) => {
    const diff = new Date(until).getTime() - Date.now();
    if (diff <= 0) return "Ended";
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    return `${days}d ${hours}h remaining`;
  };

  const filtered = useMemo(
    () => players.filter((p) => (p.username || "Player").toLowerCase().includes(query.toLowerCase())),
    [players, query],
  );

  const myRank = useMemo(() => {
    if (!user) return null;
    const idx = players.findIndex(p => p.id === user.id);
    return idx >= 0 ? idx + 1 : null;
  }, [players, user]);

  const mySeasonRank = useMemo(() => {
    if (!user) return null;
    const idx = seasonEntries.findIndex(e => e.user_id === user.id);
    return idx >= 0 ? idx + 1 : null;
  }, [seasonEntries, user]);

  return (
    <main className="container max-w-5xl py-24 px-4 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold font-display">Leaderboards</h1>
        <p className="text-muted-foreground text-sm">Compete for the top spot and earn Crown rewards each season.</p>
      </div>

      <Tabs defaultValue="season" className="w-full">
        <TabsList className="w-full grid grid-cols-2 bg-secondary/40">
          <TabsTrigger value="season">🏆 Seasonal</TabsTrigger>
          <TabsTrigger value="alltime">👑 All-Time</TabsTrigger>
        </TabsList>

        {/* Seasonal Tab */}
        <TabsContent value="season" className="space-y-4 mt-4">
          {activeSeason ? (
            <>
              {/* Season Header */}
              <div className="glass-card p-5 border-glow space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display font-bold text-lg">{activeSeason.name}</h2>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Clock className="w-3 h-3" />
                      {getTimeRemaining(activeSeason.ends_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="text-center">
                      <p className="text-amber-400 font-bold">{PODIUM_ICONS[0]} {activeSeason.reward_1st}</p>
                      <p className="text-muted-foreground">Crowns</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-400 font-bold">{PODIUM_ICONS[1]} {activeSeason.reward_2nd}</p>
                      <p className="text-muted-foreground">Crowns</p>
                    </div>
                    <div className="text-center">
                      <p className="text-orange-500 font-bold">{PODIUM_ICONS[2]} {activeSeason.reward_3rd}</p>
                      <p className="text-muted-foreground">Crowns</p>
                    </div>
                  </div>
                </div>

                {mySeasonRank && (
                  <div className="rounded-lg bg-primary/10 border border-primary/30 px-4 py-2 flex items-center justify-between">
                    <span className="text-sm font-semibold">Your Rank</span>
                    <span className="text-primary font-bold">#{mySeasonRank}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Users className="w-3 h-3" />
                  {seasonEntries.length} participants
                </div>
              </div>

              {/* Season Rankings */}
              {seasonEntries.length === 0 ? (
                <div className="glass-card p-8 text-center">
                  <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="font-display font-bold">No entries yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Play games to join the seasonal leaderboard!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {seasonEntries.map((entry, idx) => (
                    <motion.div
                      key={entry.user_id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-xl border p-4 flex items-center justify-between transition-colors ${
                        idx < 3 ? PODIUM_STYLES[idx] : "border-border bg-card/60"
                      } ${entry.user_id === user?.id ? "ring-1 ring-primary" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 text-center font-bold text-sm">
                          {idx < 3 ? PODIUM_ICONS[idx] : `#${idx + 1}`}
                        </span>
                        <Avatar className="w-8 h-8 border border-border/60">
                          <AvatarImage src={entry.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">{(entry.username || "P")[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm">{entry.username}</p>
                          <p className="text-xs text-muted-foreground">{entry.wins}W / {entry.games_played} games</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">{entry.score}</p>
                        <p className="text-[10px] text-muted-foreground">pts</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Past Seasons */}
              {seasons.filter(s => s.status !== "active").length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">Past Seasons</h3>
                  {seasons.filter(s => s.status !== "active").map(s => (
                    <div key={s.id} className="rounded-lg border border-border bg-card/40 p-3 flex items-center justify-between text-sm">
                      <span className="font-semibold">{s.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(s.starts_at), "MMM d")} — {format(new Date(s.ends_at), "MMM d")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="glass-card p-8 text-center">
              <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-display font-bold">No Active Season</p>
              <p className="text-sm text-muted-foreground mt-1">A new season will start soon!</p>
            </div>
          )}
        </TabsContent>

        {/* All-Time Tab */}
        <TabsContent value="alltime" className="space-y-4 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search player"
              className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-3 text-sm"
            />
          </div>

          {myRank && (
            <div className="rounded-lg bg-primary/10 border border-primary/30 px-4 py-2 flex items-center justify-between text-sm">
              <span className="font-semibold">Your Global Rank</span>
              <span className="text-primary font-bold">#{myRank}</span>
            </div>
          )}

          <div className="space-y-2">
            {filtered.map((p, idx) => (
              <motion.div
                layout
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl border p-4 flex items-center justify-between ${
                  idx < 3 ? PODIUM_STYLES[idx] : "border-border bg-card/60"
                } ${p.id === user?.id ? "ring-1 ring-primary" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 text-center font-bold text-sm">
                    {idx < 3 ? PODIUM_ICONS[idx] : `#${idx + 1}`}
                  </span>
                  <Avatar className="w-8 h-8 border border-border/60">
                    <AvatarImage src={p.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">{(p.username || "P")[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{p.username || "Player"}</p>
                    <p className="text-xs text-muted-foreground">{p.wins}W / {p.losses}L</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-primary">{p.crown_score}</p>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default Leaderboard;
