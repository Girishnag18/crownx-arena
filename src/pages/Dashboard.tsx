import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Swords, Bot, Globe, Users, Trophy, Clock, ChevronRight, Plus, Zap, Wallet, Loader2, User, Save, Mail, KeyRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  const location = useLocation();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [registeredTournamentIds, setRegisteredTournamentIds] = useState<string[]>([]);
  const [newTournamentName, setNewTournamentName] = useState("");
  const [newPrizePool, setNewPrizePool] = useState("500");
  const [newMaxRegistrations, setNewMaxRegistrations] = useState("128");
  const [createTournamentLoading, setCreateTournamentLoading] = useState(false);
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);
  const [registeringTournamentId, setRegisteringTournamentId] = useState<string | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [email, setEmail] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("username, avatar_url, crown_score, rank_tier, games_played, wins, losses, draws, level, win_streak, wallet_crowns")
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

  useEffect(() => {
    if (!profile || !user) return;
    setAvatarUrl(profile.avatar_url || "");
    setDateOfBirth((user.user_metadata?.date_of_birth as string) || "");
    setEmail(user.email || "");
  }, [profile, user]);

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

    const { error } = await supabase.from("tournaments").insert({
      name: newTournamentName.trim(),
      prize_pool: parsedPrize,
      max_players: parsedMaxRegistrations,
      created_by: user.id,
      status: "open",
      starts_at: new Date(Date.now() + 1000 * 60 * 45).toISOString(),
    });
    setCreateTournamentLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes("public.tournments")) {
        toast.error("Tournament schema is syncing. Please refresh once and try again.");
      } else {
        toast.error(error.message);
      }
      return;
    }

    setNewTournamentName("");
    setNewPrizePool("500");
    setNewMaxRegistrations("128");
    loadTournaments();
    toast.success("Tournament created and ready for registrations");
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

  const saveSettings = async () => {
    if (!user) return;
    setSettingsSaving(true);

    const [{ error: profileError }, { error: metadataError }] = await Promise.all([
      supabase.from("profiles").update({ avatar_url: avatarUrl || null }).eq("id", user.id),
      supabase.auth.updateUser({
        data: {
          ...(user.user_metadata || {}),
          date_of_birth: dateOfBirth || null,
        },
      }),
    ]);

    setSettingsSaving(false);

    if (profileError || metadataError) {
      toast.error(profileError?.message || metadataError?.message || "Failed to save settings");
      return;
    }

    toast.success("Profile settings updated");
    loadProfile(user.id);
  };

  const requestEmailOtp = async () => {
    if (!pendingEmail.trim()) {
      toast.error("Enter a new email address");
      return;
    }
    const { error } = await supabase.auth.updateUser({ email: pendingEmail.trim() });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("OTP sent to your new email. Enter it below to verify.");
  };

  const verifyEmailOtp = async () => {
    if (!pendingEmail || !emailOtp) {
      toast.error("Enter email and OTP code");
      return;
    }
    const { error } = await supabase.auth.verifyOtp({
      type: "email_change",
      email: pendingEmail,
      token: emailOtp,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setEmail(pendingEmail);
    setEmailOtp("");
    toast.success("Email verified and updated");
  };

  const sendPasswordOtp = async () => {
    if (!email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password reset OTP/link sent to your email");
  };

  const displayName = profile?.username || user?.user_metadata?.username || "Player";
  const winRate = profile && profile.games_played > 0
    ? ((profile.wins / profile.games_played) * 100).toFixed(1)
    : "0.0";


  useEffect(() => {
    const section = new URLSearchParams(location.search).get("section");
    if (!section) return;

    const sectionMap: Record<string, string> = {
      ratings: "ratings-section",
      settings: "settings-section",
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
                <Avatar className="w-16 h-16 border border-primary/30 gold-glow">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
                  <AvatarFallback className="bg-secondary text-primary">
                    <User className="w-7 h-7" />
                  </AvatarFallback>
                </Avatar>
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
            <div id="ratings-section" className="bg-secondary/30 rounded-lg p-4 mb-4 scroll-mt-28">
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
              <button onClick={() => navigate("/crown-topup")} className="w-full bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs font-display font-bold tracking-wide">
                Manage Crown Balance
              </button>
            </div>
            <div id="settings-section" className="scroll-mt-28 space-y-4">
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-primary" />
                Live profile & ranking updates enabled
              </div>

              <div className="bg-secondary/30 rounded-lg p-4 space-y-3">
                <h4 className="font-display text-sm font-bold">Profile settings</h4>
                <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="Profile picture URL" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                <button onClick={saveSettings} disabled={settingsSaving} className="w-full bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs font-display font-bold tracking-wide disabled:opacity-60 inline-flex items-center justify-center gap-2">
                  {settingsSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save profile
                </button>
              </div>

              <div className="bg-secondary/30 rounded-lg p-4 space-y-3">
                <h4 className="font-display text-sm font-bold">Email change with OTP verification</h4>
                <p className="text-[11px] text-muted-foreground">Current email: {email || "Not available"}</p>
                <input type="email" value={pendingEmail} onChange={(e) => setPendingEmail(e.target.value)} placeholder="New email address" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                <button onClick={requestEmailOtp} className="w-full bg-primary/15 text-primary px-3 py-2 rounded-lg text-xs font-display font-bold tracking-wide inline-flex items-center justify-center gap-2"><Mail className="w-3.5 h-3.5" /> Send OTP</button>
                <input value={emailOtp} onChange={(e) => setEmailOtp(e.target.value)} placeholder="Enter OTP" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                <button onClick={verifyEmailOtp} className="w-full bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs font-display font-bold tracking-wide">Verify email</button>
              </div>

              <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
                <h4 className="font-display text-sm font-bold">Password security</h4>
                <p className="text-[11px] text-muted-foreground">To keep your account secure, verify via your email OTP before resetting password.</p>
                <button onClick={sendPasswordOtp} className="w-full bg-primary/15 text-primary px-3 py-2 rounded-lg text-xs font-display font-bold tracking-wide inline-flex items-center justify-center gap-2"><KeyRound className="w-3.5 h-3.5" /> Send password reset OTP</button>
              </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2">
                <input value={newTournamentName} onChange={(e) => setNewTournamentName(e.target.value)} placeholder="Tournament name" className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                <input value={newPrizePool} onChange={(e) => setNewPrizePool(e.target.value)} placeholder="Prize" type="number" min={0} className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm w-full sm:w-28 focus:outline-none focus:ring-2 focus:ring-primary" />
                <input value={newMaxRegistrations} onChange={(e) => setNewMaxRegistrations(e.target.value)} placeholder="Max regs" type="number" min={2} className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm w-full sm:w-28 focus:outline-none focus:ring-2 focus:ring-primary" />
                <button onClick={createTournament} disabled={createTournamentLoading} className="bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs font-display font-bold tracking-wide flex items-center justify-center gap-1 disabled:opacity-60 transition-all duration-300"><Plus className="w-3.5 h-3.5" /> {createTournamentLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> CREATING</> : "CREATE"}</button>
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
                    <button onClick={() => registerTournament(tournament.id)} disabled={isRegistered || isFull || registeringTournamentId === tournament.id} className="text-xs font-display font-bold px-3 py-1.5 rounded bg-primary/10 text-primary disabled:bg-muted disabled:text-muted-foreground transition-all duration-300">{isRegistered ? "Registered" : isFull ? "Full" : registeringTournamentId === tournament.id ? <span className="inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Joining...</span> : "Register (2C)"}</button>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div id="history-section" variants={fadeUp} className="lg:col-span-12 glass-card p-6 scroll-mt-28">
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
