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

  return (
    <main className="container max-w-6xl py-24 px-4 space-y-6">
      <div>
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
    </main>
  );
};

export default Admin;
