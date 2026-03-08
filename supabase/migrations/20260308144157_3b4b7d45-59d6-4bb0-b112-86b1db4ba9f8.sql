-- Make user_id nullable on profiles
ALTER TABLE public.profiles ALTER COLUMN user_id DROP NOT NULL;

-- Drop the foreign key constraint to auth.users so coach-created profiles work
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- Allow athletes to claim unclaimed profiles
CREATE POLICY "Athletes can claim unclaimed profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id IS NULL AND invite_code IS NOT NULL)
WITH CHECK (user_id = auth.uid());