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
  -- Remove any previous automatic course badge for the user
  DELETE FROM public.user_badges
  WHERE user_id = NEW.user_id
    AND source = 'automatic'
    AND badge_id LIKE 'curso-%';

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

  IF normalized_course = '' THEN
    RETURN NEW;
  END IF;

  mapped_badge := NULL;

  IF normalized_course LIKE '%administracao%' THEN
    mapped_badge := 'curso-administracao';
  ELSIF normalized_course LIKE '%arquitetura%' THEN
    mapped_badge := 'curso-arquitetura';
  ELSIF normalized_course LIKE '%biomedicina%' THEN
    mapped_badge := 'curso-biomedicina';
  ELSIF normalized_course LIKE '%ciencia da computacao%'
     OR normalized_course LIKE '%ciencias da computacao%'
     OR normalized_course LIKE '%computacao%'
     OR normalized_course LIKE '%computer science%'
  THEN
    mapped_badge := 'curso-computacao';
  ELSIF normalized_course LIKE '%contabeis%' THEN
    mapped_badge := 'curso-contabeis';
  ELSIF normalized_course LIKE '%design%' THEN
    mapped_badge := 'curso-design';
  ELSIF normalized_course LIKE '%direito%'
     OR normalized_course LIKE '%jurid%'
  THEN
    mapped_badge := 'curso-direito';
  ELSIF normalized_course LIKE '%educacao fisica%' THEN
    mapped_badge := 'curso-educacao-fisica';
  ELSIF normalized_course LIKE '%enfermagem%' THEN
    mapped_badge := 'curso-enfermagem';
  ELSIF normalized_course LIKE '%engenharia civil%'
     OR normalized_course LIKE '%eng civil%'
  THEN
    mapped_badge := 'curso-eng-civil';
  ELSIF normalized_course LIKE '%engenharia de producao%'
     OR normalized_course LIKE '%eng de producao%'
  THEN
    mapped_badge := 'curso-eng-producao';
  ELSIF normalized_course LIKE '%engenharia de software%'
     OR normalized_course LIKE '%eng de software%'
  THEN
    mapped_badge := 'curso-eng-software';
  ELSIF normalized_course LIKE '%engenharia eletrica%'
     OR normalized_course LIKE '%eng eletrica%'
  THEN
    mapped_badge := 'curso-eng-eletrica';
  ELSIF normalized_course LIKE '%engenharia mecanica%'
     OR normalized_course LIKE '%eng mecanica%'
  THEN
    mapped_badge := 'curso-eng-mecanica';
  ELSIF normalized_course LIKE '%farmacia%' THEN
    mapped_badge := 'curso-farmacia';
  ELSIF normalized_course LIKE '%fisioterapia%' THEN
    mapped_badge := 'curso-fisioterapia';
  ELSIF normalized_course LIKE '%marketing%' THEN
    mapped_badge := 'curso-marketing';
  ELSIF normalized_course LIKE '%medicina veterinaria%'
     OR normalized_course LIKE '%veterinaria%'
  THEN
    mapped_badge := 'curso-veterinaria';
  ELSIF normalized_course LIKE '%medicina%' THEN
    mapped_badge := 'curso-medicina';
  ELSIF normalized_course LIKE '%nutricao%' THEN
    mapped_badge := 'curso-nutricao';
  ELSIF normalized_course LIKE '%odontologia%' THEN
    mapped_badge := 'curso-odontologia';
  ELSIF normalized_course LIKE '%pedagogia%' THEN
    mapped_badge := 'curso-pedagogia';
  ELSIF normalized_course LIKE '%psicologia%' THEN
    mapped_badge := 'curso-psicologia';
  ELSIF normalized_course LIKE '%publicidade%' THEN
    mapped_badge := 'curso-publicidade';
  ELSIF normalized_course LIKE '%sistemas de informacao%'
     OR normalized_course LIKE '%sistema de informacao%'
     OR normalized_course LIKE '%tecnologia da informacao%'
     OR normalized_course ~ '(^| )ti( |$)'
  THEN
    mapped_badge := 'curso-sistemas-info';
  END IF;

  IF mapped_badge IS NOT NULL THEN
    INSERT INTO public.user_badges (user_id, badge_id, source)
    VALUES (NEW.user_id, mapped_badge, 'automatic')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;