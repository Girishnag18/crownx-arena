
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS increment_seconds integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS white_time_ms integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS black_time_ms integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_move_at timestamptz DEFAULT NULL;
