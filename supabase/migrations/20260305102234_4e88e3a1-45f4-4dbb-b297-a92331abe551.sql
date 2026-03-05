ALTER TABLE public.results ADD COLUMN IF NOT EXISTS cycle_day integer;
ALTER TABLE public.results ADD COLUMN IF NOT EXISTS wellness_period_pain smallint;