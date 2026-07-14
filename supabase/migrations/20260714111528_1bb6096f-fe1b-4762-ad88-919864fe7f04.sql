
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;

DROP POLICY IF EXISTS "orders update by driver or admin" ON public.orders;
CREATE POLICY "orders update by driver or admin" ON public.orders FOR UPDATE TO authenticated
  USING (driver_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR customer_id = auth.uid())
  WITH CHECK (driver_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR customer_id = auth.uid());
