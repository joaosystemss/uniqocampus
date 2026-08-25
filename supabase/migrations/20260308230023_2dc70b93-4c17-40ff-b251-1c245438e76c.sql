
-- Table to persist user decorations
CREATE TABLE public.user_decorations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  border_id text NOT NULL DEFAULT 'none',
  effect_id text NOT NULL DEFAULT 'none',
  theme_id text NOT NULL DEFAULT 'default',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_decorations ENABLE ROW LEVEL SECURITY;

-- Users can read anyone's decorations
CREATE POLICY "Anyone can read decorations"
  ON public.user_decorations FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own decorations
CREATE POLICY "Users can insert own decorations"
  ON public.user_decorations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own decorations
CREATE POLICY "Users can update own decorations"
  ON public.user_decorations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
