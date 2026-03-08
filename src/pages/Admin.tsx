import { useEffect, useState } from "react";
import { BarChart3, ShieldAlert, Users, Eye, CheckCircle, XCircle, LoaderCircle, Search, Ban, Clock, Trophy, TrendingUp, Crown, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { format } from "date-fns";

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

interface Stats {
  totalUsers: number;
  openReports: number;
  weeklyMatches: number;
  totalGames: number;
  activeTournaments: number;
  avgRating: number;
}

const Admin = () => {
  const [reports, setReports] = useState<GameReport[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, openReports: 0, weeklyMatches: 0, totalGames: 0, activeTournaments: 0, avgRating: 0 });
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [reportFilter, setReportFilter] = useState<"all" | "pending" | "confirmed" | "dismissed">("all");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);

    const [{ data: reportData }, { data: userData }, { count: userCount }, { count: gameCount }, { count: weeklyCount }, { count: tournamentCount }] = await Promise.all([
      supabase.from("game_reports" as any).select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("profiles").select("id, username, avatar_url, crown_score, games_played, wins, losses, wallet_crowns, created_at, rank_tier").order("crown_score", { ascending: false }).limit(200),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("games").select("id", { count: "exact", head: true }),
      supabase.from("games").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
      supabase.from("tournaments").select("id", { count: "exact", head: true }).eq("status", "active"),
    ]);

    const typedReports = (reportData as any[] || []) as GameReport[];
    const typedUsers = (userData || []) as unknown as UserRow[];

    // Enrich reports
    const playerIds = [...new Set(typedReports.map(r => r.reported_player_id))];
    if (playerIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, username").in("id", playerIds);
      const pMap = new Map((profiles || []).map(p => [p.id, p.username]));
      typedReports.forEach(r => { r.reported_username = pMap.get(r.reported_player_id) || "Unknown"; });
    }

    const avgRating = typedUsers.length > 0 ? Math.round(typedUsers.reduce((s, u) => s + u.crown_score, 0) / typedUsers.length) : 0;

    setReports(typedReports);
    setUsers(typedUsers);
    setStats({
      totalUsers: userCount || 0,
      openReports: typedReports.filter(r => r.status === "pending").length,
      weeklyMatches: weeklyCount || 0,
      totalGames: gameCount || 0,
      activeTournaments: tournamentCount || 0,
      avgRating,
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

  const statCards = [
    { title: "Total Players", value: stats.totalUsers.toLocaleString(), icon: Users, color: "text-primary" },
    { title: "Open Reports", value: stats.openReports.toString(), icon: ShieldAlert, color: "text-destructive" },
    { title: "Weekly Matches", value: stats.weeklyMatches.toLocaleString(), icon: Activity, color: "text-primary" },
    { title: "Total Games", value: stats.totalGames.toLocaleString(), icon: BarChart3, color: "text-primary" },
    { title: "Active Tournaments", value: stats.activeTournaments.toString(), icon: Trophy, color: "text-amber-500" },
    { title: "Avg. Rating", value: stats.avgRating.toString(), icon: TrendingUp, color: "text-primary" },
  ];

  const filteredReports = reports.filter(r => reportFilter === "all" || r.status === reportFilter);
  const filteredUsers = users.filter(u => !userSearch || (u.username || "").toLowerCase().includes(userSearch.toLowerCase()));

  const getSuspicionBadge = (score: number) => {
    if (score >= 70) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">HIGH {score}</span>;
    if (score >= 40) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">MED {score}</span>;
    return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">LOW {score}</span>;
  };

  if (loading) {
    return (
      <main className="container max-w-6xl py-24 px-4 flex items-center justify-center min-h-[60vh]">
        <LoaderCircle className="w-8 h-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="container max-w-6xl py-24 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">Admin Command Center</h1>
        <p className="text-sm text-muted-foreground">Moderation, user management, and platform analytics.</p>
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
        <TabsList className="w-full grid grid-cols-3 bg-secondary/40">
          <TabsTrigger value="reports">🛡️ Reports ({stats.openReports})</TabsTrigger>
          <TabsTrigger value="users">👥 Users ({stats.totalUsers})</TabsTrigger>
          <TabsTrigger value="actions">⚙️ Moderation</TabsTrigger>
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
                    {report.analysis?.flags && (
                      <div className="flex gap-1 flex-wrap mt-1">
                        {(report.analysis.flags as string[]).map((flag: string) => (
                          <span key={flag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">{flag}</span>
                        ))}
                      </div>
                    )}
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
                    <a href={`/play?game=${report.game_id}`} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-primary/15 text-primary hover:bg-primary/25">
                      <Eye className="w-3.5 h-3.5" /> View
                    </a>
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
                  <button
                    onClick={() => resetUserRating(u.id)}
                    className="text-[10px] px-2 py-1 rounded bg-amber-500/15 text-amber-400 hover:bg-amber-500/25"
                    title="Reset rating to 400"
                  >
                    Reset
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Moderation Tab */}
        <TabsContent value="actions" className="mt-4">
          <div className="glass-card p-6 space-y-4">
            <h3 className="font-display text-lg font-bold">Quick Actions</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <button onClick={() => toast.info("Ban system requires selecting a user from the Users tab.")} className="flex items-center gap-3 rounded-xl border border-border bg-card/60 p-4 hover:bg-secondary/50 transition-colors text-left">
                <Ban className="w-5 h-5 text-destructive" />
                <div>
                  <p className="text-sm font-semibold">Ban Player</p>
                  <p className="text-xs text-muted-foreground">Permanently restrict account access</p>
                </div>
              </button>
              <button onClick={() => toast.info("Suspension system requires selecting a user from the Users tab.")} className="flex items-center gap-3 rounded-xl border border-border bg-card/60 p-4 hover:bg-secondary/50 transition-colors text-left">
                <Clock className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-sm font-semibold">Temp Suspend</p>
                  <p className="text-xs text-muted-foreground">Temporarily restrict for 24h–7d</p>
                </div>
              </button>
              <button onClick={() => toast.info("Navigate to Users tab to reset a player's rating.")} className="flex items-center gap-3 rounded-xl border border-border bg-card/60 p-4 hover:bg-secondary/50 transition-colors text-left">
                <TrendingUp className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold">Reset Rating</p>
                  <p className="text-xs text-muted-foreground">Reset CrownScore to 400</p>
                </div>
              </button>
              <button onClick={loadData} className="flex items-center gap-3 rounded-xl border border-border bg-card/60 p-4 hover:bg-secondary/50 transition-colors text-left">
                <Activity className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold">Refresh Data</p>
                  <p className="text-xs text-muted-foreground">Reload all admin data</p>
                </div>
              </button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default Admin;
