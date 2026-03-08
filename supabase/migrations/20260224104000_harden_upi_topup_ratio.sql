-- Enforce 1 rupee = 1 crown conversion in wallet top ups
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
  normalized_amount NUMERIC := round(topup_rupees::numeric, 2);
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF normalized_amount IS NULL OR normalized_amount <= 0 THEN
    RAISE EXCEPTION 'Top up amount must be greater than 0';
  END IF;

  IF normalized_ref = '' THEN
    RAISE EXCEPTION 'UPI transaction reference is required';
  END IF;

  INSERT INTO public.wallet_transactions (player_id, amount_rupees, crowns_credited, upi_txn_ref, upi_app, status)
  VALUES (uid, normalized_amount, normalized_amount, normalized_ref, upi_provider, 'completed');

  UPDATE public.profiles
  SET wallet_crowns = wallet_crowns + normalized_amount,
      updated_at = now()
  WHERE id = uid;

  RETURN QUERY
    SELECT p.wallet_crowns, normalized_amount
    FROM public.profiles p
    WHERE p.id = uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
