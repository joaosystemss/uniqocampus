
-- Avatars storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']);

CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Posts media bucket (photos + videos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('posts', 'posts', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']);

CREATE POLICY "Anyone can view post media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'posts');

CREATE POLICY "Users can upload post media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'posts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete post media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'posts' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Add media columns to posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS media_url text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS media_type text; -- 'image' or 'video'

-- Update stories bucket to allow videos too
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'],
    file_size_limit = 52428800
WHERE id = 'stories';

-- Add video support to stories
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS media_type text DEFAULT 'image'; -- 'image' or 'video'
