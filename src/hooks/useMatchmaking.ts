import { useState, useEffect, useCallback, useRef } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type MatchState = "idle" | "searching" | "matched" | "error";

export const useMatchmaking = () => {
  const { user } = useAuth();
  const [state, setState] = useState<MatchState>("idle");
  const [gameId, setGameId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameSubscriptionRef = useRef<RealtimeChannel | null>(null);

  const clearSearchState = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (gameSubscriptionRef.current) {
      supabase.removeChannel(gameSubscriptionRef.current);
      gameSubscriptionRef.current = null;
    }
  }, []);

  const attachRealtimeGameListener = useCallback((durationSeconds: number | null) => {
    if (!user) return;

    clearSearchState();

    const channel = supabase
      .channel(`matchmaking-games-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "games",
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            player1_id: string;
            player2_id: string | null;
            result_type: string;
            duration_seconds: number | null;
          };

          const joined = row.player1_id === user.id || row.player2_id === user.id;
          const durationMatch = durationSeconds === null
            ? row.duration_seconds === null
            : row.duration_seconds === durationSeconds;

          if (joined && row.result_type === "in_progress" && durationMatch) {
            setState("matched");
            setGameId(row.id);
            clearSearchState();
          }
        },
      )
      .subscribe();

    gameSubscriptionRef.current = channel;

    // Fallback polling for environments where realtime is delayed.
    pollRef.current = setInterval(async () => {
      let gamesQuery = supabase
        .from("games")
        .select("id")
        .eq("result_type", "in_progress")
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(1);

      gamesQuery = durationSeconds === null
        ? gamesQuery.is("duration_seconds", null)
        : gamesQuery.eq("duration_seconds", durationSeconds);

      const { data: games } = await gamesQuery;
      if (games && games.length > 0) {
        setState("matched");
        setGameId(games[0].id);
        clearSearchState();
      }
    }, 3000);
  }, [clearSearchState, user]);

  const startSearch = useCallback(async (gameMode = "quick_play", durationSeconds: number | null = null) => {
    if (!user) return;

    setState("searching");
    setError(null);
    setGameId(null);

    try {
      attachRealtimeGameListener(durationSeconds);

      const { data, error: fnError } = await supabase.functions.invoke("matchmake", {
        body: { game_mode: gameMode, duration_seconds: durationSeconds },
      });

      if (fnError) throw fnError;

      if (data?.matched && data?.game?.id) {
        setState("matched");
        setGameId(data.game.id);
        clearSearchState();
      }
    } catch (err: unknown) {
      clearSearchState();
      setState("error");
      setError(err instanceof Error ? err.message : "Matchmaking failed");
    }
  }, [attachRealtimeGameListener, clearSearchState, user]);

  const cancelSearch = useCallback(async () => {
    if (!user) return;

    clearSearchState();
    await supabase.from("matchmaking_queue").delete().eq("player_id", user.id);
    setState("idle");
    setGameId(null);
    setError(null);
  }, [clearSearchState, user]);

  useEffect(() => {
    return () => {
      clearSearchState();
    };
  }, [clearSearchState]);

  return { state, gameId, error, startSearch, cancelSearch };
};
