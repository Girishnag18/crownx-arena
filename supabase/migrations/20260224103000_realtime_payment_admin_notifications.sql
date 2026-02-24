-- Real-time payment audit trail for admin notifications
CREATE TABLE IF NOT EXISTS public.payment_admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  wallet_transaction_id UUID NOT NULL UNIQUE REFERENCES public.wallet_transactions(id) ON DELETE CASCADE,
  admin_phone TEXT NOT NULL DEFAULT '6300427079',
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment notifications"
  ON public.payment_admin_notifications FOR SELECT
  USING (auth.uid() = player_id);

CREATE OR REPLACE FUNCTION public.enqueue_payment_admin_notification()
RETURNS TRIGGER AS $$
DECLARE
  player_name TEXT;
BEGIN
  SELECT COALESCE(username, 'Player')
  INTO player_name
  FROM public.profiles
  WHERE id = NEW.player_id;

  INSERT INTO public.payment_admin_notifications (
    player_id,
    wallet_transaction_id,
    message
  )
  VALUES (
    NEW.player_id,
    NEW.id,
    format(
      'UPI payment success | user=%s | amount_rupees=%s | crowns=%s | txn_ref=%s',
      player_name,
      NEW.amount_rupees,
      NEW.crowns_credited,
      NEW.upi_txn_ref
    )
  )
  ON CONFLICT (wallet_transaction_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_enqueue_payment_admin_notification ON public.wallet_transactions;
CREATE TRIGGER trg_enqueue_payment_admin_notification
  AFTER INSERT ON public.wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_payment_admin_notification();

ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_admin_notifications;
