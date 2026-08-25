
-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL, -- 'like', 'comment'
  actor_id uuid NOT NULL,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- Index for fast queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id, created_at DESC);

-- Trigger: notify on like
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  post_owner uuid;
BEGIN
  SELECT user_id INTO post_owner FROM public.posts WHERE id = NEW.post_id;
  IF post_owner IS NOT NULL AND post_owner != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, actor_id, post_id)
    VALUES (post_owner, 'like', NEW.user_id, NEW.post_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_like
AFTER INSERT ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();

-- Trigger: notify on comment
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  post_owner uuid;
BEGIN
  SELECT user_id INTO post_owner FROM public.posts WHERE id = NEW.post_id;
  IF post_owner IS NOT NULL AND post_owner != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, actor_id, post_id, comment_id)
    VALUES (post_owner, 'comment', NEW.user_id, NEW.post_id, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_comment
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
