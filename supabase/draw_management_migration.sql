-- =====================================================
-- DRAW & COMPETITION ENGINE - DATABASE SCHEMA
-- =====================================================
-- This migration creates all tables needed for the 
-- deterministic draw system with Stableford scores.
-- =====================================================

-- =====================================================
-- 1. USER SCORES TABLE
-- Stores Stableford scores (1-45) for each user
-- Only last 5 scores per user are used in draws
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 45),
    competition_date DATE NOT NULL,
    competition_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient user score queries
CREATE INDEX IF NOT EXISTS idx_user_scores_user_id ON public.user_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_user_scores_created_at ON public.user_scores(created_at DESC);

-- =====================================================
-- 2. JACKPOT TRACKER TABLE
-- Tracks rollover jackpot when no 5-match winners
-- =====================================================
CREATE TABLE IF NOT EXISTS public.jackpot_tracker (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    last_draw_id UUID,
    notes TEXT
);

-- Insert initial jackpot record if not exists
INSERT INTO public.jackpot_tracker (amount, notes)
SELECT 0, 'Initial jackpot'
WHERE NOT EXISTS (SELECT 1 FROM public.jackpot_tracker);

-- =====================================================
-- 3. DRAWS TABLE
-- Main table for monthly draws
-- =====================================================
CREATE TABLE IF NOT EXISTS public.draws (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    month_year TEXT NOT NULL,  -- e.g., "January 2026"
    
    -- Status: 'open', 'simulating', 'completed', 'published'
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'simulating', 'completed', 'published')),
    
    -- Score range used for this draw
    score_range_min INTEGER NOT NULL DEFAULT 1 CHECK (score_range_min >= 1),
    score_range_max INTEGER NOT NULL DEFAULT 45 CHECK (score_range_max <= 45),
    
    -- The 5 winning numbers (3 least popular + 2 most popular)
    winning_numbers INTEGER[] DEFAULT NULL,
    
    -- Prize pool calculations
    prize_pool DECIMAL(12,2) DEFAULT 0,
    jackpot_added DECIMAL(12,2) DEFAULT 0,  -- Jackpot from previous months
    tier1_pool DECIMAL(12,2) DEFAULT 0,      -- 40% for 5-match
    tier2_pool DECIMAL(12,2) DEFAULT 0,      -- 35% for 4-match
    tier3_pool DECIMAL(12,2) DEFAULT 0,      -- 25% for 3-match
    
    -- Participant and winner counts
    participants_count INTEGER DEFAULT 0,
    tier1_winners INTEGER DEFAULT 0,  -- 5-match count
    tier2_winners INTEGER DEFAULT 0,  -- 4-match count
    tier3_winners INTEGER DEFAULT 0,  -- 3-match count
    
    -- Timestamps
    draw_date TIMESTAMPTZ,        -- When draw was executed
    published_at TIMESTAMPTZ,     -- When results were made public
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for draw queries
CREATE INDEX IF NOT EXISTS idx_draws_status ON public.draws(status);
CREATE INDEX IF NOT EXISTS idx_draws_month_year ON public.draws(month_year);

-- =====================================================
-- 4. DRAW ENTRIES TABLE
-- User entries for each draw with match results
-- =====================================================
CREATE TABLE IF NOT EXISTS public.draw_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- User's 5 Stableford scores as entry
    scores INTEGER[] NOT NULL,
    
    -- Match results
    matches INTEGER DEFAULT 0,  -- How many scores matched (0-5)
    tier INTEGER CHECK (tier IN (1, 2, 3)),  -- 1=5match, 2=4match, 3=3match, NULL=no prize
    
    -- Prize amounts
    gross_prize DECIMAL(12,2) DEFAULT 0,
    charity_amount DECIMAL(12,2) DEFAULT 0,
    net_payout DECIMAL(12,2) DEFAULT 0,
    charity_id UUID REFERENCES public.charities(id),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint: one entry per user per draw
    UNIQUE(draw_id, user_id)
);

-- Index for entry queries
CREATE INDEX IF NOT EXISTS idx_draw_entries_draw_id ON public.draw_entries(draw_id);
CREATE INDEX IF NOT EXISTS idx_draw_entries_user_id ON public.draw_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_draw_entries_tier ON public.draw_entries(tier);

-- =====================================================
-- 5. DRAW SIMULATIONS TABLE (Admin only)
-- Stores admin simulation results before publishing
-- =====================================================
CREATE TABLE IF NOT EXISTS public.draw_simulations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Simulation parameters
    score_range_min INTEGER NOT NULL,
    score_range_max INTEGER NOT NULL,
    
    -- Simulated results
    simulated_numbers INTEGER[],
    tier1_count INTEGER DEFAULT 0,
    tier2_count INTEGER DEFAULT 0,
    tier3_count INTEGER DEFAULT 0,
    estimated_payouts JSONB,  -- { tier1: amount, tier2: amount, tier3: amount }
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. RLS POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.user_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jackpot_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draw_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draw_simulations ENABLE ROW LEVEL SECURITY;

