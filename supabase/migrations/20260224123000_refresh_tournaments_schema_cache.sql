-- Ensure tournaments artifacts exist and force PostgREST schema cache refresh.
CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  prize_pool INTEGER NOT NULL DEFAULT 0,
  max_players INTEGER NOT NULL DEFAULT 128,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'full', 'live', 'completed')),
  starts_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tournament_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, player_id)
);

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tournaments' AND policyname = 'Tournaments are viewable by everyone'
  ) THEN
    CREATE POLICY "Tournaments are viewable by everyone" ON public.tournaments
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tournaments' AND policyname = 'Authenticated users can create tournaments'
  ) THEN
    CREATE POLICY "Authenticated users can create tournaments" ON public.tournaments
      FOR INSERT WITH CHECK (auth.uid() = created_by);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tournaments' AND policyname = 'Tournament creators can update tournaments'
  ) THEN
    CREATE POLICY "Tournament creators can update tournaments" ON public.tournaments
      FOR UPDATE USING (auth.uid() = created_by);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tournament_registrations' AND policyname = 'Tournament registrations are viewable by everyone'
  ) THEN
    CREATE POLICY "Tournament registrations are viewable by everyone" ON public.tournament_registrations
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tournament_registrations' AND policyname = 'Players can register to tournaments'
  ) THEN
    CREATE POLICY "Players can register to tournaments" ON public.tournament_registrations
      FOR INSERT WITH CHECK (auth.uid() = player_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tournament_registrations' AND policyname = 'Players can unregister themselves'
  ) THEN
    CREATE POLICY "Players can unregister themselves" ON public.tournament_registrations
      FOR DELETE USING (auth.uid() = player_id);
  END IF;
END $$;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_registrations;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

CREATE OR REPLACE VIEW public.tournments AS
SELECT * FROM public.tournaments;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournments TO authenticated;

-- Refresh PostgREST schema cache so the table/view are discoverable without manual restart.
NOTIFY pgrst, 'reload schema';
