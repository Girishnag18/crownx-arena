-- Phase 1 + 2 foundation:
-- 1) Analysis/anti-cheat telemetry tables
-- 2) Server-authoritative clock + move submission RPC

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS clock_white_ms BIGINT,
  ADD COLUMN IF NOT EXISTS clock_black_ms BIGINT,
  ADD COLUMN IF NOT EXISTS increment_ms INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delay_ms INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS time_control_mode TEXT NOT NULL DEFAULT 'none' CHECK (time_control_mode IN ('none','fischer','delay','bronstein')),
  ADD COLUMN IF NOT EXISTS clock_last_move_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS flag_fall_winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.analysis_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','failed')),
  priority INTEGER NOT NULL DEFAULT 100,
  engine_version TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_analysis_jobs_status_priority ON public.analysis_jobs(status, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_game ON public.analysis_jobs(game_id, created_at DESC);

ALTER TABLE public.analysis_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read analysis jobs for own games" ON public.analysis_jobs;
CREATE POLICY "Users can read analysis jobs for own games"
ON public.analysis_jobs
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.games g
    WHERE g.id = game_id
      AND (g.player_white = auth.uid() OR g.player_black = auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can request analysis jobs for own games" ON public.analysis_jobs;
CREATE POLICY "Users can request analysis jobs for own games"
ON public.analysis_jobs
FOR INSERT
WITH CHECK (
  requested_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.games g
    WHERE g.id = game_id
      AND (g.player_white = auth.uid() OR g.player_black = auth.uid())
  )
);

DROP POLICY IF EXISTS "Service role can update analysis jobs" ON public.analysis_jobs;
CREATE POLICY "Service role can update analysis jobs"
ON public.analysis_jobs
FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS public.game_engine_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  ply INTEGER NOT NULL CHECK (ply > 0),
  fen_before TEXT NOT NULL,
  best_move_uci TEXT,
  played_move_uci TEXT,
  eval_cp_before INTEGER,
  eval_cp_after INTEGER,
  cpl INTEGER,
  tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, ply)
);

CREATE INDEX IF NOT EXISTS idx_game_engine_analysis_game_ply ON public.game_engine_analysis(game_id, ply);
ALTER TABLE public.game_engine_analysis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read engine analysis for own games" ON public.game_engine_analysis;
CREATE POLICY "Users can read engine analysis for own games"
ON public.game_engine_analysis
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.games g
    WHERE g.id = game_id
      AND (g.player_white = auth.uid() OR g.player_black = auth.uid())
  )
);

DROP POLICY IF EXISTS "Service role can write engine analysis" ON public.game_engine_analysis;
CREATE POLICY "Service role can write engine analysis"
ON public.game_engine_analysis
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS public.anti_cheat_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE UNIQUE,
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  move_time_score NUMERIC NOT NULL DEFAULT 0,
  cpl_score NUMERIC NOT NULL DEFAULT 0,
  correlation_score NUMERIC NOT NULL DEFAULT 0,
  overall_risk NUMERIC NOT NULL DEFAULT 0,
  model_version TEXT NOT NULL DEFAULT 'v1',
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','dismissed','confirmed')),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anti_cheat_reports_status_risk ON public.anti_cheat_reports(status, overall_risk DESC, created_at DESC);

ALTER TABLE public.anti_cheat_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Players can read own anti-cheat reports" ON public.anti_cheat_reports;
CREATE POLICY "Players can read own anti-cheat reports"
ON public.anti_cheat_reports
FOR SELECT
USING (player_id = auth.uid());

DROP POLICY IF EXISTS "Moderators and admins can read anti-cheat reports" ON public.anti_cheat_reports;
CREATE POLICY "Moderators and admins can read anti-cheat reports"
ON public.anti_cheat_reports
FOR SELECT
USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role manages anti-cheat reports" ON public.anti_cheat_reports;
CREATE POLICY "Service role manages anti-cheat reports"
ON public.anti_cheat_reports
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.enqueue_game_analysis(target_game UUID, p_priority INTEGER DEFAULT 100)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game public.games%ROWTYPE;
  v_job_id UUID;
