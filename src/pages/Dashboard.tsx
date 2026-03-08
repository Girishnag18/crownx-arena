import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Crown, Loader2 } from "lucide-react";
import RankPromotionOverlay from "@/components/gamification/RankPromotionOverlay";
import PlacementBadge from "@/components/gamification/PlacementBadge";
import TrainingInsights from "@/components/gamification/TrainingInsights";
import DailyPuzzleCard from "@/components/gamification/DailyPuzzleCard";
import ProfileHero from "@/components/dashboard/ProfileHero";
import QuickPlayCard from "@/components/dashboard/QuickPlayCard";
import StatsGrid from "@/components/dashboard/StatsGrid";
import RecentGamesCard from "@/components/dashboard/RecentGamesCard";
import TournamentsCard from "@/components/dashboard/TournamentsCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { publishInGameNotification } from "@/components/InGameNotificationBar";
import PullToRefresh from "@/components/common/PullToRefresh";

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
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};
const stagger = { show: { transition: { staggerChildren: 0.06 } } };

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
  const [globalRank, setGlobalRank] = useState<number | null>(null);
  const [liveLeaderboardSize, setLiveLeaderboardSize] = useState(0);
  const [recentTournamentsList, setRecentTournamentsList] = useState<RecentTournamentRow[]>([]);
  const [showCreateTournament, setShowCreateTournament] = useState(false);
  const [promotion, setPromotion] = useState<{ oldRank: string; newRank: string } | null>(null);
  const prevRankRef = useRef<string | null>(null);

  /* ─── Data loaders ─── */
  const loadProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("username, avatar_url, crown_score, rank_tier, games_played, wins, losses, draws, level, win_streak, wallet_crowns, xp, puzzles_solved").eq("id", userId).maybeSingle();
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

  const loadRecentTournaments = async () => {
    const { data } = await (supabase as any).from("recent_tournaments").select("*").order("ended_at", { ascending: false }).limit(5);
    if (data) setRecentTournamentsList(data as RecentTournamentRow[]);
  };

  const loadMyRegistrations = async (userId: string) => {
    const { data } = await (supabase as any).from("tournament_registrations").select("tournament_id").eq("player_id", userId);
    if (data) setRegisteredTournamentIds((data as any[]).map((e: any) => e.tournament_id));
  };

  useEffect(() => {
    if (!authLoading && !user) { navigate("/auth"); return; }
    if (!user) return;
    loadProfile(user.id); loadTournaments(); loadRecentTournaments(); loadMyRegistrations(user.id); loadRecentGames(user.id); loadRatingOverview(user.id);
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const ch1 = supabase.channel(`profile-${user.id}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` }, () => loadProfile(user.id)).subscribe();
    const ch2 = supabase.channel(`rating-games-${user.id}`).on("postgres_changes", { event: "*", schema: "public", table: "games" }, () => { loadProfile(user.id); loadRecentGames(user.id); loadRatingOverview(user.id); }).subscribe();
    const ch3 = supabase.channel(`rating-overview-${user.id}`).on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => { loadProfile(user.id); loadRatingOverview(user.id); }).subscribe();
    const ch4 = supabase.channel("tournaments-live").on("postgres_changes", { event: "*", schema: "public", table: "tournaments" }, loadTournaments).on("postgres_changes", { event: "*", schema: "public", table: "tournament_registrations" }, () => { loadTournaments(); loadMyRegistrations(user.id); }).on("postgres_changes", { event: "*", schema: "public", table: "recent_tournaments" }, loadRecentTournaments).subscribe();
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
    toast.success("Tournament created");
  };

  const registerTournament = async (tournamentId: string) => {
    if (!user) return;
    setRegisteringTournamentId(tournamentId);
    const { error } = await (supabase as any).rpc("register_tournament_with_wallet", { target_tournament: tournamentId });
    setRegisteringTournamentId(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Registered! 2 crowns deducted.");
    loadMyRegistrations(user.id); loadTournaments(); loadProfile(user.id);
  };

  const cancelTournament = async (tournament: Tournament) => {
    if (!user || tournament.created_by !== user.id) return;
    if (!window.confirm("Call off this tournament and refund all players?")) return;
    const { data: regs } = await (supabase as any).from("tournament_registrations").select("id, player_id").eq("tournament_id", tournament.id);
    for (const reg of regs || []) {
      const { data: pd } = await supabase.from("profiles").select("wallet_crowns").eq("id", reg.player_id).single();
      await supabase.from("profiles").update({ wallet_crowns: Number(pd?.wallet_crowns || 0) + 2 }).eq("id", reg.player_id);
      await supabase.from("wallet_transactions").insert({ player_id: reg.player_id, amount: 2, txn_type: "tournament_refund" });
      await (supabase as any).from("player_notifications").insert({ user_id: reg.player_id, title: "Tournament cancelled", message: `"${tournament.name}" was cancelled. Refund issued.`, kind: "tournament_cancelled" });
    }
    await (supabase as any).from("tournament_registrations").delete().eq("tournament_id", tournament.id);
    await (supabase as any).from("recent_tournaments").insert({
      original_id: tournament.id, name: tournament.name, prize_pool: tournament.prize_pool,
      max_players: tournament.max_players, created_by: tournament.created_by || user.id,
      status: "cancelled", tournament_type: tournament.tournament_type || "swiss",
      starts_at: tournament.starts_at, ended_at: new Date().toISOString(), player_count: (regs || []).length,
    });
    await (supabase as any).from("tournaments").delete().eq("id", tournament.id);
    publishInGameNotification(`Tournament "${tournament.name}" cancelled. Crowns refunded.`, "warning");
    toast.success("Tournament cancelled, refunds issued.");
    loadTournaments(); loadRecentTournaments(); loadProfile(user.id);
  };

  /* ─── Derived ─── */
  const displayName = profile?.username || user?.user_metadata?.username || "Player";
  const rank = profile?.rank_tier || "Bronze";
  const activeTournaments = useMemo(() => tournaments.filter((t) => t.status !== "completed" && t.status !== "cancelled"), [tournaments]);

  useEffect(() => {
    const section = new URLSearchParams(location.search).get("section");
    if (!section) return;
    if (section === "settings") navigate("/settings");
  }, [location.search]);

  const handlePullRefresh = useCallback(async () => {
    if (!user) return;
    await Promise.all([
      loadProfile(user.id), loadTournaments(), loadRecentTournaments(),
      loadMyRegistrations(user.id), loadRecentGames(user.id), loadRatingOverview(user.id),
    ]);
  }, [user]);

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
    <div className="min-h-screen bg-background pt-16 pb-24 lg:pb-6">
      {promotion && <RankPromotionOverlay oldRank={promotion.oldRank} newRank={promotion.newRank} onDismiss={() => setPromotion(null)} />}

      <PullToRefresh onRefresh={handlePullRefresh}>
        <div className="container mx-auto max-w-6xl px-3 sm:px-4 lg:px-6">
          <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-4">

            {/* ─── Profile Hero ─── */}
            <motion.div variants={fadeUp}>
              <ProfileHero
                username={displayName}
                avatarUrl={profile?.avatar_url || null}
                rank={rank}
                crownScore={profile?.crown_score || 400}
                level={profile?.level || 1}
                xp={profile?.xp || 0}
                walletCrowns={profile?.wallet_crowns || 0}
              />
            </motion.div>

            {/* ─── Quick Play ─── */}
            <motion.div variants={fadeUp}>
              <QuickPlayCard />
            </motion.div>

            {/* ─── Stats ─── */}
            <motion.div variants={fadeUp}>
              <StatsGrid
                gamesPlayed={profile?.games_played || 0}
                wins={profile?.wins || 0}
                losses={profile?.losses || 0}
                draws={profile?.draws || 0}
                winStreak={profile?.win_streak || 0}
                globalRank={globalRank}
                totalPlayers={liveLeaderboardSize}
                puzzlesSolved={profile?.puzzles_solved || 0}
              />
            </motion.div>

            {/* ─── Placement Badge ─── */}
            {profile && profile.games_played < 10 && (
              <motion.div variants={fadeUp}>
                <PlacementBadge gamesPlayed={profile.games_played} />
              </motion.div>
            )}

            {/* ─── Two Column: Games + Tournaments ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <motion.div variants={fadeUp} className="space-y-4">
                <RecentGamesCard games={recentGames} userId={user?.id || ""} />
                {user && <TrainingInsights userId={user.id} />}
              </motion.div>

              <motion.div variants={fadeUp} className="space-y-4">
                <TournamentsCard
                  activeTournaments={activeTournaments}
                  recentTournaments={recentTournamentsList}
                  registeredIds={registeredTournamentIds}
                  registeringId={registeringTournamentId}
                  userId={user?.id || ""}
                  onRegister={registerTournament}
                  onCancel={cancelTournament}
                  onNavigateToTournament={(id) => navigate(`/tournament/${id}`)}
                  showCreateForm={showCreateTournament}
                  onToggleCreate={() => setShowCreateTournament(!showCreateTournament)}
                  createFormProps={{
                    name: newTournamentName, setName: setNewTournamentName,
                    prizePool: newPrizePool, setPrizePool: setNewPrizePool,
                    maxPlayers: newMaxRegistrations, setMaxPlayers: setNewMaxRegistrations,
                    startsAt: newStartsAt, setStartsAt: setNewStartsAt,
                    type: newTournamentType, setType: setNewTournamentType,
                    loading: createTournamentLoading, onCreate: createTournament,
                  }}
                />
                <DailyPuzzleCard />
              </motion.div>
            </div>

          </motion.div>
        </div>
      </PullToRefresh>
    </div>
  );
};

export default Dashboard;
