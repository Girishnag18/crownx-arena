import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, Swords, Crown, ChevronRight, Loader2, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface TournamentData {
  id: string;
  name: string;
  prize_pool: number;
  max_players: number;
  status: string;
  tournament_type: string;
  current_round: number;
  max_rounds: number;
  created_by: string;
  starts_at: string | null;
}

interface TournamentMatch {
  id: string;
  round: number;
  player1_id: string;
  player2_id: string | null;
  game_id: string | null;
  winner_id: string | null;
  result: string;
}

interface PlayerProfile {
  id: string;
  username: string | null;
  crown_score: number;
}

const TournamentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [players, setPlayers] = useState<Map<string, PlayerProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadTournament = async () => {
    if (!id) return;
    const { data } = await (supabase as any)
      .from("tournaments")
      .select("id, name, prize_pool, max_players, status, tournament_type, current_round, max_rounds, created_by, starts_at")
      .eq("id", id)
      .single();
    if (data) setTournament(data);
  };

  const loadMatches = async () => {
    if (!id) return;
    const { data } = await (supabase as any)
      .from("tournament_matches")
      .select("id, round, player1_id, player2_id, game_id, winner_id, result")
      .eq("tournament_id", id)
      .order("round", { ascending: true });
    if (data) {
      setMatches(data);
      // Load player profiles
      const playerIds = new Set<string>();
      data.forEach((m: TournamentMatch) => {
        playerIds.add(m.player1_id);
        if (m.player2_id) playerIds.add(m.player2_id);
      });
      if (playerIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, crown_score")
          .in("id", [...playerIds]);
        if (profiles) {
          const map = new Map<string, PlayerProfile>();
          profiles.forEach((p) => map.set(p.id, p));
          setPlayers(map);
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTournament();
    loadMatches();
  }, [id]);

  // Realtime subscription for live bracket updates
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`tournament-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_matches", filter: `tournament_id=eq.${id}` }, () => {
        loadMatches();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tournaments", filter: `id=eq.${id}` }, () => {
        loadTournament();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const standings = useMemo(() => {
    const map = new Map<string, { wins: number; draws: number; losses: number; points: number }>();
    matches.forEach((m) => {
      if (!map.has(m.player1_id)) map.set(m.player1_id, { wins: 0, draws: 0, losses: 0, points: 0 });
      if (m.player2_id && !map.has(m.player2_id)) map.set(m.player2_id, { wins: 0, draws: 0, losses: 0, points: 0 });

      if (m.result === "pending" || m.result === "bye") {
        if (m.result === "bye") {
          const s = map.get(m.player1_id)!;
          s.wins += 1;
          s.points += 1;
        }
        return;
      }

      if (m.winner_id) {
        const winner = map.get(m.winner_id);
        if (winner) { winner.wins += 1; winner.points += 1; }
        const loserId = m.winner_id === m.player1_id ? m.player2_id : m.player1_id;
        if (loserId) {
          const loser = map.get(loserId);
          if (loser) loser.losses += 1;
        }
      } else {
        const p1 = map.get(m.player1_id);
        if (p1) { p1.draws += 1; p1.points += 0.5; }
        if (m.player2_id) {
          const p2 = map.get(m.player2_id);
          if (p2) { p2.draws += 1; p2.points += 0.5; }
        }
      }
    });

    return [...map.entries()]
      .sort(([, a], [, b]) => b.points - a.points || b.wins - a.wins)
      .map(([playerId, stats], index) => ({ rank: index + 1, playerId, ...stats }));
  }, [matches]);

  const roundGroups = useMemo(() => {
    const groups = new Map<number, TournamentMatch[]>();
    matches.forEach((m) => {
      if (!groups.has(m.round)) groups.set(m.round, []);
      groups.get(m.round)!.push(m);
    });
    return [...groups.entries()].sort(([a], [b]) => a - b);
  }, [matches]);

  const handleStartRound = async (action: "start" | "next_round") => {
    if (!id) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("tournament-pair", {
        body: { tournament_id: id, action },
      });
      if (error) throw error;
      if (data?.completed) {
        toast.success("Tournament completed!");
      } else {
        toast.success(data?.message || "Round started!");
      }
      loadTournament();
      loadMatches();
    } catch (err: any) {
      toast.error(err.message || "Failed to start round");
    }
    setActionLoading(false);
  };

  const getPlayerName = (playerId: string) => {
    const p = players.get(playerId);
    return p?.username || playerId.slice(0, 8);
  };

  const isCreator = user?.id === tournament?.created_by;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-20">
        <Crown className="w-12 h-12 text-primary animate-pulse-gold" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="page-container text-center">
        <p className="text-muted-foreground">Tournament not found</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="container mx-auto max-w-5xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 border-glow mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="font-display text-2xl font-black flex items-center gap-2">
                <Trophy className="w-6 h-6 text-primary" />
                {tournament.name}
              </h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span>🏆 ₹{tournament.prize_pool}</span>
                <span>•</span>
                <span className="capitalize">{tournament.tournament_type}</span>
                <span>•</span>
                <span>Round {tournament.current_round}/{tournament.max_rounds}</span>
                <span>•</span>
                <span className={`font-bold ${tournament.status === "live" ? "text-emerald-400" : tournament.status === "completed" ? "text-primary" : ""}`}>
                  {tournament.status.toUpperCase()}
                </span>
              </div>
            </div>
            {isCreator && tournament.status !== "completed" && tournament.status !== "cancelled" && (
              <button
                onClick={() => handleStartRound(tournament.current_round === 0 ? "start" : "next_round")}
                disabled={actionLoading}
                className="bg-primary text-primary-foreground font-display font-bold text-xs tracking-wider px-5 py-2.5 rounded-lg gold-glow hover:scale-105 transition-transform disabled:opacity-60 flex items-center gap-2"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {tournament.current_round === 0 ? "START ROUND 1" : `START ROUND ${tournament.current_round + 1}`}
              </button>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Standings */}
          <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1 glass-card p-5">
            <h2 className="font-display font-bold text-sm mb-3 flex items-center gap-2">
              <Crown className="w-4 h-4 text-primary" />
              Standings
            </h2>
            {standings.length === 0 ? (
              <p className="text-xs text-muted-foreground">No matches played yet</p>
            ) : (
              <div className="space-y-1">
                {standings.map((s) => (
                  <div key={s.playerId} className={`flex items-center justify-between py-2 px-2 rounded text-sm ${s.rank <= 3 ? "bg-primary/5" : ""}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold w-5 text-right text-muted-foreground">{s.rank}</span>
                      <span className="font-semibold">{getPlayerName(s.playerId)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-bold text-foreground">{s.points}pts</span>
                      <span>{s.wins}W {s.draws}D {s.losses}L</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Bracket / Rounds */}
          <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 space-y-4">
            {roundGroups.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <Swords className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Waiting for the first round to start</p>
              </div>
            ) : (
              roundGroups.map(([round, roundMatches]) => (
                <div key={round} className="glass-card p-5">
                  <h3 className="font-display font-bold text-sm mb-3 flex items-center gap-2">
                    <Swords className="w-4 h-4 text-primary" />
                    Round {round}
                  </h3>
                  <div className="space-y-2">
                    {roundMatches.map((match) => {
                      const isUserMatch = user && (match.player1_id === user.id || match.player2_id === user.id);
                      const isPending = match.result === "pending";

                      return (
                        <div
                          key={match.id}
                          className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                            isUserMatch ? "border-primary/30 bg-primary/5" : "border-border/40"
                          } ${isPending ? "animate-pulse-subtle" : ""}`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                              <span className={`text-sm font-semibold truncate ${match.winner_id === match.player1_id ? "text-primary" : ""}`}>
                                {getPlayerName(match.player1_id)}
                                {match.winner_id === match.player1_id && " ✓"}
                              </span>
                              <span className={`text-sm truncate ${match.player2_id ? (match.winner_id === match.player2_id ? "text-primary" : "") : "text-muted-foreground italic"}`}>
                                {match.player2_id ? getPlayerName(match.player2_id) : "BYE"}
                                {match.player2_id && match.winner_id === match.player2_id && " ✓"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-display font-bold px-2 py-0.5 rounded ${
                              match.result === "pending" ? "bg-secondary text-muted-foreground" :
                              match.result === "bye" ? "bg-muted text-muted-foreground" :
                              "bg-primary/10 text-primary"
                            }`}>
                              {match.result === "pending" ? "LIVE" : match.result.toUpperCase()}
                            </span>
                            {isPending && match.game_id && isUserMatch && (
                              <button
                                onClick={() => navigate(`/play?game=${match.game_id}`)}
                                className="text-[10px] font-display font-bold bg-primary text-primary-foreground px-2.5 py-1 rounded flex items-center gap-1"
                              >
                                <ChevronRight className="w-3 h-3" /> PLAY
                              </button>
                            )}
                            {isPending && match.game_id && !isUserMatch && (
                              <button
                                onClick={() => navigate(`/play?game=${match.game_id}`)}
                                className="text-[10px] font-display font-bold bg-secondary px-2.5 py-1 rounded"
                              >
                                SPECTATE
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default TournamentDetail;
