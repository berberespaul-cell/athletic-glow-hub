
-- Session load entries (RPE x duration) used to compute ACWR
CREATE TABLE public.session_loads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL,
  coach_id UUID NOT NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  session_type TEXT NOT NULL DEFAULT 'strength',
  rpe SMALLINT NOT NULL CHECK (rpe BETWEEN 1 AND 10),
  duration_min INTEGER NOT NULL CHECK (duration_min > 0),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_session_loads_profile_date ON public.session_loads(profile_id, session_date DESC);
CREATE INDEX idx_session_loads_coach ON public.session_loads(coach_id);

ALTER TABLE public.session_loads ENABLE ROW LEVEL SECURITY;

-- Coaches manage loads they create for athletes they created
CREATE POLICY "Coaches can view session loads for their athletes"
  ON public.session_loads FOR SELECT TO authenticated
  USING (is_coach_creator(auth.uid(), profile_id) OR coach_id = auth.uid());

CREATE POLICY "Coaches can insert session loads for their athletes"
  ON public.session_loads FOR INSERT TO authenticated
  WITH CHECK (coach_id = auth.uid() AND is_coach_creator(auth.uid(), profile_id));

CREATE POLICY "Coaches can update their session loads"
  ON public.session_loads FOR UPDATE TO authenticated
  USING (coach_id = auth.uid());

CREATE POLICY "Coaches can delete their session loads"
  ON public.session_loads FOR DELETE TO authenticated
  USING (coach_id = auth.uid());

-- Athletes can view (read-only) their own session loads
CREATE POLICY "Athletes can view their own session loads"
  ON public.session_loads FOR SELECT TO authenticated
  USING (get_profile_user_id(profile_id) = auth.uid());

CREATE TRIGGER update_session_loads_updated_at
  BEFORE UPDATE ON public.session_loads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
