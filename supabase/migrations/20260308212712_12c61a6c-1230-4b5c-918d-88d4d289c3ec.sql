
-- Followers table
CREATE TABLE public.followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Followers viewable by everyone" ON public.followers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can follow" ON public.followers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" ON public.followers
  FOR DELETE TO authenticated USING (auth.uid() = follower_id);

CREATE INDEX idx_followers_following ON public.followers(following_id);
CREATE INDEX idx_followers_follower ON public.followers(follower_id);

-- Trigger: notify on new follower
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF NEW.following_id != NEW.follower_id THEN
    INSERT INTO public.notifications (user_id, type, actor_id)
    VALUES (NEW.following_id, 'follow', NEW.follower_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_follow
AFTER INSERT ON public.followers
FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();
