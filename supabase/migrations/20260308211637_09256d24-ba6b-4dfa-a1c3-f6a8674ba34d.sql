ALTER TABLE public.profiles ADD COLUMN is_verified boolean NOT NULL DEFAULT false;

-- Set existing verified users
UPDATE public.profiles SET is_verified = true WHERE username IN ('voce', 'campus_oficial', 'prof_silva');