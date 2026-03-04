
-- Add sex column to profiles
ALTER TABLE profiles ADD COLUMN sex TEXT;

-- Add menstrual_phase column to results
ALTER TABLE results ADD COLUMN menstrual_phase TEXT;
