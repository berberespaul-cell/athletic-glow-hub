
-- Seasons table for coaches
CREATE TABLE public.seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  name text NOT NULL,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can select own seasons" ON public.seasons FOR SELECT TO authenticated USING (auth.uid() = coach_id);
CREATE POLICY "Coaches can insert own seasons" ON public.seasons FOR INSERT TO authenticated WITH CHECK (auth.uid() = coach_id);
CREATE POLICY "Coaches can update own seasons" ON public.seasons FOR UPDATE TO authenticated USING (auth.uid() = coach_id);
CREATE POLICY "Coaches can delete own seasons" ON public.seasons FOR DELETE TO authenticated USING (auth.uid() = coach_id);

-- Add season_id to results (nullable for backward compat)
ALTER TABLE public.results ADD COLUMN season_id uuid REFERENCES public.seasons(id) ON DELETE SET NULL;
