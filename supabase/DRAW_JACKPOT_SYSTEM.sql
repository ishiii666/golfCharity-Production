-- =====================================================
-- CORRECT DRAW & JACKPOT SYSTEM
-- Run this in Supabase SQL Editor
-- This implements the exact logic as specified
-- =====================================================

-- 1. Drop old jackpot functions if they exist
DROP FUNCTION IF EXISTS public.add_to_jackpot(DECIMAL);
DROP FUNCTION IF EXISTS public.reset_jackpot();
DROP FUNCTION IF EXISTS public.get_jackpot();

-- 2. Create jackpot_tracker table (if not exists)
CREATE TABLE IF NOT EXISTS public.jackpot_tracker (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    amount DECIMAL(12,2) DEFAULT 0 NOT NULL,
    last_updated_draw_id UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure only one row exists
DELETE FROM public.jackpot_tracker WHERE id NOT IN (
    SELECT id FROM public.jackpot_tracker LIMIT 1
);

-- Insert initial row if empty (jackpot starts at 0)
INSERT INTO public.jackpot_tracker (amount)
SELECT 0
WHERE NOT EXISTS (SELECT 1 FROM public.jackpot_tracker);

-- Reset to 0 for fresh start
UPDATE public.jackpot_tracker SET amount = 0, updated_at = NOW();

-- 3. RLS for jackpot_tracker
ALTER TABLE public.jackpot_tracker ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read jackpot" ON public.jackpot_tracker;
CREATE POLICY "Anyone can read jackpot" ON public.jackpot_tracker
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role can update jackpot" ON public.jackpot_tracker;
CREATE POLICY "Service role can update jackpot" ON public.jackpot_tracker
    FOR ALL USING (true) WITH CHECK (true);

-- 4. Function to get current jackpot
CREATE OR REPLACE FUNCTION public.get_jackpot()
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_amount DECIMAL;
BEGIN
    SELECT COALESCE(amount, 0) INTO current_amount 
    FROM public.jackpot_tracker 
    LIMIT 1;
    
    RETURN COALESCE(current_amount, 0);
END;
$$;

-- 5. Function to add unpaid 40% to jackpot (when no 5-match winner)
CREATE OR REPLACE FUNCTION public.add_to_jackpot(
    p_amount DECIMAL,
    p_draw_id UUID DEFAULT NULL
)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_amount DECIMAL;
BEGIN
    UPDATE public.jackpot_tracker 
    SET amount = amount + p_amount,
        last_updated_draw_id = COALESCE(p_draw_id, last_updated_draw_id),
        updated_at = NOW()
    RETURNING amount INTO new_amount;
    
    -- If no row existed, create one
    IF new_amount IS NULL THEN
        INSERT INTO public.jackpot_tracker (amount, last_updated_draw_id)
        VALUES (p_amount, p_draw_id)
        RETURNING amount INTO new_amount;
    END IF;
    
    RETURN new_amount;
END;
$$;

-- 6. Function to reset jackpot (when 5-match winner exists)
CREATE OR REPLACE FUNCTION public.reset_jackpot(
    p_draw_id UUID DEFAULT NULL
)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    old_amount DECIMAL;
BEGIN
    SELECT amount INTO old_amount FROM public.jackpot_tracker LIMIT 1;
    
    UPDATE public.jackpot_tracker 
    SET amount = 0,
        last_updated_draw_id = COALESCE(p_draw_id, last_updated_draw_id),
        updated_at = NOW();
    
    RETURN COALESCE(old_amount, 0);
END;
$$;

-- 7. Function to get total 5-match pool (current 40% + existing jackpot)
CREATE OR REPLACE FUNCTION public.get_five_match_pool(
    p_subscriber_count INTEGER
)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    prize_pool DECIMAL;
    five_match_portion DECIMAL;
    current_jackpot DECIMAL;
BEGIN
    -- Calculate: subscribers × $5 = total prize pool
    prize_pool := p_subscriber_count * 5.00;
    
    -- 40% goes to 5-match tier
    five_match_portion := prize_pool * 0.40;
    
    -- Get existing jackpot
    SELECT COALESCE(amount, 0) INTO current_jackpot FROM public.jackpot_tracker LIMIT 1;
    
    -- Total 5-match pool = current 40% + any carried-over jackpot
    RETURN five_match_portion + current_jackpot;
END;
$$;

-- 8. Create draw_results table to store immutable results
CREATE TABLE IF NOT EXISTS public.draw_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    draw_id UUID REFERENCES public.draws(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    matches INTEGER NOT NULL CHECK (matches >= 0 AND matches <= 5),
    winning_numbers INTEGER[] NOT NULL,
    user_scores INTEGER[] NOT NULL,
    payout_amount DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for draw_results
ALTER TABLE public.draw_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own results" ON public.draw_results;
CREATE POLICY "Users can view own results" ON public.draw_results
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view all results" ON public.draw_results;
CREATE POLICY "Anyone can view all results" ON public.draw_results
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role full access results" ON public.draw_results;
CREATE POLICY "Service role full access results" ON public.draw_results
    FOR ALL USING (true) WITH CHECK (true);

-- 9. Update draws table structure
ALTER TABLE public.draws 
ADD COLUMN IF NOT EXISTS subscriber_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS prize_pool_base DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS jackpot_at_start DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS five_match_pool DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS four_match_pool DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS three_match_pool DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS five_match_winners INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS four_match_winners INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS three_match_winners INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS jackpot_after DECIMAL(12,2) DEFAULT 0;

-- 10. Grant permissions
GRANT EXECUTE ON FUNCTION public.get_jackpot() TO anon;
GRANT EXECUTE ON FUNCTION public.get_jackpot() TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_to_jackpot(DECIMAL, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_jackpot(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_five_match_pool(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_five_match_pool(INTEGER) TO service_role;

-- 11. Verify setup
SELECT 'Jackpot System Initialized:' as status;
SELECT 
    (SELECT amount FROM public.jackpot_tracker LIMIT 1) as current_jackpot,
    (SELECT COUNT(*) FROM public.draws WHERE status = 'open') as open_draws;

SELECT '✅ Draw & Jackpot system ready. Jackpot starts at $0.' as result;
