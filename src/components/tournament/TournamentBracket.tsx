import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Crown, Timer, Swords, PlayCircle, Trophy } from "lucide-react";

export interface TournamentBracketMatch {
  id: string;
  round_number: number;
  match_number: number;
  player1_id: string | null;
  player2_id: string | null;
  player1_name: string | null;
  player2_name: string | null;
  winner_id: string | null;
  status: "pending" | "active" | "bye" | "completed" | "timeout";
  game_id: string | null;
  deadline_at: string | null;
}

interface TournamentBracketProps {
  tournamentId: string;
  status: string;
  currentRound: number | null;
  roundSeconds: number | null;
  isCreator: boolean;
  userId: string | null;
  matches: TournamentBracketMatch[];
  onStart: () => void;
  onAdvance: () => void;
  onLaunchGame: (matchId: string) => void;
  onReportWinner: (matchId: string, winnerId: string) => void;
}

const formatEta = (deadlineAt: string | null, now: number) => {
  if (!deadlineAt) return "--";
  const secs = Math.max(0, Math.floor((new Date(deadlineAt).getTime() - now) / 1000));
  const mm = Math.floor(secs / 60);
  const ss = secs % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
};

const TournamentBracket = ({
  status,
  currentRound,
  roundSeconds,
  isCreator,
  userId,
  matches,
  onStart,
  onAdvance,
  onLaunchGame,
  onReportWinner,
}: TournamentBracketProps) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const rounds = useMemo(() => {
    const bucket = new Map<number, TournamentBracketMatch[]>();
    for (const match of matches) {
      const roundMatches = bucket.get(match.round_number) ?? [];
      roundMatches.push(match);
      bucket.set(match.round_number, roundMatches);
    }
    return Array.from(bucket.entries()).sort((a, b) => a[0] - b[0]);
  }, [matches]);

  const liveRoundMatches = useMemo(() => {
    const round = currentRound ?? rounds[0]?.[0] ?? 1;
    return matches.filter((match) => match.round_number === round);
  }, [currentRound, matches, rounds]);

  const liveRoundDeadline = useMemo(() => {
    const deadlines = liveRoundMatches
      .map((match) => match.deadline_at)
      .filter(Boolean)
      .map((deadline) => new Date(deadline!).getTime());
    if (deadlines.length === 0) return null;
    return Math.max(...deadlines);
  }, [liveRoundMatches]);

  const liveRoundResolved = liveRoundMatches.filter((match) => !!match.winner_id || match.status === "bye").length;
  const liveRoundProgress = liveRoundMatches.length === 0 ? 0 : Math.round((liveRoundResolved / liveRoundMatches.length) * 100);
  const hasOpenMatch = matches.some((match) => (match.status === "pending" || match.status === "active") && !match.winner_id);
  const startDisabled = status === "live" || status === "completed" || status === "cancelled";

  return (
    <div className="glass-card space-y-4 rounded-2xl p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-sm font-bold">Tournament Bracket</p>
            <span className="rounded-full border border-border/70 bg-secondary/30 px-2.5 py-1 text-[11px]">
              Status: {status}
            </span>
            <span className="rounded-full border border-border/70 bg-secondary/30 px-2.5 py-1 text-[11px]">
              Round: {currentRound ?? "--"}
            </span>
            <span className="rounded-full border border-border/70 bg-secondary/30 px-2.5 py-1 text-[11px]">
              Window: {roundSeconds ?? 600}s
            </span>
          </div>
          <div className="rounded-2xl border border-border/70 bg-secondary/20 p-3">
            <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Live round completion</span>
              <span>{liveRoundResolved}/{liveRoundMatches.length || 0} resolved</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-background/60">
              <div className="h-full rounded-full bg-gradient-to-r from-primary via-amber-300 to-emerald-300" style={{ width: `${liveRoundProgress}%` }} />
            </div>
            {liveRoundDeadline && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Current round closes in {formatEta(new Date(liveRoundDeadline).toISOString(), now)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isCreator && (
            <button
              type="button"
              onClick={onStart}
              disabled={startDisabled}
              className="rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-display font-bold text-primary disabled:opacity-45"
            >
              Start Bracket
            </button>
          )}
          {isCreator && status === "live" && (
            <button
              type="button"
              onClick={onAdvance}
              disabled={hasOpenMatch}
              className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-display font-bold text-emerald-300 disabled:opacity-45"
            >
              Advance Round
            </button>
          )}
        </div>
      </div>

      {rounds.length === 0 ? (
        <p className="text-xs text-muted-foreground">Bracket not started yet.</p>
      ) : (
        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max gap-4">
            {rounds.map(([roundNumber, roundMatches]) => (
              <div key={roundNumber} className="w-80 space-y-3">
                <div className="rounded-2xl border border-border/70 bg-secondary/20 px-3 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-display text-sm font-bold">Round {roundNumber}</p>
                      <p className="text-[11px] text-muted-foreground">{roundMatches.length} match{roundMatches.length === 1 ? "" : "es"}</p>
                    </div>
                    {currentRound === roundNumber && (
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] text-primary">
                        Live
                      </span>
                    )}
                  </div>
                </div>

                {roundMatches
                  .sort((a, b) => a.match_number - b.match_number)
                  .map((match) => {
                    const isParticipant = !!userId && (userId === match.player1_id || userId === match.player2_id);
                    const canReport = (isCreator || isParticipant) && !match.winner_id && match.player1_id !== null && match.player2_id !== null;
                    const isMyMatch = isParticipant && !match.winner_id;
                    const statusTone = match.status === "active"
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : match.status === "completed"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : match.status === "timeout"
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                          : "border-border/70 bg-secondary/30 text-muted-foreground";

                    return (
                      <div
                        key={match.id}
                        className={`space-y-3 rounded-2xl border px-4 py-3 ${
                          isMyMatch ? "border-primary/35 bg-primary/5" : "border-border/70 bg-background/60"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Match {match.match_number}</p>
                            {match.winner_id && (
                              <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-emerald-300">
                                <Crown className="h-3 w-3" />
                                Winner decided
                              </p>
                            )}
                          </div>
                          <span className={`rounded-full border px-2 py-1 text-[11px] ${statusTone}`}>{match.status}</span>
                        </div>

                        <div className="space-y-2">
                          <div className={`rounded-xl border px-3 py-2 text-sm ${match.winner_id === match.player1_id ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-border/60 bg-secondary/20"}`}>
                            {match.player1_name || "TBD"}
                          </div>
                          <div className={`rounded-xl border px-3 py-2 text-sm ${match.winner_id === match.player2_id ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-border/60 bg-secondary/20"}`}>
                            {match.player2_name || "BYE"}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Timer className="h-3 w-3" />
                            {formatEta(match.deadline_at, now)}
                          </span>
                          {match.winner_id && (
                            <span className="inline-flex items-center gap-1">
                              <Trophy className="h-3 w-3" />
                              Ready
                            </span>
                          )}
                        </div>

                        {!match.game_id && isParticipant && match.player1_id && match.player2_id && (
                          <button
                            type="button"
                            onClick={() => onLaunchGame(match.id)}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-display font-bold text-primary"
                          >
                            <Swords className="h-3.5 w-3.5" />
                            Launch Live Match
                          </button>
                        )}

                        {match.game_id && (
                          <Link
                            to={`/play?game=${match.game_id}`}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-display font-bold text-primary"
                          >
                            <PlayCircle className="h-3.5 w-3.5" />
                            Open Live Game
                          </Link>
                        )}

                        {canReport && (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => onReportWinner(match.id, match.player1_id!)}
                              className="rounded-xl border border-border/70 bg-secondary/30 px-2 py-2 text-[11px]"
                            >
                              {match.player1_name || "P1"} won
                            </button>
                            <button
                              type="button"
                              onClick={() => onReportWinner(match.id, match.player2_id!)}
                              className="rounded-xl border border-border/70 bg-secondary/30 px-2 py-2 text-[11px]"
                            >
                              {match.player2_name || "P2"} won
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentBracket;
