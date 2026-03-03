-- Tournament heartbeat: resolve timed-out matches and auto-advance finished rounds.

CREATE OR REPLACE FUNCTION public.tournament_bracket_tick(target_tournament UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament public.tournaments%ROWTYPE;
  v_current_round INTEGER;
  v_updated INTEGER := 0;
  v_match RECORD;
  v_game RECORD;
  v_decided_winner UUID;
  v_a_score INTEGER;
  v_b_score INTEGER;
BEGIN
  SELECT * INTO v_tournament
  FROM public.tournaments
  WHERE id = target_tournament
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;

  IF v_tournament.created_by <> auth.uid() THEN
    RAISE EXCEPTION 'Only the tournament creator can run bracket heartbeat';
  END IF;

  IF v_tournament.status <> 'live' THEN
    RETURN 0;
  END IF;

  v_current_round := COALESCE(v_tournament.current_round, 1);

  FOR v_match IN
    SELECT *
    FROM public.tournament_matches tm
    WHERE tm.tournament_id = target_tournament
      AND tm.round_number = v_current_round
      AND tm.winner_id IS NULL
      AND tm.status IN ('pending', 'active')
  LOOP
    v_decided_winner := NULL;

    IF v_match.game_id IS NOT NULL THEN
      SELECT g.winner_id, g.result_type
      INTO v_game
      FROM public.games g
      WHERE g.id = v_match.game_id;

      IF FOUND AND v_game.result_type IN ('checkmate','resignation','timeout') AND v_game.winner_id IS NOT NULL THEN
        v_decided_winner := v_game.winner_id;
      ELSIF FOUND AND v_game.result_type IN ('draw','stalemate') THEN
        SELECT crown_score INTO v_a_score FROM public.profiles WHERE id = v_match.player1_id;
        SELECT crown_score INTO v_b_score FROM public.profiles WHERE id = v_match.player2_id;
        IF COALESCE(v_a_score, 0) = COALESCE(v_b_score, 0) THEN
          v_decided_winner := CASE WHEN random() > 0.5 THEN v_match.player1_id ELSE v_match.player2_id END;
        ELSE
          v_decided_winner := CASE WHEN COALESCE(v_a_score, 0) >= COALESCE(v_b_score, 0) THEN v_match.player1_id ELSE v_match.player2_id END;
        END IF;
      END IF;
    END IF;

    IF v_decided_winner IS NULL AND v_match.deadline_at IS NOT NULL AND now() >= v_match.deadline_at THEN
      IF v_match.player1_id IS NULL THEN
        v_decided_winner := v_match.player2_id;
      ELSIF v_match.player2_id IS NULL THEN
        v_decided_winner := v_match.player1_id;
      ELSE
        SELECT crown_score INTO v_a_score FROM public.profiles WHERE id = v_match.player1_id;
        SELECT crown_score INTO v_b_score FROM public.profiles WHERE id = v_match.player2_id;
        IF COALESCE(v_a_score, 0) = COALESCE(v_b_score, 0) THEN
          v_decided_winner := CASE WHEN random() > 0.5 THEN v_match.player1_id ELSE v_match.player2_id END;
        ELSE
          v_decided_winner := CASE WHEN COALESCE(v_a_score, 0) >= COALESCE(v_b_score, 0) THEN v_match.player1_id ELSE v_match.player2_id END;
        END IF;
      END IF;
    END IF;

    IF v_decided_winner IS NOT NULL THEN
      UPDATE public.tournament_matches
      SET winner_id = v_decided_winner,
          status = CASE WHEN v_match.deadline_at IS NOT NULL AND now() >= v_match.deadline_at THEN 'timeout' ELSE 'completed' END
      WHERE id = v_match.id;
      v_updated := v_updated + 1;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM public.tournament_matches tm
    WHERE tm.tournament_id = target_tournament
      AND tm.round_number = v_current_round
      AND tm.winner_id IS NULL
      AND tm.status IN ('pending','active')
  ) THEN
    PERFORM public.advance_tournament_bracket(target_tournament);
    v_updated := v_updated + 1;
  END IF;

  RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.tournament_bracket_tick(UUID) TO authenticated;
