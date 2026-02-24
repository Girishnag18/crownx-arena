-- Competitive arena platform foundation
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player','admin','moderator')),
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS rank_tier TEXT NOT NULL DEFAULT 'Bronze' CHECK (rank_tier IN ('Bronze','Silver','Gold','Platinum','Diamond')),
  ADD COLUMN IF NOT EXISTS online_status BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS wins INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS losses INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.matchmaking_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_one UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  player_two UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','active','completed','cancelled')),
  accepted_at TIMESTAMPTZ,
  acceptance_deadline TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 second'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS public.user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.matchmaking_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matches readable by participants" ON public.matchmaking_matches
  FOR SELECT USING (auth.uid() = player_one OR auth.uid() = player_two);

CREATE POLICY "achievements readable" ON public.achievements
  FOR SELECT USING (true);

CREATE POLICY "user achievements readable" ON public.user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "reports creator read" ON public.user_reports
  FOR SELECT USING (auth.uid() = reporter_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.matchmaking_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_reports;
