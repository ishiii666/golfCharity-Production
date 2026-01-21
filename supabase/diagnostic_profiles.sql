-- =============================================
-- DIAGNOSTIC: Check profiles table structure
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. List ALL columns in profiles table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if our new columns exist
SELECT 
    'phone' as column_name, 
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='phone') as exists
UNION ALL
SELECT 'state', EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='state')
UNION ALL
SELECT 'golf_handicap', EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='golf_handicap')
UNION ALL
SELECT 'home_club', EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='home_club')
UNION ALL
SELECT 'notification_settings', EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='notification_settings');

-- 3. Check RLS policies on profiles
SELECT 
    policyname, 
    cmd, 
    qual, 
    with_check 
FROM pg_policies 
WHERE tablename = 'profiles';

-- 4. Try a simple update (replace USER_ID with actual user id from auth.users)
-- SELECT id, email FROM auth.users LIMIT 5;
