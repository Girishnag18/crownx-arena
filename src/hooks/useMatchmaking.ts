import { useState, useEffect, useCallback, useRef } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { soundManager } from "@/services/soundManager";

type MatchState = "idle" | "searching" | "matched" | "error" | "timeout";

export const useMatchmaking = () => {
  const { user } = useAuth();
  const [state, setState] = useState<MatchState>("idle");
  const [gameId, setGameId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchElapsed, setSearchElapsed] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameSubscriptionRef = useRef<RealtimeChannel | null>(null);
  const searchStartedAt = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expandRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSearchArgs = useRef<{ gameMode: string; durationSeconds: number | null; incrementSeconds: number | null } | null>(null);

  const clearSearchState = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (gameSubscriptionRef.current) { supabase.removeChannel(gameSubscriptionRef.current); gameSubscriptionRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (expandRef.current) { clearTimeout(expandRef.current); expandRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  }, []);

  const attachRealtimeGameListener = useCallback((durationSeconds: number | null) => {
    if (!user) return;

    // Clear previous subscription & polling only
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (gameSubscriptionRef.current) { supabase.removeChannel(gameSubscriptionRef.current); gameSubscriptionRef.current = null; }

    const channel = supabase
      .channel(`matchmaking-games-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "games" },
        (payload) => {
          const row = payload.new as {
            id: string; player1_id: string; player2_id: string | null;
            result_type: string; duration_seconds: number | null;
          };
          const joined = row.player1_id === user.id || row.player2_id === user.id;
          const durationMatch = durationSeconds === null ? row.duration_seconds === null : row.duration_seconds === durationSeconds;
          if (joined && row.result_type === "in_progress" && durationMatch) {
            setState("matched");
            setGameId(row.id);
            soundManager.play("matchFound");
            clearSearchState();
          }
        },
      )
      .subscribe();

    gameSubscriptionRef.current = channel;

    pollRef.current = setInterval(async () => {
      let gamesQuery = supabase
        .from("games")
        .select("id")
        .eq("result_type", "in_progress")
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(1);

      if (searchStartedAt.current) {
        gamesQuery = gamesQuery.gte("created_at", searchStartedAt.current);
      }

      gamesQuery = durationSeconds === null
        ? gamesQuery.is("duration_seconds", null)
        : gamesQuery.eq("duration_seconds", durationSeconds);

      const { data: games } = await gamesQuery;
      if (games && games.length > 0) {
        setState("matched");
        setGameId(games[0].id);
        soundManager.play("matchFound");
        clearSearchState();
      }
    }, 3000);
  }, [clearSearchState, user]);

  const invokeMatchmake = useCallback(async (gameMode: string, durationSeconds: number | null, incrementSeconds: number | null, ratingRange?: number) => {
    const body: Record<string, unknown> = {
      game_mode: gameMode,
      duration_seconds: durationSeconds,
      increment_seconds: incrementSeconds,
    };
    if (ratingRange) body.rating_range = ratingRange;

    const { data, error: fnError } = await supabase.functions.invoke("matchmake", { body });
    if (fnError) throw fnError;
    return data;
  }, []);

  const startSearch = useCallback(async (gameMode = "quick_play", durationSeconds: number | null = null, incrementSeconds: number | null = null) => {
    if (!user) return;

    lastSearchArgs.current = { gameMode, durationSeconds, incrementSeconds };
    searchStartedAt.current = new Date().toISOString();
    setState("searching");
    setError(null);
    setGameId(null);
    setSearchElapsed(0);

    try {
      attachRealtimeGameListener(durationSeconds);

      // Elapsed timer
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setSearchElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      // Initial search with default 200 range
      const data = await invokeMatchmake(gameMode, durationSeconds, incrementSeconds);
      if (data?.matched && data?.game?.id) {
        setState("matched");
        setGameId(data.game.id);
        soundManager.play("matchFound");
        clearSearchState();
        return;
      }

      // After 15s, widen to 500
      expandRef.current = setTimeout(async () => {
        soundManager.play("rangeExpand");
        try {
          const d2 = await invokeMatchmake(gameMode, durationSeconds, incrementSeconds, 500);
          if (d2?.matched && d2?.game?.id) {
            setState("matched");
            setGameId(d2.game.id);
            soundManager.play("matchFound");
            clearSearchState();
          }
        } catch { /* polling will catch it */ }
      }, 15000);

      // After 30s, timeout
      timeoutRef.current = setTimeout(() => {
        // Only timeout if still searching
        setState((prev) => {
          if (prev === "searching") {
            clearSearchState();
            soundManager.play("searchTimeout");
            supabase.from("matchmaking_queue").delete().eq("player_id", user.id);
            return "timeout";
          }
          return prev;
        });
      }, 30000);

    } catch (err: unknown) {
      clearSearchState();
      setState("error");
      setError(err instanceof Error ? err.message : "Matchmaking failed");
    }
  }, [attachRealtimeGameListener, clearSearchState, user, invokeMatchmake]);

  const cancelSearch = useCallback(async () => {
    if (!user) return;
    clearSearchState();
    await supabase.from("matchmaking_queue").delete().eq("player_id", user.id);
    setState("idle");
    setGameId(null);
    setError(null);
    setSearchElapsed(0);
  }, [clearSearchState, user]);

  const retrySearch = useCallback(() => {
    if (!lastSearchArgs.current) return;
    const { gameMode, durationSeconds, incrementSeconds } = lastSearchArgs.current;
    startSearch(gameMode, durationSeconds, incrementSeconds);
  }, [startSearch]);

  useEffect(() => {
    return () => { clearSearchState(); };
  }, [clearSearchState]);

  return { state, gameId, error, searchElapsed, startSearch, cancelSearch, retrySearch };
};
