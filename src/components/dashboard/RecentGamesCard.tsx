import { ChevronRight, Clock3, Swords } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

interface RecentGamesCardProps {
  games: RecentGame[];
  userId: string;
}

const resultStyles = {
  win: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  loss: "border-destructive/20 bg-destructive/10 text-destructive",
  draw: "border-border/40 bg-background/50 text-muted-foreground",
};

const RecentGamesCard = ({ games, userId }: RecentGamesCardProps) => {
  const navigate = useNavigate();
  const finishedGames = games.filter((game) => game.result_type !== "in_progress");

  const getResult = (game: RecentGame) => {
    if (game.result_type === "draw" || game.result_type === "stalemate") return "draw";
    if (game.winner_id === userId) return "win";
    if (game.winner_id) return "loss";
    return "draw";
  };

  return (
    <section className="surface-section space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="kicker-label">Replay</p>
          <h3 className="section-heading">Recent games</h3>
        </div>
        <button
          onClick={() => navigate("/match-history")}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
        >
          View all
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {finishedGames.length === 0 ? (
        <div className="surface-muted flex flex-col items-center justify-center gap-3 px-4 py-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/40 bg-secondary/40">
            <Swords className="h-6 w-6 text-muted-foreground/60" />
          </div>
          <div>
            <p className="font-display text-base font-bold text-foreground">No finished games yet</p>
            <p className="text-sm text-muted-foreground">Your match list will appear here as soon as games finish.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {finishedGames.slice(0, 8).map((game) => {
            const result = getResult(game);
            const opponent =
              game.player_white === userId ? game.black_name || "Opponent" : game.white_name || "Opponent";
            const playedAs = game.player_white === userId ? "White" : "Black";

            return (
              <button
                key={game.id}
                onClick={() => navigate(`/replay?game=${game.id}`)}
                className="surface-muted flex w-full items-center gap-4 px-4 py-4 text-left transition-all hover:border-primary/30 hover:bg-secondary/35"
              >
                <div
                  className={`h-11 w-1.5 rounded-full ${
                    result === "win"
                      ? "bg-emerald-500"
                      : result === "loss"
                        ? "bg-destructive"
                        : "bg-muted-foreground/35"
                  }`}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-display text-sm font-bold text-foreground">vs {opponent}</p>
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${resultStyles[result]}`}>
                      {result}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{playedAs}</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      {new Date(game.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default RecentGamesCard;
