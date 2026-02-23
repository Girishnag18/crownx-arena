-- Wallet + UPI top-up support and paid tournament registrations
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS wallet_crowns NUMERIC(12,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_rupees NUMERIC(12,2) NOT NULL CHECK (amount_rupees > 0),
  crowns_credited NUMERIC(12,2) NOT NULL CHECK (crowns_credited > 0),
  upi_txn_ref TEXT NOT NULL,
  upi_app TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (upi_txn_ref)
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet transactions"
  ON public.wallet_transactions FOR SELECT
  USING (auth.uid() = player_id);

CREATE POLICY "Users can create own wallet transactions"
  ON public.wallet_transactions FOR INSERT
  WITH CHECK (auth.uid() = player_id);

CREATE OR REPLACE FUNCTION public.normalize_room_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.room_code = upper(trim(NEW.room_code));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS normalize_game_room_code ON public.game_rooms;
CREATE TRIGGER normalize_game_room_code
  BEFORE INSERT OR UPDATE ON public.game_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_room_code();

CREATE OR REPLACE FUNCTION public.topup_wallet_via_upi(
  topup_rupees NUMERIC,
  upi_ref TEXT,
  upi_provider TEXT DEFAULT NULL
)
RETURNS TABLE (
  wallet_balance NUMERIC,
  credited_crowns NUMERIC
) AS $$
DECLARE
  uid UUID := auth.uid();
  normalized_ref TEXT := upper(trim(upi_ref));
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF topup_rupees IS NULL OR topup_rupees <= 0 THEN
    RAISE EXCEPTION 'Top up amount must be greater than 0';
  END IF;

  IF normalized_ref = '' THEN
    RAISE EXCEPTION 'UPI transaction reference is required';
  END IF;

  INSERT INTO public.wallet_transactions (player_id, amount_rupees, crowns_credited, upi_txn_ref, upi_app, status)
  VALUES (uid, topup_rupees, topup_rupees, normalized_ref, upi_provider, 'completed');

  UPDATE public.profiles
  SET wallet_crowns = wallet_crowns + topup_rupees,
      updated_at = now()
  WHERE id = uid;

  RETURN QUERY
    SELECT p.wallet_crowns, topup_rupees
    FROM public.profiles p
    WHERE p.id = uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.register_tournament_with_wallet(target_tournament UUID)
RETURNS TABLE (
  wallet_balance NUMERIC,
  charged_crowns NUMERIC,
  registration_id UUID
) AS $$
DECLARE
  uid UUID := auth.uid();
  current_balance NUMERIC;
  reg_id UUID;
  player_count INTEGER;
  max_player_limit INTEGER;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF target_tournament IS NULL THEN
    RAISE EXCEPTION 'Tournament id is required';
  END IF;

  SELECT max_players INTO max_player_limit
  FROM public.tournaments
  WHERE id = target_tournament
    AND status IN ('open', 'live')
  FOR UPDATE;

  IF max_player_limit IS NULL THEN
    RAISE EXCEPTION 'Tournament is not open for registration';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.tournament_registrations
    WHERE tournament_id = target_tournament
      AND player_id = uid
  ) THEN
    RAISE EXCEPTION 'You are already registered for this tournament';
  END IF;

  SELECT wallet_crowns INTO current_balance
  FROM public.profiles
  WHERE id = uid
  FOR UPDATE;

  IF current_balance < 2 THEN
    RAISE EXCEPTION 'Insufficient crowns. Top up to at least 2 crowns.';
  END IF;

  INSERT INTO public.tournament_registrations (tournament_id, player_id)
  VALUES (target_tournament, uid)
  RETURNING id INTO reg_id;

  UPDATE public.profiles
  SET wallet_crowns = wallet_crowns - 2,
      updated_at = now()
  WHERE id = uid;

  SELECT count(*)::INTEGER INTO player_count
  FROM public.tournament_registrations
  WHERE tournament_id = target_tournament;

  IF player_count >= max_player_limit THEN
    UPDATE public.tournaments
    SET status = 'full'
    WHERE id = target_tournament;
  END IF;

  RETURN QUERY
    SELECT p.wallet_crowns, 2::NUMERIC, reg_id
    FROM public.profiles p
    WHERE p.id = uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.topup_wallet_via_upi(NUMERIC, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_tournament_with_wallet(UUID) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;
