
-- Add tournament type and round tracking to tournaments
ALTER TABLE public.tournaments 
  ADD COLUMN IF NOT EXISTS tournament_type text NOT NULL DEFAULT 'swiss',
  ADD COLUMN IF NOT EXISTS current_round integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_rounds integer NOT NULL DEFAULT 5;

-- Tournament matches table for bracket/round tracking
CREATE TABLE IF NOT EXISTS public.tournament_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round integer NOT NULL DEFAULT 1,
  player1_id uuid NOT NULL,
  player2_id uuid,
  game_id uuid REFERENCES public.games(id),
  winner_id uuid,
  result text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;

-- Everyone can view tournament matches
CREATE POLICY "Tournament matches viewable by everyone"
  ON public.tournament_matches FOR SELECT
  USING (true);

-- Service role inserts matches (via edge function), but allow players to see
CREATE POLICY "Authenticated users can insert tournament matches"
  ON public.tournament_matches FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Players in match can update (for recording results)
CREATE POLICY "Players can update their tournament matches"
  ON public.tournament_matches FOR UPDATE
  TO authenticated
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- Enable realtime for live bracket updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_matches;
