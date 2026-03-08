
-- Battle pass seasons
CREATE TABLE public.battle_pass_seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  season_number int NOT NULL DEFAULT 1,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.battle_pass_seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view battle pass seasons"
  ON public.battle_pass_seasons FOR SELECT
  TO authenticated USING (true);

-- Battle pass tiers (rewards per tier)
CREATE TABLE public.battle_pass_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid REFERENCES public.battle_pass_seasons(id) ON DELETE CASCADE NOT NULL,
  tier_number int NOT NULL,
  xp_required int NOT NULL DEFAULT 0,
  reward_type text NOT NULL DEFAULT 'crowns',
  reward_amount int NOT NULL DEFAULT 0,
  reward_label text NOT NULL DEFAULT '',
  reward_icon text NOT NULL DEFAULT '🎁',
  is_premium boolean NOT NULL DEFAULT false,
  UNIQUE(season_id, tier_number)
);

ALTER TABLE public.battle_pass_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view battle pass tiers"
  ON public.battle_pass_tiers FOR SELECT
  TO authenticated USING (true);

-- Player battle pass progress
CREATE TABLE public.battle_pass_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  season_id uuid REFERENCES public.battle_pass_seasons(id) ON DELETE CASCADE NOT NULL,
  current_xp int NOT NULL DEFAULT 0,
  is_premium boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, season_id)
);

ALTER TABLE public.battle_pass_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own battle pass progress"
  ON public.battle_pass_progress FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own battle pass progress"
  ON public.battle_pass_progress FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own battle pass progress"
  ON public.battle_pass_progress FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

-- Claimed tier rewards
CREATE TABLE public.battle_pass_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tier_id uuid REFERENCES public.battle_pass_tiers(id) ON DELETE CASCADE NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, tier_id)
);

ALTER TABLE public.battle_pass_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own claims"
  ON public.battle_pass_claims FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own claims"
  ON public.battle_pass_claims FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Seed a sample season with tiers
INSERT INTO public.battle_pass_seasons (name, season_number, starts_at, ends_at, status)
VALUES ('Season 1 — Rise of Kings', 1, now(), now() + interval '30 days', 'active');

INSERT INTO public.battle_pass_tiers (season_id, tier_number, xp_required, reward_type, reward_amount, reward_label, reward_icon, is_premium)
SELECT
  s.id,
  t.tier,
  t.xp,
  t.rtype,
  t.amount,
  t.label,
  t.icon,
  t.premium
FROM public.battle_pass_seasons s,
(VALUES
  (1, 100, 'crowns', 50, '50 Crowns', '👑', false),
  (2, 250, 'crowns', 100, '100 Crowns', '👑', false),
  (3, 500, 'xp_boost', 1, 'XP Boost (2x)', '⚡', false),
  (4, 800, 'crowns', 150, '150 Crowns', '👑', false),
  (5, 1200, 'title', 1, 'Title: Strategist', '🏅', true),
  (6, 1700, 'crowns', 200, '200 Crowns', '👑', false),
  (7, 2300, 'avatar_frame', 1, 'Gold Frame', '🖼️', true),
  (8, 3000, 'crowns', 300, '300 Crowns', '👑', false),
  (9, 3800, 'title', 1, 'Title: Grandmaster', '🎖️', true),
  (10, 5000, 'crowns', 500, '500 Crowns + Exclusive Badge', '💎', true)
) AS t(tier, xp, rtype, amount, label, icon, premium)
WHERE s.season_number = 1;
