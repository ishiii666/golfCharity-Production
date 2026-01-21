-- =====================================================
-- UPDATE SUPPORTER COUNTS FROM DONATIONS
-- Run this in Supabase SQL Editor
-- =====================================================

-- Update total_raised and supporter_count from actual donations
UPDATE public.charities c
SET 
    total_raised = COALESCE((
        SELECT SUM(d.amount) 
        FROM public.donations d 
        WHERE d.charity_id = c.id AND d.status = 'completed'
    ), 0),
    supporter_count = COALESCE((
        SELECT COUNT(DISTINCT COALESCE(d.user_id::text, d.stripe_charge_id))
        FROM public.donations d 
        WHERE d.charity_id = c.id AND d.status = 'completed'
    ), 0);

-- Show results
SELECT id, name, total_raised, supporter_count 
FROM public.charities 
ORDER BY total_raised DESC;

SELECT '✅ Supporter counts updated!' AS result;
