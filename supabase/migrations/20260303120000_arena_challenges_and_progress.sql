-- Direct challenge queue metadata
ALTER TABLE public.matchmaking_queue
  ADD COLUMN IF NOT EXISTS target_player_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS challenge_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_target_player ON public.matchmaking_queue(target_player_id);
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_challenge_expires ON public.matchmaking_queue(challenge_expires_at);

-- Persistent arena progression (seasonal/monthly)
CREATE TABLE IF NOT EXISTS public.arena_progress (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  season_key TEXT NOT NULL,
  daily_streak INTEGER NOT NULL DEFAULT 0,
  win_streak INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  last_played_on DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, season_key)
);

ALTER TABLE public.arena_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own arena progress" ON public.arena_progress;
CREATE POLICY "Users can read own arena progress"
ON public.arena_progress FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage arena progress" ON public.arena_progress;
CREATE POLICY "Service role can manage arena progress"
ON public.arena_progress FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.current_arena_season_key(ts timestamptz DEFAULT now())
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT to_char(ts AT TIME ZONE 'UTC', 'YYYY-MM');
$$;

CREATE OR REPLACE FUNCTION public.apply_arena_progress_for_game()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  participant_id UUID;
  winner UUID;
  season TEXT;
  today_utc DATE;
  prev_last_played DATE;
  prev_daily_streak INTEGER;
  new_daily_streak INTEGER;
  new_win_streak INTEGER;
  point_delta INTEGER;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.game_mode <> 'world_arena' THEN
    RETURN NEW;
  END IF;

  IF NEW.result_type = 'in_progress' OR NEW.result_type = 'pending' THEN
    RETURN NEW;
  END IF;

  IF OLD.result_type IS NOT DISTINCT FROM NEW.result_type AND OLD.winner_id IS NOT DISTINCT FROM NEW.winner_id THEN
    RETURN NEW;
  END IF;

  season := public.current_arena_season_key(NEW.created_at);
  today_utc := (NEW.created_at AT TIME ZONE 'UTC')::date;
  winner := NEW.winner_id;

  FOR participant_id IN SELECT unnest(ARRAY[NEW.player_white, NEW.player_black]) LOOP
    EXIT WHEN participant_id IS NULL;

    SELECT last_played_on, daily_streak
    INTO prev_last_played, prev_daily_streak
    FROM public.arena_progress
    WHERE user_id = participant_id AND season_key = season;

    IF prev_last_played IS NULL THEN
      new_daily_streak := 1;
    ELSIF prev_last_played = today_utc THEN
      new_daily_streak := COALESCE(prev_daily_streak, 0);
    ELSIF prev_last_played = today_utc - 1 THEN
      new_daily_streak := COALESCE(prev_daily_streak, 0) + 1;
    ELSE
      new_daily_streak := 1;
    END IF;

    IF winner IS NULL THEN
      new_win_streak := 0;
      point_delta := 12;
    ELSIF winner = participant_id THEN
      new_win_streak := COALESCE((SELECT win_streak FROM public.profiles WHERE id = participant_id), 0);
      point_delta := 20;
    ELSE
      new_win_streak := 0;
      point_delta := 8;
    END IF;

    INSERT INTO public.arena_progress (user_id, season_key, daily_streak, win_streak, points, last_played_on, updated_at)
    VALUES (participant_id, season, new_daily_streak, new_win_streak, point_delta, today_utc, now())
    ON CONFLICT (user_id, season_key)
    DO UPDATE SET
      daily_streak = EXCLUDED.daily_streak,
      win_streak = EXCLUDED.win_streak,
      points = public.arena_progress.points + EXCLUDED.points,
      last_played_on = EXCLUDED.last_played_on,
      updated_at = now();
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_arena_progress_for_game ON public.games;
CREATE TRIGGER trg_apply_arena_progress_for_game
AFTER UPDATE ON public.games
FOR EACH ROW
EXECUTE FUNCTION public.apply_arena_progress_for_game();

GRANT EXECUTE ON FUNCTION public.current_arena_season_key(timestamptz) TO authenticated;

