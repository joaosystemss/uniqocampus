
-- Add status column to conversations for DM request system
ALTER TABLE public.conversations 
  ADD COLUMN status text NOT NULL DEFAULT 'pending';

-- Add index for filtering by status
CREATE INDEX idx_conversations_status ON public.conversations(status);

-- Trigger: notify on new DM request
CREATE OR REPLACE FUNCTION public.notify_on_dm_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  other_user uuid;
BEGIN
  -- The "other" user is whoever didn't create the conversation
  -- We notify user2 since user1 is always the smaller UUID (creator sorts them)
  -- Actually we notify both, the frontend handles who sees what
  other_user := CASE WHEN NEW.user1_id = auth.uid() THEN NEW.user2_id ELSE NEW.user1_id END;
  
  IF other_user IS NOT NULL AND other_user != auth.uid() THEN
    INSERT INTO public.notifications (user_id, type, actor_id)
    VALUES (other_user, 'dm_request', auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_dm_request
AFTER INSERT ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.notify_on_dm_request();
