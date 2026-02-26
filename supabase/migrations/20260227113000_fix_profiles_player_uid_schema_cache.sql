-- Ensure profiles.player_uid exists and refresh PostgREST schema cache.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS player_uid VARCHAR(10);

UPDATE public.profiles
SET player_uid = public.generate_player_uid()
WHERE player_uid IS NULL
   OR player_uid !~ '^[0-9]{10}$';

ALTER TABLE public.profiles
  ALTER COLUMN player_uid SET NOT NULL;

DROP INDEX IF EXISTS profiles_player_uid_key;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_player_uid_key ON public.profiles(player_uid);

NOTIFY pgrst, 'reload schema';
