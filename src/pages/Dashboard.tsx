import { useEffect, useMemo, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Crown, Globe, Trophy, Clock, ChevronRight, ChevronDown, Plus, Wallet, Loader2, User, Zap, Swords, Target, Flame, BarChart3, Settings, Gamepad2, Gift } from "lucide-react";
import XPProgressBar from "@/components/gamification/XPProgressBar";
import AchievementsPanel from "@/components/gamification/AchievementsPanel";
import DailyPuzzleCard from "@/components/gamification/DailyPuzzleCard";
import PlacementBadge from "@/components/gamification/PlacementBadge";
import RankPromotionOverlay from "@/components/gamification/RankPromotionOverlay";
import TrainingInsights from "@/components/gamification/TrainingInsights";
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
  tournament_type?: string;
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
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

const rankEmoji: Record<string, string> = {
  Bronze: "🥉",
  Silver: "🥈",
  Gold: "🥇",
  Platinum: "💎",
  Diamond: "💠",
  "Crown Master": "👑",
};

const rankGradient: Record<string, string> = {
  Bronze: "from-amber-700/20 to-amber-900/10",
  Silver: "from-slate-300/15 to-slate-500/10",
  Gold: "from-yellow-500/15 to-amber-600/10",
  Platinum: "from-cyan-400/15 to-blue-500/10",
  Diamond: "from-violet-400/15 to-purple-600/10",
  "Crown Master": "from-primary/20 to-amber-500/10",
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
  const [showCreateTournament, setShowCreateTournament] = useState(false);
  const [promotion, setPromotion] = useState<{ oldRank: string; newRank: string } | null>(null);
  const prevRankRef = useRef<string | null>(null);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("username, avatar_url, crown_score, rank_tier, games_played, wins, losses, draws, level, win_streak, wallet_crowns, xp, puzzles_solved")
      .eq("id", userId)
      .single();
    if (data) {
      const p = data as unknown as Profile;
      // Detect rank promotion
      if (prevRankRef.current && prevRankRef.current !== p.rank_tier) {
        const ranks = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Crown Master"];
        const oldIdx = ranks.indexOf(prevRankRef.current);
        const newIdx = ranks.indexOf(p.rank_tier);
        if (newIdx > oldIdx) {
          setPromotion({ oldRank: prevRankRef.current, newRank: p.rank_tier });
        }
      }
      prevRankRef.current = p.rank_tier;
      setProfile(p);
    }
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
      .select("id, name, prize_pool, max_players, created_by, status, starts_at, tournament_type, registration_count:tournament_registrations(count)")
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
    if (!Number.isFinite(parsedPrize) || parsedPrize < 0) { toast.error("Enter a valid prize pool amount"); return; }
    if (!Number.isInteger(parsedMaxRegistrations) || parsedMaxRegistrations < 2) { toast.error("Registration limit should be at least 2"); return; }

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

    if (error) { toast.error(error.message); return; }
    setNewTournamentName("");
    setNewPrizePool("500");
    setNewMaxRegistrations("128");
    setNewStartsAt("");
    setShowCreateTournament(false);
    if (data) {
      setTournaments((prev) => [{ ...(data as any), registration_count: [{ count: 0 }] } as Tournament, ...prev]);
    }
    loadTournaments();
    toast.success("Tournament created and synced live for all players");
  };

  const registerTournament = async (tournamentId: string) => {
    if (!user) return;
    setRegisteringTournamentId(tournamentId);
    const { error } = await (supabase as any).rpc("register_tournament_with_wallet", { target_tournament: tournamentId });
    setRegisteringTournamentId(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Registered! 2 crowns deducted from wallet.");
    loadMyRegistrations(user.id);
    loadTournaments();
    loadProfile(user.id);
  };

  const getTournamentLeaderboard = async (tournamentId: string): Promise<TournamentLeaderboardRow[]> => {
    const { data: registrations } = await (supabase as any).from("tournament_registrations").select("player_id").eq("tournament_id", tournamentId);
    const playerIds = (registrations || []).map((r: { player_id: string }) => r.player_id);
    if (!playerIds.length) return [];
    const { data: games } = await (supabase as any).from("games").select("winner_id, player_white, player_black, result_type").in("player_white", playerIds).in("player_black", playerIds).in("result_type", ["checkmate", "resignation", "draw", "stalemate"]).limit(300);
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
    const { data: regs } = await (supabase as any).from("tournament_registrations").select("id, player_id").eq("tournament_id", tournament.id);
    for (const reg of regs || []) {
      const { data: profileData } = await supabase.from("profiles").select("wallet_crowns").eq("id", reg.player_id).single();
      await supabase.from("profiles").update({ wallet_crowns: Number(profileData?.wallet_crowns || 0) + 2 }).eq("id", reg.player_id);
      await supabase.from("wallet_transactions").insert({ player_id: reg.player_id, amount: 2, txn_type: "tournament_refund" });
      await (supabase as any).from("player_notifications").insert({ user_id: reg.player_id, title: "Tournament cancelled", message: `Your tournament "${tournament.name}" was cancelled. Refund has been issued.`, kind: "tournament_cancelled" });
    }
    await (supabase as any).from("tournament_registrations").delete().eq("tournament_id", tournament.id);
    await (supabase as any).from("tournaments").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", tournament.id);
    publishInGameNotification(`Sorry! Tournament "${tournament.name}" was called off. Crowns have been refunded.`, "warning");
    toast.success("Tournament called off, refunds issued and in-game apology notice sent.");
    loadTournaments();
    loadProfile(user.id);
  };

  const displayName = profile?.username || user?.user_metadata?.username || "Player";
  const winRate = profile && profile.games_played > 0 ? ((profile.wins / profile.games_played) * 100).toFixed(1) : "0.0";

  useEffect(() => {
    const section = new URLSearchParams(location.search).get("section");
    if (!section) return;
    if (section === "settings") { navigate("/settings"); return; }
    const sectionMap: Record<string, string> = { history: "history-section" };
    const targetId = sectionMap[section];
    if (!targetId) return;
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.search]);

  const activeTournaments = useMemo(
    () => tournaments.filter((t) => t.status !== "completed" && t.status !== "cancelled"),
    [tournaments],
  );

  const recentTournaments = useMemo(
    () => tournaments.filter((t) => t.status === "completed" || t.status === "cancelled"),
    [tournaments],
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-20">
        <Crown className="w-12 h-12 text-primary animate-pulse-gold" />
      </div>
    );
  }

  const rank = profile?.rank_tier || "Bronze";

  return (
    <div className="min-h-screen bg-background pt-14 sm:pt-16 pb-16 lg:pb-4 px-2 sm:px-4">
      {/* Rank Promotion Overlay */}
      {promotion && (
        <RankPromotionOverlay
          oldRank={promotion.oldRank}
          newRank={promotion.newRank}
          onDismiss={() => setPromotion(null)}
        />
      )}
      <div className="container mx-auto max-w-7xl">
        <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }} className="space-y-2.5 sm:space-y-3">

          {/* ═══════════ HERO SECTION ═══════════ */}
          <motion.div variants={fadeUp} className={`rounded-xl border border-border/40 bg-gradient-to-br ${rankGradient[rank] || rankGradient.Bronze} backdrop-blur-sm p-3.5 sm:p-5 relative overflow-hidden`}>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.06),transparent_60%)]" />
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              {/* Avatar */}
              <div className="relative">
                <Avatar className="w-12 h-12 sm:w-16 sm:h-16 border-2 border-primary/30 shadow-[0_0_16px_-5px_hsl(var(--primary)/0.3)]">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
                  <AvatarFallback className="bg-secondary text-primary text-lg font-display font-bold">
                    <User className="w-6 h-6" />
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-card bg-emerald-500" />
              </div>

              {/* Player Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-display text-lg sm:text-xl font-black tracking-tight truncate">{displayName}</h1>
                  <span className="text-xs bg-primary/10 border border-primary/20 text-primary font-display font-bold px-2.5 py-0.5 rounded-full">
                    Lvl {profile?.level || 1}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-sm font-display font-bold flex items-center gap-1.5">
                    {rankEmoji[rank]} {rank}
                  </span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground font-medium">
                    <Crown className="w-3 h-3 text-primary inline mr-1" />{profile?.crown_score || 400} Rating
                  </span>
                </div>
              </div>

              {/* Quick stats row */}
              <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                {[
                  { label: "Games", value: profile?.games_played || 0, icon: Gamepad2 },
                  { label: "Wins", value: profile?.wins || 0, icon: Trophy },
                  { label: "Win%", value: `${winRate}%`, icon: Target },
                  { label: "Streak", value: profile?.win_streak || 0, icon: Flame },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border border-border/30 bg-card/60 backdrop-blur-sm px-2 py-1.5 sm:px-2.5 sm:py-2 text-center min-w-[3.5rem]">
                    <s.icon className="w-3 h-3 text-primary mx-auto mb-0.5" />
                    <div className="font-display text-xs font-bold leading-none">{s.value}</div>
                    <div className="text-[8px] text-muted-foreground mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* XP Bar */}
            <div className="mt-3 relative">
              <XPProgressBar xp={profile?.xp || 0} level={profile?.level || 1} />
            </div>
          </motion.div>

          {/* ═══════════ QUICK ACTIONS ROW ═══════════ */}
          <motion.div variants={fadeUp} className="grid grid-cols-4 gap-1.5 sm:gap-2">
            {[
              { title: "Play Online", desc: "Quick Play & Arena", icon: Globe, onClick: () => navigate("/lobby"), accent: true },
              { title: "Puzzles", desc: "Sharpen your tactics", icon: Target, onClick: () => navigate("/puzzles") },
              { title: "Leaderboard", desc: "Global rankings", icon: BarChart3, onClick: () => navigate("/leaderboard") },
              { title: "Settings", desc: "Profile & prefs", icon: Settings, onClick: () => navigate("/settings") },
            ].map((action, i) => (
              <motion.button
                key={action.title}
                whileTap={{ scale: 0.97 }}
                onClick={action.onClick}
                className={`rounded-lg border p-2.5 sm:p-3 text-left group transition-all duration-200 ${
                  action.accent
                    ? "bg-primary/5 border-primary/25 hover:bg-primary/10"
                    : "bg-card/60 border-border/40 hover:bg-card/80"
                }`}
              >
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center mb-1.5 transition-colors ${
                  action.accent ? "bg-primary/15" : "bg-secondary/60"
                }`}>
                  <action.icon className={`w-3.5 h-3.5 ${action.accent ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <h3 className="font-display font-bold text-[10px] sm:text-xs leading-tight">{action.title}</h3>
                <p className="text-[8px] sm:text-[10px] text-muted-foreground mt-0.5 leading-tight hidden sm:block">{action.desc}</p>
              </motion.button>
            ))}
          </motion.div>

          {/* ═══════════ MAIN GRID ═══════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3">

            {/* Left Column — Wallet, Rank, Daily Puzzle */}
            <div className="lg:col-span-4 space-y-2">
              {/* Wallet */}
              <motion.div variants={fadeUp} className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
                <button
                  onClick={() => setWalletPanelOpen((prev) => !prev)}
                  className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-secondary/20 transition-colors"
                >
                    <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-display font-bold text-sm">Wallet</p>
                      <p className="text-[10px] text-muted-foreground">{Number(profile?.wallet_crowns || 0).toFixed(0)} Crowns available</p>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${walletPanelOpen ? "rotate-180" : ""}`} />
                </button>
                {walletPanelOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="border-t border-border/30 px-3 py-3 space-y-2"
                  >
                    <div className="flex items-center gap-2 text-lg font-display font-bold">
                      <Crown className="w-5 h-5 text-primary" />
                      {Number(profile?.wallet_crowns || 0).toFixed(2)} Crowns
                    </div>
                    <button onClick={() => navigate("/crown-topup")} className="w-full bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-xs font-display font-bold tracking-wider hover:opacity-90 transition-opacity">
                      Top Up Crowns
                    </button>
                  </motion.div>
                )}
              </motion.div>

              {/* Global Rank */}
              {globalRank !== null && (
                <motion.div variants={fadeUp} className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Global Rank</p>
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-display font-black text-2xl text-primary">#{globalRank}</span>
                        <span className="text-xs text-muted-foreground">/ {liveLeaderboardSize}</span>
                      </div>
                    </div>
                    <button onClick={() => navigate("/leaderboard")} className="p-2 rounded-lg border border-border/40 hover:border-primary/30 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Placement Badge */}
              {profile && profile.games_played < 10 && (
                <motion.div variants={fadeUp}>
                  <PlacementBadge gamesPlayed={profile.games_played} />
                </motion.div>
              )}

              {/* Daily Spin */}
              <motion.div variants={fadeUp}>
                <button
                  onClick={() => navigate("/daily-spin")}
                  className="w-full rounded-lg border border-primary/25 bg-primary/5 hover:bg-primary/10 p-3 text-left group transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                      <Gift className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-display font-bold text-xs">Daily Spin</p>
                      <p className="text-[10px] text-muted-foreground">Free daily Crown rewards</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
                  </div>
                </button>
              </motion.div>

              {/* Daily Puzzle */}
              <motion.div variants={fadeUp}>
                <DailyPuzzleCard />
              </motion.div>

              {/* Training Insights */}
              {user && (
                <motion.div variants={fadeUp}>
                  <TrainingInsights userId={user.id} />
                </motion.div>
              )}
            </div>

            {/* Right Column — Tournaments */}
            <motion.div variants={fadeUp} className="lg:col-span-8">
              <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between">
                   <h3 className="font-display font-bold text-sm flex items-center gap-2">
                     <Trophy className="w-4 h-4 text-primary" />
                     Tournaments
                     {activeTournaments.length > 0 && (
                       <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full ml-1">{activeTournaments.length} active</span>
                     )}
                   </h3>
                  <button
                    onClick={() => setShowCreateTournament(!showCreateTournament)}
                    className="flex items-center gap-1.5 text-xs font-display font-bold text-primary hover:text-primary/80 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create
                  </button>
                </div>

                {/* Create form */}
                {showCreateTournament && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="border-b border-border/30 px-5 py-4 bg-secondary/10"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Tournament Name</label>
                        <input value={newTournamentName} onChange={(e) => setNewTournamentName(e.target.value)} placeholder="Weekend Crown Clash" className="w-full bg-secondary/50 border border-border/40 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Prize Pool</label>
                        <input value={newPrizePool} onChange={(e) => setNewPrizePool(e.target.value)} placeholder="500" type="number" min={0} className="w-full bg-secondary/50 border border-border/40 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Max Players</label>
                        <input value={newMaxRegistrations} onChange={(e) => setNewMaxRegistrations(e.target.value)} placeholder="128" type="number" min={2} className="w-full bg-secondary/50 border border-border/40 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Start Time</label>
                        <input type="datetime-local" value={newStartsAt} onChange={(e) => setNewStartsAt(e.target.value)} className="w-full bg-secondary/50 border border-border/40 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Format</label>
                        <select value={newTournamentType} onChange={(e) => setNewTournamentType(e.target.value)} className="w-full bg-secondary/50 border border-border/40 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all">
                          <option value="swiss">Swiss</option>
                          <option value="arena">Arena</option>
                        </select>
                      </div>
                      <button onClick={createTournament} disabled={createTournamentLoading || !newTournamentName.trim()} className="sm:col-span-2 w-full bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-xs font-display font-bold tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-opacity">
                        {createTournamentLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating...</> : <><Plus className="w-3.5 h-3.5" /> Create Tournament</>}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Tournament list */}
                <div className="max-h-[22rem] overflow-y-auto">
                   {activeTournaments.length === 0 && (
                     <div className="px-5 py-10 text-center">
                       <Trophy className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                       <p className="text-xs text-muted-foreground">No active tournaments. Create one to get started!</p>
                     </div>
                   )}
                   {activeTournaments.map((tournament) => {
                     const count = tournament.registration_count?.[0]?.count || 0;
                     const isRegistered = registeredTournamentIds.includes(tournament.id);
                     const isFull = count >= tournament.max_players;
                     const startsAtMs = tournament.starts_at ? new Date(tournament.starts_at).getTime() : 0;
                     const isReady = startsAtMs > 0 && Date.now() >= startsAtMs;

                     return (
                       <div key={tournament.id} className="px-5 py-3.5 border-b border-border/20 last:border-0 hover:bg-secondary/10 transition-colors">
                         <div className="flex items-center justify-between gap-3">
                           <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-2">
                               <h4 className="font-display font-bold text-xs truncate">{tournament.name}</h4>
                               {isReady && (
                                 <span className="flex items-center gap-1 text-[9px] bg-emerald-500/15 text-emerald-400 font-bold px-1.5 py-0.5 rounded-full">
                                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                   LIVE
                                 </span>
                               )}
                             </div>
                             <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                               <span>{count}/{tournament.max_players} players</span>
                               <span>₹{tournament.prize_pool} prize</span>
                               {tournament.starts_at && (
                                 <span>{new Date(tournament.starts_at).toLocaleDateString()} {new Date(tournament.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                               )}
                             </div>
                           </div>

                           <div className="flex items-center gap-2 shrink-0">
                             {isReady && (
                               <button onClick={() => navigate(`/tournament/${tournament.id}`)} className="text-[10px] px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary font-display font-bold hover:bg-primary/20 transition-colors">
                                 View
                               </button>
                             )}
                             <button
                               onClick={() => registerTournament(tournament.id)}
                               disabled={isRegistered || isFull || registeringTournamentId === tournament.id}
                               className={`text-[10px] font-display font-bold px-3 py-1.5 rounded-lg transition-colors ${
                                 isRegistered
                                   ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                   : isFull
                                     ? "bg-muted text-muted-foreground"
                                     : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                               }`}
                             >
                               {isRegistered ? "✓ Joined" : isFull ? "Full" : registeringTournamentId === tournament.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Join · 2♛"}
                             </button>
                           </div>
                         </div>

                         {tournament.created_by === user?.id && (
                           <button onClick={() => cancelTournament(tournament)} className="mt-2 text-[10px] px-2 py-1 rounded-md bg-destructive/10 text-destructive font-semibold hover:bg-destructive/20 transition-colors">
                             Cancel & Refund
                           </button>
                         )}
                       </div>
                     );
                   })}
                 </div>
               </div>
             </motion.div>

             {/* Recent Tournaments (Completed / Cancelled) */}
             {recentTournaments.length > 0 && (
               <motion.div variants={fadeUp} className="lg:col-span-12">
                 <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
                   <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between">
                     <h3 className="font-display font-bold text-sm flex items-center gap-2">
                       <Clock className="w-4 h-4 text-muted-foreground" />
                       Recent Tournaments
                     </h3>
                     <span className="text-[10px] text-muted-foreground">{recentTournaments.length} past</span>
                   </div>
                   <div className="divide-y divide-border/20 max-h-[18rem] overflow-y-auto">
                     {recentTournaments.map((t) => {
                       const count = t.registration_count?.[0]?.count || 0;
                       const isCompleted = t.status === "completed";
                       return (
                         <div key={t.id} className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-secondary/10 transition-colors">
                           <div className="flex items-center gap-3 flex-1 min-w-0">
                             <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isCompleted ? "bg-primary/10" : "bg-destructive/10"}`}>
                               <Trophy className={`w-4 h-4 ${isCompleted ? "text-primary" : "text-destructive"}`} />
                             </div>
                             <div className="min-w-0">
                               <h4 className="font-display font-bold text-xs truncate">{t.name}</h4>
                               <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                                 <span className="capitalize">{t.tournament_type || "swiss"}</span>
                                 <span>{count} players</span>
                                 <span>₹{t.prize_pool} prize</span>
                                 {t.starts_at && <span>{new Date(t.starts_at).toLocaleDateString()}</span>}
                               </div>
                             </div>
                           </div>
                           <div className="flex items-center gap-2 shrink-0">
                             <span className={`text-[9px] font-display font-bold px-2 py-0.5 rounded-full ${
                               isCompleted ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                             }`}>
                               {t.status.toUpperCase()}
                             </span>
                             {isCompleted && (
                               <button onClick={() => navigate(`/tournament/${t.id}`)} className="text-[10px] px-2.5 py-1.5 rounded-lg border border-border/40 text-muted-foreground hover:text-foreground hover:border-primary/30 font-display font-bold transition-colors">
                                 Details
                               </button>
                             )}
                           </div>
                         </div>
                       );
                     })}
                   </div>
                 </div>
               </motion.div>
             )}
           </div>

          {/* ═══════════ RECENT GAMES ═══════════ */}
          {recentGames.length > 0 && (
            <motion.div id="history-section" variants={fadeUp} className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden scroll-mt-28">
              <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between">
                <h3 className="font-display font-bold text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Recent Games
                </h3>
                <span className="text-[10px] text-muted-foreground">{recentGames.filter((g) => g.result_type !== "in_progress").length} games</span>
              </div>
              <div className="divide-y divide-border/20">
                {recentGames.filter((g) => g.result_type !== "in_progress").map((g) => {
                  const userWon = g.winner_id === user?.id;
                  const userPlayedWhite = g.player_white === user?.id;
                  const opponent = userPlayedWhite ? g.black_name || "Opponent" : g.white_name || "Opponent";
                  const result = g.result_type === "draw" || g.result_type === "stalemate" ? "Draw" : userWon ? "Win" : "Loss";

                  return (
                    <div key={g.id} className="px-5 py-3 flex items-center justify-between hover:bg-secondary/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${result === "Win" ? "bg-emerald-500" : result === "Loss" ? "bg-destructive" : "bg-muted-foreground"}`} />
                        <div>
                          <span className="text-xs font-display font-bold">{opponent}</span>
                          <p className="text-[10px] text-muted-foreground">{userPlayedWhite ? "♔ White" : "♚ Black"} · {g.result_type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`text-[10px] font-display font-bold px-2 py-0.5 rounded-full ${
                          result === "Win" ? "bg-emerald-500/10 text-emerald-400" : result === "Loss" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                        }`}>
                          {result}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{new Date(g.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ═══════════ ACHIEVEMENTS ═══════════ */}
          <motion.div variants={fadeUp} className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-5">
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
