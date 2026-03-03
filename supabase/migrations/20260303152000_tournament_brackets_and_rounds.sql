-- Tournament bracket engine: rounds, pairings, timed windows, and result reporting.

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS round_seconds INTEGER NOT NULL DEFAULT 600,
  ADD COLUMN IF NOT EXISTS current_round INTEGER,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS champion_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.tournament_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL CHECK (round_number > 0),
  match_number INTEGER NOT NULL CHECK (match_number > 0),
  player1_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  player2_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  game_id UUID REFERENCES public.games(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','bye','completed','timeout')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deadline_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, round_number, match_number)
);

CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament_round
  ON public.tournament_matches(tournament_id, round_number, match_number);

ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tournament matches are viewable by everyone" ON public.tournament_matches;
CREATE POLICY "Tournament matches are viewable by everyone"
ON public.tournament_matches
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Tournament creators manage tournament matches" ON public.tournament_matches;
CREATE POLICY "Tournament creators manage tournament matches"
ON public.tournament_matches
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.tournaments t
    WHERE t.id = tournament_id
      AND t.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.tournaments t
    WHERE t.id = tournament_id
      AND t.created_by = auth.uid()
  )
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_matches;

CREATE OR REPLACE FUNCTION public.touch_tournament_matches_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tournament_matches_updated_at ON public.tournament_matches;
CREATE TRIGGER trg_tournament_matches_updated_at
BEFORE UPDATE ON public.tournament_matches
FOR EACH ROW
EXECUTE FUNCTION public.touch_tournament_matches_updated_at();

CREATE OR REPLACE FUNCTION public.start_tournament_bracket(target_tournament UUID, p_round_seconds INTEGER DEFAULT 600)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament public.tournaments%ROWTYPE;
  v_round_seconds INTEGER := GREATEST(60, LEAST(COALESCE(p_round_seconds, 600), 3600));
  v_player_count INTEGER;
  v_seeded_players UUID[];
  v_player UUID;
  v_idx INTEGER := 1;
  v_pair_idx INTEGER := 1;
  v_p1 UUID;
  v_p2 UUID;
  v_start TIMESTAMPTZ := now();
  v_deadline TIMESTAMPTZ := now() + make_interval(secs => v_round_seconds);
  v_created INTEGER := 0;
BEGIN
  SELECT * INTO v_tournament
  FROM public.tournaments
  WHERE id = target_tournament
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;

  IF v_tournament.created_by <> auth.uid() THEN
    RAISE EXCEPTION 'Only the tournament creator can start bracket rounds';
  END IF;

  IF v_tournament.status = 'completed' OR v_tournament.status = 'cancelled' THEN
    RAISE EXCEPTION 'Tournament is already finished';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.tournament_matches tm
    WHERE tm.tournament_id = target_tournament
  ) THEN
    RAISE EXCEPTION 'Tournament bracket already started';
  END IF;

  SELECT ARRAY_AGG(reg.player_id ORDER BY prof.crown_score DESC, reg.registered_at ASC), COUNT(*)
    INTO v_seeded_players, v_player_count
  FROM public.tournament_registrations reg
  JOIN public.profiles prof ON prof.id = reg.player_id
  WHERE reg.tournament_id = target_tournament;

  IF COALESCE(v_player_count, 0) < 2 THEN
    RAISE EXCEPTION 'At least 2 players are required to start a bracket';
  END IF;

  WHILE v_idx <= v_player_count LOOP
    v_p1 := v_seeded_players[v_idx];
    v_p2 := CASE WHEN v_idx + 1 <= v_player_count THEN v_seeded_players[v_idx + 1] ELSE NULL END;

    INSERT INTO public.tournament_matches (
      tournament_id,
      round_number,
      match_number,
      player1_id,
      player2_id,
      winner_id,
      status,
      starts_at,
      deadline_at
    )
    VALUES (
      target_tournament,
      1,
      v_pair_idx,
      v_p1,
      v_p2,
      CASE WHEN v_p2 IS NULL THEN v_p1 ELSE NULL END,
      CASE WHEN v_p2 IS NULL THEN 'bye' ELSE 'active' END,
      v_start,
      v_deadline
    );

    v_created := v_created + 1;
    v_pair_idx := v_pair_idx + 1;
    v_idx := v_idx + 2;
  END LOOP;

  UPDATE public.tournaments
  SET status = 'live',
      round_seconds = v_round_seconds,
      current_round = 1,
      started_at = now(),
      completed_at = NULL,
      champion_id = NULL
  WHERE id = target_tournament;

  RETURN v_created;
END;
$$;

