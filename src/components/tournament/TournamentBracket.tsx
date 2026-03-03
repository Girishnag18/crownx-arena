import { Crown, Timer, Swords } from "lucide-react";

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

const formatEta = (deadlineAt: string | null) => {
  if (!deadlineAt) return "--";
  const secs = Math.max(0, Math.floor((new Date(deadlineAt).getTime() - Date.now()) / 1000));
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
  const rounds = new Map<number, TournamentBracketMatch[]>();
  for (const match of matches) {
    const bucket = rounds.get(match.round_number) ?? [];
    bucket.push(match);
    rounds.set(match.round_number, bucket);
  }
  const orderedRounds = Array.from(rounds.entries()).sort((a, b) => a[0] - b[0]);
  const hasOpenMatch = matches.some((m) => (m.status === "pending" || m.status === "active") && !m.winner_id);

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-display font-bold text-sm">Tournament Bracket</p>
          <p className="text-[11px] text-muted-foreground">
            Status: {status} | Current round: {currentRound ?? "--"} | Round timer: {roundSeconds ?? 600}s
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isCreator && status !== "live" && (
            <button onClick={onStart} className="rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-display font-bold text-primary">
              Start Bracket
            </button>
          )}
          {isCreator && status === "live" && (
            <button onClick={onAdvance} disabled={hasOpenMatch} className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-display font-bold text-emerald-300 disabled:opacity-50">
              Advance Round
            </button>
          )}
        </div>
      </div>

      {orderedRounds.length === 0 ? (
        <p className="text-xs text-muted-foreground">Bracket not started yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex gap-4 min-w-max">
            {orderedRounds.map(([roundNo, roundMatches]) => (
              <div key={roundNo} className="w-72 space-y-2">
                <div className="rounded-md border border-border/60 bg-secondary/30 px-2.5 py-2">
                  <p className="text-xs font-display font-bold">Round {roundNo}</p>
                </div>
                {roundMatches
                  .sort((a, b) => a.match_number - b.match_number)
                  .map((match) => {
                    const isParticipant = userId && (userId === match.player1_id || userId === match.player2_id);
                    const canReport = isParticipant && !match.winner_id && (match.player1_id !== null && match.player2_id !== null);
                    return (
                      <div key={match.id} className="rounded-lg border border-border/70 bg-background/60 px-3 py-2 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] text-muted-foreground">Match {match.match_number}</p>
                          <span className="text-[10px] rounded border border-border/70 bg-secondary/40 px-1.5 py-0.5">{match.status}</span>
                        </div>
                        <div className={`text-xs ${match.winner_id === match.player1_id ? "text-emerald-300 font-semibold" : ""}`}>
                          {match.player1_name || "TBD"}
                        </div>
                        <div className={`text-xs ${match.winner_id === match.player2_id ? "text-emerald-300 font-semibold" : ""}`}>
                          {match.player2_name || "BYE"}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><Timer className="w-3 h-3" /> {formatEta(match.deadline_at)}</span>
                          {match.winner_id && <span className="inline-flex items-center gap-1"><Crown className="w-3 h-3" /> Winner set</span>}
                        </div>
                        {!match.game_id && isParticipant && match.player1_id && match.player2_id && (
                          <button onClick={() => onLaunchGame(match.id)} className="w-full rounded-md border border-primary/40 bg-primary/10 px-2 py-1.5 text-[11px] font-display font-bold text-primary inline-flex items-center justify-center gap-1">
                            <Swords className="w-3 h-3" /> Launch Match
                          </button>
                        )}
                        {match.game_id && (
                          <a href={`/play?game=${match.game_id}`} className="block w-full rounded-md border border-primary/30 bg-primary/5 px-2 py-1.5 text-center text-[11px] font-display font-bold text-primary">
                            Open Live Game
                          </a>
                        )}
                        {canReport && (
                          <div className="grid grid-cols-2 gap-1.5">
                            <button onClick={() => onReportWinner(match.id, match.player1_id!)} className="rounded border border-border/70 bg-secondary/30 px-1.5 py-1 text-[11px]">
                              {match.player1_name || "P1"} won
                            </button>
                            <button onClick={() => onReportWinner(match.id, match.player2_id!)} className="rounded border border-border/70 bg-secondary/30 px-1.5 py-1 text-[11px]">
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
