
-- Matchmaking queue table
CREATE TABLE public.matchmaking_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_mode TEXT NOT NULL DEFAULT 'quick_play',
  rating INTEGER NOT NULL DEFAULT 1200,
  region TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(player_id)
);

ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view queue" ON public.matchmaking_queue
  FOR SELECT USING (true);

CREATE POLICY "Players can join queue" ON public.matchmaking_queue
  FOR INSERT WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Players can leave queue" ON public.matchmaking_queue
  FOR DELETE USING (auth.uid() = player_id);

-- Game rooms for private games
CREATE TABLE public.game_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT NOT NULL UNIQUE,
  host_id UUID NOT NULL REFERENCES public.profiles(id),
  guest_id UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'waiting',
  game_id UUID REFERENCES public.games(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rooms are viewable by everyone" ON public.game_rooms
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create rooms" ON public.game_rooms
  FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Host or guest can update room" ON public.game_rooms
  FOR UPDATE USING (auth.uid() = host_id OR auth.uid() = guest_id);

CREATE POLICY "Host can delete room" ON public.game_rooms
  FOR DELETE USING (auth.uid() = host_id);

-- Add moves column to games for real-time sync
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS moves JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS current_fen TEXT DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS player_white UUID REFERENCES public.profiles(id);
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS player_black UUID REFERENCES public.profiles(id);

-- Allow players to update their own games
CREATE POLICY "Players can update their games" ON public.games
  FOR UPDATE USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- Enable realtime for games and matchmaking
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matchmaking_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;
