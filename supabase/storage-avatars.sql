-- Storage policies for the 'avatars' bucket
-- Run this in the Supabase SQL editor

-- Allow authenticated users to upload to their own folder (uid/*)
CREATE POLICY "avatars_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to update/overwrite their own files
CREATE POLICY "avatars_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete their own files
CREATE POLICY "avatars_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read (bucket is already public, but this makes it explicit)
CREATE POLICY "avatars_select"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- Add bio column to profiles if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text DEFAULT '';
