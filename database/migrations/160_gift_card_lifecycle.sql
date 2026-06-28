-- Phase 3: gift card lifecycle — scheduled send + booking-cancel balance restore

ALTER TABLE public.gift_card_instances
  ADD COLUMN IF NOT EXISTS recipient_name text,
  ADD COLUMN IF NOT EXISTS purchaser_name text,
  ADD COLUMN IF NOT EXISTS scheduled_send_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS email_sent_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS email_image_url text;

-- Extend status to allow pending scheduled delivery
ALTER TABLE public.gift_card_instances
  DROP CONSTRAINT IF EXISTS gift_card_instances_status_check;

ALTER TABLE public.gift_card_instances
  ADD CONSTRAINT gift_card_instances_status_check
  CHECK (status = ANY (ARRAY[
    'active'::text,
    'pending_send'::text,
    'expired'::text,
    'fully_redeemed'::text,
    'cancelled'::text
  ]));

CREATE INDEX IF NOT EXISTS idx_gift_card_instances_scheduled_send
  ON public.gift_card_instances (business_id, scheduled_send_at)
  WHERE status = 'pending_send' AND scheduled_send_at IS NOT NULL;

COMMENT ON COLUMN public.gift_card_instances.scheduled_send_at IS 'When set, recipient email is sent at or after this time (status pending_send until sent)';
COMMENT ON COLUMN public.gift_card_instances.email_sent_at IS 'Timestamp when gift card notification email was delivered';

-- Restore gift card balance when a booking with a redemption is cancelled (not for expired/cancelled cards)
CREATE OR REPLACE FUNCTION refund_gift_card_for_booking(
  p_booking_id uuid,
  p_business_id uuid,
  p_description text DEFAULT 'Booking cancelled — gift card balance restored'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  inst RECORD;
  refunded_count integer := 0;
  total_refunded numeric := 0;
  new_balance numeric;
  balance_before numeric;
BEGIN
  IF p_booking_id IS NULL OR p_business_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error_message', 'booking_id and business_id are required');
  END IF;

  FOR r IN
    SELECT
      t.id AS tx_id,
      t.gift_card_instance_id,
      t.amount AS redeem_amount,
      t.customer_id
    FROM gift_card_transactions t
    WHERE t.booking_id = p_booking_id
      AND t.business_id = p_business_id
      AND t.transaction_type = 'redemption'
      AND NOT EXISTS (
        SELECT 1
        FROM gift_card_transactions rf
        WHERE rf.booking_id = p_booking_id
          AND rf.gift_card_instance_id = t.gift_card_instance_id
          AND rf.transaction_type = 'refund'
      )
  LOOP
    SELECT *
    INTO inst
    FROM gift_card_instances
    WHERE id = r.gift_card_instance_id
      AND business_id = p_business_id
    FOR UPDATE;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    IF inst.status = 'cancelled' THEN
      CONTINUE;
    END IF;

    IF inst.expires_at IS NOT NULL AND inst.expires_at < NOW() THEN
      CONTINUE;
    END IF;

    balance_before := inst.current_balance;
    new_balance := LEAST(inst.original_amount, balance_before + r.redeem_amount);

    IF new_balance <= balance_before THEN
      CONTINUE;
    END IF;

    UPDATE gift_card_instances
    SET
      current_balance = new_balance,
      status = CASE
        WHEN new_balance > 0 THEN 'active'
        ELSE status
      END,
      updated_at = NOW()
    WHERE id = inst.id;

    INSERT INTO gift_card_transactions (
      business_id,
      gift_card_instance_id,
      transaction_type,
      amount,
      balance_before,
      balance_after,
      booking_id,
      customer_id,
      description,
      transaction_date
    ) VALUES (
      p_business_id,
      inst.id,
      'refund',
      r.redeem_amount,
      balance_before,
      new_balance,
      p_booking_id,
      r.customer_id,
      COALESCE(p_description, 'Booking cancelled — gift card balance restored'),
      NOW()
    );

    refunded_count := refunded_count + 1;
    total_refunded := total_refunded + r.redeem_amount;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'refunded_count', refunded_count,
    'total_refunded', total_refunded
  );
END;
$$;

GRANT EXECUTE ON FUNCTION refund_gift_card_for_booking(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION refund_gift_card_for_booking(uuid, uuid, text) TO service_role;
