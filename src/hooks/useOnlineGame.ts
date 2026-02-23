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

export const useOnlineGame = (gameId: string | null) => {
  const { user } = useAuth();
  const [game, setGame] = useState<Chess | null>(null);
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [playerColor, setPlayerColor] = useState<"w" | "b" | null>(null);
  const [opponentName, setOpponentName] = useState<string>("Opponent");
  const [loading, setLoading] = useState(true);

  // Load game data
  useEffect(() => {
    if (!gameId || !user) return;

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

        // Get opponent name
        const opponentId = gd.player_white === user.id ? gd.player_black : gd.player_white;
        if (opponentId) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", opponentId)
            .single();
          if (profile?.username) setOpponentName(profile.username);
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, user]);

  const makeMove = useCallback(
    async (from: Square, to: Square, promotion?: string) => {
      if (!game || !gameData || !user || !playerColor) return false;

      // Check if it's the player's turn
      if (game.turn() !== playerColor) return false;

      const gameCopy = new Chess(game.fen());
      try {
        const move = gameCopy.move({ from, to, promotion: promotion || undefined });
        if (!move) return false;

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

        const newMoves = [...(gameData.moves || []), { from, to, san: move.san, promotion }];

        await supabase
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

        return true;
      } catch {
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
    opponentName,
    loading,
    makeMove,
    resign,
    isMyTurn: game ? game.turn() === playerColor : false,
    isGameOver: gameData?.result_type !== "in_progress" && gameData?.result_type !== "pending",
  };
};
