import { useState, useEffect, useCallback, useRef } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { soundManager } from "@/services/soundManager";

<<<<<<< HEAD
type MatchState = "idle" | "searching" | "matched" | "error";
type MatchmakingOptions = {
  preferLocalRegion?: boolean;
  targetPlayerId?: string | null;
  timeControlMode?: "none" | "fischer" | "delay" | "bronstein";
  incrementMs?: number;
  delayMs?: number;
};
type ChallengeStatus = "idle" | "pending" | "accepted" | "expired";
type QueueScope = "local" | "global" | null;
=======
type MatchState = "idle" | "searching" | "matched" | "error" | "timeout";
>>>>>>> 6124c122ca56d8d3ef82a2f3bf8390aac2ea3aad

export const useMatchmaking = () => {
  const { user } = useAuth();
  const [state, setState] = useState<MatchState>("idle");
  const [gameId, setGameId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
<<<<<<< HEAD
  const [challengeStatus, setChallengeStatus] = useState<ChallengeStatus>("idle");
  const [challengeTargetId, setChallengeTargetId] = useState<string | null>(null);
  const [queueScope, setQueueScope] = useState<QueueScope>(null);
=======
  const [searchElapsed, setSearchElapsed] = useState(0);
>>>>>>> 6124c122ca56d8d3ef82a2f3bf8390aac2ea3aad
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

  const attachRealtimeGameListener = useCallback((
    durationSeconds: number | null,
    timeControlMode: "none" | "fischer" | "delay" | "bronstein",
    incrementMs: number,
    delayMs: number,
  ) => {
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
<<<<<<< HEAD
            id: string;
            player1_id: string;
            player2_id: string | null;
            result_type: string;
            duration_seconds: number | null;
            time_control_mode: "none" | "fischer" | "delay" | "bronstein";
            increment_ms: number;
            delay_ms: number;
=======
            id: string; player1_id: string; player2_id: string | null;
            result_type: string; duration_seconds: number | null;
>>>>>>> 6124c122ca56d8d3ef82a2f3bf8390aac2ea3aad
          };
          const joined = row.player1_id === user.id || row.player2_id === user.id;
<<<<<<< HEAD
          const durationMatch = durationSeconds === null
            ? row.duration_seconds === null
            : row.duration_seconds === durationSeconds;
          const tcMatch = row.time_control_mode === timeControlMode && row.increment_ms === incrementMs && row.delay_ms === delayMs;

          if (joined && row.result_type === "in_progress" && durationMatch && tcMatch) {
=======
          const durationMatch = durationSeconds === null ? row.duration_seconds === null : row.duration_seconds === durationSeconds;
          if (joined && row.result_type === "in_progress" && durationMatch) {
>>>>>>> 6124c122ca56d8d3ef82a2f3bf8390aac2ea3aad
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
      const queryClient = supabase as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            eq: (col: string, value: string | number) => {
              or: (expr: string) => {
                order: (col2: string, opts: { ascending: boolean }) => {
                  limit: (count: number) => {
                    is: (col3: string, value3: null) => {
                      eq: (col4: string, value4: string | number) => {
                        eq: (col5: string, value5: string | number) => {
                          eq: (col6: string, value6: string | number) => Promise<{ data: Array<{ id: string }> | null }>;
                        };
                      };
                    };
                    eq: (col3: string, value3: string | number) => {
                      eq: (col4: string, value4: string | number) => {
                        eq: (col5: string, value5: string | number) => {
                          eq: (col6: string, value6: string | number) => Promise<{ data: Array<{ id: string }> | null }>;
                        };
                      };
                    };
                  };
                };
              };
            };
          };
        };
      };

      const base = queryClient
        .from("games")
        .select("id")
        .eq("result_type", "in_progress")
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(1);

<<<<<<< HEAD
      const { data: games } = durationSeconds === null
        ? await base
            .is("duration_seconds", null)
            .eq("time_control_mode", timeControlMode)
            .eq("increment_ms", incrementMs)
            .eq("delay_ms", delayMs)
        : await base
            .eq("duration_seconds", durationSeconds)
            .eq("time_control_mode", timeControlMode)
            .eq("increment_ms", incrementMs)
            .eq("delay_ms", delayMs);
=======
      if (searchStartedAt.current) {
        gamesQuery = gamesQuery.gte("created_at", searchStartedAt.current);
      }

      gamesQuery = durationSeconds === null
        ? gamesQuery.is("duration_seconds", null)
        : gamesQuery.eq("duration_seconds", durationSeconds);

      const { data: games } = await gamesQuery;
>>>>>>> 6124c122ca56d8d3ef82a2f3bf8390aac2ea3aad
      if (games && games.length > 0) {
        setState("matched");
        setGameId(games[0].id);
        soundManager.play("matchFound");
        clearSearchState();
      }
    }, 3000);
  }, [clearSearchState, user]);

