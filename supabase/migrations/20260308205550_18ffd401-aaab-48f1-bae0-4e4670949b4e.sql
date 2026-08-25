-- Roles enum for secure role-based access
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'professor', 'representante', 'user');
  END IF;
END
$$;

-- Badge source enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'badge_source') THEN
    CREATE TYPE public.badge_source AS ENUM ('manual', 'automatic', 'mission', 'role');
  END IF;
END
$$;

-- User roles table (separate from profiles for security)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer helper to avoid recursive RLS checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Policies for user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- User badges table
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  badge_id TEXT NOT NULL,
  source public.badge_source NOT NULL DEFAULT 'automatic',
  awarded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON public.user_badges(badge_id);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User badges are viewable by everyone" ON public.user_badges;
CREATE POLICY "User badges are viewable by everyone"
ON public.user_badges
FOR SELECT
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "Admins can manage user badges" ON public.user_badges;
CREATE POLICY "Admins can manage user badges"
ON public.user_badges
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto badge by post missions
CREATE OR REPLACE FUNCTION public.award_post_mission_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_posts_count INTEGER;
BEGIN
  INSERT INTO public.user_badges (user_id, badge_id, source)
  VALUES (NEW.user_id, 'first-post', 'mission')
  ON CONFLICT (user_id, badge_id) DO NOTHING;

  SELECT COUNT(*) INTO user_posts_count
  FROM public.posts
  WHERE user_id = NEW.user_id;

  IF user_posts_count >= 100 THEN
    INSERT INTO public.user_badges (user_id, badge_id, source)
    VALUES (NEW.user_id, '100-posts', 'mission')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_post_mission_badges ON public.posts;
CREATE TRIGGER trg_award_post_mission_badges
AFTER INSERT ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.award_post_mission_badges();

-- Auto badge by role assignment
CREATE OR REPLACE FUNCTION public.sync_role_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mapped_badge TEXT;
BEGIN
  mapped_badge := CASE (CASE WHEN TG_OP = 'DELETE' THEN OLD.role ELSE NEW.role END)
    WHEN 'admin' THEN 'admin'
    WHEN 'moderator' THEN 'mod'
    WHEN 'professor' THEN 'professor'
    WHEN 'representante' THEN 'rep-turma'
    ELSE NULL
  END;

  IF mapped_badge IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.user_badges (user_id, badge_id, source)
    VALUES (NEW.user_id, mapped_badge, 'role')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.user_badges
    WHERE user_id = OLD.user_id
      AND badge_id = mapped_badge
      AND source = 'role';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_role_badges ON public.user_roles;
CREATE TRIGGER trg_sync_role_badges
AFTER INSERT OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.sync_role_badges();

-- Auto badge by course (mission/profile progression)
CREATE OR REPLACE FUNCTION public.sync_course_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  course_text TEXT;
  mapped_badge TEXT;
BEGIN
  DELETE FROM public.user_badges
  WHERE user_id = NEW.user_id
    AND badge_id IN ('curso-ti', 'curso-eng', 'curso-dir', 'curso-med', 'curso-code')
    AND source = 'automatic';

  course_text := lower(coalesce(NEW.course, ''));
  mapped_badge := NULL;

  IF course_text = '' THEN
    RETURN NEW;
  END IF;

  IF course_text LIKE '%medic%' THEN
    mapped_badge := 'curso-med';
  ELSIF course_text LIKE '%direit%' THEN
    mapped_badge := 'curso-dir';
  ELSIF course_text LIKE '%engenh%' OR course_text LIKE '%eng.%' THEN
    mapped_badge := 'curso-eng';
  ELSIF course_text LIKE '%comput%' OR course_text LIKE '%ciência da computação%' THEN
    mapped_badge := 'curso-code';
  ELSIF course_text LIKE '%software%' OR course_text LIKE '%sistemas%' OR course_text LIKE '%ti%' THEN
    mapped_badge := 'curso-ti';
  END IF;

  IF mapped_badge IS NOT NULL THEN
    INSERT INTO public.user_badges (user_id, badge_id, source)
    VALUES (NEW.user_id, mapped_badge, 'automatic')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_course_badges ON public.profiles;
CREATE TRIGGER trg_sync_course_badges
AFTER INSERT OR UPDATE OF course ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_course_badges();