-- =====================================================
-- EMERGENCY FIX: Draw Control Page Data
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. CREATE USER_SCORES TABLE (if missing)
CREATE TABLE IF NOT EXISTS public.user_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 45),
    round_date DATE DEFAULT CURRENT_DATE,
    course_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_scores ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can view own scores" ON public.user_scores;
CREATE POLICY "Users can view own scores" ON public.user_scores
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own scores" ON public.user_scores;
CREATE POLICY "Users can insert own scores" ON public.user_scores
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all scores" ON public.user_scores;
CREATE POLICY "Admins can view all scores" ON public.user_scores
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Service role bypass
DROP POLICY IF EXISTS "Service role full access scores" ON public.user_scores;
CREATE POLICY "Service role full access scores" ON public.user_scores
    FOR ALL USING (true) WITH CHECK (true);

-- 2. CREATE JACKPOT_TRACKER TABLE (if missing)
CREATE TABLE IF NOT EXISTS public.jackpot_tracker (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    amount DECIMAL(12,2) DEFAULT 0,
    last_draw_id UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial jackpot if empty
INSERT INTO public.jackpot_tracker (amount)
SELECT 0
WHERE NOT EXISTS (SELECT 1 FROM public.jackpot_tracker);

-- Enable RLS
ALTER TABLE public.jackpot_tracker ENABLE ROW LEVEL SECURITY;

-- Allow read access
DROP POLICY IF EXISTS "Anyone can view jackpot" ON public.jackpot_tracker;
CREATE POLICY "Anyone can view jackpot" ON public.jackpot_tracker
    FOR SELECT USING (true);

-- Admins can update
DROP POLICY IF EXISTS "Admins can update jackpot" ON public.jackpot_tracker;
CREATE POLICY "Admins can update jackpot" ON public.jackpot_tracker
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 3. CREATE DRAWS TABLE (if missing)
CREATE TABLE IF NOT EXISTS public.draws (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    month_year TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'completed', 'cancelled')),
    winning_numbers INTEGER[] DEFAULT '{}',
    min_score INTEGER DEFAULT 1,
    max_score INTEGER DEFAULT 45,
    total_prize_pool DECIMAL(12,2) DEFAULT 0,
    jackpot_contribution DECIMAL(12,2) DEFAULT 0,
    draw_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.draws ENABLE ROW LEVEL SECURITY;

-- Allow read access
DROP POLICY IF EXISTS "Anyone can view draws" ON public.draws;
CREATE POLICY "Anyone can view draws" ON public.draws
    FOR SELECT USING (true);

-- Admins can manage
DROP POLICY IF EXISTS "Admins can manage draws" ON public.draws;
CREATE POLICY "Admins can manage draws" ON public.draws
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Create current month draw if none exists
INSERT INTO public.draws (month_year, status)
SELECT TO_CHAR(NOW(), 'Month YYYY'), 'open'
WHERE NOT EXISTS (SELECT 1 FROM public.draws WHERE status = 'open');

-- 4. FIX SUBSCRIPTIONS TABLE - Ensure it has correct structure
-- First check if the table exists, if not create it
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    stripe_subscription_id TEXT,
    stripe_customer_id TEXT,
    plan TEXT DEFAULT 'monthly',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled', 'past_due', 'trialing')),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view own subscription
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Service role bypass
DROP POLICY IF EXISTS "Service role full access subs" ON public.subscriptions;
CREATE POLICY "Service role full access subs" ON public.subscriptions
    FOR ALL USING (true) WITH CHECK (true);

-- 5. Add goal_amount to charities if not exists
ALTER TABLE public.charities 
ADD COLUMN IF NOT EXISTS goal_amount DECIMAL(12,2) DEFAULT 10000;

-- 6. Verify everything
SELECT 'Tables Created/Verified:' as status;
SELECT 
    (SELECT COUNT(*) FROM public.user_scores) as user_scores_count,
    (SELECT COUNT(*) FROM public.subscriptions WHERE status = 'active') as active_subscriptions,
    (SELECT COUNT(*) FROM public.draws WHERE status = 'open') as open_draws,
    (SELECT amount FROM public.jackpot_tracker LIMIT 1) as jackpot_amount;

SELECT '✅ All fixes applied! Refresh the Draw Control page.' as result;
