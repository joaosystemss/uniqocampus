
CREATE TABLE public.user_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  coins integer NOT NULL DEFAULT 50,
  unlocked_items text[] NOT NULL DEFAULT ARRAY['none', 'default', 'pulse']::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

-- Everyone can read wallets (needed for profile display)
CREATE POLICY "Wallets viewable by everyone"
ON public.user_wallets FOR SELECT
TO authenticated
USING (true);

-- Users can update their own wallet (purchases)
CREATE POLICY "Users can update own wallet"
ON public.user_wallets FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can insert their own wallet
CREATE POLICY "Users can insert own wallet"
ON public.user_wallets FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins can update any wallet
CREATE POLICY "Admins can update any wallet"
ON public.user_wallets FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-create wallet for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_wallets (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_new_user_wallet
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_wallet();
