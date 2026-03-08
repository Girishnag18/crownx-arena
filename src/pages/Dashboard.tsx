import { useEffect, useMemo, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Crown, Globe, Trophy, Clock, ChevronRight, ChevronDown, Plus, Wallet, Loader2, User, Target, Flame, BarChart3, Settings, Gamepad2, Gift, Shield, Sparkles } from "lucide-react";
import XPProgressBar from "@/components/gamification/XPProgressBar";
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

interface RecentTournamentRow {
  id: string;
  original_id: string;
  name: string;
  prize_pool: number;
  max_players: number;
  created_by: string;
  status: string;
  tournament_type: string;
  starts_at: string | null;
  ended_at: string | null;
  player_count: number;
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

/* ─── Animation variants ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
};
const stagger = { show: { transition: { staggerChildren: 0.05 } } };

/* ─── Rank theming ─── */
const rankEmoji: Record<string, string> = { Bronze: "🥉", Silver: "🥈", Gold: "🥇", Platinum: "💎", Diamond: "💠", "Crown Master": "👑" };
const rankGradient: Record<string, string> = {
  Bronze: "from-amber-700/20 via-amber-800/8 to-transparent",
  Silver: "from-slate-300/18 via-slate-400/6 to-transparent",
  Gold: "from-yellow-500/18 via-amber-500/6 to-transparent",
  Platinum: "from-cyan-400/18 via-blue-500/6 to-transparent",
  Diamond: "from-violet-400/18 via-purple-500/6 to-transparent",
  "Crown Master": "from-primary/22 via-amber-500/8 to-transparent",
};
const rankBorder: Record<string, string> = {
  Bronze: "border-amber-600/25", Silver: "border-slate-400/25", Gold: "border-yellow-500/25",
  Platinum: "border-cyan-400/25", Diamond: "border-violet-400/25", "Crown Master": "border-primary/35",
};

/* ─── Shared card style ─── */
const card = "rounded-xl border border-border/25 bg-card/50 backdrop-blur-sm";
const cardHeader = "px-4 py-2.5 border-b border-border/15 flex items-center justify-between";
const sectionIcon = "w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center shrink-0";

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
  const [recentTournamentsList, setRecentTournamentsList] = useState<RecentTournamentRow[]>([]);
  const [showCreateTournament, setShowCreateTournament] = useState(false);
  const [promotion, setPromotion] = useState<{ oldRank: string; newRank: string } | null>(null);
  const prevRankRef = useRef<string | null>(null);