-- User Scores: Users can read/write their own scores
DROP POLICY IF EXISTS "Users can view own scores" ON public.user_scores;
CREATE POLICY "Users can view own scores" ON public.user_scores
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own scores" ON public.user_scores;
CREATE POLICY "Users can insert own scores" ON public.user_scores
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own scores" ON public.user_scores;
CREATE POLICY "Users can update own scores" ON public.user_scores
    FOR UPDATE USING (auth.uid() = user_id);

-- Jackpot Tracker: Everyone can read, only service role can write
DROP POLICY IF EXISTS "Anyone can view jackpot" ON public.jackpot_tracker;
CREATE POLICY "Anyone can view jackpot" ON public.jackpot_tracker
    FOR SELECT USING (true);

-- Draws: Everyone can view published, admins can view all
DROP POLICY IF EXISTS "Anyone can view published draws" ON public.draws;
CREATE POLICY "Anyone can view published draws" ON public.draws
    FOR SELECT USING (status = 'published' OR auth.uid() IN (
        SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
    ));

DROP POLICY IF EXISTS "Admins can manage draws" ON public.draws;
CREATE POLICY "Admins can manage draws" ON public.draws
    FOR ALL USING (auth.uid() IN (
        SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
    ));

-- Draw Entries: Users see own entries, admins see all
DROP POLICY IF EXISTS "Users can view own entries" ON public.draw_entries;
CREATE POLICY "Users can view own entries" ON public.draw_entries
    FOR SELECT USING (
        user_id = auth.uid() 
        OR auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin')
    );

-- Simulations: Admin only
DROP POLICY IF EXISTS "Admins can manage simulations" ON public.draw_simulations;
CREATE POLICY "Admins can manage simulations" ON public.draw_simulations
    FOR ALL USING (auth.uid() IN (
        SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
    ));

-- =====================================================
-- 7. HELPER FUNCTION: Get user's last 5 scores
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_last_scores(p_user_id UUID, p_count INTEGER DEFAULT 5)
RETURNS INTEGER[]
LANGUAGE plpgsql
AS $$
DECLARE
    result INTEGER[];
BEGIN
    SELECT ARRAY_AGG(score ORDER BY created_at DESC)
    INTO result
    FROM (
        SELECT score, created_at
        FROM public.user_scores
        WHERE user_id = p_user_id
        ORDER BY created_at DESC
        LIMIT p_count
    ) sub;
    
    RETURN COALESCE(result, ARRAY[]::INTEGER[]);
END;
$$;

-- =====================================================
-- 8. HELPER FUNCTION: Calculate score frequencies
-- Returns count of each score value in given range
-- =====================================================
CREATE OR REPLACE FUNCTION get_score_frequencies(
    p_min_score INTEGER DEFAULT 1,
    p_max_score INTEGER DEFAULT 45,
    p_month_start DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE
)
RETURNS TABLE(score INTEGER, frequency BIGINT)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT us.score, COUNT(*) as frequency
    FROM public.user_scores us
    WHERE us.score >= p_min_score
      AND us.score <= p_max_score
      AND us.created_at >= p_month_start
    GROUP BY us.score
    ORDER BY frequency ASC, us.score ASC;
END;
$$;

-- =====================================================
-- 9. HELPER FUNCTION: Generate winning numbers
-- Returns 5 numbers: 3 least popular + 2 most popular
-- =====================================================
CREATE OR REPLACE FUNCTION generate_winning_numbers(
    p_min_score INTEGER DEFAULT 1,
    p_max_score INTEGER DEFAULT 45
)
RETURNS INTEGER[]
LANGUAGE plpgsql
AS $$
DECLARE
    least_popular INTEGER[];
    most_popular INTEGER[];
    result INTEGER[];
BEGIN
    -- Get 3 least popular (first 3 from ascending frequency)
    SELECT ARRAY_AGG(score ORDER BY frequency ASC, score ASC)
    INTO least_popular
    FROM (
        SELECT * FROM get_score_frequencies(p_min_score, p_max_score)
        LIMIT 3
    ) sub;
    
    -- Get 2 most popular (last 2 from descending frequency)
    SELECT ARRAY_AGG(score ORDER BY frequency DESC, score DESC)
    INTO most_popular
    FROM (
        SELECT * FROM get_score_frequencies(p_min_score, p_max_score)
        ORDER BY frequency DESC, score DESC
        LIMIT 2
    ) sub;
    
    -- Combine: [least1, least2, least3, most1, most2]
    result := COALESCE(least_popular, ARRAY[]::INTEGER[]) || COALESCE(most_popular, ARRAY[]::INTEGER[]);
    
    RETURN result;
END;
$$;

-- =====================================================
-- 10. HELPER FUNCTION: Count matches between arrays
-- =====================================================
CREATE OR REPLACE FUNCTION count_score_matches(
    user_scores INTEGER[],
    winning_numbers INTEGER[]
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    matches INTEGER := 0;
    score INTEGER;
BEGIN
    FOREACH score IN ARRAY user_scores LOOP
        IF score = ANY(winning_numbers) THEN
            matches := matches + 1;
        END IF;
    END LOOP;
    
    RETURN matches;
END;
$$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Run this SQL in the Supabase SQL Editor to create
-- all required tables and functions for the draw system.
-- =====================================================
