-- Add goal_amount column to charities table
ALTER TABLE public.charities 
ADD COLUMN IF NOT EXISTS goal_amount DECIMAL(12,2) DEFAULT 10000;

-- Verify
SELECT name, total_raised, goal_amount, supporter_count FROM public.charities;

SELECT '✅ Goal amount column added!' AS result;
