
-- Add wallet_crowns column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_crowns numeric NOT NULL DEFAULT 0;

-- Create tournaments table
CREATE TABLE IF NOT EXISTS public.tournaments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  prize_pool numeric NOT NULL DEFAULT 0,
  max_players integer NOT NULL DEFAULT 128,
  status text NOT NULL DEFAULT 'open',
  created_by uuid NOT NULL REFERENCES auth.users(id),
  starts_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tournaments viewable by everyone" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create tournaments" ON public.tournaments FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator can update tournament" ON public.tournaments FOR UPDATE USING (auth.uid() = created_by);

-- Create tournament_registrations table
CREATE TABLE IF NOT EXISTS public.tournament_registrations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES auth.users(id),
  registered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, player_id)
);

ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Registrations viewable by everyone" ON public.tournament_registrations FOR SELECT USING (true);
CREATE POLICY "Players can register" ON public.tournament_registrations FOR INSERT WITH CHECK (auth.uid() = player_id);
CREATE POLICY "Players can unregister" ON public.tournament_registrations FOR DELETE USING (auth.uid() = player_id);

-- Create wallet_transactions table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id uuid NOT NULL REFERENCES auth.users(id),
  amount numeric NOT NULL,
  txn_type text NOT NULL DEFAULT 'topup',
  upi_ref text,
  upi_provider text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view own transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = player_id);
CREATE POLICY "Players can insert own transactions" ON public.wallet_transactions FOR INSERT WITH CHECK (auth.uid() = player_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_registrations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;

-- RPC: topup_wallet_via_upi
CREATE OR REPLACE FUNCTION public.topup_wallet_via_upi(topup_rupees numeric, upi_ref text, upi_provider text)
RETURNS TABLE(wallet_balance numeric) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Check duplicate UTR
  IF EXISTS (SELECT 1 FROM public.wallet_transactions wt WHERE wt.upi_ref = topup_wallet_via_upi.upi_ref) THEN
    RAISE EXCEPTION 'This UPI reference has already been used';
  END IF;

  -- Credit wallet
  UPDATE public.profiles SET wallet_crowns = wallet_crowns + topup_rupees WHERE id = auth.uid();

  -- Record transaction
  INSERT INTO public.wallet_transactions (player_id, amount, txn_type, upi_ref, upi_provider)
  VALUES (auth.uid(), topup_rupees, 'topup', topup_wallet_via_upi.upi_ref, topup_wallet_via_upi.upi_provider);

  RETURN QUERY SELECT p.wallet_crowns FROM public.profiles p WHERE p.id = auth.uid();
END;
$$;

-- RPC: register_tournament_with_wallet
CREATE OR REPLACE FUNCTION public.register_tournament_with_wallet(target_tournament uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_wallet numeric;
  v_status text;
  v_current_count integer;
  v_max integer;
BEGIN
  SELECT wallet_crowns INTO v_wallet FROM public.profiles WHERE id = auth.uid();
  IF v_wallet < 2 THEN
    RAISE EXCEPTION 'Insufficient wallet balance. Need 2 crowns.';
  END IF;

  SELECT status, max_players INTO v_status, v_max FROM public.tournaments WHERE id = target_tournament;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;
  IF v_status != 'open' THEN
    RAISE EXCEPTION 'Tournament is not open for registration';
  END IF;

  SELECT COUNT(*) INTO v_current_count FROM public.tournament_registrations WHERE tournament_id = target_tournament;
  IF v_current_count >= v_max THEN
    RAISE EXCEPTION 'Tournament is full';
  END IF;

  -- Deduct 2 crowns
  UPDATE public.profiles SET wallet_crowns = wallet_crowns - 2 WHERE id = auth.uid();

  -- Register
  INSERT INTO public.tournament_registrations (tournament_id, player_id) VALUES (target_tournament, auth.uid());

  -- Record transaction
  INSERT INTO public.wallet_transactions (player_id, amount, txn_type)
  VALUES (auth.uid(), -2, 'tournament_entry');
END;
$$;
