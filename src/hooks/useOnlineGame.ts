import { useState, useEffect, useCallback } from "react";
import { Chess, Square } from "chess.js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface GameData {
  id: string;
  player_white: string;
  player_black: string;
  player1_id: string;
  player2_id: string;
  current_fen: string;
  moves: any[];
  result_type: string;
  winner_id: string | null;
  duration_seconds: number | null;
  increment_seconds: number | null;
  white_time_ms: number | null;
  black_time_ms: number | null;
  last_move_at: string | null;
}

interface PlayerSummary {
  id: string;
  username: string;
  crown_score: number;
  avatar_url: string | null;
  equippedTitle?: { name: string; icon: string } | null;
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
        setPlayerColor(gd.player_white === user.id ? "w" : "b");

        const playerIds = [gd.player_white, gd.player_black].filter(Boolean) as string[];
        if (playerIds.length > 0) {
          const [{ data: profiles }, { data: purchases }] = await Promise.all([
            supabase
              .from("profiles")
              .select("id, username, crown_score, avatar_url")
              .in("id", playerIds),
            supabase
              .from("shop_purchases")
              .select("user_id, item_id, is_equipped")
              .in("user_id", playerIds)
              .eq("is_equipped", true),
          ]);

          // Fetch title items for equipped purchases
          let titleMap = new Map<string, { name: string; icon: string }>();
          if (purchases && purchases.length > 0) {
            const itemIds = purchases.map((p) => p.item_id);
            const { data: items } = await supabase
              .from("shop_items")
              .select("id, name, icon, category")
              .in("id", itemIds)
              .eq("category", "title");
            if (items) {
              const itemById = new Map(items.map((i) => [i.id, i]));
              for (const p of purchases) {
                const item = itemById.get(p.item_id);
                if (item) titleMap.set(p.user_id, { name: item.name, icon: item.icon });
              }
            }
          }

          if (profiles) {
            const profileMap = new Map(
              profiles.map((profile) => [
                profile.id,
                {
                  id: profile.id,
                  username: profile.username || "Player",
                  crown_score: profile.crown_score || 1200,
                  avatar_url: profile.avatar_url || null,
                  equippedTitle: titleMap.get(profile.id) || null,
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

        // Calculate clock update
        const now = new Date();
        const nowISO = now.toISOString();
        let updatedWhiteMs = gameData.white_time_ms;
        let updatedBlackMs = gameData.black_time_ms;

        if (gameData.duration_seconds && gameData.last_move_at && updatedWhiteMs != null && updatedBlackMs != null) {
          const elapsed = now.getTime() - new Date(gameData.last_move_at).getTime();
          const incrementMs = (gameData.increment_seconds ?? 0) * 1000;

          if (playerColor === "w") {
            updatedWhiteMs = Math.max(0, updatedWhiteMs - elapsed) + incrementMs;
          } else {
            updatedBlackMs = Math.max(0, updatedBlackMs - elapsed) + incrementMs;
          }
        }

        setGame(gameCopy);
        setGameData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            current_fen: gameCopy.fen(),
            moves: [...(prev.moves || []), { from, to, san: move.san, promotion }],
            white_time_ms: updatedWhiteMs,
            black_time_ms: updatedBlackMs,
            last_move_at: nowISO,
          };
        });

        // Determine game result
        let resultType = "in_progress";
        let winnerId: string | null = null;
        let endedAt: string | null = null;

        if (gameCopy.isCheckmate()) {
          resultType = "checkmate";
          winnerId = user.id;
          endedAt = nowISO;
        } else if (gameCopy.isStalemate()) {
          resultType = "stalemate";
          endedAt = nowISO;
        } else if (gameCopy.isDraw()) {
          resultType = "draw";
          endedAt = nowISO;
        }

        // Check if player ran out of time
        if (updatedWhiteMs != null && updatedWhiteMs <= 0 && playerColor === "w") {
          resultType = "timeout";
          winnerId = gameData.player_black;
          endedAt = nowISO;
        } else if (updatedBlackMs != null && updatedBlackMs <= 0 && playerColor === "b") {
          resultType = "timeout";
          winnerId = gameData.player_white;
          endedAt = nowISO;
        }

        const newMoves = [...previousMoves, { from, to, san: move.san, promotion }];

        const { error } = await supabase
          .from("games")
          .update({
            current_fen: gameCopy.fen(),
            moves: newMoves as any,
            result_type: resultType,
            winner_id: winnerId,
            ended_at: endedAt,
            pgn: gameCopy.pgn(),
            white_time_ms: updatedWhiteMs,
            black_time_ms: updatedBlackMs,
            last_move_at: nowISO,
          } as any)
          .eq("id", gameData.id);

        if (error) throw error;

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

  const claimTimeout = useCallback(async () => {
    if (!gameData || !user) return;
    // Only claim if game is still in progress
    if (gameData.result_type !== "in_progress") return;
    
    const now = new Date();
    const gd = gameData as any;
    if (gd.white_time_ms == null || gd.black_time_ms == null || !gd.last_move_at) return;

    const elapsed = now.getTime() - new Date(gd.last_move_at).getTime();
    const game = new Chess(gameData.current_fen);
    const activeTurn = game.turn();
    
    const activeTimeMs = activeTurn === "w" ? gd.white_time_ms : gd.black_time_ms;
    const remaining = activeTimeMs - elapsed;

    // Only allow claiming if opponent's clock is at 0
    const opponentColor = gameData.player_white === user.id ? "b" : "w";
    if (activeTurn !== opponentColor || remaining > 0) return;

    await supabase
      .from("games")
      .update({
        result_type: "timeout",
        winner_id: user.id,
        ended_at: now.toISOString(),
        white_time_ms: activeTurn === "w" ? 0 : gd.white_time_ms,
        black_time_ms: activeTurn === "b" ? 0 : gd.black_time_ms,
      } as any)
      .eq("id", gameData.id);
  }, [gameData, user]);

  const acceptDraw = useCallback(async () => {
    if (!gameData || !user) return;
    if (gameData.result_type !== "in_progress") return;
    await supabase
      .from("games")
      .update({
        result_type: "draw",
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
    claimTimeout,
    playerName: user
      ? (playerColor === "w" ? whitePlayer?.username : blackPlayer?.username) || "You"
      : "You",
    opponentName: playerColor === "w" ? blackPlayer?.username || "Opponent" : whitePlayer?.username || "Opponent",
    isMyTurn: game ? game.turn() === playerColor : false,
    isGameOver: gameData?.result_type !== "in_progress" && gameData?.result_type !== "pending",
  };
};
