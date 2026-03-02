
-- ENUM: Sport types
CREATE TYPE public.sport_type AS ENUM ('rugby', 'basketball', 'volleyball', 'hybrid');

-- ENUM: Test families
CREATE TYPE public.test_family AS ENUM (
  'anthropometric', 'jumps', 'vma', 'sprints', 'run',
  'strength', 'streetlifting', 'weightlifting', 'change_of_direction'
);

-- ENUM: App roles
CREATE TYPE public.app_role AS ENUM ('athlete', 'coach');

-- TABLE: profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sport public.sport_type NOT NULL DEFAULT 'hybrid',
  birth_date DATE,
  weight_kg NUMERIC(5,2),
  height_cm NUMERIC(5,2),
  position TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE: user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- TABLE: coach_athletes
CREATE TABLE public.coach_athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  athlete_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (coach_id, athlete_id),
  CHECK (coach_id != athlete_id)
);

-- TABLE: test_library
CREATE TABLE public.test_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  family public.test_family NOT NULL,
  unit TEXT NOT NULL,
  description TEXT,
  protocol_url TEXT,
  sports public.sport_type[] NOT NULL,
  is_custom BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE: results
CREATE TABLE public.results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  test_id UUID REFERENCES public.test_library(id) NOT NULL,
  session_date DATE NOT NULL,
  value NUMERIC(10,4) NOT NULL,
  reps INTEGER,
  wellness_fatigue SMALLINT CHECK (wellness_fatigue BETWEEN 1 AND 6),
  wellness_sleep SMALLINT CHECK (wellness_sleep BETWEEN 1 AND 6),
  wellness_soreness SMALLINT CHECK (wellness_soreness BETWEEN 1 AND 6),
  wellness_score NUMERIC(4,2) GENERATED ALWAYS AS (
    (wellness_fatigue + wellness_sleep + wellness_soreness)::NUMERIC / 3
  ) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE: benchmarks
CREATE TABLE public.benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES public.test_library(id),
  sport public.sport_type NOT NULL,
  level TEXT NOT NULL,
  gender TEXT NOT NULL DEFAULT 'mixed',
  mean_value NUMERIC(10,4) NOT NULL,
  std_dev NUMERIC(10,4) NOT NULL,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- INDEXES
CREATE INDEX idx_results_profile_id ON public.results(profile_id);
CREATE INDEX idx_results_session_date ON public.results(session_date);
CREATE INDEX idx_results_test_id ON public.results(test_id);
CREATE INDEX idx_coach_athletes_coach ON public.coach_athletes(coach_id);
CREATE INDEX idx_coach_athletes_athlete ON public.coach_athletes(athlete_id);

-- SECURITY DEFINER: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- SECURITY DEFINER: is_coach_of_athlete
CREATE OR REPLACE FUNCTION public.is_coach_of_athlete(_coach_id UUID, _athlete_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.coach_athletes
    WHERE coach_id = _coach_id AND athlete_id = _athlete_id
  )
$$;

