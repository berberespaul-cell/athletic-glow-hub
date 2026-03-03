
-- Weight evolution tracking
CREATE TABLE public.weight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  weight_kg numeric NOT NULL,
  logged_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weight logs"
ON public.weight_logs FOR SELECT
USING (get_profile_user_id(profile_id) = auth.uid());

CREATE POLICY "Users can insert own weight logs"
ON public.weight_logs FOR INSERT
WITH CHECK (get_profile_user_id(profile_id) = auth.uid());

CREATE POLICY "Users can delete own weight logs"
ON public.weight_logs FOR DELETE
USING (get_profile_user_id(profile_id) = auth.uid());

CREATE INDEX idx_weight_logs_profile ON public.weight_logs(profile_id, logged_at DESC);
