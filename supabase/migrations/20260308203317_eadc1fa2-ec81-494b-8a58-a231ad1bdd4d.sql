
-- Stories table
CREATE TABLE public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  text text,
  image_url text,
  song_id text,
  song_title text,
  song_artist text,
  is_anonymous boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stories are viewable by everyone"
  ON public.stories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own stories"
  ON public.stories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories"
  ON public.stories FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create storage bucket for story images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('stories', 'stories', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

-- Storage policies for stories bucket
CREATE POLICY "Anyone can view story images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'stories');

CREATE POLICY "Users can upload story images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'stories' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their story images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'stories' AND (storage.foldername(name))[1] = auth.uid()::text);