-- HELPER: get profile owner
CREATE OR REPLACE FUNCTION public.get_profile_user_id(_profile_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.profiles WHERE id = _profile_id
$$;

-- TRIGGER: auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- TRIGGER: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS: profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Coaches can view linked athlete profiles" ON public.profiles
  FOR SELECT USING (
    public.has_role(auth.uid(), 'coach') AND
    public.is_coach_of_athlete(auth.uid(), user_id)
  );

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile" ON public.profiles
  FOR DELETE USING (auth.uid() = user_id);

-- RLS: user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own role" ON public.user_roles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS: coach_athletes
ALTER TABLE public.coach_athletes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view their links" ON public.coach_athletes
  FOR SELECT USING (auth.uid() = coach_id);

CREATE POLICY "Athletes can view their coach links" ON public.coach_athletes
  FOR SELECT USING (auth.uid() = athlete_id);

CREATE POLICY "Coaches can create links" ON public.coach_athletes
  FOR INSERT WITH CHECK (
    auth.uid() = coach_id AND
    public.has_role(auth.uid(), 'coach')
  );

CREATE POLICY "Coaches can delete their links" ON public.coach_athletes
  FOR DELETE USING (
    auth.uid() = coach_id AND
    public.has_role(auth.uid(), 'coach')
  );

-- RLS: test_library (public read)
ALTER TABLE public.test_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tests" ON public.test_library
  FOR SELECT TO authenticated USING (true);

-- RLS: results
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own results" ON public.results
  FOR SELECT USING (
    public.get_profile_user_id(profile_id) = auth.uid()
  );

CREATE POLICY "Coaches can view linked athlete results" ON public.results
  FOR SELECT USING (
    public.has_role(auth.uid(), 'coach') AND
    public.is_coach_of_athlete(auth.uid(), public.get_profile_user_id(profile_id))
  );

CREATE POLICY "Users can insert own results" ON public.results
  FOR INSERT WITH CHECK (
    public.get_profile_user_id(profile_id) = auth.uid()
  );

CREATE POLICY "Users can update own results" ON public.results
  FOR UPDATE USING (
    public.get_profile_user_id(profile_id) = auth.uid()
  );

CREATE POLICY "Users can delete own results" ON public.results
  FOR DELETE USING (
    public.get_profile_user_id(profile_id) = auth.uid()
  );

-- RLS: benchmarks (public read)
ALTER TABLE public.benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read benchmarks" ON public.benchmarks
  FOR SELECT TO authenticated USING (true);

-- SEED: test_library
INSERT INTO public.test_library (name, family, unit, description, sports) VALUES
  ('CMJ (Counter Movement Jump)', 'jumps', 'cm', 'Jump from standing, arms free. Measures lower-body explosive power.', ARRAY['basketball','volleyball','rugby','hybrid']::public.sport_type[]),
  ('Abalakov Jump', 'jumps', 'cm', 'CMJ with arm swing contribution. Compare to CMJ for arm coordination index.', ARRAY['basketball','volleyball','rugby','hybrid']::public.sport_type[]),
  ('Squat Jump (SJ)', 'jumps', 'cm', 'Jump from static squat position. No pre-stretch. Compare to CMJ for SSC efficiency.', ARRAY['basketball','volleyball','rugby','hybrid']::public.sport_type[]),
  ('Max Reach Jump', 'jumps', 'cm', 'Maximum height reached with one hand. Sport-specific for basketball.', ARRAY['basketball']::public.sport_type[]),
  ('Spike Jump', 'jumps', 'cm', 'Jump simulating a spike approach. Measures volleyball-specific explosive power.', ARRAY['volleyball']::public.sport_type[]),
  ('Broad Jump', 'jumps', 'cm', 'Standing horizontal jump. Measures horizontal power output.', ARRAY['rugby','hybrid']::public.sport_type[]),
  ('Sprint 5m', 'sprints', 's', '5-meter sprint from standing. First-step acceleration.', ARRAY['basketball','hybrid']::public.sport_type[]),
  ('Sprint 10m', 'sprints', 's', '10-meter sprint. Acceleration phase.', ARRAY['basketball','volleyball','hybrid']::public.sport_type[]),
  ('Sprint 20m', 'sprints', 's', '20-meter sprint. Transition from acceleration to top speed.', ARRAY['basketball','volleyball','rugby','hybrid']::public.sport_type[]),
  ('Sprint 40m', 'sprints', 's', '40-meter sprint. Maximum velocity assessment.', ARRAY['rugby','hybrid']::public.sport_type[]),
  ('Lane Agility Drill', 'change_of_direction', 's', 'NBA-standard agility test around the paint.', ARRAY['basketball','hybrid']::public.sport_type[]),
  ('T-Test', 'change_of_direction', 's', 'T-shaped agility test. Measures multi-directional speed.', ARRAY['basketball','volleyball','hybrid']::public.sport_type[]),
  ('T-Test Short', 'change_of_direction', 's', 'Shortened T-test version adapted for volleyball court dimensions.', ARRAY['volleyball']::public.sport_type[]),
  ('Pro-Agility (5-10-5)', 'change_of_direction', 's', 'NFL-style shuttle run. Lateral acceleration and deceleration.', ARRAY['rugby','hybrid']::public.sport_type[]),
  ('5-0-5 Test', 'change_of_direction', 's', '180° change of direction test over 5 meters.', ARRAY['rugby','hybrid']::public.sport_type[]),
  ('30-15 Intermittent Fitness Test (IFT)', 'vma', 'km/h', 'Berthoin protocol. Final stage speed = MAS. Optimal for team sports.', ARRAY['basketball','hybrid']::public.sport_type[]),
  ('Repeated Jump Ability (RJA)', 'vma', 'index', 'Repeated jump series assessing fatigue resistance and elastic energy reuse.', ARRAY['volleyball']::public.sport_type[]),
  ('Bronco Test', 'run', 's', 'Rugby-specific fitness test: 3 x 20m shuttle (x5). Total time recorded.', ARRAY['rugby','hybrid']::public.sport_type[]),
  ('½ Back Squat (1RM)', 'strength', 'kg', 'Half squat to 90°. Use Brzycki formula if testing with sub-maximal reps.', ARRAY['basketball','volleyball','rugby','hybrid']::public.sport_type[]),
  ('Trap Bar Deadlift (1RM)', 'strength', 'kg', 'Hexagonal bar deadlift. Lower injury risk than conventional deadlift.', ARRAY['basketball','volleyball','rugby','hybrid']::public.sport_type[]),
  ('Power Clean (1RM)', 'weightlifting', 'kg', 'Olympic lift. Gold standard for whole-body explosive strength.', ARRAY['basketball','volleyball','rugby','hybrid']::public.sport_type[]),
  ('Bench Press (1RM)', 'strength', 'kg', 'Flat bench press. Upper body pressing strength.', ARRAY['rugby','hybrid']::public.sport_type[]);
