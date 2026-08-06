-- =====================================================================
-- Subscription refills: admins can schedule an upcoming refill and
-- fulfill it (which creates the actual order, applies a redeemed free
-- cylinder if one's attached, and advances the subscription's next
-- refill date). Previously subscription_refills had no RLS write path
-- at all -- INSERT/UPDATE were granted but nothing let RLS through.
-- =====================================================================

CREATE POLICY "refills admin manage" ON public.subscription_refills FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Schedule the next refill for a subscription (no-op, returns the
-- existing one, if it already has a scheduled refill pending).
CREATE OR REPLACE FUNCTION public.generate_subscription_refill(p_subscription_id UUID) RETURNS public.subscription_refills
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  sub public.subscriptions;
  existing public.subscription_refills;
  new_refill public.subscription_refills;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only admins can schedule refills';
  END IF;

  SELECT * INTO sub FROM public.subscriptions WHERE id = p_subscription_id;
  IF sub.id IS NULL THEN
    RAISE EXCEPTION 'Subscription not found';
  END IF;

  SELECT * INTO existing FROM public.subscription_refills
    WHERE subscription_id = p_subscription_id AND status = 'scheduled' LIMIT 1;
  IF existing.id IS NOT NULL THEN
    RETURN existing;
  END IF;

  INSERT INTO public.subscription_refills(subscription_id, scheduled_date)
    VALUES (p_subscription_id, sub.next_refill_date) RETURNING * INTO new_refill;
  RETURN new_refill;
END; $$;
REVOKE EXECUTE ON FUNCTION public.generate_subscription_refill(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_subscription_refill(uuid) TO authenticated;

-- Fulfill a scheduled refill: creates the order (discounted to 0 if a
-- redeemed free cylinder is attached), marks the refill completed, and
-- advances the subscription's next_refill_date.
CREATE OR REPLACE FUNCTION public.fulfill_subscription_refill(p_refill_id UUID) RETURNS public.orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  refill public.subscription_refills;
  sub public.subscriptions;
  addr public.addresses;
  refill_qty INTEGER;
  unit_price NUMERIC;
  order_total NUMERIC;
  new_order public.orders;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only admins can fulfill refills';
  END IF;

  SELECT * INTO refill FROM public.subscription_refills WHERE id = p_refill_id FOR UPDATE;
  IF refill.id IS NULL THEN
    RAISE EXCEPTION 'Refill not found';
  END IF;
  IF refill.status <> 'scheduled' THEN
    RAISE EXCEPTION 'Refill is already %', refill.status;
  END IF;

  SELECT * INTO sub FROM public.subscriptions WHERE id = refill.subscription_id;
  refill_qty := CASE sub.plan WHEN 'plan_2' THEN 2 ELSE 3 END;
  SELECT base_price INTO unit_price FROM public.cylinder_sizes WHERE size = sub.cylinder_size;
  order_total := CASE WHEN refill.free_cylinder_applied THEN 0 ELSE unit_price * refill_qty END;

  SELECT * INTO addr FROM public.addresses WHERE id = sub.address_id;

  INSERT INTO public.orders(
    customer_id, cylinder_size, qty, address_id, address_snapshot,
    subtotal, total, payment_status, subscription_id, notes, eta
  ) VALUES (
    sub.customer_id, sub.cylinder_size, refill_qty, sub.address_id,
    COALESCE(addr.formatted_address, 'Address on file'),
    unit_price * refill_qty, order_total, 'mock_paid', sub.id,
    CASE WHEN refill.free_cylinder_applied THEN 'Subscription refill — free cylinder reward applied' ELSE 'Subscription refill' END,
    now() + interval '24 hours'
  ) RETURNING * INTO new_order;

  UPDATE public.subscription_refills SET status = 'completed', order_id = new_order.id WHERE id = refill.id;
  UPDATE public.subscriptions SET next_refill_date = (CURRENT_DATE + (usage_frequency_days || ' days')::interval)::date WHERE id = sub.id;

  RETURN new_order;
END; $$;
REVOKE EXECUTE ON FUNCTION public.fulfill_subscription_refill(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fulfill_subscription_refill(uuid) TO authenticated;
