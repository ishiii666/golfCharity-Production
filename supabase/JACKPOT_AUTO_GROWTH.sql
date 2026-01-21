-- =====================================================
-- AUTOMATIC JACKPOT GROWTH SYSTEM
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Create function to add to jackpot
CREATE OR REPLACE FUNCTION public.add_to_jackpot(contribution DECIMAL)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_amount DECIMAL;
BEGIN
    -- Update jackpot and return new amount
    UPDATE public.jackpot_tracker 
    SET amount = amount + contribution,
        updated_at = NOW()
    RETURNING amount INTO new_amount;
    
    -- If no row existed, create one
    IF new_amount IS NULL THEN
        INSERT INTO public.jackpot_tracker (amount)
        VALUES (contribution)
        RETURNING amount INTO new_amount;
    END IF;
    
    RETURN new_amount;
END;
$$;

-- 2. Create function to reset jackpot (when jackpot is won)
CREATE OR REPLACE FUNCTION public.reset_jackpot()
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
        updated_at = NOW();
    
    RETURN old_amount;
END;
$$;

-- 3. Create function to get current jackpot
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

-- 4. Reset jackpot to 0 for fresh start
UPDATE public.jackpot_tracker SET amount = 0;

-- 5. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.add_to_jackpot(DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_to_jackpot(DECIMAL) TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_jackpot() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_jackpot() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_jackpot() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_jackpot() TO anon;

SELECT '✅ Jackpot functions created! Jackpot now at $0.' as result;
SELECT 'Each new subscription will add $2 to the jackpot.' as info;
