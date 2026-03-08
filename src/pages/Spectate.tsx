import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Crown, ArrowLeft, Loader2, Users, Search, Send, MessageSquare, Filter, BarChart3 } from "lucide-react";
import EmojiReactions from "@/components/spectate/EmojiReactions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Chess } from "chess.js";
import ChessBoard from "@/components/chess/ChessBoard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import EvalBar from "@/components/chess/EvalBar";
import { format } from "date-fns";
import type { Square } from "chess.js";

interface LiveGame {
  id: string;
  player_white: string | null;
  player_black: string | null;
  current_fen: string | null;
  moves: any[];
  created_at: string;
  game_mode: string;
  white_username?: string;
  black_username?: string;
  white_score?: number;
  black_score?: number;
}

interface Comment {
  id: string;
  game_id: string;
  user_id: string;
  content: string;
  created_at: string;
  username?: string;
}

const Spectate = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [liveGames, setLiveGames] = useState<LiveGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<LiveGame | null>(null);
  const [spectateGame, setSpectateGame] = useState<Chess | null>(null);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "rating" | "moves">("recent");
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Fetch active games
  useEffect(() => {
    const fetchLiveGames = async () => {
      const { data: games } = await supabase
        .from("games")
        .select("id, player_white, player_black, current_fen, moves, created_at, game_mode")
        .eq("result_type", "in_progress")
        .not("player2_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!games || games.length === 0) {
        setLiveGames([]);
        setLoading(false);
        return;
      }

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

  // Presence for spectator count
  useEffect(() => {
    if (!selectedGame || !user) return;

    const presenceChannel = supabase.channel(`spectators-${selectedGame.id}`, {
      config: { presence: { key: user.id } },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        setSpectatorCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ user_id: user.id });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [selectedGame?.id, user?.id]);

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
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedGame?.id]);

  // Load & subscribe to comments
  useEffect(() => {
    if (!selectedGame) { setComments([]); return; }

    const loadComments = async () => {
      const { data } = await supabase
        .from("game_comments" as any)
        .select("*")
        .eq("game_id", selectedGame.id)
        .order("created_at", { ascending: true })
        .limit(200);

      if (!data) return;
      const userIds = [...new Set((data as any[]).map(c => c.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, username").in("id", userIds);
      const pMap = new Map(profiles?.map(p => [p.id, p.username]) || []);

      setComments((data as any[]).map(c => ({ ...c, username: pMap.get(c.user_id) || "Player" })));
    };

    loadComments();

    const channel = supabase
      .channel(`comments-${selectedGame.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "game_comments", filter: `game_id=eq.${selectedGame.id}` }, async (payload) => {
        const newComment = payload.new as any;
        const { data: profile } = await supabase.from("profiles").select("username").eq("id", newComment.user_id).maybeSingle();
        setComments(prev => [...prev, { ...newComment, username: profile?.username || "Player" }]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedGame?.id]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  const sendComment = async () => {
    if (!user || !selectedGame || !commentDraft.trim()) return;
    setSendingComment(true);
    await supabase.from("game_comments" as any).insert({
      game_id: selectedGame.id,
      user_id: user.id,
      content: commentDraft.trim(),
    });
    setCommentDraft("");
    setSendingComment(false);
  };

  // Filter & sort
  const filteredGames = liveGames
    .filter(g => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (g.white_username?.toLowerCase().includes(q) || g.black_username?.toLowerCase().includes(q));
    })
    .sort((a, b) => {
      if (sortBy === "rating") return Math.max(b.white_score || 0, b.black_score || 0) - Math.max(a.white_score || 0, a.black_score || 0);
      if (sortBy === "moves") return (b.moves?.length || 0) - (a.moves?.length || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const displayMoves = selectedGame?.moves
    ? (selectedGame.moves as Array<{ san: string }>).map(m => m.san)
    : [];

  if (selectedGame && spectateGame) {
    return (
      <div className="min-h-screen bg-background pt-20 pb-12 px-4">
        <div className="container mx-auto max-w-[1200px]">
          <button
            onClick={() => { setSelectedGame(null); setSpectateGame(null); setLastMove(null); setComments([]); }}
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

              <div className="flex gap-2 items-stretch w-full max-w-[96vw]">
                <EvalBar fen={selectedGame.current_fen} height={400} />
                <div className="flex-1">
                  <ChessBoard
                    game={spectateGame}
                    onMove={() => false}
                    disabled={true}
                    lastMove={lastMove}
                    sizeClassName="w-full"
                  />
                </div>
              </div>

              <div className="w-full max-w-[96vw] mt-3 rounded-lg border border-border/60 bg-secondary/20 px-4 py-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-display font-bold">{selectedGame.white_username} ({selectedGame.white_score})</span>
                  <span className="text-xs text-muted-foreground">White</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-4">
              {/* Spectator info */}
              <div className="glass-card p-4 border-glow">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-sm flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" /> Spectating Live
                  </h3>
                  <div className="flex items-center gap-2 text-xs">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-semibold">{spectatorCount}</span>
                    <span className="text-muted-foreground">watching</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedGame.white_username} vs {selectedGame.black_username}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-xs text-emerald-400">Live</span>
                </div>
              </div>

              {/* Moves panel */}
              <div className="glass-card p-4">
                <h3 className="font-display font-bold text-sm mb-3">Moves</h3>
                <div className="max-h-40 overflow-y-auto space-y-1 text-sm font-mono">
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

              {/* Commentary panel */}
              <div className="glass-card p-4 flex flex-col" style={{ height: "16rem" }}>
                <h3 className="font-display font-bold text-sm mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" /> Commentary
                </h3>
                <div className="flex-1 overflow-y-auto space-y-2 mb-2">
                  {comments.length === 0 && (
                    <p className="text-xs text-muted-foreground italic text-center py-4">No comments yet. Be the first!</p>
                  )}
                  {comments.map((c) => (
                    <div key={c.id} className="text-xs">
                      <span className="font-semibold text-primary">{c.username}</span>{" "}
                      <span className="text-muted-foreground">{format(new Date(c.created_at), "HH:mm")}</span>
                      <p className="text-foreground mt-0.5">{c.content}</p>
                    </div>
                  ))}
                  <div ref={commentsEndRef} />
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add commentary..."
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") sendComment(); }}
                    disabled={sendingComment || !user}
                    className="text-xs h-8"
                  />
                  <button
                    onClick={sendComment}
                    disabled={sendingComment || !commentDraft.trim() || !user}
                    className="bg-primary text-primary-foreground rounded-lg px-3 h-8 hover:opacity-90 disabled:opacity-40"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-3xl">
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

          {/* Filters */}
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by player name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="w-40">
                <Filter className="w-3.5 h-3.5 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="rating">Highest Rating</SelectItem>
                <SelectItem value="moves">Most Moves</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-primary mx-auto animate-spin" />
              <p className="text-sm text-muted-foreground mt-3">Loading live games...</p>
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-display font-bold">No Live Games</p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery ? "No matches found for your search." : "No matches are currently in progress. Check back soon!"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">{filteredGames.length} live game{filteredGames.length !== 1 ? "s" : ""}</p>
              {filteredGames.map((game) => {
                const moveCount = game.moves?.length || 0;
                const avgRating = Math.round(((game.white_score || 400) + (game.black_score || 400)) / 2);
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
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><Crown className="w-3 h-3" /> Avg {avgRating}</span>
                          <span>{moveCount} moves</span>
                          <span className="capitalize">{game.game_mode.replace("_", " ")}</span>
                        </div>
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
