import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const usePrivateRoom = () => {
  const { user } = useAuth();
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "waiting" | "joined" | "ready">("idle");
  const [error, setError] = useState<string | null>(null);

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  const createRoom = useCallback(async () => {
    if (!user) return;
    setError(null);
    const code = generateCode();

    const { data, error: err } = await supabase
      .from("game_rooms")
      .insert({ room_code: code, host_id: user.id })
      .select()
      .single();

    if (err) {
      setError(err.message);
      return;
    }

    setRoomCode(code);
    setRoomId(data.id);
    setStatus("waiting");
  }, [user]);

  const joinRoom = useCallback(async (code: string) => {
    if (!user) return;
    setError(null);

    const { data: room, error: fetchErr } = await supabase
      .from("game_rooms")
      .select("*")
      .eq("room_code", code.toUpperCase())
      .eq("status", "waiting")
      .single();

    if (fetchErr || !room) {
      setError("Room not found or already full");
      return;
    }

    if (room.host_id === user.id) {
      setError("You can't join your own room");
      return;
    }

    // Create game
    const isWhite = Math.random() > 0.5;
    const whiteId = isWhite ? room.host_id : user.id;
    const blackId = isWhite ? user.id : room.host_id;

    const { data: game, error: gameErr } = await supabase
      .from("games")
      .insert({
        player1_id: whiteId,
        player2_id: blackId,
        player_white: whiteId,
        player_black: blackId,
        game_mode: "private",
        result_type: "in_progress",
        current_fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        moves: [],
      })
      .select()
      .single();

    if (gameErr || !game) {
      setError("Failed to create game");
      return;
    }

    await supabase
      .from("game_rooms")
      .update({ guest_id: user.id, game_id: game.id, status: "playing" })
      .eq("id", room.id);

    setGameId(game.id);
    setStatus("ready");
  }, [user]);

  // Listen for room updates (host waiting for guest)
  useEffect(() => {
    if (!roomId || status !== "waiting") return;

    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const updated = payload.new as any;
          if (updated.status === "playing" && updated.game_id) {
            setGameId(updated.game_id);
            setStatus("ready");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, status]);

  const reset = useCallback(() => {
    setRoomCode(null);
    setRoomId(null);
    setGameId(null);
    setStatus("idle");
    setError(null);
  }, []);

  return { roomCode, gameId, status, error, createRoom, joinRoom, reset };
};
