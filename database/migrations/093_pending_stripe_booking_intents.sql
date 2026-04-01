-- Defer public (guest/customer) booking rows until Stripe Checkout succeeds.
-- Intent row holds the same JSON body as /api/guest|customer/bookings POST; checkout session id is set when the session is created.

CREATE TABLE IF NOT EXISTS pending_stripe_booking_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('guest', 'customer')),
  customer_auth_user_id uuid,
  payload jsonb NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents >= 50),
  stripe_checkout_session_id text UNIQUE,
  consumed_at timestamptz,
  created_booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pending_stripe_intents_business ON pending_stripe_booking_intents(business_id);
CREATE INDEX IF NOT EXISTS idx_pending_stripe_intents_session ON pending_stripe_booking_intents(stripe_checkout_session_id);

COMMENT ON TABLE pending_stripe_booking_intents IS 'Book-now Stripe flow: store validated payload until checkout.session.completed creates bookings row(s).';
