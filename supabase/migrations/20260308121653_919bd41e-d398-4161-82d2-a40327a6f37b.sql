
-- Add invite_code and coach_created_by to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invite_code text UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coach_created_by uuid;

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  name text NOT NULL,
  sport sport_type NOT NULL DEFAULT 'hybrid',
  level text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can select own teams" ON teams
  FOR SELECT TO authenticated USING (auth.uid() = coach_id);
CREATE POLICY "Coaches can insert own teams" ON teams
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = coach_id);
CREATE POLICY "Coaches can update own teams" ON teams
  FOR UPDATE TO authenticated USING (auth.uid() = coach_id);
CREATE POLICY "Coaches can delete own teams" ON teams
  FOR DELETE TO authenticated USING (auth.uid() = coach_id);

-- Create team_members linking table
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(team_id, profile_id)
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can select team members" ON team_members
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM teams WHERE teams.id = team_members.team_id AND teams.coach_id = auth.uid()));
CREATE POLICY "Coaches can insert team members" ON team_members
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM teams WHERE teams.id = team_members.team_id AND teams.coach_id = auth.uid()));
CREATE POLICY "Coaches can update team members" ON team_members
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM teams WHERE teams.id = team_members.team_id AND teams.coach_id = auth.uid()));
CREATE POLICY "Coaches can delete team members" ON team_members
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM teams WHERE teams.id = team_members.team_id AND teams.coach_id = auth.uid()));

CREATE POLICY "Athletes can view own team memberships" ON team_members
  FOR SELECT TO authenticated
  USING (get_profile_user_id(profile_id) = auth.uid());

-- Function to check if coach created a profile
CREATE OR REPLACE FUNCTION public.is_coach_creator(_coach_id uuid, _profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = _profile_id AND coach_created_by = _coach_id
  )
$$;

-- Function to generate unique invite codes
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  code text;
  exists_already boolean;
BEGIN
  LOOP
    code := upper(substr(md5(random()::text), 1, 8));
    SELECT EXISTS(SELECT 1 FROM profiles WHERE invite_code = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END;
$$;

-- Coaches can manage profiles they created
CREATE POLICY "Coaches can view created profiles" ON profiles
  FOR SELECT TO authenticated USING (coach_created_by = auth.uid());
CREATE POLICY "Coaches can update created profiles" ON profiles
  FOR UPDATE TO authenticated USING (coach_created_by = auth.uid());
CREATE POLICY "Coaches can insert created profiles" ON profiles
  FOR INSERT TO authenticated WITH CHECK (coach_created_by = auth.uid());

-- Coaches can manage results for profiles they created
CREATE POLICY "Coaches can insert results for created athletes" ON results
  FOR INSERT TO authenticated WITH CHECK (is_coach_creator(auth.uid(), profile_id));
CREATE POLICY "Coaches can view results for created athletes" ON results
  FOR SELECT TO authenticated USING (is_coach_creator(auth.uid(), profile_id));
CREATE POLICY "Coaches can update results for created athletes" ON results
  FOR UPDATE TO authenticated USING (is_coach_creator(auth.uid(), profile_id));
CREATE POLICY "Coaches can delete results for created athletes" ON results
  FOR DELETE TO authenticated USING (is_coach_creator(auth.uid(), profile_id));
