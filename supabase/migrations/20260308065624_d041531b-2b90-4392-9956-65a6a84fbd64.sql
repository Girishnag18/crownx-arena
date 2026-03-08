
-- Shop items catalog
CREATE TABLE public.shop_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'title',
  icon text NOT NULL DEFAULT '🎁',
  price_crowns int NOT NULL DEFAULT 10,
  rarity text NOT NULL DEFAULT 'common',
  metadata jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop items viewable by everyone"
  ON public.shop_items FOR SELECT
  TO authenticated USING (true);

-- Player purchases
CREATE TABLE public.shop_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_id uuid REFERENCES public.shop_items(id) ON DELETE CASCADE NOT NULL,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  is_equipped boolean NOT NULL DEFAULT false,
  UNIQUE(user_id, item_id)
);

ALTER TABLE public.shop_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases"
  ON public.shop_purchases FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchases"
  ON public.shop_purchases FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own purchases"
  ON public.shop_purchases FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

-- Seed shop items
INSERT INTO public.shop_items (name, description, category, icon, price_crowns, rarity) VALUES
  ('Strategist', 'Display "Strategist" title on your profile', 'title', '🧠', 50, 'common'),
  ('Grandmaster', 'Display "Grandmaster" title on your profile', 'title', '♚', 200, 'rare'),
  ('The Immortal', 'Display "The Immortal" legendary title', 'title', '⚡', 500, 'legendary'),
  ('Chess Wizard', 'Display "Chess Wizard" title', 'title', '🧙', 100, 'uncommon'),
  ('Gold Frame', 'Golden avatar frame', 'avatar_frame', '🖼️', 150, 'rare'),
  ('Diamond Frame', 'Diamond-studded avatar frame', 'avatar_frame', '💎', 400, 'legendary'),
  ('Flame Frame', 'Animated flame avatar frame', 'avatar_frame', '🔥', 250, 'rare'),
  ('Crown Badge', 'Special crown badge on profile', 'badge', '👑', 75, 'uncommon'),
  ('Star Badge', 'Shining star badge', 'badge', '⭐', 100, 'uncommon'),
  ('Lightning Badge', 'Lightning bolt badge for speed players', 'badge', '⚡', 120, 'rare'),
  ('Classic Board', 'Classic wooden board theme', 'board_theme', '♟️', 80, 'common'),
  ('Midnight Board', 'Dark midnight board theme', 'board_theme', '🌙', 150, 'rare'),
  ('Ocean Board', 'Ocean blue board theme', 'board_theme', '🌊', 200, 'rare');
