import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Swords, Crown, Clock, TrendingUp, TrendingDown, Minus, PlayCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

interface GameRecord {
  id: string;
  result_type: string;
  winner_id: string | null;
  game_mode: string;
  created_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  player_white: string | null;
  player_black: string | null;
}

interface PlayerInfo {
  id: string;
  username: string | null;
  avatar_url: string | null;
  crown_score: number;
}

interface MatchHistoryProps {
  playerId: string;
}

const MatchHistory = ({ playerId }: MatchHistoryProps) => {
  const navigate = useNavigate();
  const [games, setGames] = useState<GameRecord[]>([]);
  const [players, setPlayers] = useState<Map<string, PlayerInfo>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("games")
        .select("id, result_type, winner_id, game_mode, created_at, ended_at, duration_seconds, player_white, player_black")
        .or(`player_white.eq.${playerId},player_black.eq.${playerId}`)
        .neq("result_type", "pending")
        .neq("result_type", "in_progress")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!data) { setLoading(false); return; }
      const records = data as unknown as GameRecord[];
      setGames(records);

      // Fetch all opponent profiles
      const ids = new Set<string>();
      records.forEach((g) => {
        if (g.player_white) ids.add(g.player_white);
        if (g.player_black) ids.add(g.player_black);
      });

      if (ids.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, crown_score")
          .in("id", Array.from(ids));

        const map = new Map<string, PlayerInfo>();
        (profiles || []).forEach((p) => map.set(p.id, p as PlayerInfo));
        setPlayers(map);
      }
      setLoading(false);
    };
    load();
  }, [playerId]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card p-4 animate-pulse h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <Swords className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No match history yet. Play some games!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {games.map((game, i) => {
        const isWin = game.winner_id === playerId;
        const isDraw = game.result_type === "draw" || game.result_type === "stalemate";
        const isLoss = !isDraw && !isWin && game.winner_id;

        const opponentId = game.player_white === playerId ? game.player_black : game.player_white;
        const opponent = opponentId ? players.get(opponentId) : null;
        const playedAs = game.player_white === playerId ? "white" : "black";

        const resultLabel = isWin ? "Won" : isDraw ? "Draw" : isLoss ? "Lost" : "—";
        const resultColor = isWin ? "text-emerald-400" : isDraw ? "text-muted-foreground" : "text-destructive";
        const resultBg = isWin ? "border-emerald-500/20 bg-emerald-500/5" : isDraw ? "border-border/40" : "border-destructive/20 bg-destructive/5";

        const resultTypeLabel: Record<string, string> = {
          checkmate: "Checkmate",
          resignation: "Resignation",
          stalemate: "Stalemate",
          draw: "Draw",
          timeout: "Timeout",
        };

        return (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className={`rounded-lg border p-3 flex items-center gap-3 ${resultBg}`}
          >
            {/* Result icon */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              isWin ? "bg-emerald-500/20" : isDraw ? "bg-secondary" : "bg-destructive/20"
            }`}>
              {isWin ? <TrendingUp className="w-4 h-4 text-emerald-400" /> :
               isDraw ? <Minus className="w-4 h-4 text-muted-foreground" /> :
               <TrendingDown className="w-4 h-4 text-destructive" />}
            </div>

            {/* Opponent */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Avatar className="w-6 h-6 border border-border/50">
                <AvatarImage src={opponent?.avatar_url || undefined} />
                <AvatarFallback className="text-[9px] bg-secondary">
                  {(opponent?.username || "?").slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-xs font-display font-bold truncate">
                  vs {opponent?.username || "Unknown"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  as {playedAs === "white" ? "♔" : "♚"} · {resultTypeLabel[game.result_type] || game.result_type}
                </p>
              </div>
            </div>

            {/* Result + replay */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-right">
                <p className={`text-xs font-display font-bold ${resultColor}`}>{resultLabel}</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(game.created_at), { addSuffix: true })}
                </p>
              </div>
              <button
                onClick={() => navigate(`/replay?game=${game.id}`)}
                className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-primary/10 hover:border-primary/30 transition-colors"
                title="Replay game"
              >
                <PlayCircle className="w-3.5 h-3.5 text-primary" />
              </button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default MatchHistory;
