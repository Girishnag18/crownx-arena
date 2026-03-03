
-- Create elo_history table to track CrownScore snapshots after each match
CREATE TABLE public.elo_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL,
  game_id uuid REFERENCES public.games(id) ON DELETE SET NULL,
  elo_before integer NOT NULL,
  elo_after integer NOT NULL,
  elo_delta integer GENERATED ALWAYS AS (elo_after - elo_before) STORED,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast player lookups
CREATE INDEX idx_elo_history_player ON public.elo_history(player_id, recorded_at DESC);

-- Enable RLS
ALTER TABLE public.elo_history ENABLE ROW LEVEL SECURITY;

-- Everyone can view elo history (for profile charts)
CREATE POLICY "Elo history viewable by everyone"
ON public.elo_history FOR SELECT
USING (true);

-- Only authenticated users can insert their own records
CREATE POLICY "Users can insert own elo history"
ON public.elo_history FOR INSERT
WITH CHECK (auth.uid() = player_id);

-- Enable realtime for live chart updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.elo_history;
