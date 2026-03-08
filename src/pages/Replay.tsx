import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Chess, Square } from "chess.js";
import { motion } from "framer-motion";
import {
  ArrowLeft, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Play, Pause, Download, BarChart3, Loader2, Crown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ChessBoard from "@/components/chess/ChessBoard";
import EvalBar from "@/components/chess/EvalBar";
import GameReview from "@/components/chess/GameReview";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { stockfish, CLASSIFICATION_COLORS, CLASSIFICATION_ICONS, type MoveAnalysis } from "@/services/stockfishService";
import { format } from "date-fns";

interface GameData {
  id: string;
  player_white: string | null;
  player_black: string | null;
  current_fen: string | null;
  moves: Array<{ from: string; to: string; san: string; promotion?: string }>;
  result_type: string;
  winner_id: string | null;
  created_at: string;
  pgn: string | null;
  game_mode: string;
}

interface PlayerInfo {
  id: string;
  username: string | null;
  avatar_url: string | null;
  crown_score: number;
}

const Replay = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const gameId = searchParams.get("game");

  const [gameData, setGameData] = useState<GameData | null>(null);
  const [whitePlayer, setWhitePlayer] = useState<PlayerInfo | null>(null);
  const [blackPlayer, setBlackPlayer] = useState<PlayerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1); // -1 = starting position
  const [autoPlaying, setAutoPlaying] = useState(false);
  const [autoPlaySpeed, setAutoPlaySpeed] = useState(1500);
  const [showReview, setShowReview] = useState(false);
  const [moveEvals, setMoveEvals] = useState<Map<number, number>>(new Map());
  const [evalLoading, setEvalLoading] = useState(false);

  // Load game data
  useEffect(() => {
    if (!gameId) return;
    const load = async () => {
      const { data } = await supabase
        .from("games")
        .select("id, player_white, player_black, current_fen, moves, result_type, winner_id, created_at, pgn, game_mode")
        .eq("id", gameId)
        .single();

      if (!data) { setLoading(false); return; }
      const gd = data as unknown as GameData;
      gd.moves = (gd.moves || []) as GameData["moves"];
      setGameData(gd);

      const playerIds = [gd.player_white, gd.player_black].filter(Boolean) as string[];
      if (playerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, crown_score")
          .in("id", playerIds);
        if (profiles) {
          const map = new Map(profiles.map((p) => [p.id, p as PlayerInfo]));
          setWhitePlayer(gd.player_white ? map.get(gd.player_white) || null : null);
          setBlackPlayer(gd.player_black ? map.get(gd.player_black) || null : null);
        }
      }
      setLoading(false);
    };
    load();
  }, [gameId]);

  // Build chess positions for each move
  const positions = useMemo(() => {
    if (!gameData) return [];
    const startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const fens: string[] = [startFen];
    const game = new Chess(startFen);
    for (const move of gameData.moves) {
      try {
        game.move({ from: move.from as Square, to: move.to as Square, promotion: move.promotion });
        fens.push(game.fen());
      } catch { break; }
    }
    return fens;
  }, [gameData]);

  // Current position
  const currentFen = positions[currentMoveIndex + 1] || positions[0] || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const currentGame = useMemo(() => new Chess(currentFen), [currentFen]);

  const lastMove = currentMoveIndex >= 0 && gameData?.moves[currentMoveIndex]
    ? { from: gameData.moves[currentMoveIndex].from as Square, to: gameData.moves[currentMoveIndex].to as Square }
    : null;

  // Auto-play
  useEffect(() => {
    if (!autoPlaying || !gameData) return;
    if (currentMoveIndex >= gameData.moves.length - 1) {
      setAutoPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      setCurrentMoveIndex((i) => i + 1);
    }, autoPlaySpeed);
    return () => clearTimeout(timer);
  }, [autoPlaying, currentMoveIndex, autoPlaySpeed, gameData]);

  // Evaluate positions lazily
  const evaluateCurrentPosition = useCallback(async () => {
    if (moveEvals.has(currentMoveIndex) || evalLoading) return;
    setEvalLoading(true);
    try {
      const result = await stockfish.evaluate(currentFen, 12);
      setMoveEvals((prev) => new Map(prev).set(currentMoveIndex, result.score));
    } catch {}
    setEvalLoading(false);
  }, [currentMoveIndex, currentFen, moveEvals, evalLoading]);

  useEffect(() => {
    evaluateCurrentPosition();
  }, [currentMoveIndex]);

  const goToStart = () => { setCurrentMoveIndex(-1); setAutoPlaying(false); };
  const goToEnd = () => { if (gameData) { setCurrentMoveIndex(gameData.moves.length - 1); setAutoPlaying(false); } };
  const goBack = () => { setCurrentMoveIndex((i) => Math.max(-1, i - 1)); };
  const goForward = () => { if (gameData) setCurrentMoveIndex((i) => Math.min(gameData.moves.length - 1, i + 1)); };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goBack();
      else if (e.key === "ArrowRight") goForward();
      else if (e.key === "Home") goToStart();
      else if (e.key === "End") goToEnd();
      else if (e.key === " ") { e.preventDefault(); setAutoPlaying((p) => !p); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [gameData]);

  const downloadPgn = () => {
    if (!gameData?.pgn) return;
    const blob = new Blob([gameData.pgn], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `game-${gameData.id.slice(0, 8)}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const playerColor = user && gameData ? (gameData.player_white === user.id ? "w" : "b") : "w";
  const resultLabel: Record<string, string> = {
    checkmate: "Checkmate", resignation: "Resignation", stalemate: "Stalemate",
    draw: "Draw", timeout: "Timeout",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!gameData || positions.length === 0) {
    return (
      <div className="min-h-screen bg-background pt-20 px-4">
        <div className="container mx-auto max-w-2xl text-center py-20">
          <p className="text-muted-foreground">Game not found or has no moves.</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-primary text-sm hover:underline">Go back</button>
        </div>
      </div>
    );
  }

  // Build move pairs for display
  const movePairs: Array<{ num: number; white: { san: string; idx: number }; black?: { san: string; idx: number } }> = [];
  for (let i = 0; i < gameData.moves.length; i += 2) {
    movePairs.push({
      num: Math.floor(i / 2) + 1,
      white: { san: gameData.moves[i].san, idx: i },
      black: gameData.moves[i + 1] ? { san: gameData.moves[i + 1].san, idx: i + 1 } : undefined,
    });
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-[1300px]">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Board Column */}
          <div className="lg:col-span-8 flex flex-col items-center">
            {/* Top player */}
            <PlayerBar
              player={blackPlayer}
              label="Black"
              isWinner={gameData.winner_id === blackPlayer?.id}
            />

            <div className="flex gap-2 items-stretch w-full max-w-[96vw]">
              <EvalBar fen={currentFen} height={400} />
              <div className="flex-1">
                <ChessBoard
                  game={currentGame}
                  onMove={() => false}
                  disabled
                  lastMove={lastMove}
                  sizeClassName="w-full"
                />
              </div>
            </div>

            {/* Bottom player */}
            <PlayerBar
              player={whitePlayer}
              label="White"
              isWinner={gameData.winner_id === whitePlayer?.id}
            />

            {/* Controls */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <button onClick={goToStart} className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-secondary/60 transition-colors">
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button onClick={goBack} className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-secondary/60 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setAutoPlaying((p) => !p)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                  autoPlaying ? "bg-primary text-primary-foreground" : "border border-border hover:bg-secondary/60"
                }`}
              >
                {autoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button onClick={goForward} className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-secondary/60 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={goToEnd} className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-secondary/60 transition-colors">
                <ChevronsRight className="w-4 h-4" />
              </button>

              {/* Speed control */}
              <div className="ml-3 flex items-center gap-1 text-xs text-muted-foreground">
                <span>Speed:</span>
                {[2000, 1500, 800, 400].map((ms) => (
                  <button
                    key={ms}
                    onClick={() => setAutoPlaySpeed(ms)}
                    className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
                      autoPlaySpeed === ms ? "bg-primary text-primary-foreground" : "bg-secondary/50 hover:bg-secondary"
                    }`}
                  >
                    {ms === 2000 ? "0.5×" : ms === 1500 ? "1×" : ms === 800 ? "2×" : "4×"}
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 mt-4">
              {gameData.pgn && (
                <button onClick={downloadPgn} className="flex items-center gap-1.5 text-xs border border-border rounded-lg px-3 py-2 hover:bg-secondary/50 transition-colors">
                  <Download className="w-3.5 h-3.5" /> Download PGN
                </button>
              )}
              <button
                onClick={() => setShowReview((p) => !p)}
                className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary border border-primary/30 rounded-lg px-3 py-2 hover:bg-primary/20 transition-colors"
              >
                <BarChart3 className="w-3.5 h-3.5" /> {showReview ? "Hide Analysis" : "Engine Analysis"}
              </button>
            </div>
          </div>

          {/* Side Panel */}
          <div className="lg:col-span-4 space-y-4">
            {/* Game info */}
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display font-bold text-sm">Game Info</h3>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {format(new Date(gameData.created_at), "MMM d, yyyy · HH:mm")}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-secondary/30 rounded-lg p-2 text-center">
                  <p className="text-muted-foreground">Result</p>
                  <p className="font-bold">{resultLabel[gameData.result_type] || gameData.result_type}</p>
                </div>
                <div className="bg-secondary/30 rounded-lg p-2 text-center">
                  <p className="text-muted-foreground">Moves</p>
                  <p className="font-bold">{gameData.moves.length}</p>
                </div>
              </div>
              {gameData.winner_id && (
                <p className="text-xs text-center mt-2 font-semibold text-primary">
                  🏆 {gameData.winner_id === whitePlayer?.id ? whitePlayer?.username : blackPlayer?.username} won
                </p>
              )}
            </div>

            {/* Move list */}
            <div className="glass-card p-4">
              <h3 className="font-display font-bold text-sm mb-3">Moves</h3>
              <div className="max-h-[360px] overflow-y-auto space-y-0.5 font-mono text-sm">
                {movePairs.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No moves</p>
                )}
                {movePairs.map((pair) => (
                  <div key={pair.num} className="flex items-center gap-1">
                    <span className="text-muted-foreground w-7 text-right text-xs">{pair.num}.</span>
                    <button
                      onClick={() => { setCurrentMoveIndex(pair.white.idx); setAutoPlaying(false); }}
                      className={`w-16 px-1.5 py-0.5 rounded text-left transition-colors ${
                        currentMoveIndex === pair.white.idx
                          ? "bg-primary/20 text-primary font-bold"
                          : "hover:bg-secondary/50"
                      }`}
                    >
                      {pair.white.san}
                    </button>
                    {pair.black && (
                      <button
                        onClick={() => { setCurrentMoveIndex(pair.black!.idx); setAutoPlaying(false); }}
                        className={`w-16 px-1.5 py-0.5 rounded text-left transition-colors ${
                          currentMoveIndex === pair.black.idx
                            ? "bg-primary/20 text-primary font-bold"
                            : "hover:bg-secondary/50"
                        }`}
                      >
                        {pair.black.san}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Current eval */}
              {moveEvals.has(currentMoveIndex) && (
                <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground flex items-center justify-between">
                  <span>Engine eval:</span>
                  <span className="font-mono font-bold text-foreground">
                    {(() => {
                      const ev = moveEvals.get(currentMoveIndex)!;
                      return ev > 0 ? `+${(ev / 100).toFixed(1)}` : (ev / 100).toFixed(1);
                    })()}
                  </span>
                </div>
              )}
            </div>

            {/* Engine Review */}
            {showReview && (
              <GameReview
                moves={gameData.moves}
                playerColor={playerColor}
                onClose={() => setShowReview(false)}
                onSelectMove={(idx, fen) => {
                  setCurrentMoveIndex(idx);
                  setAutoPlaying(false);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const PlayerBar = ({ player, label, isWinner }: { player: PlayerInfo | null; label: string; isWinner: boolean }) => (
  <div className="w-full max-w-[96vw] my-2 rounded-lg border border-border/60 bg-secondary/20 px-4 py-2">
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <Avatar className="w-7 h-7 border border-border/70">
          <AvatarImage src={player?.avatar_url || undefined} />
          <AvatarFallback className="text-[10px] bg-secondary">
            {(player?.username || "?").slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="font-display font-bold">
          {player?.username || "Player"} ({player?.crown_score || 400})
        </span>
        {isWinner && <Crown className="w-3.5 h-3.5 text-primary" />}
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  </div>
);

export default Replay;
