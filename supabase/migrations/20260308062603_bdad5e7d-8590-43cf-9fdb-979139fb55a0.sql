
CREATE TABLE public.leaderboard_seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  season_number integer NOT NULL DEFAULT 1,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  status text NOT NULL DEFAULT 'active',
  reward_1st numeric NOT NULL DEFAULT 10,
  reward_2nd numeric NOT NULL DEFAULT 5,
  reward_3rd numeric NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leaderboard_seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seasons viewable by everyone"
  ON public.leaderboard_seasons FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE public.season_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.leaderboard_seasons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  games_played integer NOT NULL DEFAULT 0,
  wins integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(season_id, user_id)
);

ALTER TABLE public.season_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Season entries viewable by everyone"
  ON public.season_entries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own entries"
  ON public.season_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries"
  ON public.season_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
