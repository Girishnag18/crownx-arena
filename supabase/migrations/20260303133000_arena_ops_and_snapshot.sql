-- 1) Queue/search state machine and challenge lifecycle storage
ALTER TABLE public.matchmaking_queue
  ADD COLUMN IF NOT EXISTS queue_state TEXT NOT NULL DEFAULT 'queued_local' CHECK (queue_state IN ('queued_local','queued_global','matched','expired')),
  ADD COLUMN IF NOT EXISTS matching_scope TEXT NOT NULL DEFAULT 'local' CHECK (matching_scope IN ('local','global')),
  ADD COLUMN IF NOT EXISTS search_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS expanded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_ping_ms INTEGER;

CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_state_scope ON public.matchmaking_queue(game_mode, queue_state, matching_scope);
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_search_started ON public.matchmaking_queue(search_started_at);

CREATE TABLE IF NOT EXISTS public.arena_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_mode TEXT NOT NULL DEFAULT 'world_arena' CHECK (game_mode IN ('quick_play','world_arena')),
  duration_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired','cancelled','rejected')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  matched_game_id UUID REFERENCES public.games(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_arena_challenges_target_status ON public.arena_challenges(target_player_id, status, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_arena_challenges_challenger_status ON public.arena_challenges(challenger_id, status, sent_at DESC);

ALTER TABLE public.arena_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own challenges" ON public.arena_challenges;
CREATE POLICY "Users can read own challenges"
ON public.arena_challenges
FOR SELECT
USING (auth.uid() = challenger_id OR auth.uid() = target_player_id);

DROP POLICY IF EXISTS "Users can create own challenges" ON public.arena_challenges;
CREATE POLICY "Users can create own challenges"
ON public.arena_challenges
FOR INSERT
WITH CHECK (auth.uid() = challenger_id);

DROP POLICY IF EXISTS "Service role can update challenges" ON public.arena_challenges;
CREATE POLICY "Service role can update challenges"
ON public.arena_challenges
FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 2) Rate limit primitives
CREATE TABLE IF NOT EXISTS public.action_rate_limits (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_key TEXT NOT NULL,
  window_started_at TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, action_key)
);

ALTER TABLE public.action_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages rate limits" ON public.action_rate_limits;
CREATE POLICY "Service role manages rate limits"
ON public.action_rate_limits
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.enforce_action_rate_limit(
  p_user_id UUID,
  p_action_key TEXT,
  p_window_seconds INTEGER,
  p_max_count INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_window_start TIMESTAMPTZ := v_now - make_interval(secs => p_window_seconds);
  v_row RECORD;
BEGIN
  SELECT * INTO v_row
  FROM public.action_rate_limits
  WHERE user_id = p_user_id AND action_key = p_action_key
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.action_rate_limits (user_id, action_key, window_started_at, count, updated_at)
    VALUES (p_user_id, p_action_key, v_now, 1, v_now);
    RETURN true;
  END IF;

  IF v_row.window_started_at < v_window_start THEN
    UPDATE public.action_rate_limits
    SET window_started_at = v_now,
        count = 1,
        updated_at = v_now
    WHERE user_id = p_user_id AND action_key = p_action_key;
    RETURN true;
  END IF;

  IF v_row.count >= p_max_count THEN
    RETURN false;
  END IF;

  UPDATE public.action_rate_limits
  SET count = count + 1,
      updated_at = v_now
  WHERE user_id = p_user_id AND action_key = p_action_key;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enforce_action_rate_limit(UUID, TEXT, INTEGER, INTEGER) TO authenticated;

-- 3) Queue state transitions + cleanup
CREATE OR REPLACE FUNCTION public.transition_queue_state(p_player_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.matchmaking_queue%ROWTYPE;
  v_age_seconds INTEGER;
  v_new_scope TEXT;
  v_new_state TEXT;
BEGIN
  SELECT * INTO v_row
  FROM public.matchmaking_queue
  WHERE player_id = p_player_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'missing';
  END IF;

  v_age_seconds := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - COALESCE(v_row.search_started_at, v_row.created_at))))::INTEGER);

  IF v_age_seconds >= 40 THEN
    v_new_scope := 'global';
    v_new_state := 'queued_global';
  ELSIF v_age_seconds >= 20 THEN
    v_new_scope := 'local';
    v_new_state := 'queued_local';
  ELSE
    v_new_scope := 'local';
    v_new_state := 'queued_local';
  END IF;

  UPDATE public.matchmaking_queue
  SET matching_scope = v_new_scope,
      queue_state = v_new_state,
      expanded_at = CASE WHEN v_new_scope = 'global' THEN COALESCE(expanded_at, now()) ELSE expanded_at END
  WHERE player_id = p_player_id;

  RETURN v_new_state;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transition_queue_state(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.cleanup_matchmaking_artifacts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER := 0;
BEGIN
  DELETE FROM public.matchmaking_queue
  WHERE created_at < now() - interval '15 minutes';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  UPDATE public.arena_challenges
  SET status = 'expired',
      expired_at = now()
  WHERE status = 'pending'
    AND sent_at < now() - interval '2 minutes';

  RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_matchmaking_artifacts() TO authenticated;

-- 4) Analytics events
CREATE TABLE IF NOT EXISTS public.arena_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_arena_events_user_time ON public.arena_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_arena_events_name_time ON public.arena_events(event_name, created_at DESC);

