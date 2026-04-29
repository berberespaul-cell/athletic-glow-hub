CREATE TABLE public.athlete_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL,
  test_id UUID NOT NULL,
  target_value NUMERIC NOT NULL,
  target_date DATE NOT NULL,
  notes TEXT,
  achieved BOOLEAN NOT NULL DEFAULT false,
  achieved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.athlete_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals"
ON public.athlete_goals FOR SELECT
USING (public.get_profile_user_id(profile_id) = auth.uid());

CREATE POLICY "Users can insert own goals"
ON public.athlete_goals FOR INSERT
WITH CHECK (public.get_profile_user_id(profile_id) = auth.uid());

CREATE POLICY "Users can update own goals"
ON public.athlete_goals FOR UPDATE
USING (public.get_profile_user_id(profile_id) = auth.uid());

CREATE POLICY "Users can delete own goals"
ON public.athlete_goals FOR DELETE
USING (public.get_profile_user_id(profile_id) = auth.uid());

CREATE POLICY "Coaches can view goals for created athletes"
ON public.athlete_goals FOR SELECT
USING (public.is_coach_creator(auth.uid(), profile_id));

CREATE INDEX idx_athlete_goals_profile ON public.athlete_goals(profile_id);
CREATE INDEX idx_athlete_goals_test ON public.athlete_goals(test_id);

CREATE TRIGGER update_athlete_goals_updated_at
BEFORE UPDATE ON public.athlete_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();