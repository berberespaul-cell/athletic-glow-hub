
-- Add created_by_user_id to test_library for custom tests
ALTER TABLE public.test_library ADD COLUMN IF NOT EXISTS created_by_user_id uuid;

-- Allow authenticated users to insert custom tests
CREATE POLICY "Users can insert custom tests"
ON public.test_library FOR INSERT
TO authenticated
WITH CHECK (created_by_user_id = auth.uid() AND is_custom = true);

-- Allow users to update their own custom tests
CREATE POLICY "Users can update custom tests"
ON public.test_library FOR UPDATE
TO authenticated
USING (created_by_user_id = auth.uid() AND is_custom = true);

-- Allow users to delete their own custom tests
CREATE POLICY "Users can delete custom tests"
ON public.test_library FOR DELETE
TO authenticated
USING (created_by_user_id = auth.uid() AND is_custom = true);