ALTER TABLE public.arena_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own arena events" ON public.arena_events;
CREATE POLICY "Users can insert own arena events"
ON public.arena_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can read arena events" ON public.arena_events;
CREATE POLICY "Service role can read arena events"
ON public.arena_events
FOR SELECT
USING (auth.role() = 'service_role');

-- 5) Live games feed materialized view
DROP MATERIALIZED VIEW IF EXISTS public.live_games_feed;
CREATE MATERIALIZED VIEW public.live_games_feed AS
SELECT
  g.id,
  g.created_at,
  g.duration_seconds,
  g.result_type,
  g.winner_id,
  g.player_white,
  g.player_black,
  pw.username AS white_name,
  pb.username AS black_name,
  pw.crown_score AS white_rating,
  pb.crown_score AS black_rating
FROM public.games g
LEFT JOIN public.profiles pw ON pw.id = g.player_white
LEFT JOIN public.profiles pb ON pb.id = g.player_black
WHERE g.game_mode = 'world_arena'
  AND g.result_type = 'in_progress'
ORDER BY g.created_at DESC
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_live_games_feed_id ON public.live_games_feed(id);

CREATE OR REPLACE FUNCTION public.refresh_live_games_feed()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.live_games_feed;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_live_games_feed() TO authenticated;

