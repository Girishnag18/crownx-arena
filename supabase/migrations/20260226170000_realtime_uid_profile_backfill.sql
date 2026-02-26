-- Ensure player UID and social tables exist for real-time user identity flows.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS player_uid VARCHAR(8);

CREATE OR REPLACE FUNCTION public.generate_player_uid()
RETURNS VARCHAR(8)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  generated_uid VARCHAR(8);
BEGIN
  LOOP
    generated_uid := LPAD((FLOOR(RANDOM() * 100000000)::BIGINT)::TEXT, 8, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE player_uid = generated_uid);
  END LOOP;

  RETURN generated_uid;
END;
$$;

UPDATE public.profiles
SET player_uid = public.generate_player_uid()
WHERE player_uid IS NULL
   OR player_uid !~ '^[0-9]{8}$';

ALTER TABLE public.profiles
  ALTER COLUMN player_uid SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_player_uid_key ON public.profiles(player_uid);

CREATE OR REPLACE FUNCTION public.ensure_profile_uid()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.player_uid IS NULL OR NEW.player_uid !~ '^[0-9]{8}$' THEN
    NEW.player_uid := public.generate_player_uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_player_uid ON public.profiles;
CREATE TRIGGER trg_profiles_player_uid
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.ensure_profile_uid();

-- Keep auth signup resilient in case old trigger was missing during deployment.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO UPDATE
    SET username = COALESCE(public.profiles.username, EXCLUDED.username);
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(requester_id, addressee_id)
);

CREATE TABLE IF NOT EXISTS public.player_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'general',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'friendships' AND policyname = 'friendships_select_own') THEN
    CREATE POLICY friendships_select_own ON public.friendships
      FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'friendships' AND policyname = 'friendships_insert_own') THEN
    CREATE POLICY friendships_insert_own ON public.friendships
      FOR INSERT WITH CHECK (auth.uid() = requester_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'friendships' AND policyname = 'friendships_update_participants') THEN
    CREATE POLICY friendships_update_participants ON public.friendships
      FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = addressee_id)
      WITH CHECK (auth.uid() = requester_id OR auth.uid() = addressee_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'player_notifications' AND policyname = 'player_notifications_select_own') THEN
    CREATE POLICY player_notifications_select_own ON public.player_notifications
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'player_notifications' AND policyname = 'player_notifications_insert_own') THEN
    CREATE POLICY player_notifications_insert_own ON public.player_notifications
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'player_notifications' AND policyname = 'player_notifications_update_own') THEN
    CREATE POLICY player_notifications_update_own ON public.player_notifications
      FOR UPDATE USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_notifications;
