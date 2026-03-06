import { useState, useEffect, useCallback } from "react";
import { Chess, Square } from "chess.js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Json } from "@/integrations/supabase/types";

interface GameData {
  id: string;
  player_white: string;
  player_black: string;
  player1_id: string;
  player2_id: string;
  current_fen: string;
  duration_seconds: number | null;
  moves: Json[];
  result_type: string;
  winner_id: string | null;
  clock_white_ms: number | null;
  clock_black_ms: number | null;
  increment_ms: number;
  delay_ms: number;
  time_control_mode: "none" | "fischer" | "delay" | "bronstein";
  clock_last_move_at: string | null;
  flag_fall_winner_id: string | null;
}

interface PlayerSummary {
  id: string;
  username: string;
  crown_score: number;
  avatar_url: string | null;
}

export const useOnlineGame = (gameId: string | null) => {
  const { user } = useAuth();
  const [game, setGame] = useState<Chess | null>(null);
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [playerColor, setPlayerColor] = useState<"w" | "b" | null>(null);
  const [whitePlayer, setWhitePlayer] = useState<PlayerSummary | null>(null);
  const [blackPlayer, setBlackPlayer] = useState<PlayerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncState, setSyncState] = useState<"connecting" | "live" | "offline">("connecting");
  const [pendingMove, setPendingMove] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [clockTick, setClockTick] = useState(0);

  // Load game data
  useEffect(() => {
    if (!gameId || !user) return;
    setSyncState("connecting");

    const loadGame = async () => {
      const { data } = await supabase
        .from("games")
        .select("*")
        .eq("id", gameId)
        .single();

      if (data) {
        const gd = data as unknown as GameData;
        setGameData(gd);
        const chess = new Chess(gd.current_fen);
        setGame(chess);
        setPlayerColor(gd.player_white === user.id ? "w" : gd.player_black === user.id ? "b" : null);

        const playerIds = [gd.player_white, gd.player_black].filter(Boolean) as string[];
        if (playerIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, username, crown_score, avatar_url")
            .in("id", playerIds);

          if (profiles) {
            const profileMap = new Map(
              profiles.map((profile) => [
                profile.id,
                {
                  id: profile.id,
                  username: profile.username || "Player",
                  crown_score: profile.crown_score || 1200,
                  avatar_url: profile.avatar_url || null,
                } satisfies PlayerSummary,
              ]),
            );

            setWhitePlayer(gd.player_white ? profileMap.get(gd.player_white) || null : null);
            setBlackPlayer(gd.player_black ? profileMap.get(gd.player_black) || null : null);
          }
        }
        setLoading(false);
      }
    };

    loadGame();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          const updated = payload.new as unknown as GameData;
          setGameData(updated);
          const chess = new Chess(updated.current_fen);
          setGame(chess);
          setLastSyncedAt(new Date());
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setSyncState("live");
          setLastSyncedAt(new Date());
          return;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setSyncState("offline");
        }
      });

    return () => {
      setSyncState("offline");
      supabase.removeChannel(channel);
    };
  }, [gameId, user]);

  useEffect(() => {
    if (!gameData) return;

    const playerIds = [gameData.player_white, gameData.player_black].filter(Boolean) as string[];
    if (playerIds.length === 0) return;

    const profileChannel = supabase
      .channel(`game-profiles-${gameData.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        async (payload) => {
          const updatedProfileId = (payload.new as { id?: string })?.id;
          if (!updatedProfileId || !playerIds.includes(updatedProfileId)) return;

          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, username, crown_score, avatar_url")
            .in("id", playerIds);

          if (!profiles) return;

          const profileMap = new Map(
            profiles.map((profile) => [
              profile.id,
              {
                id: profile.id,
                username: profile.username || "Player",
                crown_score: profile.crown_score || 1200,
                  avatar_url: profile.avatar_url || null,
              } satisfies PlayerSummary,
            ]),
          );

          setWhitePlayer(gameData.player_white ? profileMap.get(gameData.player_white) || null : null);
          setBlackPlayer(gameData.player_black ? profileMap.get(gameData.player_black) || null : null);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [gameData]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setClockTick((prev) => (prev + 1) % 10000);
    }, 250);
    return () => {
      window.clearInterval(id);
    };
  }, []);

  const deriveClocks = useCallback((data: GameData | null) => {
    if (!data) return { white: null as number | null, black: null as number | null };
    if (data.clock_white_ms === null || data.clock_black_ms === null || !data.clock_last_move_at || data.result_type !== "in_progress") {
      return { white: data.clock_white_ms, black: data.clock_black_ms };
    }

    const elapsedMs = Math.max(0, Date.now() - new Date(data.clock_last_move_at).getTime());
    const isWhiteTurn = data.current_fen?.includes(" w ");

    let white = data.clock_white_ms;
    let black = data.clock_black_ms;

    if (isWhiteTurn) {
      if (data.time_control_mode === "delay") {
        white = Math.max(0, white - Math.max(0, elapsedMs - data.delay_ms));
      } else if (data.time_control_mode === "bronstein") {
        white = Math.max(0, white - elapsedMs + Math.min(elapsedMs, data.delay_ms));
      } else {
        white = Math.max(0, white - elapsedMs);
      }
    } else {
      if (data.time_control_mode === "delay") {
        black = Math.max(0, black - Math.max(0, elapsedMs - data.delay_ms));
      } else if (data.time_control_mode === "bronstein") {
        black = Math.max(0, black - elapsedMs + Math.min(elapsedMs, data.delay_ms));
      } else {
        black = Math.max(0, black - elapsedMs);
      }
    }
    return { white, black };
  }, []);

  const makeMove = useCallback(
    async (from: Square, to: Square, promotion?: string) => {
      if (!game || !gameData || !user || !playerColor) return false;

      // Check if it's the player's turn
      if (game.turn() !== playerColor) return false;

      const gameCopy = new Chess(game.fen());
      const previousFen = game.fen();
      const previousMoves = gameData.moves || [];
      try {
        const move = gameCopy.move({ from, to, promotion: promotion || undefined });
        if (!move) return false;

        setPendingMove(true);
        setGame(gameCopy);
        setGameData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            current_fen: gameCopy.fen(),
            moves: [...(prev.moves || []), { from, to, san: move.san, promotion: promotion ?? null }],
          };
        });

        // Determine game result
        let resultType = "in_progress";
        let winnerId: string | null = null;
        let endedAt: string | null = null;

        if (gameCopy.isCheckmate()) {
          resultType = "checkmate";
          winnerId = user.id;
          endedAt = new Date().toISOString();
        } else if (gameCopy.isStalemate()) {
          resultType = "stalemate";
          endedAt = new Date().toISOString();
        } else if (gameCopy.isDraw()) {
          resultType = "draw";
          endedAt = new Date().toISOString();
        }

        const newMoves = [...previousMoves, { from, to, san: move.san, promotion: promotion ?? null }];

        const { data, error } = await (supabase as unknown as {
          rpc: (
            fn: string,
            args: Record<string, unknown>,
          ) => Promise<{
            data: Array<{
              ok: boolean;
              result_type: string;
              winner_id: string | null;
              clock_white_ms: number | null;
              clock_black_ms: number | null;
              current_fen: string;
              moves: Json;
            }> | null;
            error: { message: string } | null;
          }>;
        }).rpc("submit_online_move", {
          p_game_id: gameData.id,
          p_from: from,
          p_to: to,
          p_san: move.san,
          p_promotion: promotion ?? null,
          p_new_fen: gameCopy.fen(),
          p_result_type: resultType,
          p_winner_id: winnerId,
          p_pgn: gameCopy.pgn(),
        });

        if (error) throw error;
        if (data && data.length > 0) {
          const row = data[0];
          setGameData((prev) => prev ? {
            ...prev,
            current_fen: row.current_fen,
            moves: (row.moves as Json[]) || newMoves,
            result_type: row.result_type,
            winner_id: row.winner_id,
            clock_white_ms: row.clock_white_ms,
            clock_black_ms: row.clock_black_ms,
            clock_last_move_at: new Date().toISOString(),
          } : prev);
          setGame(new Chess(row.current_fen));
        }

        // Record elo_history snapshot if game ended
        if (resultType !== "in_progress") {
          try {
            const { data: currentProfile } = await supabase
              .from("profiles")
              .select("crown_score")
              .eq("id", user.id)
              .single();
            
            if (currentProfile) {
              const eloBefore = currentProfile.crown_score;
              // Simple elo delta: +20 for win, -15 for loss, 0 for draw
              const eloChange = winnerId === user.id ? 20 : winnerId ? -15 : 0;
              const eloAfter = Math.max(0, eloBefore + eloChange);

              await supabase.from("elo_history").insert({
                player_id: user.id,
                game_id: gameData.id,
                elo_before: eloBefore,
                elo_after: eloAfter,
              } as any);

              // Update profile crown_score
              await supabase
                .from("profiles")
                .update({ crown_score: eloAfter } as any)
                .eq("id", user.id);
            }
          } catch {
            // Non-critical: don't fail the move if elo tracking fails
          }
        }

        setLastSyncedAt(new Date());
        setPendingMove(false);

        return true;
      } catch {
        setPendingMove(false);
        setGame(new Chess(game.fen()));
        setGameData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            current_fen: previousFen,
            moves: previousMoves,
          };
        });
        return false;
      }
    },
    [game, gameData, user, playerColor]
  );

  const resign = useCallback(async () => {
    if (!gameData || !user) return;
    if (gameData.player_white !== user.id && gameData.player_black !== user.id) return;
    const winnerId = gameData.player_white === user.id ? gameData.player_black : gameData.player_white;
    await supabase
      .from("games")
      .update({
        result_type: "resignation",
        winner_id: winnerId,
        ended_at: new Date().toISOString(),
      })
      .eq("id", gameData.id);
  }, [gameData, user]);

  return {
    game,
    gameData,
    playerColor,
    whitePlayer,
    blackPlayer,
    loading,
    pendingMove,
    syncState,
    lastSyncedAt,
    makeMove,
    resign,
    isSpectator: !!user && !!gameData && gameData.player_white !== user.id && gameData.player_black !== user.id,
    playerName: user
      ? (playerColor === "w" ? whitePlayer?.username : blackPlayer?.username) || "You"
      : "You",
    opponentName: playerColor === "w" ? blackPlayer?.username || "Opponent" : whitePlayer?.username || "Opponent",
    isMyTurn: game ? game.turn() === playerColor : false,
    isGameOver: gameData?.result_type !== "in_progress" && gameData?.result_type !== "pending",
    clock: (() => {
      void clockTick;
      return deriveClocks(gameData);
    })(),
  };
};
