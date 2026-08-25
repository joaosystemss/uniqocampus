CREATE OR REPLACE FUNCTION public.sync_semester_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  period_num INT;
BEGIN
  -- Remove all previous period badges and calouro
  DELETE FROM public.user_badges
  WHERE user_id = NEW.user_id
    AND source = 'automatic'
    AND (badge_id LIKE 'periodo-%' OR badge_id = 'calouro');

  period_num := NULL;
  BEGIN
    period_num := NULLIF(btrim(coalesce(NEW.semester, '')), '')::int;
  EXCEPTION WHEN OTHERS THEN
    period_num := NULL;
  END;

  IF period_num IS NULL OR period_num < 1 OR period_num > 12 THEN
    RETURN NEW;
  END IF;

  -- Assign specific period badge
  INSERT INTO public.user_badges (user_id, badge_id, source)
  VALUES (NEW.user_id, 'periodo-' || period_num, 'automatic')
  ON CONFLICT (user_id, badge_id) DO NOTHING;

  -- Also assign calouro for 1st period
  IF period_num = 1 THEN
    INSERT INTO public.user_badges (user_id, badge_id, source)
    VALUES (NEW.user_id, 'calouro', 'automatic')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;