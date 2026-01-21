-- =============================================
-- FIX RLS PERMISSION ERROR (403)
-- The error "permission denied for table users" happens because
-- the previous policies tried to read the 'auth.users' table directly.
-- Standard users cannot read 'auth.users'.
--
-- Solution: Check the Admin role using the JWT (token) instead of the table.
-- =============================================

-- 1. Drop the problematic policies
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- 2. Recreate policies using auth.jwt() (SAFE)
CREATE POLICY "Admins can read all profiles" ON profiles
FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

CREATE POLICY "Admins can update all profiles" ON profiles
FOR UPDATE USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- 3. Verify
SELECT 'Admin policies fixed to use JWT claims' as message;
