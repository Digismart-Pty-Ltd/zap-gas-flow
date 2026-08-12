-- =====================================================================
-- Zap Gas: loyalty rework, exclusive cylinder tracking, subscription
-- deposit model, and in-app chat auto-clear.
--
-- Design notes:
--  * billing_cycle / monthly_price on subscriptions are left in place
--    (both already default safely) but are no longer populated by the
--    new subscription flow -- recurring billing is on hold pending the
--    client's confirmation of deposit/refill mechanics. Real Yoco
--    integration for one-time charges can slot in later without a
--    schema change.
--  * Loyalty now only earns on 9kg cylinders delivered against a
--    subscription. Reaching 10 credits sets free_cylinder_ready; only
--    an admin (via redeem_loyalty_reward) can consume it.
-- =====================================================================

-- ==== loyalty_credits: redeem-ready flag ====
ALTER TABLE public.loyalty_credits
  ADD COLUMN IF NOT EXISTS free_cylinder_ready BOOLEAN NOT NULL DEFAULT false;

-- ==== subscriptions: one-time deposit for exclusive cylinder(s) ====
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_payment_status public.payment_status NOT NULL DEFAULT 'unpaid';

-- ==== subscription_refills: track free-cylinder application ====
ALTER TABLE public.subscription_refills
  ADD COLUMN IF NOT EXISTS free_cylinder_applied BOOLEAN NOT NULL DEFAULT false;

-- ==== support_messages: read flag + auto-clear expiry ====
ALTER TABLE public.support_messages
  ADD COLUMN IF NOT EXISTS read BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days');
CREATE INDEX IF NOT EXISTS support_messages_expires_idx ON public.support_messages(expires_at);

DROP POLICY IF EXISTS "support owner or admin" ON public.support_messages;
CREATE POLICY "support owner or admin" ON public.support_messages FOR SELECT TO authenticated
  USING ((user_id = auth.uid() OR public.has_role(auth.uid(),'admin')) AND expires_at > now());

DROP POLICY IF EXISTS "support owner insert" ON public.support_messages;
CREATE POLICY "support owner insert" ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (
    (from_role = 'customer' AND user_id = auth.uid())
    OR (from_role = 'admin' AND public.has_role(auth.uid(),'admin'))
  );

CREATE POLICY "support owner update read" ON public.support_messages FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;

-- Best-effort scheduled cleanup of expired chat messages. If pg_cron
-- isn't enabled on this Supabase project, this quietly no-ops here --
-- call public.cleanup_expired_support_messages() from a scheduled Edge
-- Function instead (Supabase project settings > Cron).
CREATE OR REPLACE FUNCTION public.cleanup_expired_support_messages() RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.support_messages WHERE expires_at <= now();
$$;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_support_messages() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'zap-gas-cleanup-support-messages',
      '0 3 * * *',
      $$SELECT public.cleanup_expired_support_messages();$$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- pg_cron not available / not permitted on this project; skip silently.
  NULL;
END $$;

-- ==== cylinder_assets: exclusive Zap Gas-owned cylinders ====
CREATE TYPE public.cylinder_asset_status AS ENUM ('in_stock','with_customer','in_transit','maintenance','retired');

CREATE TABLE public.cylinder_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_tag TEXT NOT NULL UNIQUE,
  size public.cylinder_size NOT NULL,
  status public.cylinder_asset_status NOT NULL DEFAULT 'in_stock',
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  current_customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.cylinder_assets TO authenticated;
GRANT ALL ON public.cylinder_assets TO service_role;
ALTER TABLE public.cylinder_assets ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_cylinder_assets_updated BEFORE UPDATE ON public.cylinder_assets
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX cylinder_assets_subscription_idx ON public.cylinder_assets(subscription_id);
CREATE INDEX cylinder_assets_status_idx ON public.cylinder_assets(status);

CREATE POLICY "cylinder_assets admin all" ON public.cylinder_assets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "cylinder_assets owner read" ON public.cylinder_assets FOR SELECT TO authenticated
  USING (current_customer_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.subscriptions s WHERE s.id = subscription_id AND s.customer_id = auth.uid()
  ));

-- Assign `p_qty` in-stock assets of the given size to a subscription.
-- Callable by the owning customer (at signup) or an admin.
CREATE OR REPLACE FUNCTION public.assign_subscription_cylinders(
  p_subscription_id UUID, p_customer_id UUID, p_size public.cylinder_size, p_qty INTEGER
) RETURNS SETOF public.cylinder_assets
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE available_count INTEGER;
BEGIN
  IF auth.uid() <> p_customer_id AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized to assign cylinders for this customer';
  END IF;

  SELECT count(*) INTO available_count FROM public.cylinder_assets
    WHERE size = p_size AND status = 'in_stock' AND subscription_id IS NULL;
  IF available_count < p_qty THEN
    RAISE EXCEPTION 'Insufficient % cylinder stock: % available, % requested. Contact an admin to add stock.', p_size, available_count, p_qty;
  END IF;

  RETURN QUERY
  UPDATE public.cylinder_assets ca
    SET subscription_id = p_subscription_id, current_customer_id = p_customer_id, status = 'with_customer'
    WHERE ca.id IN (
      SELECT id FROM public.cylinder_assets
      WHERE size = p_size AND status = 'in_stock' AND subscription_id IS NULL
      ORDER BY created_at ASC LIMIT p_qty FOR UPDATE SKIP LOCKED
    )
    RETURNING ca.*;
