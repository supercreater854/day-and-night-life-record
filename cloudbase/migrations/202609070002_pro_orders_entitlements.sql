CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL
    DEFAULT (current_setting('request.jwt.claims', true)::jsonb ->> 'sub'),
  product_id text NOT NULL,
  amount numeric(10, 2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  CONSTRAINT orders_owner_present CHECK (owner_id <> ''),
  CONSTRAINT orders_product_supported CHECK (product_id = 'day-night-pro-monthly'),
  CONSTRAINT orders_amount_supported CHECK (amount = 4.90),
  CONSTRAINT orders_status_supported CHECK (status IN ('pending', 'paid', 'cancelled')),
  CONSTRAINT orders_paid_at_consistent CHECK (
    (status = 'paid' AND paid_at IS NOT NULL) OR
    (status IN ('pending', 'cancelled') AND paid_at IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.entitlements (
  owner_id text NOT NULL
    DEFAULT (current_setting('request.jwt.claims', true)::jsonb ->> 'sub'),
  product_id text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, product_id),
  CONSTRAINT entitlements_owner_present CHECK (owner_id <> ''),
  CONSTRAINT entitlements_product_supported CHECK (product_id = 'day-night-pro-monthly'),
  CONSTRAINT entitlements_status_supported CHECK (status IN ('active', 'expired'))
);

CREATE INDEX IF NOT EXISTS orders_owner_created_idx ON public.orders (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS entitlements_owner_expiry_idx ON public.entitlements (owner_id, expires_at DESC);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.orders FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.entitlements FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.orders TO authenticated;
GRANT SELECT ON public.entitlements TO authenticated;
GRANT ALL ON public.orders, public.entitlements TO service_role;

DROP POLICY IF EXISTS orders_select_own ON public.orders;
CREATE POLICY orders_select_own ON public.orders
  FOR SELECT TO authenticated
  USING (owner_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub'));

DROP POLICY IF EXISTS orders_insert_own_pending ON public.orders;
CREATE POLICY orders_insert_own_pending ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
    AND product_id = 'day-night-pro-monthly'
    AND amount = 4.90
    AND status = 'pending'
    AND paid_at IS NULL
  );

DROP POLICY IF EXISTS entitlements_select_own ON public.entitlements;
CREATE POLICY entitlements_select_own ON public.entitlements
  FOR SELECT TO authenticated
  USING (owner_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub'));

CREATE OR REPLACE FUNCTION public.simulate_pro_payment(p_order_id uuid)
RETURNS SETOF public.entitlements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller_uid text := current_setting('request.jwt.claims', true)::jsonb ->> 'sub';
  paid_order public.orders;
BEGIN
  IF caller_uid IS NULL OR caller_uid = '' THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  UPDATE public.orders
  SET status = 'paid', paid_at = now()
  WHERE id = p_order_id
    AND owner_id = caller_uid
    AND product_id = 'day-night-pro-monthly'
    AND amount = 4.90
    AND status = 'pending'
  RETURNING * INTO paid_order;

  IF paid_order.id IS NULL THEN
    RAISE EXCEPTION 'pending order not found';
  END IF;

  RETURN QUERY
  INSERT INTO public.entitlements (owner_id, product_id, status, expires_at)
  VALUES (caller_uid, 'day-night-pro-monthly', 'active', now() + interval '30 days')
  ON CONFLICT (owner_id, product_id) DO UPDATE
  SET status = 'active',
      expires_at = GREATEST(public.entitlements.expires_at, now()) + interval '30 days',
      updated_at = now()
  RETURNING public.entitlements.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_pro_order(p_order_id uuid)
RETURNS SETOF public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller_uid text := current_setting('request.jwt.claims', true)::jsonb ->> 'sub';
BEGIN
  IF caller_uid IS NULL OR caller_uid = '' THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  RETURN QUERY
  UPDATE public.orders
  SET status = 'cancelled'
  WHERE id = p_order_id
    AND owner_id = caller_uid
    AND status = 'pending'
  RETURNING public.orders.*;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pending order not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.simulate_pro_payment(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_pro_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.simulate_pro_payment(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_pro_order(uuid) TO authenticated, service_role;

COMMENT ON TABLE public.orders IS 'Day and Night simulated Pro orders';
COMMENT ON TABLE public.entitlements IS 'Day and Night account-scoped product entitlements';
COMMENT ON FUNCTION public.simulate_pro_payment(uuid) IS 'TEST ONLY: converts the caller own pending order into a 30-day Pro entitlement';