-- 6) Single snapshot RPC for world arena dashboard
CREATE OR REPLACE FUNCTION public.get_world_arena_snapshot(
  p_user_id UUID,
  p_duration_seconds INTEGER DEFAULT NULL,
  p_prefer_local_region BOOLEAN DEFAULT false
)
RETURNS TABLE (
  searching_now INTEGER,
  avg_wait_seconds INTEGER,
  recent_matches INTEGER,
  my_rating INTEGER,
  my_region TEXT,
  best_opponent_rating INTEGER,
  best_opponent_region TEXT,
  balance_percent INTEGER,
  quality_score INTEGER,
  strict_local_wait_seconds INTEGER,
  live_games JSONB,
  recent_winners JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_rating INTEGER := 1200;
  v_my_region TEXT := NULL;
BEGIN
  SELECT COALESCE(crown_score, 1200), country
  INTO v_my_rating, v_my_region
  FROM public.profiles
  WHERE id = p_user_id;

  RETURN QUERY
  WITH queue_pool AS (
    SELECT q.*,
           GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - q.created_at)))::INTEGER) AS wait_seconds,
           ABS(q.rating - v_my_rating) AS rating_diff
    FROM public.matchmaking_queue q
    WHERE q.game_mode = 'world_arena'
      AND q.player_id <> p_user_id
      AND (
        (p_duration_seconds IS NULL AND q.duration_seconds IS NULL)
        OR (p_duration_seconds IS NOT NULL AND q.duration_seconds = p_duration_seconds)
      )
  ),
  best AS (
    SELECT q.*
    FROM queue_pool q
    ORDER BY
      (q.rating_diff - LEAST(q.wait_seconds, 120) * 0.25 + CASE WHEN p_prefer_local_region AND v_my_region IS NOT NULL AND q.region IS DISTINCT FROM v_my_region THEN 30 ELSE 0 END) ASC,
      q.created_at ASC
    LIMIT 1
  ),
  q_stats AS (
    SELECT
      COUNT(*)::INTEGER AS searching_now,
      COALESCE(ROUND(AVG(wait_seconds))::INTEGER, 0) AS avg_wait_seconds,
      COALESCE(ROUND(AVG(wait_seconds)) FILTER (WHERE v_my_region IS NOT NULL AND region = v_my_region)::INTEGER, NULL) AS strict_local_wait_seconds
    FROM queue_pool
  ),
  recents AS (
    SELECT COUNT(*)::INTEGER AS recent_matches
    FROM public.games g
    WHERE g.game_mode = 'world_arena'
      AND g.created_at >= now() - interval '5 minutes'
  ),
  matchup AS (
    SELECT
      b.rating AS best_opponent_rating,
      b.region AS best_opponent_region,
      CASE
        WHEN b.rating IS NULL THEN NULL
        ELSE ROUND((1 - ABS((1 / (1 + POWER(10, (b.rating - v_my_rating)::NUMERIC / 400))) - 0.5) * 2) * 100)::INTEGER
      END AS balance_percent,
      CASE
        WHEN b.rating IS NULL THEN NULL
        ELSE GREATEST(0, LEAST(100,
          ROUND((1 - ABS((1 / (1 + POWER(10, (b.rating - v_my_rating)::NUMERIC / 400))) - 0.5) * 2) * 100
            - CASE WHEN p_prefer_local_region AND v_my_region IS NOT NULL AND b.region IS DISTINCT FROM v_my_region THEN 15 ELSE 0 END
            + LEAST(b.wait_seconds, 90) * 0.1
          )::INTEGER
        ))
      END AS quality_score
    FROM best b
  ),
  live AS (
    SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::jsonb) AS payload
    FROM (
      SELECT id, created_at, duration_seconds, result_type, winner_id, player_white, player_black, white_name, black_name, white_rating, black_rating
      FROM public.live_games_feed
      ORDER BY created_at DESC
      LIMIT 6
    ) t
  ),
  winners AS (
    SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::jsonb) AS payload
    FROM (
      SELECT
        g.id,
        g.created_at,
        g.duration_seconds,
        g.result_type,
        g.winner_id,
        pw.username AS winner_name
      FROM public.games g
      LEFT JOIN public.profiles pw ON pw.id = g.winner_id
      WHERE g.game_mode = 'world_arena'
        AND g.result_type IN ('checkmate','resignation')
      ORDER BY g.created_at DESC
      LIMIT 6
    ) t
  )
  SELECT
    q_stats.searching_now,
    q_stats.avg_wait_seconds,
    recents.recent_matches,
    v_my_rating,
    v_my_region,
    matchup.best_opponent_rating,
    matchup.best_opponent_region,
    matchup.balance_percent,
    matchup.quality_score,
    q_stats.strict_local_wait_seconds,
    live.payload,
    winners.payload
  FROM q_stats, recents, live, winners
  LEFT JOIN matchup ON true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_world_arena_snapshot(UUID, INTEGER, BOOLEAN) TO authenticated;
