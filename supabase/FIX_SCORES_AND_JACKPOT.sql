-- =====================================================
-- FIX: Add Scores and Jackpot for Draw Control
-- Run this AFTER the previous EMERGENCY_FIX
-- =====================================================

-- 1. UPDATE JACKPOT to a starting value
UPDATE public.jackpot_tracker SET amount = 500;

-- If no row exists, insert one
INSERT INTO public.jackpot_tracker (amount)
SELECT 500
WHERE NOT EXISTS (SELECT 1 FROM public.jackpot_tracker);

-- 2. ADD TEST SCORES for subscribers who don't have 5 scores
-- Get all users with active subscriptions and add test scores
DO $$
DECLARE
    sub_record RECORD;
    i INTEGER;
BEGIN
    FOR sub_record IN 
        SELECT s.user_id 
        FROM public.subscriptions s
        WHERE s.status = 'active'
    LOOP
        -- Check if user has less than 5 scores
        IF (SELECT COUNT(*) FROM public.user_scores WHERE user_id = sub_record.user_id) < 5 THEN
            -- Add test scores (random between 18-45 for golf scores)
            FOR i IN 1..5 LOOP
                INSERT INTO public.user_scores (user_id, score, round_date, course_name)
                VALUES (
                    sub_record.user_id,
                    18 + floor(random() * 27)::int, -- Random score 18-45
                    CURRENT_DATE - (i * interval '1 day'),
                    'Test Course ' || i
                );
            END LOOP;
            RAISE NOTICE 'Added 5 test scores for user %', sub_record.user_id;
        END IF;
    END LOOP;
END $$;

-- 3. VERIFY THE FIX
SELECT 'Active Subscriptions:' as check_type, COUNT(*) as count 
FROM public.subscriptions WHERE status = 'active';

SELECT 'Users with 5+ Scores:' as check_type, COUNT(DISTINCT user_id) as count 
FROM public.user_scores 
GROUP BY user_id 
HAVING COUNT(*) >= 5;

SELECT 'Jackpot Amount:' as check_type, amount as count 
FROM public.jackpot_tracker 
LIMIT 1;

SELECT '✅ Now refresh the Draw Control page!' as result;
