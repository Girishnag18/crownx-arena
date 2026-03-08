
-- Achievements/badges system
CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT '🏆',
  xp_reward integer NOT NULL DEFAULT 50,
  category text NOT NULL DEFAULT 'general'
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Achievements viewable by everyone" ON public.achievements
  FOR SELECT USING (true);

-- Player unlocked achievements
CREATE TABLE public.player_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_id uuid REFERENCES public.achievements(id) ON DELETE CASCADE NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);

ALTER TABLE public.player_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements" ON public.player_achievements
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements" ON public.player_achievements
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Daily puzzle tracking
CREATE TABLE public.daily_puzzles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  puzzle_id uuid REFERENCES public.puzzles(id) NOT NULL,
  active_date date UNIQUE NOT NULL DEFAULT CURRENT_DATE
);

ALTER TABLE public.daily_puzzles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Daily puzzles viewable by everyone" ON public.daily_puzzles
  FOR SELECT USING (true);

-- Seed achievements
INSERT INTO public.achievements (key, title, description, icon, xp_reward, category) VALUES
  ('first_game', 'First Steps', 'Play your first game', '♟️', 50, 'games'),
  ('win_5', 'Rising Star', 'Win 5 games', '⭐', 100, 'games'),
  ('win_25', 'Veteran', 'Win 25 games', '🎖️', 250, 'games'),
  ('win_100', 'Centurion', 'Win 100 games', '💯', 500, 'games'),
  ('streak_3', 'Hot Streak', 'Win 3 games in a row', '🔥', 75, 'streaks'),
  ('streak_5', 'On Fire', 'Win 5 games in a row', '🔥', 150, 'streaks'),
  ('streak_10', 'Unstoppable', 'Win 10 games in a row', '💥', 300, 'streaks'),
  ('puzzle_10', 'Puzzle Novice', 'Solve 10 puzzles', '🧩', 75, 'puzzles'),
  ('puzzle_50', 'Puzzle Master', 'Solve 50 puzzles', '🧠', 200, 'puzzles'),
  ('puzzle_100', 'Puzzle Legend', 'Solve 100 puzzles', '👑', 400, 'puzzles'),
  ('elo_500', 'Apprentice', 'Reach 500 CrownScore', '🥉', 100, 'rating'),
  ('elo_800', 'Intermediate', 'Reach 800 CrownScore', '🥈', 200, 'rating'),
  ('elo_1200', 'Expert', 'Reach 1200 CrownScore', '🥇', 400, 'rating'),
  ('elo_1600', 'Grand Master', 'Reach 1600 CrownScore', '👑', 800, 'rating'),
  ('study_create', 'Scholar', 'Create your first study', '📚', 75, 'studies'),
  ('daily_streak_7', 'Weekly Warrior', 'Solve daily puzzles 7 days in a row', '📅', 200, 'daily');
