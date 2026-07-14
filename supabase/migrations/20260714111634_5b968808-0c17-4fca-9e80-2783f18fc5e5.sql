
-- avatars: user folder = auth.uid()
CREATE POLICY "avatars own read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars own write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars own update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- pod-photos & signatures: driver uploads under order_id/... 
CREATE POLICY "pod driver insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('pod-photos','signatures') AND EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id::text = (storage.foldername(name))[1] AND (o.driver_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  ));
CREATE POLICY "pod involved read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('pod-photos','signatures') AND EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id::text = (storage.foldername(name))[1] AND (o.customer_id = auth.uid() OR o.driver_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  ));
