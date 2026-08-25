
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS university text DEFAULT NULL;

-- Create sync function for university badges
CREATE OR REPLACE FUNCTION public.sync_university_badges()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  raw_uni TEXT;
  normalized_uni TEXT;
  mapped_badge TEXT;
BEGIN
  -- Remove previous university badges
  DELETE FROM public.user_badges
  WHERE user_id = NEW.user_id
    AND source = 'automatic'
    AND badge_id LIKE 'uni-%';

  raw_uni := lower(coalesce(NEW.university, ''));
  normalized_uni := regexp_replace(
    translate(raw_uni, 'áàâãäåéèêëíìîïóòôõöúùûüçñýÿºª', 'aaaaaaeeeeiiiiooooouuuucnyyoa'),
    '[^a-z0-9 ]', ' ', 'g'
  );
  normalized_uni := btrim(regexp_replace(normalized_uni, '\s+', ' ', 'g'));

  IF normalized_uni = '' THEN RETURN NEW; END IF;

  mapped_badge := NULL;

  IF normalized_uni LIKE '%ufpi%' OR normalized_uni LIKE '%universidade federal do piaui%' THEN
    mapped_badge := 'uni-ufpi';
  ELSIF normalized_uni LIKE '%uespi%' OR normalized_uni LIKE '%universidade estadual do piaui%' THEN
    mapped_badge := 'uni-uespi';
  ELSIF normalized_uni LIKE '%ifpi%' OR normalized_uni LIKE '%instituto federal do piaui%' THEN
    mapped_badge := 'uni-ifpi';
  ELSIF normalized_uni LIKE '%uninovafapi%' OR normalized_uni LIKE '%novafapi%' THEN
    mapped_badge := 'uni-uninovafapi';
  ELSIF normalized_uni LIKE '%uninassau%' OR normalized_uni LIKE '%nassau%' THEN
    mapped_badge := 'uni-uninassau';
  ELSIF normalized_uni LIKE '%santo agostinho%' OR normalized_uni LIKE '%fsa%' THEN
    mapped_badge := 'uni-fsa';
  ELSIF normalized_uni LIKE '%facid%' OR normalized_uni LIKE '%devry%' THEN
    mapped_badge := 'uni-facid';
  ELSIF normalized_uni LIKE '%chrisfapi%' OR normalized_uni LIKE '%christus%' THEN
    mapped_badge := 'uni-chrisfapi';
  ELSIF normalized_uni LIKE '%estacio%' THEN
    mapped_badge := 'uni-estacio';
  ELSIF normalized_uni LIKE '%unip%' OR normalized_uni LIKE '%universidade paulista%' THEN
    mapped_badge := 'uni-unip';
  ELSIF normalized_uni LIKE '%aespi%' THEN
    mapped_badge := 'uni-aespi';
  ELSIF normalized_uni LIKE '%faeme%' OR normalized_uni LIKE '%meio norte%' THEN
    mapped_badge := 'uni-faeme';
  ELSIF normalized_uni LIKE '%cet%' OR normalized_uni LIKE '%tecnologia de teresina%' THEN
    mapped_badge := 'uni-cet';
  ELSIF normalized_uni LIKE '%alianca%' OR normalized_uni LIKE '%fal%' THEN
    mapped_badge := 'uni-fal';
  ELSIF normalized_uni LIKE '%adelmar%' OR normalized_uni LIKE '%far%' THEN
    mapped_badge := 'uni-far';
  ELSIF normalized_uni LIKE '%novaunesc%' THEN
    mapped_badge := 'uni-novaunesc';
  ELSIF normalized_uni LIKE '%r.sa%' OR normalized_uni LIKE '%r sa%' THEN
    mapped_badge := 'uni-rsa';
  ELSIF normalized_uni LIKE '%undb%' THEN
    mapped_badge := 'uni-undb';
  ELSIF normalized_uni LIKE '%mauricio de nassau%' THEN
    mapped_badge := 'uni-uninassau';
  END IF;

  IF mapped_badge IS NOT NULL THEN
    INSERT INTO public.user_badges (user_id, badge_id, source)
    VALUES (NEW.user_id, mapped_badge, 'automatic')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger
DROP TRIGGER IF EXISTS on_profile_university_change ON public.profiles;
CREATE TRIGGER on_profile_university_change
  AFTER INSERT OR UPDATE OF university ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_university_badges();
