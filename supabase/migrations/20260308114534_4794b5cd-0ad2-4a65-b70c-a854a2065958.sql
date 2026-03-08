
CREATE TABLE public.recent_tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id uuid NOT NULL,
  name text NOT NULL,
  prize_pool numeric NOT NULL DEFAULT 0,
  max_players integer NOT NULL DEFAULT 128,
  created_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  tournament_type text NOT NULL DEFAULT 'swiss',
  starts_at timestamptz,
  ended_at timestamptz DEFAULT now(),
  player_count integer NOT NULL DEFAULT 0
);

ALTER TABLE public.recent_tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recent tournaments viewable by everyone"
  ON public.recent_tournaments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert recent tournaments"
  ON public.recent_tournaments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator can delete recent tournaments"
  ON public.recent_tournaments FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);
