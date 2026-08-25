
-- Drop all existing triggers first, then recreate
DROP TRIGGER IF EXISTS trg_update_likes_count ON public.post_likes;
DROP TRIGGER IF EXISTS trg_update_comments_count ON public.comments;
DROP TRIGGER IF EXISTS trg_notify_on_like ON public.post_likes;
DROP TRIGGER IF EXISTS trg_notify_on_comment ON public.comments;
DROP TRIGGER IF EXISTS trg_notify_on_follow ON public.followers;
DROP TRIGGER IF EXISTS trg_notify_on_dm_request ON public.conversations;
DROP TRIGGER IF EXISTS trg_award_post_mission_badges ON public.posts;
DROP TRIGGER IF EXISTS trg_sync_role_badges ON public.user_roles;
DROP TRIGGER IF EXISTS trg_sync_course_badges ON public.profiles;
DROP TRIGGER IF EXISTS trg_new_user_wallet ON public.profiles;
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS trg_sync_semester_badges ON public.profiles;

-- Recreate all triggers
CREATE TRIGGER trg_update_likes_count AFTER INSERT OR DELETE ON public.post_likes FOR EACH ROW EXECUTE FUNCTION public.update_likes_count();
CREATE TRIGGER trg_update_comments_count AFTER INSERT OR DELETE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.update_comments_count();
CREATE TRIGGER trg_notify_on_like AFTER INSERT ON public.post_likes FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();
CREATE TRIGGER trg_notify_on_comment AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();
CREATE TRIGGER trg_notify_on_follow AFTER INSERT ON public.followers FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();
CREATE TRIGGER trg_notify_on_dm_request AFTER INSERT ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.notify_on_dm_request();
CREATE TRIGGER trg_award_post_mission_badges AFTER INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION public.award_post_mission_badges();
CREATE TRIGGER trg_sync_role_badges AFTER INSERT OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.sync_role_badges();
CREATE TRIGGER trg_sync_course_badges AFTER INSERT OR UPDATE OF course ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.sync_course_badges();
CREATE TRIGGER trg_new_user_wallet AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_wallet();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Semester badge function + trigger
CREATE OR REPLACE FUNCTION public.sync_semester_badges()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(coalesce(NEW.semester, '')) IN ('1', '1º', 'primeiro', '1o') THEN
    INSERT INTO public.user_badges (user_id, badge_id, source) VALUES (NEW.user_id, 'calouro', 'automatic') ON CONFLICT (user_id, badge_id) DO NOTHING;
  ELSE
    DELETE FROM public.user_badges WHERE user_id = NEW.user_id AND badge_id = 'calouro' AND source = 'automatic';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_semester_badges AFTER INSERT OR UPDATE OF semester ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.sync_semester_badges();

-- Backfill: award course badges for existing users who have a course set
INSERT INTO public.user_badges (user_id, badge_id, source)
SELECT p.user_id,
  CASE
    WHEN lower(p.course) LIKE '%medic%' THEN 'curso-med'
    WHEN lower(p.course) LIKE '%direit%' THEN 'curso-dir'
    WHEN lower(p.course) LIKE '%engenh%' OR lower(p.course) LIKE '%eng.%' THEN 'curso-eng'
    WHEN lower(p.course) LIKE '%comput%' OR lower(p.course) LIKE '%ciência da computação%' THEN 'curso-code'
    WHEN lower(p.course) LIKE '%software%' OR lower(p.course) LIKE '%sistemas%' OR lower(p.course) LIKE '%ti%' THEN 'curso-ti'
  END,
  'automatic'
FROM public.profiles p
WHERE p.course IS NOT NULL AND p.course != ''
  AND CASE
    WHEN lower(p.course) LIKE '%medic%' THEN 'curso-med'
    WHEN lower(p.course) LIKE '%direit%' THEN 'curso-dir'
    WHEN lower(p.course) LIKE '%engenh%' OR lower(p.course) LIKE '%eng.%' THEN 'curso-eng'
    WHEN lower(p.course) LIKE '%comput%' OR lower(p.course) LIKE '%ciência da computação%' THEN 'curso-code'
    WHEN lower(p.course) LIKE '%software%' OR lower(p.course) LIKE '%sistemas%' OR lower(p.course) LIKE '%ti%' THEN 'curso-ti'
  END IS NOT NULL
ON CONFLICT (user_id, badge_id) DO NOTHING;

-- Backfill wallets for existing users without one
INSERT INTO public.user_wallets (user_id)
SELECT p.user_id FROM public.profiles p
LEFT JOIN public.user_wallets w ON w.user_id = p.user_id
WHERE w.id IS NULL
ON CONFLICT (user_id) DO NOTHING;
