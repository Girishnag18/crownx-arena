<<<<<<< HEAD
import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, ShieldAlert, Users, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AntiCheatReport {
  id: string;
  game_id: string;
  player_id: string;
  move_time_score: number;
  cpl_score: number;
  correlation_score: number;
  overall_risk: number;
  model_version: string;
  evidence: Record<string, unknown>;
  status: "open" | "reviewing" | "dismissed" | "confirmed";
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

const Admin = () => {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<AntiCheatReport[]>([]);
  const [filter, setFilter] = useState<"open" | "reviewing" | "dismissed" | "confirmed" | "all">("open");
  const [busyReportId, setBusyReportId] = useState<string | null>(null);
  const [runnerBusy, setRunnerBusy] = useState(false);

  const loadReports = useCallback(async () => {
    setLoading(true);
    const client = supabase as unknown as {
      from: (table: string) => {
        select: (cols: string) => {
          order: (col: string, opts: { ascending: boolean }) => {
            order: (col2: string, opts2: { ascending: boolean }) => {
              limit: (count: number) => {
                eq: (col3: string, value: string) => Promise<{ data: AntiCheatReport[] | null; error: { message: string } | null }>;
                then?: never;
              };
            };
          };
        };
      };
    };
    const query = client
      .from("anti_cheat_reports")
      .select("*")
      .order("overall_risk", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);

    const { data, error } = filter === "all"
      ? await (query as unknown as Promise<{ data: AntiCheatReport[] | null; error: { message: string } | null }>)
      : await query.eq("status", filter);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setReports(data || []);
  }, [filter]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const review = async (reportId: string, status: "reviewing" | "dismissed" | "confirmed") => {
    setBusyReportId(reportId);
    const rpc = supabase as unknown as {
      rpc: (name: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    };
    const { error } = await rpc.rpc("review_anti_cheat_report", { p_report_id: reportId, p_status: status });
    setBusyReportId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Report marked ${status}`);
    await loadReports();
  };

  const runAnalysisWorker = async () => {
    setRunnerBusy(true);
    const { data, error } = await supabase.functions.invoke("analyze-game", {
      body: { max_jobs: 10 },
    });
    setRunnerBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const count = Array.isArray((data as { processed?: unknown[] } | null)?.processed)
      ? ((data as { processed: unknown[] }).processed.length)
      : 0;
    toast.success(`Analysis runner processed ${count} job(s)`);
    await loadReports();
  };

  const cards = useMemo(() => {
    const open = reports.filter((r) => r.status === "open").length;
    const high = reports.filter((r) => r.overall_risk >= 75).length;
    return [
      { title: "Total reports", value: String(reports.length), icon: Users },
      { title: "Open reports", value: String(open), icon: ShieldAlert },
      { title: "High risk (75+)", value: String(high), icon: BarChart3 },
    ];
  }, [reports]);
=======
import { useEffect, useState } from "react";
import { BarChart3, ShieldAlert, Users, Eye, CheckCircle, XCircle, LoaderCircle, Search, Ban, Clock, Trophy, TrendingUp, Crown, Activity, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface GameReport {
  id: string;
  game_id: string;
  reported_player_id: string;
  reason: string;
  status: string;
  suspicion_score: number;
  analysis: any;
  created_at: string;
  reported_username?: string;
}

interface UserRow {
  id: string;
  username: string | null;
  avatar_url: string | null;
  crown_score: number;
  games_played: number;
  wins: number;
  losses: number;
  wallet_crowns: number;
  created_at: string;
  rank_tier: string;
}

interface TournamentRow {
  id: string;
  name: string;
  status: string;
  tournament_type: string;
  max_players: number;
  prize_pool: number;
  current_round: number;
  max_rounds: number;
  starts_at: string | null;
  created_at: string;
  reg_count?: number;
}

interface UserBan {
  id: string;
  user_id: string;
  ban_type: string;
  reason: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  username?: string;
}

interface Stats {
  totalUsers: number;
  openReports: number;
  weeklyMatches: number;
  totalGames: number;
  activeTournaments: number;
  avgRating: number;
  activeBans: number;
}

const Admin = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<GameReport[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [bans, setBans] = useState<UserBan[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, openReports: 0, weeklyMatches: 0, totalGames: 0, activeTournaments: 0, avgRating: 0, activeBans: 0 });
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [reportFilter, setReportFilter] = useState<"all" | "pending" | "confirmed" | "dismissed">("all");

  // Ban dialog
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banTarget, setBanTarget] = useState<UserRow | null>(null);
  const [banType, setBanType] = useState<"permanent" | "temporary">("temporary");
  const [banDuration, setBanDuration] = useState("24h");
  const [banReason, setBanReason] = useState("");
  const [banSubmitting, setBanSubmitting] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);

    const [{ data: reportData }, { data: userData }, { count: userCount }, { count: gameCount }, { count: weeklyCount }, { data: tournamentData }, { data: banData }] = await Promise.all([
      supabase.from("game_reports" as any).select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("profiles").select("id, username, avatar_url, crown_score, games_played, wins, losses, wallet_crowns, created_at, rank_tier").order("crown_score", { ascending: false }).limit(200),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("games").select("id", { count: "exact", head: true }),
      supabase.from("games").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
      supabase.from("tournaments").select("*").order("created_at", { ascending: false }).limit(50),
      (supabase as any).from("user_bans").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(100),
    ]);

    const typedReports = (reportData as any[] || []) as GameReport[];
    const typedUsers = (userData || []) as unknown as UserRow[];
    const typedTournaments = (tournamentData || []) as unknown as TournamentRow[];
    const typedBans = (banData || []) as unknown as UserBan[];

    // Enrich reports
    const reportPlayerIds = [...new Set(typedReports.map(r => r.reported_player_id))];
    if (reportPlayerIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, username").in("id", reportPlayerIds);
      const pMap = new Map((profiles || []).map(p => [p.id, p.username]));
      typedReports.forEach(r => { r.reported_username = pMap.get(r.reported_player_id) || "Unknown"; });
    }

    // Enrich bans with usernames
    const banUserIds = [...new Set(typedBans.map(b => b.user_id))];
    if (banUserIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, username").in("id", banUserIds);
      const pMap = new Map((profiles || []).map(p => [p.id, p.username]));
      typedBans.forEach(b => { b.username = pMap.get(b.user_id) || "Unknown"; });
    }

    // Enrich tournaments with registration count
    for (const t of typedTournaments) {
      const { count } = await supabase.from("tournament_registrations").select("id", { count: "exact", head: true }).eq("tournament_id", t.id);
      t.reg_count = count || 0;
    }

    const avgRating = typedUsers.length > 0 ? Math.round(typedUsers.reduce((s, u) => s + u.crown_score, 0) / typedUsers.length) : 0;

    setReports(typedReports);
    setUsers(typedUsers);
    setTournaments(typedTournaments);
    setBans(typedBans);
    setStats({
      totalUsers: userCount || 0,
      openReports: typedReports.filter(r => r.status === "pending").length,
      weeklyMatches: weeklyCount || 0,
      totalGames: gameCount || 0,
      activeTournaments: typedTournaments.filter(t => t.status === "active" || t.status === "open").length,
      avgRating,
      activeBans: typedBans.length,
    });
    setLoading(false);
  };

  const updateReportStatus = async (reportId: string, newStatus: string) => {
    setProcessingId(reportId);
    const { error } = await supabase.from("game_reports" as any).update({ status: newStatus, reviewed_at: new Date().toISOString() } as any).eq("id", reportId);
    if (error) { toast.error("Failed to update report"); }
    else {
      toast.success(`Report marked as ${newStatus}`);
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: newStatus } : r));
      if (newStatus !== "pending") setStats(s => ({ ...s, openReports: s.openReports - 1 }));
    }
    setProcessingId(null);
  };

  const resetUserRating = async (userId: string) => {
    const { error } = await supabase.from("profiles").update({ crown_score: 400, rank_tier: "Bronze" }).eq("id", userId);
    if (error) { toast.error(error.message); return; }
    toast.success("Rating reset to 400");
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, crown_score: 400, rank_tier: "Bronze" } : u));
  };

  const openBanDialog = (u: UserRow) => {
    setBanTarget(u);
    setBanType("temporary");
    setBanDuration("24h");
    setBanReason("");
    setBanDialogOpen(true);
  };

  const submitBan = async () => {
    if (!user || !banTarget) return;
    setBanSubmitting(true);

    const durationMs: Record<string, number> = {
      "24h": 86400000,
      "3d": 3 * 86400000,
      "7d": 7 * 86400000,
      "30d": 30 * 86400000,
    };

    const expiresAt = banType === "permanent" ? null : new Date(Date.now() + (durationMs[banDuration] || 86400000)).toISOString();

    const { error } = await (supabase as any).from("user_bans").insert({
      user_id: banTarget.id,
      banned_by: user.id,
      ban_type: banType === "permanent" ? "permanent" : `temp_${banDuration}`,
      reason: banReason || "Violation of terms",
      expires_at: expiresAt,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${banTarget.username || "Player"} has been ${banType === "permanent" ? "banned" : "suspended"}`);
      setBanDialogOpen(false);
      await loadData();
    }
    setBanSubmitting(false);
  };

  const liftBan = async (banId: string) => {
    setProcessingId(banId);
    const { error } = await (supabase as any).from("user_bans").update({ is_active: false }).eq("id", banId);
    if (error) toast.error(error.message);
    else {
      toast.success("Ban lifted");
      setBans(prev => prev.filter(b => b.id !== banId));
      setStats(s => ({ ...s, activeBans: s.activeBans - 1 }));
    }
    setProcessingId(null);
  };

  const updateTournamentStatus = async (tournamentId: string, newStatus: string) => {
    setProcessingId(tournamentId);
    const { error } = await supabase.from("tournaments").update({ status: newStatus } as any).eq("id", tournamentId);
    if (error) toast.error(error.message);
    else {
      toast.success(`Tournament status → ${newStatus}`);
      setTournaments(prev => prev.map(t => t.id === tournamentId ? { ...t, status: newStatus } : t));
    }
    setProcessingId(null);
  };

  const statCards = [
    { title: "Total Players", value: stats.totalUsers.toLocaleString(), icon: Users, color: "text-primary" },
    { title: "Open Reports", value: stats.openReports.toString(), icon: ShieldAlert, color: "text-destructive" },
    { title: "Weekly Matches", value: stats.weeklyMatches.toLocaleString(), icon: Activity, color: "text-primary" },
    { title: "Total Games", value: stats.totalGames.toLocaleString(), icon: BarChart3, color: "text-primary" },
    { title: "Tournaments", value: stats.activeTournaments.toString(), icon: Trophy, color: "text-amber-500" },
    { title: "Active Bans", value: stats.activeBans.toString(), icon: Ban, color: "text-destructive" },
  ];

  const filteredReports = reports.filter(r => reportFilter === "all" || r.status === reportFilter);
  const filteredUsers = users.filter(u => !userSearch || (u.username || "").toLowerCase().includes(userSearch.toLowerCase()));

  const getSuspicionBadge = (score: number) => {
    if (score >= 70) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">HIGH {score}</span>;
    if (score >= 40) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">MED {score}</span>;
    return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">LOW {score}</span>;
  };

  const getTournamentStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      open: "bg-green-500/20 text-green-500",
      active: "bg-primary/20 text-primary",
      completed: "bg-muted text-muted-foreground",
      cancelled: "bg-destructive/20 text-destructive",
    };
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${map[status] || "bg-muted text-muted-foreground"}`}>{status}</span>;
  };

  if (loading) {
    return (
      <main className="container max-w-6xl py-24 px-4 flex items-center justify-center min-h-[60vh]">
        <LoaderCircle className="w-8 h-8 animate-spin text-primary" />
      </main>
    );
  }
>>>>>>> d3c51e24423dfa38cc6a6faefc281915d357437d

  return (
    <main className="container max-w-6xl py-24 px-4 space-y-6">
      <div>
<<<<<<< HEAD
        <h1 className="text-4xl font-bold mb-2">Admin Command Center</h1>
        <p className="text-muted-foreground">Anti-cheat moderation and risk triage.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {cards.map((card) => (
          <article key={card.title} className="glass-card p-5">
            <card.icon className="w-5 h-5 text-primary mb-2" />
            <p className="text-sm text-muted-foreground">{card.title}</p>
            <p className="text-2xl font-bold">{card.value}</p>
          </article>
        ))}
      </div>

      <section className="glass-card p-5 space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          {(["open", "reviewing", "dismissed", "confirmed", "all"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`rounded-md border px-3 py-1.5 text-xs font-display font-bold ${filter === value ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/30"}`}
            >
              {value.toUpperCase()}
            </button>
          ))}
          <button
            onClick={() => void runAnalysisWorker()}
            disabled={runnerBusy}
            className="ml-auto rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-display font-bold text-primary disabled:opacity-50"
          >
            {runnerBusy ? "Running..." : "Run Analysis Worker"}
          </button>
        </div>

        {loading ? (
          <div className="py-10 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reports.</p>
        ) : (
          <div className="space-y-2 max-h-[30rem] overflow-y-auto pr-1">
            {reports.map((r) => (
              <article key={r.id} className="rounded-lg border border-border/70 bg-secondary/20 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">Game: {r.game_id.slice(0, 8)} | Player: {r.player_id.slice(0, 8)}</p>
                    <p className="text-[11px] text-muted-foreground">Model {r.model_version} | {new Date(r.created_at).toLocaleString()}</p>
                  </div>
                  <span className={`rounded px-2 py-1 text-xs font-bold ${r.overall_risk >= 80 ? "bg-rose-500/20 text-rose-300" : r.overall_risk >= 60 ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300"}`}>
                    Risk {Math.round(r.overall_risk)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded border border-border/60 bg-background/50 px-2 py-1">Time: {Math.round(r.move_time_score)}</div>
                  <div className="rounded border border-border/60 bg-background/50 px-2 py-1">CPL: {Math.round(r.cpl_score)}</div>
                  <div className="rounded border border-border/60 bg-background/50 px-2 py-1">Corr: {Math.round(r.correlation_score)}</div>
                </div>
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">Evidence</summary>
                  <pre className="mt-2 rounded bg-background/60 p-2 overflow-x-auto">{JSON.stringify(r.evidence, null, 2)}</pre>
                </details>
                <div className="flex flex-wrap gap-2">
                  <button disabled={busyReportId === r.id} onClick={() => void review(r.id, "reviewing")} className="rounded border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300 disabled:opacity-50">Reviewing</button>
                  <button disabled={busyReportId === r.id} onClick={() => void review(r.id, "dismissed")} className="rounded border border-border px-2.5 py-1 text-xs disabled:opacity-50">Dismiss</button>
                  <button disabled={busyReportId === r.id} onClick={() => void review(r.id, "confirmed")} className="rounded border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-300 disabled:opacity-50">Confirm</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
=======
        <h1 className="text-3xl font-bold font-display">Admin Command Center</h1>
        <p className="text-sm text-muted-foreground">Moderation, user management, tournaments, and platform analytics.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((card) => (
          <motion.div key={card.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
            <card.icon className={`w-4 h-4 ${card.color} mb-1`} />
            <p className="text-[11px] text-muted-foreground">{card.title}</p>
            <p className="text-xl font-bold">{card.value}</p>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="reports" className="w-full">
        <TabsList className="w-full grid grid-cols-4 bg-secondary/40">
          <TabsTrigger value="reports">🛡️ Reports</TabsTrigger>
          <TabsTrigger value="users">👥 Users</TabsTrigger>
          <TabsTrigger value="tournaments">🏆 Tournaments</TabsTrigger>
          <TabsTrigger value="bans">🚫 Bans</TabsTrigger>
        </TabsList>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4 mt-4">
          <div className="flex gap-2">
            {(["all", "pending", "confirmed", "dismissed"] as const).map(f => (
              <button
                key={f}
                onClick={() => setReportFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  reportFilter === f ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                }`}
              >
                {f} {f === "pending" && stats.openReports > 0 ? `(${stats.openReports})` : ""}
              </button>
            ))}
          </div>

          {filteredReports.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-display font-bold">No reports</p>
              <p className="text-sm text-muted-foreground">Clean playing field! 🎉</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredReports.map(report => (
                <div
                  key={report.id}
                  className={`rounded-xl border p-4 flex flex-col md:flex-row md:items-center gap-3 ${
                    report.status === "pending" ? "border-destructive/30 bg-destructive/5" : "border-border bg-card/60"
                  }`}
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-bold text-sm">{report.reported_username}</span>
                      {getSuspicionBadge(report.suspicion_score || 0)}
                      <span className="text-xs text-muted-foreground capitalize">{report.reason.replace("_", " ")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Game: {report.game_id.slice(0, 8)}… · {format(new Date(report.created_at), "MMM d, HH:mm")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {report.status === "pending" ? (
                      <>
                        <button onClick={() => updateReportStatus(report.id, "dismissed")} disabled={processingId === report.id} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-muted hover:bg-muted/80">
                          <XCircle className="w-3.5 h-3.5" /> Dismiss
                        </button>
                        <button onClick={() => updateReportStatus(report.id, "confirmed")} disabled={processingId === report.id} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-destructive/15 text-destructive hover:bg-destructive/25">
                          <CheckCircle className="w-3.5 h-3.5" /> Confirm
                        </button>
                      </>
                    ) : (
                      <span className={`text-xs font-bold px-2 py-1 rounded ${report.status === "confirmed" ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground"}`}>
                        {report.status.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by username..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="pl-9" />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredUsers.map((u, idx) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border bg-card/60 p-4 flex items-center gap-4"
              >
                <span className="text-xs text-muted-foreground w-6 text-right font-mono">{idx + 1}</span>
                <Avatar className="w-9 h-9 border border-border/60">
                  <AvatarImage src={u.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">{(u.username || "P")[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{u.username || "Player"}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{u.rank_tier}</span>
                    <span>{u.games_played} games</span>
                    <span>{u.wins}W/{u.losses}L</span>
                    <span className="flex items-center gap-0.5"><Crown className="w-3 h-3" />{Number(u.wallet_crowns).toFixed(1)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">{u.crown_score}</p>
                  <p className="text-[10px] text-muted-foreground">CrownScore</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => resetUserRating(u.id)} className="text-[10px] px-2 py-1 rounded bg-amber-500/15 text-amber-400 hover:bg-amber-500/25" title="Reset rating">
                    Reset
                  </button>
                  <button onClick={() => openBanDialog(u)} className="text-[10px] px-2 py-1 rounded bg-destructive/15 text-destructive hover:bg-destructive/25" title="Ban/Suspend">
                    <Ban className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Tournaments Tab */}
        <TabsContent value="tournaments" className="space-y-4 mt-4">
          {tournaments.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-display font-bold">No tournaments</p>
              <p className="text-sm text-muted-foreground">Create one from the lobby!</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {tournaments.map(t => (
                <div key={t.id} className="rounded-xl border border-border bg-card/60 p-4 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-bold text-sm">{t.name}</span>
                      {getTournamentStatusBadge(t.status)}
                      <span className="text-[10px] text-muted-foreground uppercase">{t.tournament_type}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{t.reg_count || 0}/{t.max_players} players</span>
                      <span>Round {t.current_round}/{t.max_rounds}</span>
                      <span className="flex items-center gap-0.5"><Crown className="w-3 h-3" /> {t.prize_pool} prize</span>
                      <span>{format(new Date(t.created_at), "MMM d")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.status === "open" && (
                      <button onClick={() => updateTournamentStatus(t.id, "active")} disabled={processingId === t.id} className="text-xs px-3 py-1.5 rounded-md bg-green-500/15 text-green-500 hover:bg-green-500/25">
                        Start
                      </button>
                    )}
                    {(t.status === "open" || t.status === "active") && (
                      <button onClick={() => updateTournamentStatus(t.id, "cancelled")} disabled={processingId === t.id} className="text-xs px-3 py-1.5 rounded-md bg-destructive/15 text-destructive hover:bg-destructive/25">
                        Cancel
                      </button>
                    )}
                    {t.status === "active" && (
                      <button onClick={() => updateTournamentStatus(t.id, "completed")} disabled={processingId === t.id} className="text-xs px-3 py-1.5 rounded-md bg-primary/15 text-primary hover:bg-primary/25">
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Bans Tab */}
        <TabsContent value="bans" className="space-y-4 mt-4">
          {bans.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <Ban className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-display font-bold">No active bans</p>
              <p className="text-sm text-muted-foreground">All clear!</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {bans.map(b => (
                <div key={b.id} className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 flex items-center gap-4">
                  <Ban className="w-5 h-5 text-destructive shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{b.username || "Unknown"}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="capitalize">{b.ban_type.replace("_", " ")}</span>
                      {b.expires_at && <span>Expires: {format(new Date(b.expires_at), "MMM d, HH:mm")}</span>}
                      <span>{b.reason}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => liftBan(b.id)}
                    disabled={processingId === b.id}
                    className="text-xs px-3 py-1.5 rounded-md bg-green-500/15 text-green-500 hover:bg-green-500/25 disabled:opacity-50"
                  >
                    Lift Ban
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Ban Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban / Suspend Player</DialogTitle>
            <DialogDescription>
              {banTarget ? `Action against ${banTarget.username || "Player"} (CrownScore: ${banTarget.crown_score})` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Ban Type</label>
              <Select value={banType} onValueChange={v => setBanType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="temporary">Temporary Suspension</SelectItem>
                  <SelectItem value="permanent">Permanent Ban</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {banType === "temporary" && (
              <div>
                <label className="text-sm font-medium mb-1 block">Duration</label>
                <Select value={banDuration} onValueChange={setBanDuration}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">24 hours</SelectItem>
                    <SelectItem value="3d">3 days</SelectItem>
                    <SelectItem value="7d">7 days</SelectItem>
                    <SelectItem value="30d">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-1 block">Reason</label>
              <Textarea
                placeholder="Reason for ban..."
                value={banReason}
                onChange={e => setBanReason(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setBanDialogOpen(false)} className="px-4 py-2 rounded-lg text-sm bg-muted hover:bg-muted/80">Cancel</button>
              <button
                onClick={submitBan}
                disabled={banSubmitting}
                className="px-4 py-2 rounded-lg text-sm bg-destructive text-destructive-foreground hover:opacity-90 disabled:opacity-50"
              >
                {banSubmitting ? "Processing..." : banType === "permanent" ? "Permanent Ban" : "Suspend"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
>>>>>>> d3c51e24423dfa38cc6a6faefc281915d357437d
    </main>
  );
};

export default Admin;
