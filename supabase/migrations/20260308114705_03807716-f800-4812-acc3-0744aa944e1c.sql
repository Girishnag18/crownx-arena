
-- Allow tournament creators to delete their tournaments
CREATE POLICY "Creator can delete tournaments"
  ON public.tournaments FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);
