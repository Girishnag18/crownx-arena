import { useEffect, useState } from "react";
import { BarChart3, ShieldAlert, Users, Eye, CheckCircle, XCircle, LoaderCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GameReport {
  id: string;
  game_id: string;
  reported_player_id: string;
  reason: string;
  status: string;
  suspicion_score: number;
  analysis: any;
  created_at: string;
  reporter_username?: string;
  reported_username?: string;
}

const Admin = () => {
  const [reports, setReports] = useState<GameReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalUsers: 0, openReports: 0, weeklyMatches: 0 });
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    // Load reports
    const { data: reportData } = await supabase
      .from("game_reports" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    const typedReports = (reportData as any[] || []) as GameReport[];

    // Enrich with usernames
    const playerIds = [...new Set(typedReports.map((r) => r.reported_player_id))];
    if (playerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", playerIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p.username]));
      for (const r of typedReports) {
        r.reported_username = profileMap.get(r.reported_player_id) || "Unknown";
      }
    }

    setReports(typedReports);

    // Stats
    const { count: userCount } = await supabase.from("profiles").select("id", { count: "exact", head: true });
    const openCount = typedReports.filter((r) => r.status === "pending").length;
    const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { count: matchCount } = await supabase.from("games").select("id", { count: "exact", head: true }).gte("created_at", oneWeekAgo);

    setStats({
      totalUsers: userCount || 0,
      openReports: openCount,
      weeklyMatches: matchCount || 0,
    });

    setLoading(false);
  };

  const updateReportStatus = async (reportId: string, newStatus: string) => {
    setProcessingId(reportId);
    const { error } = await supabase
      .from("game_reports" as any)
      .update({ status: newStatus, reviewed_at: new Date().toISOString() } as any)
      .eq("id", reportId);

    if (error) {
      toast.error("Failed to update report");
    } else {
      toast.success(`Report marked as ${newStatus}`);
      setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r)));
    }
    setProcessingId(null);
  };

  const cards = [
    { title: "Total users", value: stats.totalUsers.toLocaleString(), icon: Users },
    { title: "Open reports", value: stats.openReports.toString(), icon: ShieldAlert },
    { title: "Weekly matches", value: stats.weeklyMatches.toLocaleString(), icon: BarChart3 },
  ];

  const getSuspicionBadge = (score: number) => {
    if (score >= 70) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">HIGH {score}</span>;
    if (score >= 40) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">MED {score}</span>;
    return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">LOW {score}</span>;
  };

  return (
    <main className="container max-w-6xl py-24 px-4">
      <h1 className="text-4xl font-bold mb-2">Admin Command Center</h1>
      <p className="text-muted-foreground mb-8">Moderation, analytics, and anti-cheat oversight.</p>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {cards.map((card) => (
          <article key={card.title} className="glass-card p-5">
            <card.icon className="w-5 h-5 text-primary mb-2" />
            <p className="text-sm text-muted-foreground">{card.title}</p>
            <p className="text-2xl font-bold">{card.value}</p>
          </article>
        ))}
      </div>

      <section className="glass-card p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-destructive" />
          Anti-Cheat Reports
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoaderCircle className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : reports.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">No reports yet. Clean playing field! 🎉</p>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {reports.map((report) => (
              <div
                key={report.id}
                className={`rounded-lg border p-4 flex flex-col md:flex-row md:items-center gap-3 ${
                  report.status === "pending" ? "border-destructive/30 bg-destructive/5" : "border-border bg-secondary/20"
                }`}
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-bold text-sm">{report.reported_username}</span>
                    {getSuspicionBadge(report.suspicion_score || 0)}
                    <span className="text-xs text-muted-foreground capitalize">{report.reason.replace("_", " ")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Game: {report.game_id.slice(0, 8)}… · {new Date(report.created_at).toLocaleDateString()}
                  </p>
                  {report.analysis?.flags && (
                    <div className="flex gap-1 flex-wrap mt-1">
                      {(report.analysis.flags as string[]).map((flag: string) => (
                        <span key={flag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                          {flag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {report.status === "pending" ? (
                    <>
                      <button
                        onClick={() => updateReportStatus(report.id, "dismissed")}
                        disabled={processingId === report.id}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-muted hover:bg-muted/80"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Dismiss
                      </button>
                      <button
                        onClick={() => updateReportStatus(report.id, "confirmed")}
                        disabled={processingId === report.id}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-destructive/15 text-destructive hover:bg-destructive/25"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Confirm Cheat
                      </button>
                    </>
                  ) : (
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      report.status === "confirmed" ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground"
                    }`}>
                      {report.status.toUpperCase()}
                    </span>
                  )}
                  <a
                    href={`/play?game=${report.game_id}`}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-primary/15 text-primary hover:bg-primary/25"
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="glass-card p-6">
        <h2 className="text-xl font-semibold mb-4">Moderation actions</h2>
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 rounded-lg bg-secondary">Ban user</button>
          <button className="px-4 py-2 rounded-lg bg-secondary">Suspend user</button>
          <button className="px-4 py-2 rounded-lg bg-secondary">Reset rating</button>
          <button className="px-4 py-2 rounded-lg bg-secondary">Review chat reports</button>
        </div>
      </section>
    </main>
  );
};

export default Admin;
