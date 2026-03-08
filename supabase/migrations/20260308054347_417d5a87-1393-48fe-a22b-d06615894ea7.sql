
-- Studies table
CREATE TABLE IF NOT EXISTS public.studies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  visibility text NOT NULL DEFAULT 'public',
  opening_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.studies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public studies viewable by everyone"
  ON public.studies FOR SELECT
  USING (visibility = 'public' OR auth.uid() = owner_id);

CREATE POLICY "Users can create own studies"
  ON public.studies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own studies"
  ON public.studies FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own studies"
  ON public.studies FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Study chapters/positions
CREATE TABLE IF NOT EXISTS public.study_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id uuid NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Chapter 1',
  fen text NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  moves jsonb DEFAULT '[]',
  annotations jsonb DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.study_chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Study chapters viewable with study"
  ON public.study_chapters FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.studies s WHERE s.id = study_id AND (s.visibility = 'public' OR s.owner_id = auth.uid())
  ));

CREATE POLICY "Owner can insert chapters"
  ON public.study_chapters FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.studies s WHERE s.id = study_id AND s.owner_id = auth.uid()
  ));

CREATE POLICY "Owner can update chapters"
  ON public.study_chapters FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.studies s WHERE s.id = study_id AND s.owner_id = auth.uid()
  ));

CREATE POLICY "Owner can delete chapters"
  ON public.study_chapters FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.studies s WHERE s.id = study_id AND s.owner_id = auth.uid()
  ));

-- Realtime for collaborative editing
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_chapters;
