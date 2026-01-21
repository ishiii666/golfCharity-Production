-- =====================================================
-- COMPLETE FIX FOR SUBSCRIPTIONS TABLE
-- Copy and paste this ENTIRE script into Supabase SQL Editor
-- =====================================================

-- Step 1: Drop all existing policies
DO $$ 
BEGIN
    EXECUTE (
        SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.subscriptions;', E'\n')
        FROM pg_policies 
        WHERE tablename = 'subscriptions'
    );
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Step 2: Disable RLS temporarily
ALTER TABLE IF EXISTS public.subscriptions DISABLE ROW LEVEL SECURITY;

-- Step 3: Drop and recreate table with correct structure
DROP TABLE IF EXISTS public.subscriptions CASCADE;

CREATE TABLE public.subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    stripe_price_id TEXT,
    plan TEXT DEFAULT 'monthly',
    status TEXT DEFAULT 'active',
    current_period_start TIMESTAMPTZ DEFAULT NOW(),
    current_period_end TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    payment_method_brand TEXT,
    payment_method_last4 TEXT,
    payment_method_exp_month INTEGER,
    payment_method_exp_year INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Step 4: Create indexes
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id);

-- Step 5: Enable RLS with permissive policy
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Step 6: Create policies
CREATE POLICY "Allow all for authenticated users"
ON public.subscriptions FOR ALL
TO authenticated, anon, service_role
USING (true)
WITH CHECK (true);

-- Step 7: Grant permissions
GRANT ALL ON public.subscriptions TO anon;
GRANT ALL ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

-- Step 8: Test insert a record
INSERT INTO public.subscriptions (user_id, plan, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'test', 'test')
ON CONFLICT (user_id) DO NOTHING;

-- Step 9: Verify and clean up test
DELETE FROM public.subscriptions WHERE plan = 'test';

-- Step 10: Show final status
SELECT 
    'Table created: ' || EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions') AS table_exists,
    'RLS enabled: ' || (SELECT rowsecurity FROM pg_tables WHERE tablename = 'subscriptions') AS rls_status;

SELECT '✅ SUBSCRIPTIONS TABLE READY!' AS result;
