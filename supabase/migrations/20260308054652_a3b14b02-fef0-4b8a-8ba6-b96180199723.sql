
-- Anti-cheat game reports table
CREATE TABLE public.game_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  reporter_id uuid NOT NULL,
  reported_player_id uuid NOT NULL,
  reason text NOT NULL DEFAULT 'engine_use',
  status text NOT NULL DEFAULT 'pending',
  suspicion_score numeric DEFAULT 0,
  analysis jsonb DEFAULT '{}'::jsonb,
  admin_notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

ALTER TABLE public.game_reports ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can report
CREATE POLICY "Users can create reports" ON public.game_reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Users can see their own reports
CREATE POLICY "Users can view own reports" ON public.game_reports
  FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'));

-- Admins can update reports
CREATE POLICY "Admins can update reports" ON public.game_reports
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
