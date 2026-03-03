import { useState, useEffect, useCallback, useRef } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

export const useMatchmaking = () => {
  const { user } = useAuth();
  const [state, setState] = useState<MatchState>("idle");
  const [gameId, setGameId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [challengeStatus, setChallengeStatus] = useState<ChallengeStatus>("idle");
  const [challengeTargetId, setChallengeTargetId] = useState<string | null>(null);
  const [queueScope, setQueueScope] = useState<QueueScope>(null);
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

  const attachRealtimeGameListener = useCallback((
    durationSeconds: number | null,
    timeControlMode: "none" | "fischer" | "delay" | "bronstein",
    incrementMs: number,
    delayMs: number,
  ) => {
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
            time_control_mode: "none" | "fischer" | "delay" | "bronstein";
            increment_ms: number;
            delay_ms: number;
          };

          const joined = row.player1_id === user.id || row.player2_id === user.id;
          const durationMatch = durationSeconds === null
            ? row.duration_seconds === null
            : row.duration_seconds === durationSeconds;
          const tcMatch = row.time_control_mode === timeControlMode && row.increment_ms === incrementMs && row.delay_ms === delayMs;

          if (joined && row.result_type === "in_progress" && durationMatch && tcMatch) {
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
      if (games && games.length > 0) {
        setState("matched");
        setGameId(games[0].id);
        clearSearchState();
      }
    }, 3000);
  }, [clearSearchState, user]);

  const startSearch = useCallback(async (
    gameMode = "quick_play",
    durationSeconds: number | null = null,
    options: MatchmakingOptions = {},
  ) => {
    if (!user) return;

    setState("searching");
    setError(null);
    setGameId(null);
    if (options.targetPlayerId) {
      setChallengeStatus("pending");
      setChallengeTargetId(options.targetPlayerId);
    } else {
      setChallengeStatus("idle");
      setChallengeTargetId(null);
    }

    try {
      const timeControlMode = options.timeControlMode ?? (durationSeconds ? "fischer" : "none");
      const incrementMs = options.incrementMs ?? 0;
      const delayMs = options.delayMs ?? 0;
      attachRealtimeGameListener(durationSeconds, timeControlMode, incrementMs, delayMs);

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

      if (data?.matched && data?.game?.id) {
        setState("matched");
        setGameId(data.game.id);
        if (options.targetPlayerId) setChallengeStatus("accepted");
        clearSearchState();
      } else if (options.targetPlayerId && data?.challenge_pending) {
        setChallengeStatus("pending");
        setQueueScope((data?.queue_scope as QueueScope) ?? "local");
      } else if (data?.queued) {
        setQueueScope((data?.queue_scope as QueueScope) ?? "local");
      }
    } catch (err: unknown) {
      clearSearchState();
      setState("error");
      setError(err instanceof Error ? err.message : "Matchmaking failed");
      if (options.targetPlayerId) setChallengeStatus("expired");
    }
  }, [attachRealtimeGameListener, clearSearchState, user]);

  const cancelSearch = useCallback(async () => {
    if (!user) return;

    clearSearchState();
    await supabase.from("matchmaking_queue").delete().eq("player_id", user.id);
    setState("idle");
    setGameId(null);
    setError(null);
    setChallengeStatus("idle");
    setChallengeTargetId(null);
    setQueueScope(null);
  }, [clearSearchState, user]);

  useEffect(() => {
    return () => {
      clearSearchState();
    };
  }, [clearSearchState]);

  return { state, gameId, error, challengeStatus, challengeTargetId, queueScope, startSearch, cancelSearch };
};
