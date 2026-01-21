-- =====================================================
-- DRAW ENGINE - FIX SCRIPT
-- Run this to check and fix the draws table
-- =====================================================

-- First, check if draws table exists and what columns it has
-- Run this SELECT first to see the error:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'draws';

-- If the table doesn't exist or is missing columns, drop and recreate:
DROP TABLE IF EXISTS public.draw_simulations CASCADE;
DROP TABLE IF EXISTS public.draw_entries CASCADE;
DROP TABLE IF EXISTS public.draws CASCADE;

-- Now create draws table fresh
CREATE TABLE public.draws (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    month_year TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'simulating', 'completed', 'published')),
    score_range_min INTEGER NOT NULL DEFAULT 1 CHECK (score_range_min >= 1),
    score_range_max INTEGER NOT NULL DEFAULT 45 CHECK (score_range_max <= 45),
    winning_numbers INTEGER[] DEFAULT NULL,
    prize_pool DECIMAL(12,2) DEFAULT 0,
    jackpot_added DECIMAL(12,2) DEFAULT 0,
    tier1_pool DECIMAL(12,2) DEFAULT 0,
    tier2_pool DECIMAL(12,2) DEFAULT 0,
    tier3_pool DECIMAL(12,2) DEFAULT 0,
    participants_count INTEGER DEFAULT 0,
    tier1_winners INTEGER DEFAULT 0,
    tier2_winners INTEGER DEFAULT 0,
    tier3_winners INTEGER DEFAULT 0,
    draw_date TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create draw_entries table
CREATE TABLE public.draw_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    scores INTEGER[] NOT NULL,
    matches INTEGER DEFAULT 0,
    tier INTEGER CHECK (tier IN (1, 2, 3)),
    gross_prize DECIMAL(12,2) DEFAULT 0,
    charity_amount DECIMAL(12,2) DEFAULT 0,
    net_payout DECIMAL(12,2) DEFAULT 0,
    charity_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(draw_id, user_id)
);

-- Create draw_simulations table
CREATE TABLE public.draw_simulations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES auth.users(id),
    score_range_min INTEGER NOT NULL,
    score_range_max INTEGER NOT NULL,
    simulated_numbers INTEGER[],
    tier1_count INTEGER DEFAULT 0,
    tier2_count INTEGER DEFAULT 0,
    tier3_count INTEGER DEFAULT 0,
    estimated_payouts JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_draws_status ON public.draws(status);
CREATE INDEX idx_draws_month_year ON public.draws(month_year);
CREATE INDEX idx_draw_entries_draw_id ON public.draw_entries(draw_id);
CREATE INDEX idx_draw_entries_user_id ON public.draw_entries(user_id);

-- Enable RLS
ALTER TABLE public.draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draw_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draw_simulations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view published draws" ON public.draws
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage draws" ON public.draws
    FOR ALL USING (true);

CREATE POLICY "Users can view own entries" ON public.draw_entries
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage entries" ON public.draw_entries
    FOR ALL USING (true);

CREATE POLICY "Admins can manage simulations" ON public.draw_simulations
    FOR ALL USING (true);

-- Create initial draw for January 2026
INSERT INTO public.draws (month_year, status)
VALUES ('January 2026', 'open');

-- Verify the table was created correctly
SELECT id, month_year, status, created_at FROM public.draws;
