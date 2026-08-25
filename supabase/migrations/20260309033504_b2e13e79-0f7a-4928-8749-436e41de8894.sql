
-- Community messages table
CREATE TABLE public.community_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text,
  media_url text,
  media_type text DEFAULT 'text',
  is_anonymous boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;

-- Everyone can read messages
CREATE POLICY "Community messages viewable by everyone"
ON public.community_messages FOR SELECT
TO authenticated
USING (true);

-- Members can insert messages
CREATE POLICY "Members can send messages"
ON public.community_messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.community_members cm
    WHERE cm.community_id = community_messages.community_id
    AND cm.user_id = auth.uid()
  )
);

-- Users can delete own messages
CREATE POLICY "Users can delete own messages"
ON public.community_messages FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;

-- Storage bucket for community media (images + audio)
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-media', 'community-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload community media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'community-media');

CREATE POLICY "Anyone can view community media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'community-media');

CREATE POLICY "Users can delete own community media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'community-media' AND (storage.foldername(name))[1] = auth.uid()::text);
