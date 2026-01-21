-- =====================================================
-- FIX SUBSCRIPTIONS TABLE FOR STRIPE WEBHOOK
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Ensure subscriptions table has correct structure
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    stripe_price_id TEXT,
    plan TEXT CHECK (plan IN ('monthly', 'annual')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'cancelled')),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    payment_method_brand TEXT,
    payment_method_last4 TEXT,
    payment_method_exp_month INTEGER,
    payment_method_exp_year INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add missing columns if table exists
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS plan TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id);

-- 4. DISABLE RLS COMPLETELY for service role access
-- This allows the Edge Functions (webhooks) to insert/update freely
ALTER TABLE public.subscriptions DISABLE ROW LEVEL SECURITY;

-- Or if you prefer to keep RLS and add policies:
-- ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role full access" ON public.subscriptions;
DROP POLICY IF EXISTS "Allow service role all operations" ON public.subscriptions;

-- 5. Create policies that allow service role full access
-- Re-enable RLS with proper policies
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own subscription
CREATE POLICY "Users can view own subscription"
ON public.subscriptions FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Allow service role (webhooks/edge functions) full access
-- This is CRITICAL for webhooks to work
CREATE POLICY "Service role full access"
ON public.subscriptions
FOR ALL
USING (true)
WITH CHECK (true);

-- Grant service role full access
GRANT ALL ON public.subscriptions TO service_role;
GRANT ALL ON public.subscriptions TO authenticated;

-- 6. Verify the table structure
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'subscriptions' 
ORDER BY ordinal_position;

-- 7. Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'subscriptions';

-- 8. Check policies
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'subscriptions';

SELECT '✅ Subscriptions table fixed! Webhooks should now be able to insert data.' AS status;
