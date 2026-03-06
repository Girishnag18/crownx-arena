import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Radar, Swords, Trophy } from "lucide-react";
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

const formatEta = (deadlineAt: string | null, now: number) => {
  if (!deadlineAt) return "--";
  const secs = Math.max(0, Math.floor((new Date(deadlineAt).getTime() - now) / 1000));
  const mm = Math.floor(secs / 60);
  const ss = secs % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
};

const TournamentBracketPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState<TournamentInfo | null>(null);
  const [matches, setMatches] = useState<TournamentBracketMatch[]>([]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const loadBracket = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    const tournamentClient = supabase as unknown as {
      from: (table: string) => {
        select: (columns: string) => {
          eq: (column: string, value: string) => { single: () => Promise<{ data: TournamentInfo | null; error: { message: string } | null }> };
        };
      };
    };

    const { data: tournamentData, error: tournamentError } = await tournamentClient
      .from("tournaments")
      .select("id, name, status, created_by, current_round, round_seconds, champion_id")
      .eq("id", id)
      .single();

    if (tournamentError || !tournamentData) {
      toast.error(tournamentError?.message || "Tournament not found");
      navigate("/dashboard");
      return;
    }

    const matchesClient = supabase as unknown as {
      from: (table: string) => {
        select: (columns: string) => {
          eq: (column: string, value: string) => {
            order: (column2: string, opts: { ascending: boolean }) => {
              order: (column3: string, opts2: { ascending: boolean }) => Promise<{
                data: Array<{
                  id: string;
                  round_number: number;
                  match_number: number;
                  player1_id: string | null;
                  player2_id: string | null;
                  winner_id: string | null;
                  status: TournamentBracketMatch["status"];
                  game_id: string | null;
                  deadline_at: string | null;
                }> | null;
              }>;
            };
          };
        };
      };
    };

    const { data: rawMatches } = await matchesClient
      .from("tournament_matches")
      .select("id, round_number, match_number, player1_id, player2_id, winner_id, status, game_id, deadline_at")
      .eq("tournament_id", id)
      .order("round_number", { ascending: true })
      .order("match_number", { ascending: true });

    const rows = rawMatches ?? [];
    const ids = Array.from(new Set(rows.flatMap((row) => [row.player1_id, row.player2_id]).filter(Boolean))) as string[];
    const profilesClient = supabase as unknown as {
      from: (table: string) => {
        select: (columns: string) => {
          in: (column: string, values: string[]) => Promise<{ data: Array<{ id: string; username: string | null }> | null }>;
        };
      };
    };

    const { data: profiles } = ids.length > 0
      ? await profilesClient.from("profiles").select("id, username").in("id", ids)
      : { data: [] };
    const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.username || "Player"]));

    setTournament(tournamentData);
    setMatches(rows.map((match) => ({
      ...match,
      player1_name: match.player1_id ? names.get(match.player1_id) || "Player" : null,
      player2_name: match.player2_id ? names.get(match.player2_id) || "Player" : null,
    })));
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => {
    void loadBracket();
  }, [loadBracket]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`tournament-bracket-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_matches", filter: `tournament_id=eq.${id}` }, () => {
        void loadBracket();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments", filter: `id=eq.${id}` }, () => {
        void loadBracket();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, loadBracket]);

  const isCreator = useMemo(() => !!user?.id && user.id === tournament?.created_by, [tournament?.created_by, user?.id]);

  useEffect(() => {
    if (!tournament?.id || !isCreator || tournament.status !== "live") return;

    const rpcClient = supabase as unknown as {
      rpc: (name: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    };

    const heartbeat = window.setInterval(async () => {
      const { error } = await rpcClient.rpc("tournament_bracket_tick", { target_tournament: tournament.id });
      if (!error) {
        void loadBracket();
      }
    }, 10_000);

    return () => window.clearInterval(heartbeat);
  }, [isCreator, loadBracket, tournament?.id, tournament?.status]);

  const startBracket = async () => {
    if (!tournament?.id) return;
    const rpcClient = supabase as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }> };
    const { error } = await rpcClient.rpc("start_tournament_bracket", {
      target_tournament: tournament.id,
      p_round_seconds: tournament.round_seconds ?? 600,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Bracket started.");
    await loadBracket();
  };

  const advanceBracket = async () => {
    if (!tournament?.id) return;
    const rpcClient = supabase as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }> };
    const { error } = await rpcClient.rpc("advance_tournament_bracket", { target_tournament: tournament.id });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Advanced to next round.");
    await loadBracket();
  };

  const launchMatch = async (matchId: string) => {
    const rpcClient = supabase as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: string | null; error: { message: string } | null }> };
    const { data, error } = await rpcClient.rpc("create_tournament_match_game", { target_match: matchId });
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data) navigate(`/play?game=${data}`);
  };

  const reportWinner = async (matchId: string, winnerId: string) => {
    const rpcClient = supabase as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }> };
    const { error } = await rpcClient.rpc("report_tournament_match_result", { target_match: matchId, target_winner: winnerId });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Winner reported.");
    await loadBracket();
  };

  const liveRoundMatches = useMemo(() => {
    if (!tournament?.current_round) return [];
    return matches.filter((match) => match.round_number === tournament.current_round);
  }, [matches, tournament?.current_round]);

  const roundDeadline = useMemo(() => {
    const deadlines = liveRoundMatches
      .map((match) => match.deadline_at)
      .filter(Boolean)
      .sort();
    return deadlines.length > 0 ? deadlines[deadlines.length - 1]! : null;
  }, [liveRoundMatches]);

  const myPendingMatch = useMemo(() => {
    if (!user?.id) return null;
    return liveRoundMatches.find((match) =>
      (match.player1_id === user.id || match.player2_id === user.id) && !match.winner_id,
    ) ?? null;
  }, [liveRoundMatches, user?.id]);

  const totalPlayers = useMemo(
    () => new Set(matches.flatMap((match) => [match.player1_id, match.player2_id]).filter(Boolean)).size,
    [matches],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 pt-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tournament) return null;

  return (
    <div className="min-h-screen bg-background px-4 pb-12 pt-20">
      <div className="container mx-auto max-w-7xl space-y-5">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/30 px-3 py-1.5 text-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </button>

        <div className="overflow-hidden rounded-[28px] border border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(234,179,8,0.16),transparent_28%),linear-gradient(135deg,rgba(19,24,37,0.96),rgba(11,18,28,0.98))] p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-primary">
                <Radar className="h-3.5 w-3.5" />
                Real-time bracket room
              </div>
              <h1 className="font-display text-3xl font-black">{tournament.name}</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Pairings, active round windows, live match launches, and bracket sync all stay visible here.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
              <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-3">
                <p className="text-muted-foreground">Status</p>
                <p className="mt-1 font-display text-base font-bold capitalize">{tournament.status}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-3">
                <p className="text-muted-foreground">Current round</p>
                <p className="mt-1 font-display text-base font-bold">{tournament.current_round ?? "--"}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-3">
                <p className="text-muted-foreground">Players</p>
                <p className="mt-1 font-display text-base font-bold">{totalPlayers}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-3">
                <p className="text-muted-foreground">Round timer</p>
                <p className="mt-1 font-display text-base font-bold">{roundDeadline ? formatEta(roundDeadline, now) : "--"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="glass-card rounded-2xl p-4">
            <div className="mb-2 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              <p className="font-display text-sm font-bold">Round pulse</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {liveRoundMatches.length === 0
                ? "Round pairings will appear here as soon as the bracket starts."
                : `${liveRoundMatches.filter((match) => !!match.winner_id).length} of ${liveRoundMatches.length} matches have resolved in the live round.`}
            </p>
          </div>

          <div className="glass-card rounded-2xl p-4">
            <div className="mb-2 flex items-center gap-2">
              <Swords className="h-4 w-4 text-emerald-300" />
              <p className="font-display text-sm font-bold">Your matchup</p>
            </div>
            {myPendingMatch ? (
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  {myPendingMatch.player1_name} vs {myPendingMatch.player2_name}
                </p>
                {myPendingMatch.game_id ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/play?game=${myPendingMatch.game_id}`)}
                    className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-display font-bold text-primary"
                  >
                    Join live match
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void launchMatch(myPendingMatch.id)}
                    className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-display font-bold text-primary"
                  >
                    Launch your match
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No open matchup for your account in the current round.</p>
            )}
          </div>

          <div className="glass-card rounded-2xl p-4">
            <div className="mb-2 flex items-center gap-2">
              <Radar className="h-4 w-4 text-amber-300" />
              <p className="font-display text-sm font-bold">Creator heartbeat</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {isCreator && tournament.status === "live"
                ? "This page is keeping the round heartbeat alive and syncing deadline resolutions every 10 seconds."
                : "Creators can keep this page open during a live round to auto-resolve timed-out matches and advance pairings."}
            </p>
          </div>
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
