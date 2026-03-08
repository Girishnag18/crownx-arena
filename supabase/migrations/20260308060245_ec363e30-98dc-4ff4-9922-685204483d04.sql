
-- Opening lines library
CREATE TABLE public.opening_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  eco text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT 'w',
  moves text[] NOT NULL,
  description text DEFAULT '',
  difficulty text NOT NULL DEFAULT 'beginner',
  category text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.opening_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Opening lines viewable by everyone" ON public.opening_lines
  FOR SELECT USING (true);

-- Player progress on each opening line (spaced repetition)
CREATE TABLE public.opening_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  line_id uuid REFERENCES public.opening_lines(id) ON DELETE CASCADE NOT NULL,
  ease_factor numeric NOT NULL DEFAULT 2.5,
  interval_days integer NOT NULL DEFAULT 1,
  repetitions integer NOT NULL DEFAULT 0,
  correct_streak integer NOT NULL DEFAULT 0,
  last_reviewed_at timestamptz,
  next_review_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, line_id)
);

ALTER TABLE public.opening_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress" ON public.opening_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON public.opening_progress
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON public.opening_progress
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Seed popular openings
INSERT INTO public.opening_lines (name, eco, color, moves, description, difficulty, category) VALUES
  ('Italian Game', 'C50', 'w', ARRAY['e4','e5','Nf3','Nc6','Bc4'], 'Classical development targeting f7', 'beginner', 'open'),
  ('Sicilian Defense', 'B20', 'b', ARRAY['e4','c5'], 'Fighting response to 1.e4', 'beginner', 'semi-open'),
  ('Queen''s Gambit', 'D06', 'w', ARRAY['d4','d5','c4'], 'Classical pawn sacrifice for center control', 'beginner', 'closed'),
  ('French Defense', 'C00', 'b', ARRAY['e4','e6'], 'Solid but slightly passive defense', 'beginner', 'semi-open'),
  ('Ruy Lopez', 'C60', 'w', ARRAY['e4','e5','Nf3','Nc6','Bb5'], 'Spanish Opening - pressure on e5 pawn', 'intermediate', 'open'),
  ('King''s Indian Defense', 'E60', 'b', ARRAY['d4','Nf6','c4','g6'], 'Hypermodern fianchetto defense', 'intermediate', 'indian'),
  ('Caro-Kann Defense', 'B10', 'b', ARRAY['e4','c6'], 'Solid defense aiming for d5', 'beginner', 'semi-open'),
  ('London System', 'D02', 'w', ARRAY['d4','d5','Bf4'], 'Easy-to-learn system with early bishop development', 'beginner', 'closed'),
  ('Scotch Game', 'C44', 'w', ARRAY['e4','e5','Nf3','Nc6','d4'], 'Direct center challenge', 'beginner', 'open'),
  ('Nimzo-Indian', 'E20', 'b', ARRAY['d4','Nf6','c4','e6','Nc3','Bb4'], 'Flexible defense pinning the knight', 'intermediate', 'indian'),
  ('Giuoco Piano', 'C53', 'w', ARRAY['e4','e5','Nf3','Nc6','Bc4','Bc5'], 'Quiet Italian with symmetrical development', 'beginner', 'open'),
  ('Slav Defense', 'D10', 'b', ARRAY['d4','d5','c4','c6'], 'Solid queen''s pawn defense', 'intermediate', 'closed'),
  ('English Opening', 'A10', 'w', ARRAY['c4'], 'Flexible flank opening', 'intermediate', 'flank'),
  ('Pirc Defense', 'B07', 'b', ARRAY['e4','d6','d4','Nf6'], 'Hypermodern allowing white center then attacking it', 'intermediate', 'semi-open'),
  ('Vienna Game', 'C25', 'w', ARRAY['e4','e5','Nc3'], 'Flexible knight-first approach', 'beginner', 'open'),
  ('Grünfeld Defense', 'D70', 'b', ARRAY['d4','Nf6','c4','g6','Nc3','d5'], 'Challenging white''s center from a distance', 'advanced', 'indian');
