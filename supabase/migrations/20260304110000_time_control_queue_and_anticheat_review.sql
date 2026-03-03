-- Extend queue/room for richer time controls and add moderator review RPC for anti-cheat reports.

ALTER TABLE public.matchmaking_queue
  ADD COLUMN IF NOT EXISTS increment_ms INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delay_ms INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS time_control_mode TEXT NOT NULL DEFAULT 'none' CHECK (time_control_mode IN ('none','fischer','delay','bronstein'));

ALTER TABLE public.game_rooms
  ADD COLUMN IF NOT EXISTS increment_ms INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delay_ms INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS time_control_mode TEXT NOT NULL DEFAULT 'none' CHECK (time_control_mode IN ('none','fischer','delay','bronstein'));

CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_time_control
  ON public.matchmaking_queue(game_mode, duration_seconds, time_control_mode, increment_ms, delay_ms);

CREATE OR REPLACE FUNCTION public.review_anti_cheat_report(
  p_report_id UUID,
  p_status TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF p_status NOT IN ('reviewing','dismissed','confirmed') THEN
    RAISE EXCEPTION 'Invalid report status';
  END IF;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = v_uid
      AND ur.role IN ('admin','moderator')
  ) THEN
    RAISE EXCEPTION 'Only admins/moderators can review reports';
  END IF;

  UPDATE public.anti_cheat_reports
  SET status = p_status,
      reviewed_by = v_uid,
      reviewed_at = now()
  WHERE id = p_report_id;

  RETURN p_report_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.review_anti_cheat_report(UUID, TEXT) TO authenticated;
