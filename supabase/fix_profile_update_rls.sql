-- =============================================
-- Fix RLS Policy for Profile Updates
-- Run this in Supabase SQL Editor
-- =============================================

-- Drop and recreate the update policy with proper WITH CHECK
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Verify
SELECT 'Profile UPDATE policy fixed!' as message;
