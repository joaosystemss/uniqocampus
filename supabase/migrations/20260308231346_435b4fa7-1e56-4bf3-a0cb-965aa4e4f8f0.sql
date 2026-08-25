
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  coins_awarded integer NOT NULL DEFAULT 30,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (referred_id)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Referrals viewable by participants"
  ON public.referrals FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Users can insert referral for themselves"
  ON public.referrals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = referred_id);
