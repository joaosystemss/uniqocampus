CREATE OR REPLACE FUNCTION public.sync_course_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  raw_course TEXT;
  normalized_course TEXT;
  mapped_badge TEXT;
BEGIN
  DELETE FROM public.user_badges
  WHERE user_id = NEW.user_id
    AND badge_id IN ('curso-ti', 'curso-eng', 'curso-dir', 'curso-med', 'curso-code')
    AND source = 'automatic';

  raw_course := lower(coalesce(NEW.course, ''));

  normalized_course := regexp_replace(
    translate(
      raw_course,
      'áàâãäåéèêëíìîïóòôõöúùûüçñýÿºª',
      'aaaaaaeeeeiiiiooooouuuucnyyoa'
    ),
    '[^a-z0-9 ]',
    ' ',
    'g'
  );
  normalized_course := regexp_replace(normalized_course, '\s+', ' ', 'g');
  normalized_course := btrim(normalized_course);

  mapped_badge := NULL;

  IF normalized_course = '' THEN
    RETURN NEW;
  END IF;

  -- Computação/Código
  IF normalized_course LIKE '%ciencia da computacao%'
     OR normalized_course LIKE '%ciencias da computacao%'
     OR normalized_course LIKE '%computacao%'
     OR normalized_course LIKE '%computer science%'
  THEN
    mapped_badge := 'curso-code';

  -- TI/Sistemas/Software
  ELSIF normalized_course LIKE '%engenharia de software%'
     OR normalized_course LIKE '%software%'
     OR normalized_course LIKE '%sistemas de informacao%'
     OR normalized_course LIKE '%sistema de informacao%'
     OR normalized_course LIKE '%analise e desenvolvimento de sistemas%'
     OR normalized_course LIKE '%ads%'
     OR normalized_course LIKE '%informatica%'
     OR normalized_course LIKE '%tecnologia da informacao%'
     OR normalized_course ~ '(^| )ti( |$)'
  THEN
    mapped_badge := 'curso-ti';

  -- Engenharia/Arquitetura
  ELSIF normalized_course LIKE '%engenharia%'
     OR normalized_course LIKE '%arquitetura%'
     OR normalized_course ~ '(^| )eng( |$)'
  THEN
    mapped_badge := 'curso-eng';

  -- Direito/Humanas/Gestão
  ELSIF normalized_course LIKE '%direito%'
     OR normalized_course LIKE '%jurid%'
     OR normalized_course LIKE '%administracao%'
     OR normalized_course LIKE '%contabeis%'
     OR normalized_course LIKE '%marketing%'
     OR normalized_course LIKE '%publicidade%'
     OR normalized_course LIKE '%pedagogia%'
     OR normalized_course LIKE '%educacao%'
  THEN
    mapped_badge := 'curso-dir';

  -- Saúde
  ELSIF normalized_course LIKE '%medicina%'
     OR normalized_course LIKE '%enfermagem%'
     OR normalized_course LIKE '%farmacia%'
     OR normalized_course LIKE '%fisioterapia%'
     OR normalized_course LIKE '%odontologia%'
     OR normalized_course LIKE '%nutricao%'
     OR normalized_course LIKE '%biomedicina%'
     OR normalized_course LIKE '%veterinaria%'
     OR normalized_course LIKE '%psicologia%'
  THEN
    mapped_badge := 'curso-med';
  END IF;

  IF mapped_badge IS NOT NULL THEN
    INSERT INTO public.user_badges (user_id, badge_id, source)
    VALUES (NEW.user_id, mapped_badge, 'automatic')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;