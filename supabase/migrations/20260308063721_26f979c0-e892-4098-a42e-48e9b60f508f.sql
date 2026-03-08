
-- Clubs table
CREATE TABLE public.clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  logo_url text,
  owner_id uuid NOT NULL,
  member_count integer NOT NULL DEFAULT 1,
  total_wins integer NOT NULL DEFAULT 0,
  total_games integer NOT NULL DEFAULT 0,
  avg_rating integer NOT NULL DEFAULT 400,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Club members table
CREATE TABLE public.club_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(club_id, user_id)
);

-- RLS on clubs
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clubs viewable by everyone" ON public.clubs
  FOR SELECT USING (true);

CREATE POLICY "Owner can create clubs" ON public.clubs
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owner can update clubs" ON public.clubs
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owner can delete clubs" ON public.clubs
  FOR DELETE USING (auth.uid() = owner_id);

-- RLS on club_members
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club members viewable by everyone" ON public.club_members
  FOR SELECT USING (true);

CREATE POLICY "Users can join clubs" ON public.club_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave clubs" ON public.club_members
  FOR DELETE USING (auth.uid() = user_id);

-- Allow club owner to remove members
CREATE POLICY "Club owner can remove members" ON public.club_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.clubs WHERE id = club_members.club_id AND owner_id = auth.uid()
    )
  );
