
CREATE OR REPLACE FUNCTION public.handle_order_delivered() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_credits INTEGER;
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS DISTINCT FROM 'delivered') THEN
    -- ensure loyalty row
    INSERT INTO public.loyalty_credits(customer_id) VALUES (NEW.customer_id) ON CONFLICT DO NOTHING;

    IF NEW.loyalty_applied THEN
      INSERT INTO public.loyalty_events(customer_id, type, order_id, amount) VALUES (NEW.customer_id,'redeem',NEW.id, 10);
      UPDATE public.loyalty_credits SET free_cylinders_redeemed = free_cylinders_redeemed + 1, updated_at = now() WHERE customer_id = NEW.customer_id;
    ELSE
      UPDATE public.loyalty_credits
        SET credits = credits + NEW.qty,
            lifetime_earned = lifetime_earned + NEW.qty,
            updated_at = now()
        WHERE customer_id = NEW.customer_id
        RETURNING credits INTO new_credits;
      INSERT INTO public.loyalty_events(customer_id, type, order_id, amount) VALUES (NEW.customer_id,'earn',NEW.id, NEW.qty);
      IF new_credits >= 10 THEN
        UPDATE public.loyalty_credits SET credits = credits - 10, updated_at = now() WHERE customer_id = NEW.customer_id;
        INSERT INTO public.notifications(user_id, title, body)
          VALUES (NEW.customer_id, 'Free cylinder unlocked! 🎉', 'You reached 10 cylinders. Your next order gets a free cylinder.');
      END IF;
    END IF;
  END IF;

  -- Log status change event
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.order_events(order_id, status, actor_id, note) VALUES (NEW.id, NEW.status, auth.uid(), NULL);
  END IF;

  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.handle_order_delivered() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_order_status_change AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_order_delivered();

-- On insert order, log initial event
CREATE OR REPLACE FUNCTION public.handle_order_insert() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.order_events(order_id, status, actor_id, note) VALUES (NEW.id, NEW.status, auth.uid(), 'Order created');
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.handle_order_insert() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_order_created AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.handle_order_insert();

-- Helper: get next order eligible for loyalty redemption? We handle in-app.
