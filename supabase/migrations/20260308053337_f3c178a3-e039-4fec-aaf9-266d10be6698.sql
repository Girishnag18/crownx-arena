
-- Tighten INSERT policy: only allow inserting matches where user is player1
DROP POLICY IF EXISTS "Authenticated users can insert tournament matches" ON public.tournament_matches;
CREATE POLICY "Users can insert own tournament matches"
  ON public.tournament_matches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = player1_id);
