
-- Team Battles table
CREATE TABLE public.team_battles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  opponent_club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  board_count integer NOT NULL DEFAULT 4,
  status text NOT NULL DEFAULT 'pending',
  challenger_score numeric NOT NULL DEFAULT 0,
  opponent_score numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Team Battle boards (individual matches)
CREATE TABLE public.team_battle_boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id uuid NOT NULL REFERENCES public.team_battles(id) ON DELETE CASCADE,
  board_number integer NOT NULL DEFAULT 1,
  challenger_player_id uuid NOT NULL,
  opponent_player_id uuid,
  game_id uuid REFERENCES public.games(id),
  result text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Referrals table
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  referral_code text NOT NULL,
  reward_claimed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(referred_id)
);

-- Add referral_code to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

-- Enable RLS
ALTER TABLE public.team_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_battle_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Team battles policies
CREATE POLICY "Team battles viewable by everyone" ON public.team_battles FOR SELECT USING (true);
CREATE POLICY "Club members can create team battles" ON public.team_battles FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.club_members WHERE club_id = challenger_club_id AND user_id = auth.uid())
);
CREATE POLICY "Participants can update team battles" ON public.team_battles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.club_members WHERE (club_id = challenger_club_id OR club_id = opponent_club_id) AND user_id = auth.uid())
);

-- Team battle boards policies
CREATE POLICY "Battle boards viewable by everyone" ON public.team_battle_boards FOR SELECT USING (true);
CREATE POLICY "Battle participants can insert boards" ON public.team_battle_boards FOR INSERT WITH CHECK (auth.uid() = challenger_player_id);
CREATE POLICY "Battle participants can update boards" ON public.team_battle_boards FOR UPDATE USING (
  auth.uid() = challenger_player_id OR auth.uid() = opponent_player_id
);

-- Referrals policies
CREATE POLICY "Users can view own referrals" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
CREATE POLICY "Users can insert referrals" ON public.referrals FOR INSERT WITH CHECK (auth.uid() = referred_id);
CREATE POLICY "Users can update own referrals" ON public.referrals FOR UPDATE USING (auth.uid() = referrer_id);

-- Generate referral code for existing profiles
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE new_code text;
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    LOOP
      new_code := upper(substr(md5(random()::text), 1, 6));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_code);
    END LOOP;
    NEW.referral_code := new_code;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_referral_code BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();

-- Backfill existing profiles with referral codes
UPDATE public.profiles SET referral_code = upper(substr(md5(id::text || random()::text), 1, 6)) WHERE referral_code IS NULL;
