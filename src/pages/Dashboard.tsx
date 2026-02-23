import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Swords, Bot, Globe, Users, Trophy, Clock, ChevronRight, Plus, Zap, Wallet, IndianRupee } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Profile {
  username: string | null;
  crown_score: number;
  rank_tier: string;
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
  level: number;
  win_streak: number;
  wallet_crowns: number;
}

interface Tournament {
  id: string;
  name: string;
  prize_pool: number;
  max_players: number;
  status: "open" | "full" | "live" | "completed";
  starts_at: string | null;
  registration_count?: { count: number }[];
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

  const [profile, setProfile] = useState<Profile | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [registeredTournamentIds, setRegisteredTournamentIds] = useState<string[]>([]);
  const [newTournamentName, setNewTournamentName] = useState("");
  const [newPrizePool, setNewPrizePool] = useState("500");
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);
  const [topupAmount, setTopupAmount] = useState("50");
  const [upiReference, setUpiReference] = useState("");
  const [topupLoading, setTopupLoading] = useState(false);
  const [registeringTournamentId, setRegisteringTournamentId] = useState<string | null>(null);
  const upiId = import.meta.env.VITE_UPI_ID || "crownxarena@upi";

  const openUpiApp = () => {
    const amount = Number(topupAmount) || 0;
    if (amount <= 0) {
      toast.error("Enter a valid amount before opening UPI app");
      return;
    }

    const params = new URLSearchParams({
      pa: upiId,
      pn: "CrownX Arena",
      tn: "Wallet topup",
      am: amount.toFixed(2),
      cu: "INR",
    });

    window.open(`upi://pay?${params.toString()}`, "_self");
  };

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("username, crown_score, rank_tier, games_played, wins, losses, draws, level, win_streak, wallet_crowns")
      .eq("id", userId)
      .single();
    if (data) setProfile(data as Profile);
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

  const loadTournaments = async () => {
    const { data } = await supabase
      .from("tournaments")
      .select("id, name, prize_pool, max_players, status, starts_at, registration_count:tournament_registrations(count)")
      .order("created_at", { ascending: false })
      .limit(8);

    if (data) setTournaments(data as unknown as Tournament[]);
  };

  const loadMyRegistrations = async (userId: string) => {
    const { data } = await supabase
      .from("tournament_registrations")
      .select("tournament_id")
      .eq("player_id", userId);

    if (data) setRegisteredTournamentIds(data.map((entry) => entry.tournament_id));
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
      supabase.removeChannel(tournamentChannel);
    };
  }, [user]);

  const createTournament = async () => {
    if (!user || !newTournamentName.trim()) return;

    const { error } = await supabase.from("tournaments").insert({
      name: newTournamentName.trim(),
      prize_pool: Number(newPrizePool) || 0,
      max_players: 128,
      created_by: user.id,
      status: "open",
      starts_at: new Date(Date.now() + 1000 * 60 * 45).toISOString(),
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    setNewTournamentName("");
    setNewPrizePool("500");
    toast.success("Tournament created and ready for registrations");
  };

  const topupWallet = async () => {
    if (!user) return;
    const amount = Number(topupAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid top up amount");
      return;
    }

    if (!upiReference.trim()) {
      toast.error("Enter your UPI transaction reference");
      return;
    }

    setTopupLoading(true);
    const { data, error } = await supabase.rpc("topup_wallet_via_upi", {
      topup_rupees: amount,
      upi_ref: upiReference.trim(),
      upi_provider: "upi",
    });
    setTopupLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    const newBalance = data?.[0]?.wallet_balance;
    toast.success(`Top up successful. Wallet balance: ${newBalance} crowns`);
    setUpiReference("");
    loadProfile(user.id);
  };

  const registerTournament = async (tournamentId: string) => {
    if (!user) return;
    setRegisteringTournamentId(tournamentId);
    const { error } = await supabase.rpc("register_tournament_with_wallet", {
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

  const displayName = profile?.username || user?.user_metadata?.username || "Player";
  const winRate = profile && profile.games_played > 0
    ? ((profile.wins / profile.games_played) * 100).toFixed(1)
    : "0.0";

  const liveTournamentCount = useMemo(
    () => tournaments.filter((t) => t.status === "live" || t.status === "open").length,
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
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-7xl">
        <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.08 } } }} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <motion.div variants={fadeUp} className="lg:col-span-4 glass-card p-6 border-glow">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center gold-glow">
                  <Crown className="w-8 h-8 text-primary" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card" style={{ background: "hsl(142 71% 45%)" }} />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold">{displayName}</h2>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gradient-gold font-display font-bold">{rankEmoji[profile?.rank_tier || "Bronze"]} {profile?.rank_tier || "Bronze"}</span>
                  <span className="text-muted-foreground">• Level {profile?.level || 1}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[{ label: "Played", value: String(profile?.games_played || 0) }, { label: "Wins", value: String(profile?.wins || 0) }, { label: "Win Rate", value: `${winRate}%` }].map((stat) => (
                <div key={stat.label} className="bg-secondary/50 rounded-lg p-3 text-center">
                  <div className="font-display text-lg font-bold text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
            <div className="bg-secondary/30 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Crown Score</span>
                <span className="font-display text-lg font-bold text-primary">{(profile?.crown_score || 1200).toLocaleString()}</span>
              </div>
            </div>
            <div className="bg-secondary/40 border border-border rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Wallet</span>
                <span className="text-xs text-muted-foreground">1 Crown = ₹1</span>
              </div>
              <div className="flex items-center gap-2 text-lg font-display font-bold mb-3">
                <Wallet className="w-4 h-4 text-primary" />
                {Number(profile?.wallet_crowns || 0).toFixed(2)} Crowns
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] gap-2">
                <div className="relative">
                  <IndianRupee className="w-3.5 h-3.5 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2" />
                  <input value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} type="number" min={1} placeholder="Amount" className="bg-secondary border border-border rounded-lg pl-7 pr-2 py-2 text-xs w-full sm:w-24 focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <input value={upiReference} onChange={(e) => setUpiReference(e.target.value.toUpperCase())} placeholder="UPI transaction ref" className="bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary" />
                <div className="flex gap-2">
                  <button onClick={openUpiApp} className="bg-secondary border border-border px-3 py-2 rounded-lg text-xs font-display font-bold tracking-wide">
                    Open UPI
                  </button>
                  <button onClick={topupWallet} disabled={topupLoading} className="bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs font-display font-bold tracking-wide disabled:opacity-60">
                    {topupLoading ? "Processing" : "Top up"}
                  </button>
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-primary" />
              Live profile updates enabled
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="lg:col-span-3 space-y-4">
            <div className="space-y-3">
              {[{ icon: Swords, title: "Quick Play", desc: "Jump into ranked match", to: "/lobby", accent: true }, { icon: Bot, title: "vs Computer", desc: "Practice with AI", to: "/play?mode=computer" }, { icon: Globe, title: "World Arena", desc: "Global matchmaking", to: "/lobby" }, { icon: Users, title: "Private Room", desc: "Invite a friend", to: "/lobby" }].map((mode) => (
                <motion.button key={mode.title} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => navigate(mode.to)} className={`glass-card p-5 text-left group transition-all duration-300 ${mode.accent ? "border-primary/30 gold-glow" : "hover:border-primary/20"}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${mode.accent ? "bg-primary/20" : "bg-secondary"}`}><mode.icon className={`w-5 h-5 ${mode.accent ? "text-primary" : "text-muted-foreground"}`} /></div>
                    <div>
                      <h3 className="font-display font-bold text-sm">{mode.title}</h3>
                      <p className="text-xs text-muted-foreground">{mode.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="lg:col-span-5 glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold flex items-center gap-2"><Trophy className="w-5 h-5 text-primary" />Active Tournaments</h3>
              <span className="text-xs text-primary font-display">{liveTournamentCount} live</span>
            </div>
            <div className="rounded-lg border border-border/60 p-4 bg-secondary/20 mb-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Create Tournament</p>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
                <input value={newTournamentName} onChange={(e) => setNewTournamentName(e.target.value)} placeholder="Tournament name" className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                <input value={newPrizePool} onChange={(e) => setNewPrizePool(e.target.value)} placeholder="Prize" type="number" min={0} className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm w-full sm:w-28 focus:outline-none focus:ring-2 focus:ring-primary" />
                <button onClick={createTournament} className="bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs font-display font-bold tracking-wide flex items-center justify-center gap-1"><Plus className="w-3.5 h-3.5" /> CREATE</button>
              </div>
            </div>
            <div className="space-y-2 max-h-[20rem] overflow-y-auto pr-1">
              {tournaments.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No active tournaments. Create one to go live.</p>}
              {tournaments.map((tournament) => {
                const count = tournament.registration_count?.[0]?.count || 0;
                const isRegistered = registeredTournamentIds.includes(tournament.id);
                const isFull = count >= tournament.max_players;
                return (
                  <div key={tournament.id} className="flex items-center justify-between gap-3 py-3 border-b border-border last:border-0">
                    <div>
                      <div className="font-semibold text-sm">{tournament.name}</div>
                      <div className="text-xs text-muted-foreground">{count}/{tournament.max_players} players • 🏆 ₹{tournament.prize_pool}</div>
                      <div className="text-[11px] text-primary/90 mt-0.5">Ready for registrations • Entry: 2 crowns</div>
                    </div>
                    <button onClick={() => registerTournament(tournament.id)} disabled={isRegistered || isFull || registeringTournamentId === tournament.id} className="text-xs font-display font-bold px-3 py-1.5 rounded bg-primary/10 text-primary disabled:bg-muted disabled:text-muted-foreground">{isRegistered ? "Registered" : isFull ? "Full" : registeringTournamentId === tournament.id ? "Joining..." : "Register (2C)"}</button>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="lg:col-span-12 glass-card p-6">
            <h3 className="font-display font-bold flex items-center gap-2 mb-4"><Clock className="w-5 h-5 text-primary" />Recent Games</h3>
            <div className="space-y-1">
              {recentGames.length === 0 && <p className="text-sm text-muted-foreground">No completed games yet.</p>}
              {recentGames.map((g) => {
                const userWon = g.winner_id === user?.id;
                const userPlayedWhite = g.player_white === user?.id;
                const opponent = userPlayedWhite ? g.black_name || "Opponent" : g.white_name || "Opponent";
                const result = g.result_type === "draw" || g.result_type === "stalemate" ? "Draw" : userWon ? "Win" : "Loss";
                const resultColor = result === "Win" ? "bg-success" : result === "Loss" ? "bg-destructive" : "bg-muted-foreground";

                return (
                  <div key={g.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${resultColor}`} />
                      <span className="text-sm font-semibold">{opponent}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-display font-bold">{result}</span>
                      <span className="text-xs text-muted-foreground">{new Date(g.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
