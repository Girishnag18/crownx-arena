import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import TournamentBracket, { type TournamentBracketMatch } from "@/components/tournament/TournamentBracket";

type TournamentInfo = {
  id: string;
  name: string;
  status: string;
  created_by: string;
  current_round: number | null;
  round_seconds: number | null;
  champion_id: string | null;
};

const TournamentBracketPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState<TournamentInfo | null>(null);
  const [matches, setMatches] = useState<TournamentBracketMatch[]>([]);

  const loadBracket = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const client = supabase as unknown as {
      from: (table: string) => {
        select: (columns: string) => {
          eq: (column: string, value: string) => { single: () => Promise<{ data: TournamentInfo | null; error: { message: string } | null }> };
        };
      };
    };
    const { data: tData, error: tError } = await client
      .from("tournaments")
      .select("id, name, status, created_by, current_round, round_seconds, champion_id")
      .eq("id", id)
      .single();

    if (tError || !tData) {
      toast.error(tError?.message || "Tournament not found");
      navigate("/dashboard");
      return;
    }

    const mClient = supabase as unknown as {
      from: (table: string) => {
        select: (columns: string) => {
          eq: (column: string, value: string) => {
            order: (column2: string, opts: { ascending: boolean }) => {
              order: (column3: string, opts2: { ascending: boolean }) => Promise<{ data: Array<{
                id: string;
                round_number: number;
                match_number: number;
                player1_id: string | null;
                player2_id: string | null;
                winner_id: string | null;
                status: TournamentBracketMatch["status"];
                game_id: string | null;
                deadline_at: string | null;
              }> | null }>;
            };
          };
        };
      };
    };

    const { data: rawMatches } = await mClient
      .from("tournament_matches")
      .select("id, round_number, match_number, player1_id, player2_id, winner_id, status, game_id, deadline_at")
      .eq("tournament_id", id)
      .order("round_number", { ascending: true })
      .order("match_number", { ascending: true });

    const rows = rawMatches ?? [];
    const ids = Array.from(new Set(rows.flatMap((r) => [r.player1_id, r.player2_id]).filter(Boolean))) as string[];
    const pClient = supabase as unknown as {
      from: (table: string) => {
        select: (columns: string) => {
          in: (column: string, values: string[]) => Promise<{ data: Array<{ id: string; username: string | null }> | null }>;
        };
      };
    };
    const { data: profiles } = ids.length > 0 ? await pClient.from("profiles").select("id, username").in("id", ids) : { data: [] };
    const names = new Map((profiles ?? []).map((p) => [p.id, p.username || "Player"]));

    setTournament(tData);
    setMatches(rows.map((m) => ({
      ...m,
      player1_name: m.player1_id ? names.get(m.player1_id) || "Player" : null,
      player2_name: m.player2_id ? names.get(m.player2_id) || "Player" : null,
    })));
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => {
    void loadBracket();
  }, [loadBracket]);

  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`tournament-bracket-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_matches", filter: `tournament_id=eq.${id}` }, () => {
        void loadBracket();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments", filter: `id=eq.${id}` }, () => {
        void loadBracket();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, loadBracket]);

  const isCreator = useMemo(() => !!user?.id && user.id === tournament?.created_by, [user?.id, tournament?.created_by]);

  const startBracket = async () => {
    if (!tournament?.id) return;
    const rpc = supabase as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }> };
    const { error } = await rpc.rpc("start_tournament_bracket", { target_tournament: tournament.id, p_round_seconds: tournament.round_seconds ?? 600 });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Bracket started.");
    await loadBracket();
  };

  const advanceBracket = async () => {
    if (!tournament?.id) return;
    const rpc = supabase as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }> };
    const { error } = await rpc.rpc("advance_tournament_bracket", { target_tournament: tournament.id });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Advanced to next round.");
    await loadBracket();
  };

  const launchMatch = async (matchId: string) => {
    const rpc = supabase as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: string | null; error: { message: string } | null }> };
    const { data, error } = await rpc.rpc("create_tournament_match_game", { target_match: matchId });
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data) navigate(`/play?game=${data}`);
  };

  const reportWinner = async (matchId: string, winnerId: string) => {
    const rpc = supabase as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }> };
    const { error } = await rpc.rpc("report_tournament_match_result", { target_match: matchId, target_winner: winnerId });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Winner reported.");
    await loadBracket();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-20 px-4 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tournament) return null;

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-7xl space-y-4">
        <button
          onClick={() => navigate("/dashboard")}
          className="inline-flex items-center gap-1 rounded border border-border/70 bg-secondary/30 px-3 py-1.5 text-xs"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to Dashboard
        </button>

        <div className="rounded-xl border border-border/70 bg-secondary/20 px-4 py-3">
          <h1 className="font-display text-xl font-bold">{tournament.name}</h1>
          <p className="text-xs text-muted-foreground">
            Round {tournament.current_round ?? "--"} | Status: {tournament.status}
          </p>
        </div>

        <TournamentBracket
          tournamentId={tournament.id}
          status={tournament.status}
          currentRound={tournament.current_round}
          roundSeconds={tournament.round_seconds}
          isCreator={isCreator}
          userId={user?.id || null}
          matches={matches}
          onStart={startBracket}
          onAdvance={advanceBracket}
          onLaunchGame={launchMatch}
          onReportWinner={reportWinner}
        />
      </div>
    </div>
  );
};

export default TournamentBracketPage;
