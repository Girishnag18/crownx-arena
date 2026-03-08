
-- In-game chat messages (players + spectators)
CREATE TABLE public.game_chat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  message text NOT NULL DEFAULT '',
  emoji text,
  is_reaction boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.game_chat ENABLE ROW LEVEL SECURITY;

-- Everyone can read chat for any game
CREATE POLICY "Game chat viewable by everyone" ON public.game_chat
  FOR SELECT TO authenticated
  USING (true);

-- Authenticated users can send messages
CREATE POLICY "Authenticated users can send chat" ON public.game_chat
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_chat;
