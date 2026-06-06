
CREATE POLICY "auth view listing images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'listing-images');
CREATE POLICY "anon view listing images" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'listing-images');
CREATE POLICY "auth upload own listing folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'listing-images' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "auth manage own listing files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'listing-images' AND (auth.uid())::text = (storage.foldername(name))[1]);
