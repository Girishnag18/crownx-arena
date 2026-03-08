-- Compatibility alias for legacy typo: tournments -> tournaments
-- Prevents schema-cache failures from older clients still querying `public.tournments`.
CREATE VIEW IF NOT EXISTS public.tournments AS
SELECT * FROM public.tournaments;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournments TO authenticated;
