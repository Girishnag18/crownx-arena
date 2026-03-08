import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Globe, Trophy, Clock, ChevronRight, ChevronDown, Plus, Wallet, Loader2, User, Zap } from "lucide-react";
import XPProgressBar from "@/components/gamification/XPProgressBar";
import AchievementsPanel from "@/components/gamification/AchievementsPanel";
import DailyPuzzleCard from "@/components/gamification/DailyPuzzleCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { publishInGameNotification } from "@/components/InGameNotificationBar";

interface Profile {
  username: string | null;
  avatar_url: string | null;
  crown_score: number;
  rank_tier: string;
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
  level: number;
  win_streak: number;
  wallet_crowns: number;
  xp: number;
  puzzles_solved: number;
}

interface Tournament {
  id: string;
  name: string;
  prize_pool: number;
  max_players: number;
  created_by?: string;
  status: "open" | "full" | "live" | "completed" | "cancelled";
  starts_at: string | null;
  cancelled_at?: string | null;
  registration_count?: { count: number }[];
}

interface TournamentLeaderboardRow {
  playerId: string;
  wins: number;
  matches: number;
}

interface RecentGame {
  id: string;
  created_at: string;
  result_type: string;
  winner_id: string | null;
  player_white: string | null;
  player_black: string | null;
  white_name?: string;
  black_name?: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const rankEmoji: Record<string, string> = {
  Bronze: "🥉",
  Silver: "🥈",
  Gold: "🥇",
  Platinum: "💎",
  Diamond: "💠",
  "Crown Master": "👑",
};

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [registeredTournamentIds, setRegisteredTournamentIds] = useState<string[]>([]);
  const [newTournamentName, setNewTournamentName] = useState("");
  const [newPrizePool, setNewPrizePool] = useState("500");
  const [newMaxRegistrations, setNewMaxRegistrations] = useState("128");
  const [newStartsAt, setNewStartsAt] = useState("");
  const [createTournamentLoading, setCreateTournamentLoading] = useState(false);
  const [newTournamentType, setNewTournamentType] = useState("swiss");
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);
  const [registeringTournamentId, setRegisteringTournamentId] = useState<string | null>(null);
  const [walletPanelOpen, setWalletPanelOpen] = useState(false);
  const [globalRank, setGlobalRank] = useState<number | null>(null);
  const [liveLeaderboardSize, setLiveLeaderboardSize] = useState(0);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("username, avatar_url, crown_score, rank_tier, games_played, wins, losses, draws, level, win_streak, wallet_crowns, xp, puzzles_solved")
      .eq("id", userId)
      .single();
    if (data) setProfile(data as unknown as Profile);
  };

  const loadRecentGames = async (userId: string) => {
    const { data } = await supabase
      .from("games")
      .select("id, created_at, result_type, winner_id, player_white, player_black")
      .or(`player_white.eq.${userId},player_black.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!data) return;

    const games = data as RecentGame[];
    const opponentIds = Array.from(new Set(games.map((g) => (g.player_white === userId ? g.player_black : g.player_white)).filter(Boolean))) as string[];

    let names = new Map<string, string>();
    if (opponentIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, username").in("id", opponentIds);
      if (profiles) {
        names = new Map(profiles.map((p) => [p.id, p.username || "Player"]));
      }
    }

    setRecentGames(
      games.map((game) => ({
        ...game,
        white_name: game.player_white ? names.get(game.player_white) : undefined,
        black_name: game.player_black ? names.get(game.player_black) : undefined,
      })),
    );
  };


  const loadRatingOverview = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .order("crown_score", { ascending: false })
      .limit(500);

    if (error || !data) return;

    setLiveLeaderboardSize(data.length);
    const rankIndex = data.findIndex((entry) => entry.id === userId);
    setGlobalRank(rankIndex >= 0 ? rankIndex + 1 : null);
  };

  const loadTournaments = async () => {
    const { data } = await (supabase as any)
      .from("tournaments")
      .select("id, name, prize_pool, max_players, created_by, status, starts_at, registration_count:tournament_registrations(count)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) setTournaments(data as Tournament[]);
  };

  const loadMyRegistrations = async (userId: string) => {
    const { data } = await (supabase as any)
      .from("tournament_registrations")
      .select("tournament_id")
      .eq("player_id", userId);

    if (data) setRegisteredTournamentIds((data as any[]).map((entry: any) => entry.tournament_id));
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (!user) return;

    loadProfile(user.id);
    loadTournaments();
    loadMyRegistrations(user.id);
    loadRecentGames(user.id);
    loadRatingOverview(user.id);
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const profileChannel = supabase
      .channel(`profile-${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` }, () => {
        loadProfile(user.id);
      })
      .subscribe();

    const gameChannel = supabase
      .channel(`rating-games-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "games" }, () => {
        loadProfile(user.id);
        loadRecentGames(user.id);
        loadRatingOverview(user.id);
      })
      .subscribe();

    const ratingChannel = supabase
      .channel(`rating-overview-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        loadProfile(user.id);
        loadRatingOverview(user.id);
      })
      .subscribe();

    const tournamentChannel = supabase
      .channel("tournaments-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments" }, loadTournaments)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_registrations" }, () => {
        loadTournaments();
        loadMyRegistrations(user.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(gameChannel);
      supabase.removeChannel(ratingChannel);
      supabase.removeChannel(tournamentChannel);
    };
  }, [user]);


  const createTournament = async () => {
    if (!user || !newTournamentName.trim()) return;

    const parsedPrize = Number(newPrizePool);
    const parsedMaxRegistrations = Number(newMaxRegistrations);

    if (!Number.isFinite(parsedPrize) || parsedPrize < 0) {
      toast.error("Enter a valid prize pool amount");
      return;
    }

    if (!Number.isInteger(parsedMaxRegistrations) || parsedMaxRegistrations < 2) {
      toast.error("Registration limit should be at least 2");
      return;
    }

    setCreateTournamentLoading(true);

    const { data, error } = await (supabase as any).from("tournaments").insert({
      name: newTournamentName.trim(),
      prize_pool: parsedPrize,
      max_players: parsedMaxRegistrations,
      created_by: user.id,
      status: "open",
      tournament_type: newTournamentType,
      starts_at: newStartsAt ? new Date(newStartsAt).toISOString() : new Date(Date.now() + 1000 * 60 * 45).toISOString(),
    }).select("id, name, prize_pool, max_players, status, starts_at").single();
    setCreateTournamentLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setNewTournamentName("");
    setNewPrizePool("500");
    setNewMaxRegistrations("128");
    setNewStartsAt("");
    if (data) {
      setTournaments((prev) => [{ ...(data as any), registration_count: [{ count: 0 }] } as Tournament, ...prev]);
    }
    loadTournaments();
    toast.success("Tournament created and synced live for all players");
  };

  const registerTournament = async (tournamentId: string) => {
    if (!user) return;
    setRegisteringTournamentId(tournamentId);
    const { error } = await (supabase as any).rpc("register_tournament_with_wallet", {
      target_tournament: tournamentId,
    });
    setRegisteringTournamentId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Registered! 2 crowns deducted from wallet.");
    loadMyRegistrations(user.id);
    loadTournaments();
    loadProfile(user.id);
  };

  const getTournamentLeaderboard = async (tournamentId: string): Promise<TournamentLeaderboardRow[]> => {
    const { data: registrations } = await (supabase as any)
      .from("tournament_registrations")
      .select("player_id")
      .eq("tournament_id", tournamentId);

    const playerIds = (registrations || []).map((r: { player_id: string }) => r.player_id);
    if (!playerIds.length) return [];

    const { data: games } = await (supabase as any)
      .from("games")
      .select("winner_id, player_white, player_black, result_type")
      .in("player_white", playerIds)
      .in("player_black", playerIds)
      .in("result_type", ["checkmate", "resignation", "draw", "stalemate"])
      .limit(300);

    const board = new Map<string, TournamentLeaderboardRow>();
    playerIds.forEach((id: string) => board.set(id, { playerId: id, wins: 0, matches: 0 }));

    (games || []).forEach((g: any) => {
      if (board.has(g.player_white)) board.get(g.player_white)!.matches += 1;
      if (board.has(g.player_black)) board.get(g.player_black)!.matches += 1;
      if (g.winner_id && board.has(g.winner_id)) board.get(g.winner_id)!.wins += 1;
    });

    return Array.from(board.values()).sort((a, b) => b.wins - a.wins || b.matches - a.matches).slice(0, 10);
  };

  const cancelTournament = async (tournament: Tournament) => {
    if (!user || tournament.created_by !== user.id) return;
    if (!window.confirm("Call off this tournament and refund all players 2 crowns?")) return;

    const { data: regs } = await (supabase as any)
      .from("tournament_registrations")
      .select("id, player_id")
      .eq("tournament_id", tournament.id);

    for (const reg of regs || []) {
      const { data: profileData } = await supabase.from("profiles").select("wallet_crowns").eq("id", reg.player_id).single();
      await supabase.from("profiles").update({ wallet_crowns: Number(profileData?.wallet_crowns || 0) + 2 }).eq("id", reg.player_id);
      await supabase.from("wallet_transactions").insert({ player_id: reg.player_id, amount: 2, txn_type: "tournament_refund" });
      await (supabase as any).from("player_notifications").insert({
        user_id: reg.player_id,
        title: "Tournament cancelled",
        message: `Your tournament "${tournament.name}" was cancelled. Refund has been issued.`,
        kind: "tournament_cancelled",
      });
    }

    await (supabase as any).from("tournament_registrations").delete().eq("tournament_id", tournament.id);
    await (supabase as any).from("tournaments").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", tournament.id);

    publishInGameNotification(`Sorry! Tournament "${tournament.name}" was called off. Crowns have been refunded.`, "warning");
    toast.success("Tournament called off, refunds issued and in-game apology notice sent.");

    loadTournaments();
    loadProfile(user.id);
  };

  const displayName = profile?.username || user?.user_metadata?.username || "Player";
  const winRate = profile && profile.games_played > 0
    ? ((profile.wins / profile.games_played) * 100).toFixed(1)
    : "0.0";


  useEffect(() => {
    const section = new URLSearchParams(location.search).get("section");
    if (!section) return;

    if (section === "settings") {
      navigate("/settings");
      return;
    }

    const sectionMap: Record<string, string> = {
      history: "history-section",
    };

    const targetId = sectionMap[section];
    if (!targetId) return;

    const target = document.getElementById(targetId);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.search]);

  const liveTournamentCount = useMemo(
    () => tournaments.filter((t) => t.status !== "completed" && t.status !== "cancelled").length,
    [tournaments],
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-20">
        <Crown className="w-12 h-12 text-primary animate-pulse-gold" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="container mx-auto max-w-7xl">
        <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.08 } } }} className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">

          {/* ─── Player Card ─── */}
          <motion.div variants={fadeUp} className="lg:col-span-4 glass-card p-4 sm:p-6 border-glow">
            <div className="flex items-center gap-3 sm:gap-4 mb-5">
              <div className="relative">
                <Avatar className="w-14 h-14 border border-primary/30 gold-glow">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
                  <AvatarFallback className="bg-secondary text-primary">
                    <User className="w-6 h-6" />
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card bg-success" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-lg font-bold truncate">{displayName}</h2>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gradient-gold font-display font-bold">{rankEmoji[profile?.rank_tier || "Bronze"]} {profile?.rank_tier || "Bronze"}</span>
                  <span className="text-muted-foreground text-xs">Lvl {profile?.level || 1}</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              {[
                { label: "Games", value: profile?.games_played || 0 },
                { label: "Wins", value: profile?.wins || 0 },
                { label: "Win Rate", value: `${winRate}%` },
              ].map((stat) => (
                <div key={stat.label} className="stat-card">
                  <div className="font-display text-base font-bold">{stat.value}</div>
                  <div className="text-[10px] text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Wallet */}
            <div className="space-y-2 mb-4">
              <button
                onClick={() => setWalletPanelOpen((prev) => !prev)}
                className="w-full bg-secondary/30 border border-border/40 rounded-lg p-3.5 flex items-center justify-between text-left hover:border-primary/20 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Wallet className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-xs font-semibold">Wallet</p>
                    <p className="text-[10px] text-muted-foreground">{Number(profile?.wallet_crowns || 0).toFixed(0)} Crowns</p>
                  </div>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${walletPanelOpen ? "rotate-180" : ""}`} />
              </button>
              {walletPanelOpen && (
                <div className="bg-secondary/20 border border-border/30 rounded-lg p-3.5 space-y-3">
                  <div className="flex items-center gap-2 text-base font-display font-bold">
                    <Crown className="w-4 h-4 text-primary" />
                    {Number(profile?.wallet_crowns || 0).toFixed(2)} Crowns
                  </div>
                  <button onClick={() => navigate("/crown-topup")} className="w-full bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs font-display font-bold tracking-wide">
                    Top Up
                  </button>
                </div>
              )}
            </div>

            {/* Settings shortcut */}
            <button
              onClick={() => navigate("/settings")}
              className="w-full bg-secondary/30 border border-border/40 rounded-lg p-3.5 flex items-center justify-between text-left hover:border-primary/20 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Zap className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-semibold">Settings & Profile</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </motion.div>

          {/* ─── Quick Access ─── */}
          <motion.div variants={fadeUp} className="lg:col-span-3 space-y-3">
            <XPProgressBar xp={profile?.xp || 0} level={profile?.level || 1} />
            <DailyPuzzleCard />

            {/* Play button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/lobby")}
              className="w-full glass-card p-4 text-left group hover:border-primary/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Globe className="w-4.5 h-4.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-xs">Play Online</h3>
                  <p className="text-[10px] text-muted-foreground">Quick Play, Arena & Private Rooms</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </motion.button>

            {/* Global Rank (only show if available) */}
            {globalRank !== null && (
              <div className="glass-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Trophy className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Global Rank</p>
                      <p className="font-display font-bold text-sm">#{globalRank}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground">of {liveLeaderboardSize}</span>
                </div>
              </div>
            )}
          </motion.div>

          {/* ─── Tournaments ─── */}
          <motion.div variants={fadeUp} className="lg:col-span-5 glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-sm flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                Tournaments
              </h3>
              {liveTournamentCount > 0 && (
                <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">{liveTournamentCount} active</span>
              )}
            </div>

            {/* Create form */}
            <div className="rounded-lg border border-border/40 p-4 bg-secondary/15 mb-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">Create New</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] text-muted-foreground">Name</label>
                  <input value={newTournamentName} onChange={(e) => setNewTournamentName(e.target.value)} placeholder="Weekend Crown Clash" className="w-full bg-secondary/50 border border-border/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">Prize Pool</label>
                  <input value={newPrizePool} onChange={(e) => setNewPrizePool(e.target.value)} placeholder="500" type="number" min={0} className="w-full bg-secondary/50 border border-border/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">Max Players</label>
                  <input value={newMaxRegistrations} onChange={(e) => setNewMaxRegistrations(e.target.value)} placeholder="128" type="number" min={2} className="w-full bg-secondary/50 border border-border/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] text-muted-foreground">Start Time</label>
                  <input type="datetime-local" value={newStartsAt} onChange={(e) => setNewStartsAt(e.target.value)} className="w-full bg-secondary/50 border border-border/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">Format</label>
                  <select value={newTournamentType} onChange={(e) => setNewTournamentType(e.target.value)} className="w-full bg-secondary/50 border border-border/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                    <option value="swiss">Swiss</option>
                    <option value="arena">Arena</option>
                  </select>
                </div>
                <button onClick={createTournament} disabled={createTournamentLoading || !newTournamentName.trim()} className="md:col-span-2 w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-display font-bold tracking-wide flex items-center justify-center gap-2 disabled:opacity-50">
                  {createTournamentLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating...</> : <><Plus className="w-3.5 h-3.5" /> Create</>}
                </button>
              </div>
            </div>

            {/* Tournament list */}
            <div className="space-y-1 max-h-[18rem] overflow-y-auto pr-1">
              {tournaments.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No tournaments yet. Create one above.</p>
              )}
              {tournaments.map((tournament) => {
                const count = tournament.registration_count?.[0]?.count || 0;
                const isRegistered = registeredTournamentIds.includes(tournament.id);
                const isFull = count >= tournament.max_players;
                const startsAtMs = tournament.starts_at ? new Date(tournament.starts_at).getTime() : 0;
                const isReady = startsAtMs > 0 && Date.now() >= startsAtMs && tournament.status !== "cancelled";
                const isCancelled = tournament.status === "cancelled";

                return (
                  <div key={tournament.id} className={`py-2.5 border-b border-border/30 last:border-0 space-y-1.5 ${isCancelled ? "opacity-50" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-xs truncate">{tournament.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {count}/{tournament.max_players} players · ₹{tournament.prize_pool} prize
                        </p>
                        {tournament.starts_at && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(tournament.starts_at).toLocaleDateString()} {new Date(tournament.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                        <p className="text-[10px] mt-0.5">
                          {isCancelled ? (
                            <span className="text-destructive">Cancelled</span>
                          ) : isReady ? (
                            <span className="text-success">Live now</span>
                          ) : (
                            <span className="text-primary/80">Open · 2 crowns entry</span>
                          )}
                        </p>
                      </div>
                      {!isCancelled && (
                        <button
                          onClick={() => registerTournament(tournament.id)}
                          disabled={isRegistered || isFull || registeringTournamentId === tournament.id}
                          className="text-[10px] font-display font-bold px-2.5 py-1.5 rounded-md bg-primary/10 text-primary disabled:bg-muted disabled:text-muted-foreground shrink-0"
                        >
                          {isRegistered ? "Joined" : isFull ? "Full" : registeringTournamentId === tournament.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Join"}
                        </button>
                      )}
                    </div>

                    {isReady && (
                      <div className="flex gap-1.5 flex-wrap">
                        <button
                          onClick={() => navigate(`/tournament/${tournament.id}`)}
                          className="text-[10px] px-2 py-1 rounded-md bg-primary/10 text-primary font-semibold"
                        >
                          View Bracket
                        </button>
                        <button
                          onClick={async () => {
                            const leaders = await getTournamentLeaderboard(tournament.id);
                            const leaderText = leaders.length > 0
                              ? leaders.map((l, i) => `#${i + 1} ${l.playerId.slice(0, 6)} (${l.wins}W/${l.matches}M)`).join(" | ")
                              : "No match data yet";
                            toast.message(`Top 10: ${leaderText}`);
                          }}
                          className="text-[10px] px-2 py-1 rounded-md bg-secondary/50 text-muted-foreground"
                        >
                          Leaderboard
                        </button>
                      </div>
                    )}

                    {tournament.created_by === user?.id && !isCancelled && (
                      <button onClick={() => cancelTournament(tournament)} className="text-[10px] px-2 py-1 rounded-md bg-destructive/10 text-destructive font-semibold">
                        Cancel & Refund
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* ─── Recent Games (only show if there are games) ─── */}
          {recentGames.length > 0 && (
            <motion.div id="history-section" variants={fadeUp} className="lg:col-span-12 glass-card p-5 scroll-mt-28">
              <h3 className="font-display font-bold text-sm flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-primary" />
                Recent Games
              </h3>
              <div className="space-y-0.5">
                {recentGames.filter((g) => g.result_type !== "in_progress").map((g) => {
                  const userWon = g.winner_id === user?.id;
                  const userPlayedWhite = g.player_white === user?.id;
                  const opponent = userPlayedWhite ? g.black_name || "Opponent" : g.white_name || "Opponent";
                  const result = g.result_type === "draw" || g.result_type === "stalemate" ? "Draw" : userWon ? "Win" : "Loss";
                  const resultColor = result === "Win" ? "bg-success" : result === "Loss" ? "bg-destructive" : "bg-muted-foreground";

                  return (
                    <div key={g.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-secondary/20 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${resultColor}`} />
                        <span className="text-xs font-semibold">{opponent}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-display font-bold ${result === "Win" ? "text-success" : result === "Loss" ? "text-destructive" : "text-muted-foreground"}`}>{result}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(g.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ─── Achievements ─── */}
          <motion.div variants={fadeUp} className="lg:col-span-12 glass-card p-5">
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

export default Dashboard;
