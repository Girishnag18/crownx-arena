
ALTER TABLE public.matchmaking_queue ADD COLUMN IF NOT EXISTS duration_seconds integer DEFAULT NULL;

CREATE POLICY "Players can update own queue entry"
ON public.matchmaking_queue
FOR UPDATE
TO authenticated
USING (auth.uid() = player_id)
WITH CHECK (auth.uid() = player_id);
