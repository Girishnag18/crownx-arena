import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type QueueRow = {
  player_id: string;
  rating: number;
  region: string | null;
  created_at: string;
  matching_scope?: "local" | "global";
  target_player_id?: string | null;
  challenge_expires_at?: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const userClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const gameMode = body?.game_mode ?? "quick_play";
    const durationSeconds = body?.duration_seconds ?? null;
    const timeControlMode = body?.time_control_mode ?? (durationSeconds ? "fischer" : "none");
    const incrementMs = Number(body?.increment_ms ?? 0);
    const delayMs = Number(body?.delay_ms ?? 0);
    const preferLocalRegion = !!body?.prefer_local_region;
    const targetPlayerIdRaw = body?.target_player_id;
    const targetPlayerId = typeof targetPlayerIdRaw === "string" && targetPlayerIdRaw.length > 0
      ? targetPlayerIdRaw
      : null;

    const allowedModes = new Set(["quick_play", "world_arena"]);
    const allowedDurations = new Set([600, 900, 1200, 1800]);

    if (!allowedModes.has(gameMode)) {
      return new Response(JSON.stringify({ error: "Invalid game_mode" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (durationSeconds !== null && !allowedDurations.has(durationSeconds)) {
      return new Response(JSON.stringify({ error: "Invalid duration_seconds" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allowedTimeControlModes = new Set(["none", "fischer", "delay", "bronstein"]);
    if (!allowedTimeControlModes.has(timeControlMode)) {
      return new Response(JSON.stringify({ error: "Invalid time_control_mode" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Number.isFinite(incrementMs) || incrementMs < 0 || incrementMs > 60_000) {
      return new Response(JSON.stringify({ error: "Invalid increment_ms" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Number.isFinite(delayMs) || delayMs < 0 || delayMs > 60_000) {
      return new Response(JSON.stringify({ error: "Invalid delay_ms" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (targetPlayerId && targetPlayerId === user.id) {
      return new Response(JSON.stringify({ error: "Cannot challenge yourself" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: searchAllowed } = await supabase.rpc("enforce_action_rate_limit", {
      p_user_id: user.id,
      p_action_key: "queue_search",
      p_window_seconds: 30,
      p_max_count: 20,
    });

    if (searchAllowed === false) {
      return new Response(JSON.stringify({ error: "Too many queue attempts. Slow down briefly." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (targetPlayerId) {
      const { data: challengeAllowed } = await supabase.rpc("enforce_action_rate_limit", {
        p_user_id: user.id,
        p_action_key: "challenge_send",
        p_window_seconds: 60,
        p_max_count: 8,
      });

      if (challengeAllowed === false) {
        return new Response(JSON.stringify({ error: "Challenge rate limit reached. Try again in a minute." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    await supabase.rpc("cleanup_matchmaking_artifacts");

    const { data: profile } = await supabase
      .from("profiles")
      .select("crown_score, country")
      .eq("id", user.id)
      .single();

    const playerRating = profile?.crown_score || 1200;
    const playerRegion = profile?.country || null;

    const { data: existingQueue } = await supabase
      .from("matchmaking_queue")
      .select("search_started_at, matching_scope")
      .eq("player_id", user.id)
      .maybeSingle();

    const searchStartedAt = existingQueue?.search_started_at
      ? new Date(existingQueue.search_started_at).getTime()
      : Date.now();
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - searchStartedAt) / 1000));
    const myScope: "local" | "global" = elapsedSeconds >= 40 ? "global" : "local";

    const nowIso = new Date().toISOString();

    const logEvent = async (eventName: string, payload: Record<string, unknown>) => {
      await supabase.from("arena_events").insert({
        user_id: user.id,
        event_name: eventName,
        payload,
      });
    };

    const buildCandidatesQuery = (regionFilter: string | null, onlyTarget: string | null = null) => {
      let query = supabase
        .from("matchmaking_queue")
        .select("player_id, rating, region, created_at, matching_scope, target_player_id, challenge_expires_at")
        .eq("game_mode", gameMode)
        .neq("player_id", user.id)
        .gte("rating", playerRating - 250)
        .lte("rating", playerRating + 250)
        .in("queue_state", ["queued_local", "queued_global"])
        .or(`target_player_id.is.null,challenge_expires_at.gt.${nowIso}`)
        .order("created_at", { ascending: true })
        .limit(8);

      query = durationSeconds === null ? query.is("duration_seconds", null) : query.eq("duration_seconds", durationSeconds);
      query = query.eq("time_control_mode", timeControlMode).eq("increment_ms", incrementMs).eq("delay_ms", delayMs);

      if (onlyTarget) {
        query = query.eq("player_id", onlyTarget);
      }

      if (regionFilter) {
        query = query.eq("region", regionFilter);
      }

      if (myScope === "local") {
        query = query.in("matching_scope", ["local", "global"]);
      }

      return query;
    };

    let selectedOpponent: QueueRow | null = null;

    // 1) Incoming targeted challenge for me has highest priority.
    {
      let incomingQuery = supabase
        .from("matchmaking_queue")
        .select("player_id, rating, region, created_at, matching_scope, target_player_id, challenge_expires_at")
        .eq("game_mode", gameMode)
        .eq("target_player_id", user.id)
        .gt("challenge_expires_at", nowIso)
        .neq("player_id", user.id)
        .in("queue_state", ["queued_local", "queued_global"])
        .order("created_at", { ascending: true })
        .limit(1);

      incomingQuery = durationSeconds === null
        ? incomingQuery.is("duration_seconds", null)
        : incomingQuery.eq("duration_seconds", durationSeconds);
      incomingQuery = incomingQuery
        .eq("time_control_mode", timeControlMode)
        .eq("increment_ms", incrementMs)
        .eq("delay_ms", delayMs);

      const { data: incoming } = await incomingQuery;
      if (incoming && incoming.length > 0) {
        selectedOpponent = incoming[0] as QueueRow;
      }
    }

    // 2) If I challenged specific target, try direct first.
    if (!selectedOpponent && targetPlayerId) {
      const { data: targeted } = await buildCandidatesQuery(null, targetPlayerId);
      if (targeted && targeted.length > 0) {
        selectedOpponent = targeted[0] as QueueRow;
      }
    }

    // 3) Normal matching: local-preferred then global fallback.
    if (!selectedOpponent) {
      if (preferLocalRegion && playerRegion) {
        const { data: local } = await buildCandidatesQuery(playerRegion);
        if (local && local.length > 0) {
          selectedOpponent = local[0] as QueueRow;
        }
      }

      if (!selectedOpponent) {
        const { data: global } = await buildCandidatesQuery(null);
        if (global && global.length > 0) {
          selectedOpponent = global[0] as QueueRow;
        }
      }
    }

    if (selectedOpponent) {
      const isWhite = Math.random() > 0.5;
      const whiteId = isWhite ? user.id : selectedOpponent.player_id;
      const blackId = isWhite ? selectedOpponent.player_id : user.id;

      const { data: game, error: gameError } = await supabase
        .from("games")
        .insert({
          player1_id: whiteId,
          player2_id: blackId,
          player_white: whiteId,
          player_black: blackId,
          game_mode: gameMode,
          result_type: "in_progress",
          current_fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
          moves: [],
          duration_seconds: durationSeconds,
          clock_white_ms: durationSeconds ? durationSeconds * 1000 : null,
          clock_black_ms: durationSeconds ? durationSeconds * 1000 : null,
          increment_ms: incrementMs,
          delay_ms: delayMs,
          time_control_mode: timeControlMode,
          clock_last_move_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (gameError) {
        return new Response(JSON.stringify({ error: gameError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("matchmaking_queue").delete().eq("player_id", selectedOpponent.player_id);
      await supabase.from("matchmaking_queue").delete().eq("player_id", user.id);

      await supabase
        .from("arena_challenges")
        .update({ status: "accepted", accepted_at: new Date().toISOString(), matched_game_id: game.id })
        .in("challenger_id", [user.id, selectedOpponent.player_id])
        .in("target_player_id", [user.id, selectedOpponent.player_id])
        .eq("status", "pending");

      await logEvent("match_found", {
        game_id: game.id,
        game_mode: gameMode,
        duration_seconds: durationSeconds,
        scope: myScope,
        target_player_id: targetPlayerId,
      });

      await supabase.rpc("refresh_live_games_feed");

      return new Response(JSON.stringify({ matched: true, game }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // No match found -> upsert queue row and optional challenge lifecycle row.
    const challengeExpiresAt = targetPlayerId ? new Date(Date.now() + 2 * 60 * 1000).toISOString() : null;

    const { error: queueError } = await supabase
      .from("matchmaking_queue")
      .upsert(
        {
          player_id: user.id,
          game_mode: gameMode,
          rating: playerRating,
          region: playerRegion,
          duration_seconds: durationSeconds,
          time_control_mode: timeControlMode,
          increment_ms: incrementMs,
          delay_ms: delayMs,
          target_player_id: targetPlayerId,
          challenge_expires_at: challengeExpiresAt,
          queue_state: myScope === "global" ? "queued_global" : "queued_local",
          matching_scope: myScope,
          search_started_at: new Date(searchStartedAt).toISOString(),
        },
        { onConflict: "player_id" },
      );

    if (queueError) {
      return new Response(JSON.stringify({ error: queueError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.rpc("transition_queue_state", { p_player_id: user.id });

    if (targetPlayerId) {
      await supabase
        .from("arena_challenges")
        .update({ status: "expired", expired_at: new Date().toISOString() })
        .eq("challenger_id", user.id)
        .eq("status", "pending")
        .neq("target_player_id", targetPlayerId);

      await supabase.from("arena_challenges").insert({
        challenger_id: user.id,
        target_player_id: targetPlayerId,
        game_mode: gameMode,
        duration_seconds: durationSeconds,
        status: "pending",
        metadata: { scope: myScope },
      });
    }

    await logEvent("queue_started", {
        game_mode: gameMode,
        duration_seconds: durationSeconds,
        time_control_mode: timeControlMode,
        increment_ms: incrementMs,
        delay_ms: delayMs,
        scope: myScope,
      target_player_id: targetPlayerId,
      prefer_local_region: preferLocalRegion,
    });

    return new Response(
      JSON.stringify({
        matched: false,
        queued: true,
        queue_scope: myScope,
        challenge_pending: !!targetPlayerId,
        challenge_target: targetPlayerId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
