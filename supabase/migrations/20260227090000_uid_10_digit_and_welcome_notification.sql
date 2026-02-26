-- Move profile UID to a 10-digit numeric format and auto-create welcome notifications.
CREATE OR REPLACE FUNCTION public.generate_player_uid()
RETURNS VARCHAR(10)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  generated_uid VARCHAR(10);
BEGIN
  LOOP
    generated_uid := LPAD((FLOOR(RANDOM() * 10000000000)::BIGINT)::TEXT, 10, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE player_uid = generated_uid);
  END LOOP;

  RETURN generated_uid;
END;
$$;

UPDATE public.profiles
SET player_uid = public.generate_player_uid()
WHERE player_uid IS NULL
   OR player_uid !~ '^[0-9]{10}$';

ALTER TABLE public.profiles
  ALTER COLUMN player_uid TYPE VARCHAR(10);

DROP INDEX IF EXISTS profiles_player_uid_key;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_player_uid_key ON public.profiles(player_uid);

CREATE OR REPLACE FUNCTION public.ensure_profile_uid()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.player_uid IS NULL OR NEW.player_uid !~ '^[0-9]{10}$' THEN
    NEW.player_uid := public.generate_player_uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_new_user_welcome()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.player_notifications
    WHERE user_id = NEW.id
      AND kind = 'welcome'
  ) THEN
    INSERT INTO public.player_notifications (user_id, title, message, kind)
    VALUES (
      NEW.id,
      'Welcome to CrownX Arena 👑',
      'Welcome aboard! We''re excited to have you in our chess arena. Build your profile, challenge players, and enjoy your first games.',
      'welcome'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_user_welcome ON public.profiles;
CREATE TRIGGER trg_notify_new_user_welcome
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_user_welcome();

INSERT INTO public.player_notifications (user_id, title, message, kind)
SELECT p.id,
       'Welcome to CrownX Arena 👑',
       'Welcome aboard! We''re excited to have you in our chess arena. Build your profile, challenge players, and enjoy your first games.',
       'welcome'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1
  FROM public.player_notifications pn
  WHERE pn.user_id = p.id
    AND pn.kind = 'welcome'
);