CREATE OR REPLACE FUNCTION public.advance_tournament_bracket(target_tournament UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament public.tournaments%ROWTYPE;
  v_current_round INTEGER;
  v_winners UUID[];
  v_winner_count INTEGER;
  v_created INTEGER := 0;
  v_idx INTEGER := 1;
  v_match_idx INTEGER := 1;
  v_p1 UUID;
  v_p2 UUID;
  v_round_seconds INTEGER;
  v_start TIMESTAMPTZ := now();
  v_deadline TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_tournament
  FROM public.tournaments
  WHERE id = target_tournament
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;

  IF v_tournament.created_by <> auth.uid() THEN
    RAISE EXCEPTION 'Only the tournament creator can advance bracket rounds';
  END IF;

  IF v_tournament.status <> 'live' THEN
    RAISE EXCEPTION 'Tournament is not live';
  END IF;

  v_current_round := COALESCE(v_tournament.current_round, 1);

  IF EXISTS (
    SELECT 1
    FROM public.tournament_matches tm
    WHERE tm.tournament_id = target_tournament
      AND tm.round_number = v_current_round
      AND tm.winner_id IS NULL
      AND tm.status IN ('pending','active')
  ) THEN
    RAISE EXCEPTION 'Current round is still in progress';
  END IF;

  SELECT ARRAY_AGG(tm.winner_id ORDER BY tm.match_number), COUNT(*)
    INTO v_winners, v_winner_count
  FROM public.tournament_matches tm
  WHERE tm.tournament_id = target_tournament
    AND tm.round_number = v_current_round
    AND tm.winner_id IS NOT NULL;

  IF COALESCE(v_winner_count, 0) = 0 THEN
    RAISE EXCEPTION 'No winners available to advance';
  END IF;

  IF v_winner_count = 1 THEN
    UPDATE public.tournaments
    SET status = 'completed',
        champion_id = v_winners[1],
        completed_at = now()
    WHERE id = target_tournament;
    RETURN 0;
  END IF;

  v_round_seconds := GREATEST(60, LEAST(COALESCE(v_tournament.round_seconds, 600), 3600));
  v_deadline := now() + make_interval(secs => v_round_seconds);

  WHILE v_idx <= v_winner_count LOOP
    v_p1 := v_winners[v_idx];
    v_p2 := CASE WHEN v_idx + 1 <= v_winner_count THEN v_winners[v_idx + 1] ELSE NULL END;

    INSERT INTO public.tournament_matches (
      tournament_id,
      round_number,
      match_number,
      player1_id,
      player2_id,
      winner_id,
      status,
      starts_at,
      deadline_at
    )
    VALUES (
      target_tournament,
      v_current_round + 1,
      v_match_idx,
      v_p1,
      v_p2,
      CASE WHEN v_p2 IS NULL THEN v_p1 ELSE NULL END,
      CASE WHEN v_p2 IS NULL THEN 'bye' ELSE 'active' END,
      v_start,
      v_deadline
    );

    v_created := v_created + 1;
    v_match_idx := v_match_idx + 1;
    v_idx := v_idx + 2;
  END LOOP;

  UPDATE public.tournaments
  SET current_round = v_current_round + 1
  WHERE id = target_tournament;

  RETURN v_created;
END;
$$;

CREATE OR REPLACE FUNCTION public.report_tournament_match_result(target_match UUID, target_winner UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match public.tournament_matches%ROWTYPE;
  v_tournament public.tournaments%ROWTYPE;
BEGIN
  SELECT * INTO v_match
  FROM public.tournament_matches
  WHERE id = target_match
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  SELECT * INTO v_tournament
  FROM public.tournaments
  WHERE id = v_match.tournament_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;

  IF v_tournament.status <> 'live' THEN
    RAISE EXCEPTION 'Tournament is not live';
  END IF;

  IF target_winner IS DISTINCT FROM v_match.player1_id
     AND target_winner IS DISTINCT FROM v_match.player2_id THEN
    RAISE EXCEPTION 'Winner must be one of the two players in this match';
  END IF;

  IF auth.uid() IS DISTINCT FROM v_tournament.created_by
     AND auth.uid() IS DISTINCT FROM v_match.player1_id
     AND auth.uid() IS DISTINCT FROM v_match.player2_id THEN
    RAISE EXCEPTION 'Not allowed to report this result';
  END IF;

  UPDATE public.tournament_matches
  SET winner_id = target_winner,
      status = 'completed'
  WHERE id = target_match;

  RETURN target_winner;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_tournament_match_game(target_match UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match public.tournament_matches%ROWTYPE;
  v_game_id UUID;
  v_is_white_first BOOLEAN;
  v_white UUID;
  v_black UUID;
BEGIN
  SELECT * INTO v_match
  FROM public.tournament_matches
  WHERE id = target_match
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF v_match.player1_id IS NULL OR v_match.player2_id IS NULL THEN
    RAISE EXCEPTION 'Cannot launch game for a bye match';
  END IF;

  IF v_match.game_id IS NOT NULL THEN
    RETURN v_match.game_id;
  END IF;

  IF auth.uid() IS DISTINCT FROM v_match.player1_id
     AND auth.uid() IS DISTINCT FROM v_match.player2_id THEN
    RAISE EXCEPTION 'Only match participants can launch this game';
  END IF;

  v_is_white_first := random() > 0.5;
  v_white := CASE WHEN v_is_white_first THEN v_match.player1_id ELSE v_match.player2_id END;
  v_black := CASE WHEN v_is_white_first THEN v_match.player2_id ELSE v_match.player1_id END;

  INSERT INTO public.games (
    player1_id,
    player2_id,
    player_white,
    player_black,
    game_mode,
    result_type,
    current_fen,
    moves
  ) VALUES (
    v_white,
    v_black,
    v_white,
    v_black,
    'private',
    'in_progress',
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    '[]'::jsonb
  )
  RETURNING id INTO v_game_id;

  UPDATE public.tournament_matches
  SET game_id = v_game_id,
      status = 'active'
  WHERE id = target_match;

  RETURN v_game_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_tournament_bracket(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.advance_tournament_bracket(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_tournament_match_result(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_tournament_match_game(UUID) TO authenticated;
