-- Compatibility alias for legacy typo: tournments -> tournaments
-- Prevents schema-cache failures from older clients still querying `public.tournments`.
CREATE OR REPLACE VIEW public.tournments AS
SELECT * FROM public.tournaments;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournments TO authenticated;
