
-- ==== Enums ====
CREATE TYPE public.app_role AS ENUM ('customer', 'driver', 'admin');
CREATE TYPE public.cylinder_size AS ENUM ('kg9', 'kg19', 'kg48');
CREATE TYPE public.order_status AS ENUM ('pending','assigned','en_route','arriving','delivered','cancelled');
CREATE TYPE public.payment_status AS ENUM ('unpaid','mock_paid','refunded');
CREATE TYPE public.subscription_plan AS ENUM ('plan_2','plan_3');
CREATE TYPE public.billing_cycle AS ENUM ('monthly','quarterly','annual');
CREATE TYPE public.subscription_status AS ENUM ('active','paused','cancelled');
CREATE TYPE public.refill_status AS ENUM ('scheduled','in_progress','completed','skipped');
CREATE TYPE public.loyalty_event_type AS ENUM ('earn','redeem');

-- ==== Shared updated_at trigger ====
CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

-- ==== profiles ====
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ==== user_roles ====
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

-- Profile policies
CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'driver'));
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles self insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- user_roles policies
CREATE POLICY "user_roles self read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ==== addresses ====
CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT,
  formatted_address TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT ALL ON public.addresses TO service_role;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "addresses owner all" ON public.addresses FOR ALL TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'driver')) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_addresses_updated BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ==== cylinder_sizes ====
CREATE TABLE public.cylinder_sizes (
  size public.cylinder_size PRIMARY KEY,
  label TEXT NOT NULL,
  base_price NUMERIC(10,2) NOT NULL
);
GRANT SELECT ON public.cylinder_sizes TO authenticated, anon;
GRANT ALL ON public.cylinder_sizes TO service_role;
ALTER TABLE public.cylinder_sizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cylinder sizes readable" ON public.cylinder_sizes FOR SELECT TO authenticated, anon USING (true);

INSERT INTO public.cylinder_sizes(size,label,base_price) VALUES
 ('kg9','9kg Cylinder', 350.00),
 ('kg19','19kg Cylinder', 680.00),
 ('kg48','48kg Cylinder', 1590.00);

-- ==== orders ====
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cylinder_size public.cylinder_size NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1 CHECK (qty > 0),
  address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL,
  address_snapshot TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  status public.order_status NOT NULL DEFAULT 'pending',
  urgent BOOLEAN NOT NULL DEFAULT false,
  eta TIMESTAMPTZ,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  loyalty_applied BOOLEAN NOT NULL DEFAULT false,
  payment_status public.payment_status NOT NULL DEFAULT 'unpaid',
  subscription_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders customer read" ON public.orders FOR SELECT TO authenticated USING (customer_id = auth.uid() OR driver_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "orders customer insert" ON public.orders FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid());
CREATE POLICY "orders update by driver or admin" ON public.orders FOR UPDATE TO authenticated USING (driver_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR customer_id = auth.uid()) WITH CHECK (true);
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX orders_customer_idx ON public.orders(customer_id, created_at DESC);
CREATE INDEX orders_driver_idx ON public.orders(driver_id, status);

-- ==== order_events ====
CREATE TABLE public.order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status public.order_status NOT NULL,
  note TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  actor_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_events TO authenticated;
GRANT ALL ON public.order_events TO service_role;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_events read via order" ON public.order_events FOR SELECT TO authenticated USING (
  EXISTS(SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.customer_id = auth.uid() OR o.driver_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
);
CREATE POLICY "order_events insert by driver or admin" ON public.order_events FOR INSERT TO authenticated WITH CHECK (
  EXISTS(SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.driver_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
);

-- ==== proof_of_delivery ====
CREATE TABLE public.proof_of_delivery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  photo_url TEXT,
  signature_url TEXT,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  driver_id UUID REFERENCES auth.users(id)
);
GRANT SELECT, INSERT ON public.proof_of_delivery TO authenticated;
GRANT ALL ON public.proof_of_delivery TO service_role;
ALTER TABLE public.proof_of_delivery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pod read via order" ON public.proof_of_delivery FOR SELECT TO authenticated USING (
  EXISTS(SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.customer_id = auth.uid() OR o.driver_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
);
CREATE POLICY "pod insert by driver" ON public.proof_of_delivery FOR INSERT TO authenticated WITH CHECK (
  EXISTS(SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.driver_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
);

-- ==== subscriptions ====
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan public.subscription_plan NOT NULL,
  cylinder_size public.cylinder_size NOT NULL,
  billing_cycle public.billing_cycle NOT NULL DEFAULT 'monthly',
  usage_frequency_days INTEGER NOT NULL DEFAULT 30,
  next_refill_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  status public.subscription_status NOT NULL DEFAULT 'active',
  address_id UUID REFERENCES public.addresses(id),
  monthly_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions owner" ON public.subscriptions FOR ALL TO authenticated USING (customer_id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (customer_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_subscriptions_updated BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ==== subscription_refills ====
CREATE TABLE public.subscription_refills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  status public.refill_status NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.subscription_refills TO authenticated;
GRANT ALL ON public.subscription_refills TO service_role;
ALTER TABLE public.subscription_refills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "refills via subscription" ON public.subscription_refills FOR SELECT TO authenticated USING (
  EXISTS(SELECT 1 FROM public.subscriptions s WHERE s.id = subscription_id AND (s.customer_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'driver')))
);

-- ==== loyalty ====
CREATE TABLE public.loyalty_credits (
  customer_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits INTEGER NOT NULL DEFAULT 0,
  lifetime_earned INTEGER NOT NULL DEFAULT 0,
  free_cylinders_redeemed INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.loyalty_credits TO authenticated;
GRANT ALL ON public.loyalty_credits TO service_role;
ALTER TABLE public.loyalty_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loyalty owner" ON public.loyalty_credits FOR SELECT TO authenticated USING (customer_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.loyalty_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.loyalty_event_type NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.loyalty_events TO authenticated;
GRANT ALL ON public.loyalty_events TO service_role;
ALTER TABLE public.loyalty_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loyalty events owner" ON public.loyalty_events FOR SELECT TO authenticated USING (customer_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ==== driver_locations ====
CREATE TABLE public.driver_locations (
  driver_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.driver_locations TO authenticated;
GRANT ALL ON public.driver_locations TO service_role;
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "driver_locations self write" ON public.driver_locations FOR ALL TO authenticated USING (driver_id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (driver_id = auth.uid());
CREATE POLICY "driver_locations read by involved" ON public.driver_locations FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin')
  OR driver_id = auth.uid()
  OR EXISTS(SELECT 1 FROM public.orders o WHERE o.driver_id = driver_locations.driver_id AND o.customer_id = auth.uid() AND o.status IN ('assigned','en_route','arriving'))
);

-- ==== notifications ====
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications owner" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "notifications owner update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ==== support_messages ====
CREATE TABLE public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_role public.app_role NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "support owner or admin" ON public.support_messages FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "support owner insert" ON public.support_messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ==== New user bootstrap trigger ====
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles(id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'customer') ON CONFLICT DO NOTHING;
  INSERT INTO public.loyalty_credits(customer_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==== Realtime ====
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
