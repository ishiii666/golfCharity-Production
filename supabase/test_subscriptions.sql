-- =====================================================
-- Test Subscriptions - Add sample subscriptions for testing
-- Run this in Supabase SQL Editor to test the subscription column
-- =====================================================

-- First, let's see what users exist
SELECT id, email, full_name, role FROM public.profiles;

-- View current subscriptions (if any)
SELECT * FROM public.subscriptions;

-- Add test subscriptions for some users
-- Replace the UUIDs below with actual user IDs from your profiles table

-- Example: Add a monthly subscription for a test user
-- You can copy a user ID from the SELECT above
/*
INSERT INTO public.subscriptions (user_id, plan, status)
SELECT id, 'monthly', 'active'
FROM public.profiles 
WHERE email = 'test@test.com'  -- Change this to an actual user email
ON CONFLICT (user_id) DO UPDATE SET plan = 'monthly', status = 'active';
*/

-- Quick way: Add subscriptions for ALL non-admin users
INSERT INTO public.subscriptions (user_id, plan, status)
SELECT id, 
       CASE 
           WHEN random() > 0.5 THEN 'monthly'
           ELSE 'annual'
       END,
       'active'
FROM public.profiles 
WHERE role != 'admin'
AND id NOT IN (SELECT user_id FROM public.subscriptions WHERE user_id IS NOT NULL);

-- Verify subscriptions were created
SELECT p.full_name, p.email, p.role, s.plan, s.status
FROM public.profiles p
LEFT JOIN public.subscriptions s ON p.id = s.user_id;

SELECT '✅ Test subscriptions created!' AS status;
