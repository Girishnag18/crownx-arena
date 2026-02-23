-- Fix private room join/update policy so non-host users can join waiting rooms.
DROP POLICY IF EXISTS "Host or guest can update room" ON public.game_rooms;

CREATE POLICY "Host or guest can update room" ON public.game_rooms
  FOR UPDATE USING (
    auth.uid() = host_id
    OR auth.uid() = guest_id
    OR (
      status = 'waiting'
      AND guest_id IS NULL
      AND auth.uid() <> host_id
    )
  );

-- Realtime tournaments
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

CREATE POLICY "Tournaments are viewable by everyone" ON public.tournaments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create tournaments" ON public.tournaments
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Tournament creators can update tournaments" ON public.tournaments
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Tournament registrations are viewable by everyone" ON public.tournament_registrations
  FOR SELECT USING (true);

CREATE POLICY "Players can register to tournaments" ON public.tournament_registrations
  FOR INSERT WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Players can unregister themselves" ON public.tournament_registrations
  FOR DELETE USING (auth.uid() = player_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_registrations;
