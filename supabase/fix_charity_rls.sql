-- =============================================
-- FIX CHARITY RLS POLICIES
-- The current policy checks auth.users which can fail
-- This version uses profiles table which is more reliable
-- =============================================

-- Drop existing charity write policies
DROP POLICY IF EXISTS "Admins can insert charities" ON charities;
DROP POLICY IF EXISTS "Admins can update charities" ON charities;
DROP POLICY IF EXISTS "Admins can delete charities" ON charities;

-- Create new policies that check profiles table instead of auth.users
-- This avoids the "permission denied for table users" error

-- Policy: Only admins can insert charities (using profiles table)
CREATE POLICY "Admins can insert charities" ON charities
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- Policy: Only admins can update charities (using profiles table)
CREATE POLICY "Admins can update charities" ON charities
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- Policy: Only admins can delete charities (using profiles table)
CREATE POLICY "Admins can delete charities" ON charities
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- Make sure profiles table has the role column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- =============================================
-- IMPORTANT: Create your admin profile
-- Replace YOUR_USER_ID with your actual auth.users id
-- You can find it in Supabase Dashboard > Authentication > Users
-- =============================================

-- Example (uncomment and modify):
-- INSERT INTO profiles (id, email, full_name, role) 
-- VALUES ('YOUR-USER-UUID-HERE', 'your@email.com', 'Your Name', 'admin')
-- ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- Verify policies were created
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'charities';
