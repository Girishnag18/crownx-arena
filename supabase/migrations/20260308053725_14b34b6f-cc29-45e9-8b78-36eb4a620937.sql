
-- Puzzles table
CREATE TABLE IF NOT EXISTS public.puzzles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fen text NOT NULL,
  solution text[] NOT NULL,
  rating integer NOT NULL DEFAULT 1200,
  themes text[] NOT NULL DEFAULT '{}',
  source text DEFAULT 'custom',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.puzzles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Puzzles are viewable by everyone"
  ON public.puzzles FOR SELECT
  USING (true);

-- Puzzle attempts / progress tracking
CREATE TABLE IF NOT EXISTS public.puzzle_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  puzzle_id uuid NOT NULL REFERENCES public.puzzles(id) ON DELETE CASCADE,
  solved boolean NOT NULL DEFAULT false,
  attempts integer NOT NULL DEFAULT 1,
  time_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.puzzle_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own puzzle attempts"
  ON public.puzzle_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own puzzle attempts"
  ON public.puzzle_attempts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own puzzle attempts"
  ON public.puzzle_attempts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Puzzle stats on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS puzzle_rating integer NOT NULL DEFAULT 1200,
  ADD COLUMN IF NOT EXISTS puzzle_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS puzzles_solved integer NOT NULL DEFAULT 0;
