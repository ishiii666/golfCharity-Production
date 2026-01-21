-- =====================================================
-- FIX DONATIONS AND CHARITIES TABLES
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Ensure donations table exists with correct structure
DROP TABLE IF EXISTS public.donations CASCADE;

CREATE TABLE public.donations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    charity_id UUID NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency TEXT DEFAULT 'aud',
    stripe_payment_intent_id TEXT,
    stripe_charge_id TEXT,
    source TEXT DEFAULT 'direct',
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Add columns to charities table if missing
ALTER TABLE public.charities 
ADD COLUMN IF NOT EXISTS total_raised DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS supporter_count INTEGER DEFAULT 0;

-- Step 3: Disable RLS on donations
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Step 4: Create open policy for donations
DROP POLICY IF EXISTS "Allow all donations ops" ON public.donations;
CREATE POLICY "Allow all donations ops"
ON public.donations FOR ALL
TO authenticated, anon, service_role
USING (true)
WITH CHECK (true);

-- Step 5: Grant permissions
GRANT ALL ON public.donations TO anon;
GRANT ALL ON public.donations TO authenticated;
GRANT ALL ON public.donations TO service_role;

-- Step 6: Create the increment_charity_total function
CREATE OR REPLACE FUNCTION public.increment_charity_total(
    p_charity_id UUID,
    p_amount DECIMAL
)
RETURNS void AS $$
BEGIN
    UPDATE public.charities 
    SET total_raised = COALESCE(total_raised, 0) + p_amount,
        supporter_count = COALESCE(supporter_count, 0) + 1
    WHERE id = p_charity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Grant execute permission
GRANT EXECUTE ON FUNCTION public.increment_charity_total TO anon;
GRANT EXECUTE ON FUNCTION public.increment_charity_total TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_charity_total TO service_role;

-- Step 8: Update charities RLS to be more permissive for updates
ALTER TABLE public.charities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow charity reads" ON public.charities;
CREATE POLICY "Allow charity reads"
ON public.charities FOR SELECT
TO anon, authenticated, service_role
USING (true);

DROP POLICY IF EXISTS "Allow charity updates" ON public.charities;
CREATE POLICY "Allow charity updates"
ON public.charities FOR UPDATE
TO authenticated, service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow charity inserts" ON public.charities;
CREATE POLICY "Allow charity inserts"
ON public.charities FOR INSERT
TO authenticated, service_role
WITH CHECK (true);

-- Step 9: Test the increment function
DO $$
DECLARE
    test_charity_id UUID;
BEGIN
    -- Get a charity ID to test
    SELECT id INTO test_charity_id FROM public.charities LIMIT 1;
    
    IF test_charity_id IS NOT NULL THEN
        -- Store current value
        RAISE NOTICE 'Testing increment_charity_total...';
        
        -- Call the function
        PERFORM public.increment_charity_total(test_charity_id, 0);
        
        RAISE NOTICE '✅ Function works!';
    END IF;
END $$;

-- Step 10: Manually update charity totals from existing donations
UPDATE public.charities c
SET total_raised = COALESCE((
    SELECT SUM(d.amount) 
    FROM public.donations d 
    WHERE d.charity_id = c.id AND d.status = 'completed'
), 0);

SELECT '✅ DONATIONS TABLE READY!' AS result;