BEGIN
  SELECT * INTO v_game FROM public.games WHERE id = target_game;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found';
  END IF;

  IF v_game.player_white IS DISTINCT FROM auth.uid() AND v_game.player_black IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  INSERT INTO public.analysis_jobs (game_id, requested_by, priority)
  VALUES (target_game, auth.uid(), GREATEST(1, LEAST(COALESCE(p_priority, 100), 1000)))
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_online_move(
  p_game_id UUID,
  p_from TEXT,
  p_to TEXT,
  p_san TEXT,
  p_promotion TEXT DEFAULT NULL,
  p_new_fen TEXT DEFAULT NULL,
  p_result_type TEXT DEFAULT 'in_progress',
  p_winner_id UUID DEFAULT NULL,
  p_pgn TEXT DEFAULT NULL
)
RETURNS TABLE (
  ok BOOLEAN,
  result_type TEXT,
  winner_id UUID,
  clock_white_ms BIGINT,
  clock_black_ms BIGINT,
  current_fen TEXT,
  moves JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game public.games%ROWTYPE;
  v_now TIMESTAMPTZ := now();
  v_elapsed_ms BIGINT := 0;
  v_is_white_turn BOOLEAN;
  v_is_white_mover BOOLEAN;
  v_turn_char TEXT;
  v_move_obj JSONB;
  v_moves JSONB;
  v_white_ms BIGINT;
  v_black_ms BIGINT;
  v_new_result TEXT := COALESCE(NULLIF(p_result_type, ''), 'in_progress');
  v_new_winner UUID := p_winner_id;
BEGIN
  SELECT * INTO v_game
  FROM public.games
  WHERE id = p_game_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found';
  END IF;

  IF v_game.result_type <> 'in_progress' THEN
    RETURN QUERY SELECT false, v_game.result_type, v_game.winner_id, v_game.clock_white_ms, v_game.clock_black_ms, v_game.current_fen, COALESCE(v_game.moves, '[]'::jsonb);
    RETURN;
  END IF;

  IF auth.uid() IS DISTINCT FROM v_game.player_white AND auth.uid() IS DISTINCT FROM v_game.player_black THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  v_turn_char := split_part(split_part(COALESCE(v_game.current_fen, ''), ' ', 2), ' ', 1);
  v_is_white_turn := v_turn_char = 'w';
  v_is_white_mover := auth.uid() = v_game.player_white;

  IF v_is_white_turn <> v_is_white_mover THEN
    RAISE EXCEPTION 'Not your turn';
  END IF;

  v_white_ms := COALESCE(v_game.clock_white_ms, CASE WHEN v_game.duration_seconds IS NULL THEN NULL ELSE v_game.duration_seconds::BIGINT * 1000 END);
  v_black_ms := COALESCE(v_game.clock_black_ms, CASE WHEN v_game.duration_seconds IS NULL THEN NULL ELSE v_game.duration_seconds::BIGINT * 1000 END);

  IF v_white_ms IS NOT NULL AND v_black_ms IS NOT NULL THEN
    IF v_game.clock_last_move_at IS NULL THEN
      v_elapsed_ms := 0;
    ELSE
      v_elapsed_ms := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (v_now - v_game.clock_last_move_at)) * 1000)::BIGINT);
    END IF;

    IF v_is_white_mover THEN
      IF v_game.time_control_mode = 'fischer' THEN
        v_white_ms := v_white_ms - v_elapsed_ms + COALESCE(v_game.increment_ms, 0);
      ELSIF v_game.time_control_mode = 'delay' THEN
        v_white_ms := v_white_ms - GREATEST(0, v_elapsed_ms - COALESCE(v_game.delay_ms, 0));
      ELSIF v_game.time_control_mode = 'bronstein' THEN
        v_white_ms := v_white_ms - v_elapsed_ms + LEAST(v_elapsed_ms, COALESCE(v_game.delay_ms, 0));
      ELSE
        v_white_ms := v_white_ms - v_elapsed_ms;
      END IF;
    ELSE
      IF v_game.time_control_mode = 'fischer' THEN
        v_black_ms := v_black_ms - v_elapsed_ms + COALESCE(v_game.increment_ms, 0);
      ELSIF v_game.time_control_mode = 'delay' THEN
        v_black_ms := v_black_ms - GREATEST(0, v_elapsed_ms - COALESCE(v_game.delay_ms, 0));
      ELSIF v_game.time_control_mode = 'bronstein' THEN
        v_black_ms := v_black_ms - v_elapsed_ms + LEAST(v_elapsed_ms, COALESCE(v_game.delay_ms, 0));
      ELSE
        v_black_ms := v_black_ms - v_elapsed_ms;
      END IF;
    END IF;

    IF v_white_ms <= 0 THEN
      v_white_ms := 0;
      v_new_result := 'timeout';
      v_new_winner := v_game.player_black;
    ELSIF v_black_ms <= 0 THEN
      v_black_ms := 0;
      v_new_result := 'timeout';
      v_new_winner := v_game.player_white;
    END IF;
  END IF;

  v_moves := COALESCE(v_game.moves, '[]'::jsonb);
  v_move_obj := jsonb_build_object(
    'from', p_from,
    'to', p_to,
    'san', p_san,
    'promotion', p_promotion,
    'moved_at', v_now
  );

  IF v_new_result = 'timeout' THEN
    UPDATE public.games
    SET result_type = v_new_result,
        winner_id = v_new_winner,
        flag_fall_winner_id = v_new_winner,
        ended_at = v_now,
        clock_white_ms = v_white_ms,
        clock_black_ms = v_black_ms,
        clock_last_move_at = v_now
    WHERE id = p_game_id;
  ELSE
    UPDATE public.games
    SET current_fen = COALESCE(p_new_fen, v_game.current_fen),
        moves = v_moves || jsonb_build_array(v_move_obj),
        result_type = v_new_result,
        winner_id = CASE WHEN v_new_result = 'in_progress' THEN NULL ELSE v_new_winner END,
        ended_at = CASE WHEN v_new_result = 'in_progress' THEN NULL ELSE v_now END,
        pgn = COALESCE(p_pgn, v_game.pgn),
        clock_white_ms = v_white_ms,
        clock_black_ms = v_black_ms,
        clock_last_move_at = v_now,
        flag_fall_winner_id = CASE WHEN v_new_result = 'timeout' THEN v_new_winner ELSE v_game.flag_fall_winner_id END
    WHERE id = p_game_id;
  END IF;

  SELECT g.result_type, g.winner_id, g.clock_white_ms, g.clock_black_ms, g.current_fen, COALESCE(g.moves, '[]'::jsonb)
  INTO result_type, winner_id, clock_white_ms, clock_black_ms, current_fen, moves
  FROM public.games g
  WHERE g.id = p_game_id;

  ok := true;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enqueue_game_analysis(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_online_move(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT) TO authenticated;
