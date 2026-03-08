import { Clock, ChevronRight, Swords } from "lucide-react";
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

const RecentGamesCard = ({ games, userId }: RecentGamesCardProps) => {
  const navigate = useNavigate();
  const finishedGames = games.filter((g) => g.result_type !== "in_progress");

  const getResult = (game: RecentGame) => {
    if (game.result_type === "draw" || game.result_type === "stalemate") return "draw";
    if (game.winner_id === userId) return "win";
    if (game.winner_id) return "loss";
    return "draw";
  };

  const resultStyles = {
    win: "bg-emerald-500/12 text-emerald-400 border-emerald-500/20",
    loss: "bg-destructive/12 text-destructive border-destructive/20",
    draw: "bg-muted/50 text-muted-foreground border-border/30",
  };

  return (
    <div className="rounded-xl bg-card/80 border border-border/30 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-display font-bold text-sm">Recent Games</h3>
        </div>
        <button onClick={() => navigate("/match-history")} className="text-[10px] text-primary font-display font-bold flex items-center gap-0.5 hover:underline">
          View All <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {finishedGames.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <Swords className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No games played yet</p>
        </div>
      ) : (
        <div className="divide-y divide-border/10 max-h-[18rem] overflow-y-auto">
          {finishedGames.slice(0, 8).map((game) => {
            const result = getResult(game);
            const opponent = game.player_white === userId
              ? (game.black_name || "Opponent")
              : (game.white_name || "Opponent");
            const playedAs = game.player_white === userId ? "White" : "Black";

            return (
              <button
                key={game.id}
                onClick={() => navigate(`/replay?game=${game.id}`)}
                className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-secondary/10 transition-colors text-left"
              >
                <div className={`w-2 h-8 rounded-full ${result === "win" ? "bg-emerald-500" : result === "loss" ? "bg-destructive" : "bg-muted-foreground/30"}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-xs truncate">vs {opponent}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {playedAs} · {new Date(game.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </p>
                </div>
                <span className={`text-[10px] font-display font-bold uppercase px-2 py-1 rounded-md border ${resultStyles[result]}`}>
                  {result}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecentGamesCard;