<<<<<<< HEAD
  const startSearch = useCallback(async (
    gameMode = "quick_play",
    durationSeconds: number | null = null,
    options: MatchmakingOptions = {},
  ) => {
=======
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
>>>>>>> 6124c122ca56d8d3ef82a2f3bf8390aac2ea3aad
    if (!user) return;

    lastSearchArgs.current = { gameMode, durationSeconds, incrementSeconds };
    searchStartedAt.current = new Date().toISOString();
    setState("searching");
    setError(null);
    setGameId(null);
<<<<<<< HEAD
    if (options.targetPlayerId) {
      setChallengeStatus("pending");
      setChallengeTargetId(options.targetPlayerId);
    } else {
      setChallengeStatus("idle");
      setChallengeTargetId(null);
    }
=======
    setSearchElapsed(0);
>>>>>>> 6124c122ca56d8d3ef82a2f3bf8390aac2ea3aad

    try {
      const timeControlMode = options.timeControlMode ?? (durationSeconds ? "fischer" : "none");
      const incrementMs = options.incrementMs ?? 0;
      const delayMs = options.delayMs ?? 0;
      attachRealtimeGameListener(durationSeconds, timeControlMode, incrementMs, delayMs);

<<<<<<< HEAD
      const { data, error: fnError } = await supabase.functions.invoke("matchmake", {
        body: {
          game_mode: gameMode,
          duration_seconds: durationSeconds,
          prefer_local_region: !!options.preferLocalRegion,
          target_player_id: options.targetPlayerId ?? null,
          time_control_mode: timeControlMode,
          increment_ms: incrementMs,
          delay_ms: delayMs,
        },
      });

      if (fnError) throw fnError;
=======
      // Elapsed timer
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setSearchElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
>>>>>>> 6124c122ca56d8d3ef82a2f3bf8390aac2ea3aad

      // Initial search with default 200 range
      const data = await invokeMatchmake(gameMode, durationSeconds, incrementSeconds);
      if (data?.matched && data?.game?.id) {
        setState("matched");
        setGameId(data.game.id);
<<<<<<< HEAD
        if (options.targetPlayerId) setChallengeStatus("accepted");
        clearSearchState();
      } else if (options.targetPlayerId && data?.challenge_pending) {
        setChallengeStatus("pending");
        setQueueScope((data?.queue_scope as QueueScope) ?? "local");
      } else if (data?.queued) {
        setQueueScope((data?.queue_scope as QueueScope) ?? "local");
=======
        soundManager.play("matchFound");
        clearSearchState();
        return;
>>>>>>> 6124c122ca56d8d3ef82a2f3bf8390aac2ea3aad
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
      if (options.targetPlayerId) setChallengeStatus("expired");
    }
  }, [attachRealtimeGameListener, clearSearchState, user, invokeMatchmake]);

  const cancelSearch = useCallback(async () => {
    if (!user) return;
    clearSearchState();
    await supabase.from("matchmaking_queue").delete().eq("player_id", user.id);
    setState("idle");
    setGameId(null);
    setError(null);
<<<<<<< HEAD
    setChallengeStatus("idle");
    setChallengeTargetId(null);
    setQueueScope(null);
=======
    setSearchElapsed(0);
>>>>>>> 6124c122ca56d8d3ef82a2f3bf8390aac2ea3aad
  }, [clearSearchState, user]);

  const retrySearch = useCallback(() => {
    if (!lastSearchArgs.current) return;
    const { gameMode, durationSeconds, incrementSeconds } = lastSearchArgs.current;
    startSearch(gameMode, durationSeconds, incrementSeconds);
  }, [startSearch]);

  useEffect(() => {
    return () => { clearSearchState(); };
  }, [clearSearchState]);

<<<<<<< HEAD
  return { state, gameId, error, challengeStatus, challengeTargetId, queueScope, startSearch, cancelSearch };
=======
  return { state, gameId, error, searchElapsed, startSearch, cancelSearch, retrySearch };
>>>>>>> 6124c122ca56d8d3ef82a2f3bf8390aac2ea3aad
};
