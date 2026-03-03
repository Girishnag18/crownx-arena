-- Automatically enqueue analysis jobs when a game finishes.

CREATE OR REPLACE FUNCTION public.enqueue_analysis_on_game_end()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.result_type IN ('checkmate','stalemate','resignation','timeout','draw')
     AND COALESCE(OLD.result_type, 'pending') IN ('pending','in_progress')
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.analysis_jobs aj
      WHERE aj.game_id = NEW.id
        AND aj.status IN ('queued','running','done')
    ) THEN
      INSERT INTO public.analysis_jobs (game_id, requested_by, priority)
      VALUES (NEW.id, COALESCE(NEW.player_white, NEW.player_black), 90);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_analysis_on_game_end ON public.games;
CREATE TRIGGER trg_enqueue_analysis_on_game_end
AFTER UPDATE OF result_type ON public.games
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_analysis_on_game_end();
