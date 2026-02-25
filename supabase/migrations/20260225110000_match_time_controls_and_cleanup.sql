-- Add selectable time controls for matchmaking/private rooms.
ALTER TABLE public.matchmaking_queue
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

ALTER TABLE public.game_rooms
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

ALTER TABLE public.matchmaking_queue
  DROP CONSTRAINT IF EXISTS matchmaking_queue_duration_seconds_check;
ALTER TABLE public.matchmaking_queue
  ADD CONSTRAINT matchmaking_queue_duration_seconds_check
  CHECK (duration_seconds IS NULL OR duration_seconds IN (600, 900, 1200, 1800));

ALTER TABLE public.game_rooms
  DROP CONSTRAINT IF EXISTS game_rooms_duration_seconds_check;
ALTER TABLE public.game_rooms
  ADD CONSTRAINT game_rooms_duration_seconds_check
  CHECK (duration_seconds IS NULL OR duration_seconds IN (600, 900, 1200, 1800));

-- Fix private room join issue: let a guest claim a waiting room in one UPDATE statement.
DROP POLICY IF EXISTS "Host or guest can update room" ON public.game_rooms;
CREATE POLICY "Host or guest can update room" ON public.game_rooms
  FOR UPDATE USING (
    auth.uid() = host_id
    OR auth.uid() = guest_id
    OR (status = 'waiting' AND guest_id IS NULL)
  );

-- Cleanup cancelled tournaments that are older than 1 hour.
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

UPDATE public.tournaments
SET cancelled_at = COALESCE(cancelled_at, now())
WHERE status = 'cancelled' AND cancelled_at IS NULL;

CREATE OR REPLACE FUNCTION public.cleanup_cancelled_tournaments()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.tournaments
  WHERE status = 'cancelled'
    AND cancelled_at IS NOT NULL
    AND cancelled_at <= now() - interval '1 hour';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_cancelled_tournaments() TO authenticated;
