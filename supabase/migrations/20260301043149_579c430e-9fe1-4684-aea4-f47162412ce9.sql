
-- Change default crown_score from 1200 to 400
ALTER TABLE public.profiles ALTER COLUMN crown_score SET DEFAULT 400;

-- Update existing profiles that still have the default 1200 and 0 games played to 400
UPDATE public.profiles SET crown_score = 400 WHERE crown_score = 1200 AND games_played = 0;
