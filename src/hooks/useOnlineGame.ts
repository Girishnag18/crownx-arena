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
}

interface PlayerSummary {
  id: string;
  username: string;
  crown_score: number;
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
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, username, crown_score")
            .in("id", playerIds);

          if (profiles) {
            const profileMap = new Map(
              profiles.map((profile) => [
                profile.id,
                {
                  id: profile.id,
                  username: profile.username || "Player",
                  crown_score: profile.crown_score || 1200,
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
            .select("id, username, crown_score")
            .in("id", playerIds);

          if (!profiles) return;

          const profileMap = new Map(
            profiles.map((profile) => [
              profile.id,
              {
                id: profile.id,
                username: profile.username || "Player",
                crown_score: profile.crown_score || 1200,
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
        setGame(gameCopy);
        setGameData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            current_fen: gameCopy.fen(),
            moves: [...(prev.moves || []), { from, to, san: move.san, promotion }],
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
          })
          .eq("id", gameData.id);

        if (error) throw error;

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
    playerName: user
      ? (playerColor === "w" ? whitePlayer?.username : blackPlayer?.username) || "You"
      : "You",
    opponentName: playerColor === "w" ? blackPlayer?.username || "Opponent" : whitePlayer?.username || "Opponent",
    isMyTurn: game ? game.turn() === playerColor : false,
    isGameOver: gameData?.result_type !== "in_progress" && gameData?.result_type !== "pending",
  };
};
