
-- Fix: check more specific patterns FIRST (software before eng.)
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
  -- Remove old course badges
  DELETE FROM public.user_badges
  WHERE user_id = NEW.user_id
    AND badge_id IN ('curso-ti', 'curso-eng', 'curso-dir', 'curso-med', 'curso-code')
    AND source = 'automatic';

  course_text := lower(coalesce(NEW.course, ''));
  mapped_badge := NULL;

  IF course_text = '' THEN
    RETURN NEW;
  END IF;

  -- Check SPECIFIC patterns first, then broader ones
  IF course_text LIKE '%software%' OR course_text LIKE '%sistemas de informação%' OR course_text LIKE '%sistemas%' THEN
    mapped_badge := 'curso-ti';
  ELSIF course_text LIKE '%ciência da computação%' OR course_text LIKE '%ciências da computação%' OR course_text LIKE '%comput%' THEN
    mapped_badge := 'curso-code';
  ELSIF course_text LIKE '%medic%' THEN
    mapped_badge := 'curso-med';
  ELSIF course_text LIKE '%direit%' THEN
    mapped_badge := 'curso-dir';
  ELSIF course_text LIKE '%engenh%' OR course_text LIKE '%eng.%' OR course_text LIKE '%eng %' THEN
    mapped_badge := 'curso-eng';
  ELSIF course_text LIKE '%ti%' OR course_text LIKE '%tecnologia da informação%' OR course_text LIKE '%informática%' THEN
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