END; $$;
REVOKE EXECUTE ON FUNCTION public.assign_subscription_cylinders(uuid, uuid, public.cylinder_size, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_subscription_cylinders(uuid, uuid, public.cylinder_size, integer) TO authenticated;

-- Create a subscription and atomically reserve its exclusive cylinders.
-- Rolls back the whole subscription if stock is insufficient.
CREATE OR REPLACE FUNCTION public.create_subscription_with_cylinders(
  p_customer_id UUID,
  p_plan public.subscription_plan,
  p_cylinder_size public.cylinder_size,
  p_usage_frequency_days INTEGER,
  p_deposit_amount NUMERIC,
  p_address_id UUID
) RETURNS public.subscriptions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  qty INTEGER;
  new_sub public.subscriptions;
BEGIN
  IF auth.uid() <> p_customer_id AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized to create a subscription for this customer';
  END IF;

  qty := CASE p_plan WHEN 'plan_2' THEN 2 ELSE 3 END;

  INSERT INTO public.subscriptions(
    customer_id, plan, cylinder_size, usage_frequency_days, next_refill_date,
    address_id, deposit_amount, deposit_payment_status
  ) VALUES (
    p_customer_id, p_plan, p_cylinder_size, p_usage_frequency_days,
    (CURRENT_DATE + (p_usage_frequency_days || ' days')::interval)::date,
    p_address_id, p_deposit_amount, 'mock_paid'
  ) RETURNING * INTO new_sub;

  -- Reserve exclusive cylinders; raises and rolls back the INSERT above if stock is short.
  PERFORM public.assign_subscription_cylinders(new_sub.id, p_customer_id, p_cylinder_size, qty);

  RETURN new_sub;
END; $$;
REVOKE EXECUTE ON FUNCTION public.create_subscription_with_cylinders(uuid, public.subscription_plan, public.cylinder_size, integer, numeric, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_subscription_with_cylinders(uuid, public.subscription_plan, public.cylinder_size, integer, numeric, uuid) TO authenticated;

-- Release a subscription's exclusive cylinders back to the general pool
-- when it's cancelled.
CREATE OR REPLACE FUNCTION public.handle_subscription_cancelled() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    UPDATE public.cylinder_assets
      SET subscription_id = NULL, current_customer_id = NULL, status = 'in_stock'
      WHERE subscription_id = NEW.id;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.handle_subscription_cancelled() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_subscription_cancelled AFTER UPDATE OF status ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_subscription_cancelled();

-- ==== Loyalty: earn only on 9kg cylinders delivered against a subscription ====
CREATE OR REPLACE FUNCTION public.handle_order_delivered() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_credits INTEGER;
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS DISTINCT FROM 'delivered') THEN
    INSERT INTO public.loyalty_credits(customer_id) VALUES (NEW.customer_id) ON CONFLICT DO NOTHING;

    -- Only 9kg cylinders delivered against a subscription earn credit.
    -- On-demand orders (subscription_id IS NULL) and non-9kg sizes never earn.
    IF NEW.subscription_id IS NOT NULL AND NEW.cylinder_size = 'kg9' AND NOT NEW.loyalty_applied THEN
      UPDATE public.loyalty_credits
        SET credits = credits + NEW.qty,
            lifetime_earned = lifetime_earned + NEW.qty,
            updated_at = now()
        WHERE customer_id = NEW.customer_id
        RETURNING credits INTO new_credits;
      INSERT INTO public.loyalty_events(customer_id, type, order_id, amount) VALUES (NEW.customer_id,'earn',NEW.id, NEW.qty);

      IF new_credits >= 10 THEN
        UPDATE public.loyalty_credits SET free_cylinder_ready = true, updated_at = now() WHERE customer_id = NEW.customer_id;
        INSERT INTO public.notifications(user_id, title, body)
          VALUES (NEW.customer_id, 'Free cylinder unlocked! 🎉', 'You reached 10 cylinders. An admin will apply your free cylinder to an upcoming refill.');
      END IF;
    END IF;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.order_events(order_id, status, actor_id, note) VALUES (NEW.id, NEW.status, auth.uid(), NULL);
  END IF;

  RETURN NEW;
END; $$;

-- Admin-only: redeem a customer's free cylinder reward, applying it to
-- their next scheduled subscription refill.
CREATE OR REPLACE FUNCTION public.redeem_loyalty_reward(p_customer_id UUID) RETURNS public.subscription_refills
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_credits INTEGER;
  target_refill public.subscription_refills;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only admins can redeem loyalty rewards';
  END IF;

  SELECT credits INTO current_credits FROM public.loyalty_credits WHERE customer_id = p_customer_id FOR UPDATE;
  IF current_credits IS NULL OR current_credits < 10 THEN
    RAISE EXCEPTION 'Customer does not have 10 credits available to redeem';
  END IF;

  UPDATE public.loyalty_credits
    SET credits = credits - 10,
        free_cylinders_redeemed = free_cylinders_redeemed + 1,
        free_cylinder_ready = (credits - 10) >= 10,
        updated_at = now()
    WHERE customer_id = p_customer_id;

  INSERT INTO public.loyalty_events(customer_id, type, amount) VALUES (p_customer_id, 'redeem', 10);

  SELECT sr.* INTO target_refill
    FROM public.subscription_refills sr
    JOIN public.subscriptions s ON s.id = sr.subscription_id
    WHERE s.customer_id = p_customer_id AND sr.status = 'scheduled' AND sr.free_cylinder_applied = false
    ORDER BY sr.scheduled_date ASC LIMIT 1 FOR UPDATE;

  IF target_refill.id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.subscription_refills SET free_cylinder_applied = true WHERE id = target_refill.id
    RETURNING * INTO target_refill;

  RETURN target_refill;
END; $$;
REVOKE EXECUTE ON FUNCTION public.redeem_loyalty_reward(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_loyalty_reward(uuid) TO authenticated;
