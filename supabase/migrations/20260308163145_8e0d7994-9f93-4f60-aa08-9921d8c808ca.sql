
CREATE TABLE public.cosmetic_loadouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Loadout',
  item_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cosmetic_loadouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own loadouts" ON public.cosmetic_loadouts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own loadouts" ON public.cosmetic_loadouts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own loadouts" ON public.cosmetic_loadouts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own loadouts" ON public.cosmetic_loadouts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