  /* ─── Data loaders ─── */
  const loadProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("username, avatar_url, crown_score, rank_tier, games_played, wins, losses, draws, level, win_streak, wallet_crowns, xp, puzzles_solved").eq("id", userId).single();
    if (data) {
      const p = data as unknown as Profile;
      if (prevRankRef.current && prevRankRef.current !== p.rank_tier) {
        const ranks = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Crown Master"];
        if (ranks.indexOf(p.rank_tier) > ranks.indexOf(prevRankRef.current)) setPromotion({ oldRank: prevRankRef.current, newRank: p.rank_tier });
      }
      prevRankRef.current = p.rank_tier;
      setProfile(p);
    }
  };

  const loadRecentGames = async (userId: string) => {
    const { data } = await supabase.from("games").select("id, created_at, result_type, winner_id, player_white, player_black").or(`player_white.eq.${userId},player_black.eq.${userId}`).order("created_at", { ascending: false }).limit(10);
    if (!data) return;
    const games = data as RecentGame[];
    const opponentIds = Array.from(new Set(games.map((g) => (g.player_white === userId ? g.player_black : g.player_white)).filter(Boolean))) as string[];
    let names = new Map<string, string>();
    if (opponentIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, username").in("id", opponentIds);
      if (profiles) names = new Map(profiles.map((p) => [p.id, p.username || "Player"]));
    }
    setRecentGames(games.map((game) => ({ ...game, white_name: game.player_white ? names.get(game.player_white) : undefined, black_name: game.player_black ? names.get(game.player_black) : undefined })));
  };

  const loadRatingOverview = async (userId: string) => {
    const { data, error } = await supabase.from("profiles").select("id").order("crown_score", { ascending: false }).limit(500);
    if (error || !data) return;
    setLiveLeaderboardSize(data.length);
    const rankIndex = data.findIndex((entry) => entry.id === userId);
    setGlobalRank(rankIndex >= 0 ? rankIndex + 1 : null);
  };

  const loadTournaments = async () => {
    const { data } = await (supabase as any).from("tournaments").select("id, name, prize_pool, max_players, created_by, status, starts_at, tournament_type, registration_count:tournament_registrations(count)").order("created_at", { ascending: false }).limit(50);
    if (data) setTournaments(data as Tournament[]);
  };

  const loadMyRegistrations = async (userId: string) => {
    const { data } = await (supabase as any).from("tournament_registrations").select("tournament_id").eq("player_id", userId);
    if (data) setRegisteredTournamentIds((data as any[]).map((e: any) => e.tournament_id));
  };

  useEffect(() => {
    if (!authLoading && !user) { navigate("/auth"); return; }
    if (!user) return;
    loadProfile(user.id); loadTournaments(); loadMyRegistrations(user.id); loadRecentGames(user.id); loadRatingOverview(user.id);
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const ch1 = supabase.channel(`profile-${user.id}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` }, () => loadProfile(user.id)).subscribe();
    const ch2 = supabase.channel(`rating-games-${user.id}`).on("postgres_changes", { event: "*", schema: "public", table: "games" }, () => { loadProfile(user.id); loadRecentGames(user.id); loadRatingOverview(user.id); }).subscribe();
    const ch3 = supabase.channel(`rating-overview-${user.id}`).on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => { loadProfile(user.id); loadRatingOverview(user.id); }).subscribe();
    const ch4 = supabase.channel("tournaments-live").on("postgres_changes", { event: "*", schema: "public", table: "tournaments" }, loadTournaments).on("postgres_changes", { event: "*", schema: "public", table: "tournament_registrations" }, () => { loadTournaments(); loadMyRegistrations(user.id); }).subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); supabase.removeChannel(ch3); supabase.removeChannel(ch4); };
  }, [user]);

  /* ─── Actions ─── */
  const createTournament = async () => {
    if (!user || !newTournamentName.trim()) return;
    const parsedPrize = Number(newPrizePool);
    const parsedMax = Number(newMaxRegistrations);
    if (!Number.isFinite(parsedPrize) || parsedPrize < 0) { toast.error("Enter a valid prize pool amount"); return; }
    if (!Number.isInteger(parsedMax) || parsedMax < 2) { toast.error("Registration limit should be at least 2"); return; }
    setCreateTournamentLoading(true);
    const { data, error } = await (supabase as any).from("tournaments").insert({ name: newTournamentName.trim(), prize_pool: parsedPrize, max_players: parsedMax, created_by: user.id, status: "open", tournament_type: newTournamentType, starts_at: newStartsAt ? new Date(newStartsAt).toISOString() : new Date(Date.now() + 1000 * 60 * 45).toISOString() }).select("id, name, prize_pool, max_players, status, starts_at").single();
    setCreateTournamentLoading(false);
    if (error) { toast.error(error.message); return; }
    setNewTournamentName(""); setNewPrizePool("500"); setNewMaxRegistrations("128"); setNewStartsAt(""); setShowCreateTournament(false);
    if (data) setTournaments((prev) => [{ ...(data as any), registration_count: [{ count: 0 }] } as Tournament, ...prev]);
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
    loadMyRegistrations(user.id); loadTournaments(); loadProfile(user.id);
  };

  const cancelTournament = async (tournament: Tournament) => {
    if (!user || tournament.created_by !== user.id) return;
    if (!window.confirm("Call off this tournament and refund all players 2 crowns?")) return;
    const { data: regs } = await (supabase as any).from("tournament_registrations").select("id, player_id").eq("tournament_id", tournament.id);
    for (const reg of regs || []) {
      const { data: pd } = await supabase.from("profiles").select("wallet_crowns").eq("id", reg.player_id).single();
      await supabase.from("profiles").update({ wallet_crowns: Number(pd?.wallet_crowns || 0) + 2 }).eq("id", reg.player_id);
      await supabase.from("wallet_transactions").insert({ player_id: reg.player_id, amount: 2, txn_type: "tournament_refund" });
      await (supabase as any).from("player_notifications").insert({ user_id: reg.player_id, title: "Tournament cancelled", message: `Your tournament "${tournament.name}" was cancelled. Refund has been issued.`, kind: "tournament_cancelled" });
    }
    await (supabase as any).from("tournament_registrations").delete().eq("tournament_id", tournament.id);
    await (supabase as any).from("tournaments").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", tournament.id);
    publishInGameNotification(`Sorry! Tournament "${tournament.name}" was called off. Crowns have been refunded.`, "warning");
    toast.success("Tournament called off, refunds issued.");
    loadTournaments(); loadProfile(user.id);
  };

  /* ─── Derived ─── */
  const displayName = profile?.username || user?.user_metadata?.username || "Player";
  const winRate = profile && profile.games_played > 0 ? ((profile.wins / profile.games_played) * 100).toFixed(1) : "0.0";
  const rank = profile?.rank_tier || "Bronze";
  const activeTournaments = useMemo(() => tournaments.filter((t) => t.status !== "completed" && t.status !== "cancelled"), [tournaments]);
  const recentTournaments = useMemo(() => tournaments.filter((t) => t.status === "completed" || t.status === "cancelled").slice(0, 5), [tournaments]);
  const finishedGames = useMemo(() => recentGames.filter((g) => g.result_type !== "in_progress"), [recentGames]);

  useEffect(() => {
    const section = new URLSearchParams(location.search).get("section");
    if (!section) return;
    if (section === "settings") { navigate("/settings"); return; }
    if (section === "history") document.getElementById("history-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.search]);

  const statChips = [
    { label: "Games", value: profile?.games_played || 0, icon: Gamepad2 },
    { label: "Wins", value: profile?.wins || 0, icon: Trophy },
    { label: "Win%", value: `${winRate}%`, icon: Target },
    { label: "Streak", value: profile?.win_streak || 0, icon: Flame },
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-20">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
          <Crown className="w-10 h-10 text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-16 pb-20 lg:pb-6">
      {promotion && <RankPromotionOverlay oldRank={promotion.oldRank} newRank={promotion.newRank} onDismiss={() => setPromotion(null)} />}

      <div className="container mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
        <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-3">

          {/* ════════ HERO ════════ */}
          <motion.div variants={fadeUp} className={`relative rounded-xl border ${rankBorder[rank] || "border-border/30"} bg-gradient-to-br ${rankGradient[rank] || rankGradient.Bronze} overflow-hidden`}>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.06),transparent_60%)]" />
            <div className="relative px-4 py-4 sm:px-5 sm:py-5">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary/25 to-transparent blur-sm" />
                  <Avatar className="relative w-14 h-14 sm:w-16 sm:h-16 border-2 border-primary/30 ring-2 ring-primary/8 ring-offset-2 ring-offset-background">
                    <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
                    <AvatarFallback className="bg-secondary text-primary font-display font-bold text-lg"><User className="w-6 h-6" /></AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background bg-emerald-500">
                    <div className="w-full h-full rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                </div>

                {/* Identity */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="font-display text-lg sm:text-xl font-black tracking-tight truncate">{displayName}</h1>
                    <span className="inline-flex items-center gap-1 text-[9px] bg-primary/12 border border-primary/20 text-primary font-display font-bold px-1.5 py-0.5 rounded-full">
                      <Sparkles className="w-2.5 h-2.5" /> Lvl {profile?.level || 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm font-display font-bold">{rankEmoji[rank]} {rank}</span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <Crown className="w-3 h-3 text-primary" />{profile?.crown_score || 400}
                    </span>
                  </div>
                </div>

                {/* Desktop stats */}
                <div className="hidden md:flex items-center gap-1.5">
                  {statChips.map((s) => (
                    <div key={s.label} className="rounded-lg border border-border/25 bg-card/60 px-3 py-2 text-center min-w-[4rem]">
                      <s.icon className="w-3.5 h-3.5 text-primary mx-auto mb-0.5" />
                      <div className="font-display text-xs font-bold">{s.value}</div>
                      <div className="text-[8px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile stats */}
              <div className="grid grid-cols-4 gap-1.5 mt-3 md:hidden">
                {statChips.map((s) => (
                  <div key={s.label} className="rounded-lg border border-border/25 bg-card/40 px-1.5 py-1.5 text-center">
                    <s.icon className="w-3 h-3 text-primary mx-auto mb-0.5" />
                    <div className="font-display text-[11px] font-bold">{s.value}</div>
                    <div className="text-[7px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* XP Bar */}
              <div className="mt-3">
                <XPProgressBar xp={profile?.xp || 0} level={profile?.level || 1} />
              </div>
            </div>
          </motion.div>

          {/* ════════ QUICK ACTIONS ════════ */}
          <motion.div variants={fadeUp} className="grid grid-cols-4 gap-2">
            {[
              { title: "Play Online", desc: "Quick match", icon: Globe, onClick: () => navigate("/lobby"), accent: true },
              { title: "Puzzles", desc: "Train tactics", icon: Target, onClick: () => navigate("/puzzles") },
              { title: "Leaderboard", desc: "Rankings", icon: BarChart3, onClick: () => navigate("/leaderboard") },
              { title: "Settings", desc: "Preferences", icon: Settings, onClick: () => navigate("/settings") },
            ].map((a) => (
              <motion.button key={a.title} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={a.onClick}
                className={`${card} p-3 text-left group transition-all duration-200 ${a.accent ? "border-primary/25 hover:border-primary/40 hover:shadow-[0_4px_16px_-6px_hsl(var(--primary)/0.12)]" : "hover:border-border/50"}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1.5 ${a.accent ? "bg-primary/12" : "bg-secondary/50"}`}>
                  <a.icon className={`w-4 h-4 ${a.accent ? "text-primary" : "text-muted-foreground group-hover:text-foreground"} transition-colors`} />
                </div>
                <h3 className="font-display font-bold text-[10px] sm:text-xs">{a.title}</h3>
                <p className="text-[8px] sm:text-[9px] text-muted-foreground mt-0.5 hidden sm:block">{a.desc}</p>
              </motion.button>
            ))}
          </motion.div>

          {/* ════════ MAIN 2-COL ════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">

            {/* ── LEFT ── */}
            <div className="lg:col-span-4 space-y-3">

              {/* Global Rank */}
              {globalRank !== null && (
                <motion.div variants={fadeUp} className={`${card} p-4`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/12 to-primary/4 border border-primary/15 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Global Rank</p>
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-display font-black text-xl text-primary">#{globalRank}</span>
                        <span className="text-[10px] text-muted-foreground">/ {liveLeaderboardSize}</span>
                      </div>
                    </div>
                    <button onClick={() => navigate("/leaderboard")} className="p-2 rounded-lg border border-border/25 hover:border-primary/25 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Placement */}
              {profile && profile.games_played < 10 && <motion.div variants={fadeUp}><PlacementBadge gamesPlayed={profile.games_played} /></motion.div>}

              {/* Training Insights */}
              {user && <motion.div variants={fadeUp}><TrainingInsights userId={user.id} /></motion.div>}
            </div>

            {/* ── RIGHT (empty for now, tournaments below) ── */}
            <div className="lg:col-span-8" />
          </div>

          {/* ════════ TOURNAMENTS — FULL WIDTH ════════ */}
          <motion.div variants={fadeUp} className={`${card} overflow-hidden`}>
            <div className={cardHeader}>
              <h3 className="font-display font-bold text-sm flex items-center gap-2">
                <div className={sectionIcon}><Trophy className="w-3 h-3 text-primary" /></div>
                Tournaments
                {activeTournaments.length > 0 && (
                  <span className="text-[9px] bg-primary/12 text-primary font-bold px-2 py-0.5 rounded-full">{activeTournaments.length} active</span>
                )}
              </h3>
              <button onClick={() => setShowCreateTournament(!showCreateTournament)} className="flex items-center gap-1.5 text-xs font-display font-bold text-primary hover:text-primary/80 px-2.5 py-1.5 rounded-lg hover:bg-primary/5 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Create
              </button>
            </div>

            {/* Create form */}
            {showCreateTournament && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} transition={{ duration: 0.2 }} className="border-b border-border/15 px-4 py-4 bg-secondary/5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                    <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Name</label>
                    <input value={newTournamentName} onChange={(e) => setNewTournamentName(e.target.value)} placeholder="Weekend Crown Clash" className="w-full bg-background border border-border/30 rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/25 transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Prize Pool</label>
                    <input value={newPrizePool} onChange={(e) => setNewPrizePool(e.target.value)} type="number" min={0} className="w-full bg-background border border-border/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/25 transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Max Players</label>
                    <input value={newMaxRegistrations} onChange={(e) => setNewMaxRegistrations(e.target.value)} type="number" min={2} className="w-full bg-background border border-border/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/25 transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Start Time</label>
                    <input type="datetime-local" value={newStartsAt} onChange={(e) => setNewStartsAt(e.target.value)} className="w-full bg-background border border-border/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/25 transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Format</label>
                    <select value={newTournamentType} onChange={(e) => setNewTournamentType(e.target.value)} className="w-full bg-background border border-border/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/25 transition-all">
                      <option value="swiss">Swiss</option>
                      <option value="arena">Arena</option>
                    </select>
                  </div>
                  <button onClick={createTournament} disabled={createTournamentLoading || !newTournamentName.trim()} className="sm:col-span-2 lg:col-span-3 w-full bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-xs font-display font-bold tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-opacity">
                    {createTournamentLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating...</> : <><Plus className="w-3.5 h-3.5" /> Create Tournament</>}
                  </button>
                </div>
              </motion.div>
            )}

            {/* List */}
            <div className="max-h-[26rem] overflow-y-auto">
              {activeTournaments.length === 0 && (
                <div className="px-4 py-10 text-center">
                  <div className="w-12 h-12 rounded-xl bg-secondary/30 flex items-center justify-center mx-auto mb-3">
                    <Trophy className="w-6 h-6 text-muted-foreground/25" />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">No active tournaments</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-0.5">Create one to get started</p>
                </div>
              )}
              {activeTournaments.map((t) => {
                const count = t.registration_count?.[0]?.count || 0;
                const isReg = registeredTournamentIds.includes(t.id);
                const isFull = count >= t.max_players;
                const isReady = t.starts_at ? Date.now() >= new Date(t.starts_at).getTime() : false;
                return (
                  <div key={t.id} className="px-4 py-3 border-b border-border/10 last:border-0 hover:bg-secondary/6 transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-display font-bold text-xs truncate">{t.name}</h4>
                          {isReady && (
                            <span className="inline-flex items-center gap-1 text-[8px] bg-emerald-500/12 text-emerald-500 font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2.5 mt-1 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1"><User className="w-2.5 h-2.5" />{count}/{t.max_players}</span>
                          <span>₹{t.prize_pool}</span>
                          {t.starts_at && <span className="hidden sm:inline">{new Date(t.starts_at).toLocaleDateString()} {new Date(t.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isReady && <button onClick={() => navigate(`/tournament/${t.id}`)} className="text-[10px] px-2.5 py-1.5 rounded-lg bg-primary/8 text-primary font-display font-bold hover:bg-primary/12 transition-colors">View</button>}
                        <button onClick={() => registerTournament(t.id)} disabled={isReg || isFull || registeringTournamentId === t.id}
                          className={`text-[10px] font-display font-bold px-3 py-1.5 rounded-lg transition-all ${isReg ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : isFull ? "bg-muted text-muted-foreground" : "bg-primary/8 text-primary hover:bg-primary/12 border border-primary/20"}`}>
                          {isReg ? "✓ Joined" : isFull ? "Full" : registeringTournamentId === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Join · 2♛"}
                        </button>
                      </div>
                    </div>
                    {t.created_by === user?.id && (
                      <button onClick={() => cancelTournament(t)} className="mt-2 text-[10px] px-2.5 py-1 rounded-md bg-destructive/8 text-destructive font-semibold hover:bg-destructive/12 transition-colors">Cancel & Refund</button>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* ════════ RECENT TOURNAMENTS ════════ */}
          <motion.div variants={fadeUp} className={`${card} overflow-hidden`}>
            <div className={cardHeader}>
              <h3 className="font-display font-bold text-sm flex items-center gap-2">
                <div className={sectionIcon}><Clock className="w-3 h-3 text-muted-foreground" /></div>
                Recent Tournaments
              </h3>
              {recentTournaments.length > 0 && (
                <span className="text-[10px] text-muted-foreground font-medium">{recentTournaments.length} ended</span>
              )}
            </div>
            {recentTournaments.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="w-10 h-10 rounded-xl bg-secondary/30 flex items-center justify-center mx-auto mb-2">
                  <Clock className="w-5 h-5 text-muted-foreground/25" />
                </div>
                <p className="text-xs text-muted-foreground font-medium">No recent tournaments</p>
                <p className="text-[10px] text-muted-foreground/50 mt-0.5">Completed and cancelled tournaments appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-border/10 max-h-[14rem] overflow-y-auto">
                {recentTournaments.map((t) => {
                  const count = t.registration_count?.[0]?.count || 0;
                  const isCancelled = t.status === "cancelled";
                  return (
                    <div key={t.id} className="px-4 py-2.5 flex items-center justify-between gap-2 hover:bg-secondary/6 transition-colors">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                          <Trophy className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-display font-bold text-xs truncate">{t.name}</h4>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                            <span className="capitalize">{t.tournament_type || "swiss"}</span>
                            <span>{count} players</span>
                            <span>₹{t.prize_pool}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[9px] font-display font-bold px-2 py-0.5 rounded-full ${isCancelled ? "bg-destructive/10 text-destructive" : "bg-primary/8 text-primary"}`}>
                          {isCancelled ? "CANCELLED" : "COMPLETED"}
                        </span>
                        <button onClick={() => navigate(`/tournament/${t.id}`)} className="text-[10px] px-2.5 py-1 rounded-lg border border-border/25 text-muted-foreground hover:text-foreground hover:border-primary/25 font-display font-bold transition-colors">Details</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
