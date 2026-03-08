import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Eye, Crown, ArrowLeft, Loader2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Chess } from "chess.js";
import ChessBoard from "@/components/chess/ChessBoard";
import GameChat from "@/components/chess/GameChat";
import type { Square } from "chess.js";

interface LiveGame {
  id: string;
  player_white: string | null;
  player_black: string | null;
  current_fen: string | null;
  moves: any[];
  created_at: string;
  white_username?: string;
  black_username?: string;
  white_score?: number;
  black_score?: number;
}

const Spectate = () => {
  const navigate = useNavigate();
  const [liveGames, setLiveGames] = useState<LiveGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<LiveGame | null>(null);
  const [spectateGame, setSpectateGame] = useState<Chess | null>(null);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);

  // Fetch active games
  useEffect(() => {
    const fetchLiveGames = async () => {
      const { data: games } = await supabase
        .from("games")
        .select("id, player_white, player_black, current_fen, moves, created_at")
        .eq("result_type", "in_progress")
        .not("player2_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!games || games.length === 0) {
        setLiveGames([]);
        setLoading(false);
        return;
      }

      // Fetch player profiles
      const playerIds = [...new Set(games.flatMap(g => [g.player_white, g.player_black]).filter(Boolean))] as string[];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, crown_score")
        .in("id", playerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const enriched: LiveGame[] = games.map(g => ({
        ...g,
        moves: (g.moves as any[]) || [],
        white_username: profileMap.get(g.player_white || "")?.username || "Player",
        black_username: profileMap.get(g.player_black || "")?.username || "Player",
        white_score: profileMap.get(g.player_white || "")?.crown_score || 400,
        black_score: profileMap.get(g.player_black || "")?.crown_score || 400,
      }));

      setLiveGames(enriched);
      setLoading(false);
    };

    fetchLiveGames();
    const interval = setInterval(fetchLiveGames, 10000);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to selected game updates
  useEffect(() => {
    if (!selectedGame) return;

    const chess = new Chess(selectedGame.current_fen || undefined);
    setSpectateGame(chess);

    const movesArr = selectedGame.moves as Array<{ from: string; to: string }>;
    if (movesArr.length > 0) {
      const last = movesArr[movesArr.length - 1];
      setLastMove({ from: last.from as Square, to: last.to as Square });
    }

    const channel = supabase
      .channel(`spectate-${selectedGame.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${selectedGame.id}` },
        (payload) => {
          const updated = payload.new as any;
          const newChess = new Chess(updated.current_fen);
          setSpectateGame(newChess);
          setSelectedGame(prev => prev ? { ...prev, ...updated } : null);

          const updatedMoves = (updated.moves || []) as Array<{ from: string; to: string }>;
          if (updatedMoves.length > 0) {
            const last = updatedMoves[updatedMoves.length - 1];
            setLastMove({ from: last.from as Square, to: last.to as Square });
          }

          // Game ended
          if (updated.result_type !== "in_progress") {
            setSelectedGame(prev => prev ? { ...prev, ...updated } : null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedGame?.id]);

  const displayMoves = selectedGame?.moves
    ? (selectedGame.moves as Array<{ san: string }>).map(m => m.san)
    : [];

  if (selectedGame && spectateGame) {
    return (
      <div className="min-h-screen bg-background pt-20 pb-12 px-4">
        <div className="container mx-auto max-w-[1200px]">
          <button
            onClick={() => { setSelectedGame(null); setSpectateGame(null); setLastMove(null); }}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back to live games
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 flex flex-col items-center">
              <div className="w-full max-w-[96vw] mb-3 rounded-lg border border-border/60 bg-secondary/20 px-4 py-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-display font-bold">{selectedGame.black_username} ({selectedGame.black_score})</span>
                  <span className="text-xs text-muted-foreground">Black</span>
                </div>
              </div>

              <ChessBoard
                game={spectateGame}
                onMove={() => false}
                disabled={true}
                lastMove={lastMove}
                sizeClassName="max-w-[96vw]"
              />

              <div className="w-full max-w-[96vw] mt-3 rounded-lg border border-border/60 bg-secondary/20 px-4 py-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-display font-bold">{selectedGame.white_username} ({selectedGame.white_score})</span>
                  <span className="text-xs text-muted-foreground">White</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-4">
              <div className="glass-card p-5 border-glow">
                <h3 className="font-display font-bold text-sm flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  Spectating Live
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedGame.white_username} vs {selectedGame.black_username}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-xs text-emerald-400">Live</span>
                </div>
              </div>

              <div className="glass-card p-5">
                <h3 className="font-display font-bold text-sm mb-3">Moves</h3>
                <div className="max-h-64 overflow-y-auto space-y-1 text-sm font-mono">
                  {displayMoves.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">No moves yet</p>
                  )}
                  {Array.from({ length: Math.ceil(displayMoves.length / 2) }, (_, i) => (
                    <div key={i} className="flex items-center gap-2 py-0.5">
                      <span className="text-muted-foreground w-6 text-right text-xs">{i + 1}.</span>
                      <span className="w-16 text-foreground">{displayMoves[i * 2]}</span>
                      <span className="w-16 text-foreground">{displayMoves[i * 2 + 1] || ""}</span>
                    </div>
                  ))}
                </div>
              </div>

              <GameChat gameId={selectedGame.id} isSpectator={true} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <button
            onClick={() => navigate("/lobby")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Lobby
          </button>

          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Eye className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold mb-2">Spectate Live Games</h1>
            <p className="text-sm text-muted-foreground">Watch matches happening right now</p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-primary mx-auto animate-spin" />
              <p className="text-sm text-muted-foreground mt-3">Loading live games...</p>
            </div>
          ) : liveGames.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-display font-bold">No Live Games</p>
              <p className="text-sm text-muted-foreground mt-1">No matches are currently in progress. Check back soon!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {liveGames.map((game) => {
                const moveCount = game.moves?.length || 0;
                return (
                  <motion.button
                    key={game.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setSelectedGame(game)}
                    className="w-full glass-card p-4 text-left hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-display font-bold text-sm">
                          {game.white_username} <span className="text-muted-foreground">vs</span> {game.black_username}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {game.white_score} vs {game.black_score} • {moveCount} moves
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        <Eye className="w-4 h-4 text-primary" />
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Spectate;
