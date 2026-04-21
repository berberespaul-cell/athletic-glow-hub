
CREATE TABLE public.scheduled_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('test', 'sport_training', 'workout')),
  test_id UUID REFERENCES public.test_library(id) ON DELETE SET NULL,
  event_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scheduled events"
ON public.scheduled_events FOR SELECT
USING (get_profile_user_id(profile_id) = auth.uid());

CREATE POLICY "Users can insert own scheduled events"
ON public.scheduled_events FOR INSERT
WITH CHECK (get_profile_user_id(profile_id) = auth.uid());

CREATE POLICY "Users can update own scheduled events"
ON public.scheduled_events FOR UPDATE
USING (get_profile_user_id(profile_id) = auth.uid());

CREATE POLICY "Users can delete own scheduled events"
ON public.scheduled_events FOR DELETE
USING (get_profile_user_id(profile_id) = auth.uid());

CREATE POLICY "Coaches can view scheduled events for created athletes"
ON public.scheduled_events FOR SELECT
USING (is_coach_creator(auth.uid(), profile_id));

CREATE POLICY "Coaches can insert scheduled events for created athletes"
ON public.scheduled_events FOR INSERT
WITH CHECK (is_coach_creator(auth.uid(), profile_id));

CREATE POLICY "Coaches can update scheduled events for created athletes"
ON public.scheduled_events FOR UPDATE
USING (is_coach_creator(auth.uid(), profile_id));

CREATE POLICY "Coaches can delete scheduled events for created athletes"
ON public.scheduled_events FOR DELETE
USING (is_coach_creator(auth.uid(), profile_id));

CREATE INDEX idx_scheduled_events_profile_date ON public.scheduled_events(profile_id, event_date);
