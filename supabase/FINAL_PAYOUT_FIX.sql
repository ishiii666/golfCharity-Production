-- =====================================================
-- FINAL PAYOUT & FINANCE SCHEMA FIX
-- Syncs database with current code expectations
-- =====================================================

-- 1. PROFILES Table Updates
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS account_balance DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS bsb_number TEXT,
ADD COLUMN IF NOT EXISTS account_number TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT;

-- 2. DRAW_ENTRIES Table Updates
ALTER TABLE public.draw_entries 
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payout_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payout_ref TEXT,
ADD COLUMN IF NOT EXISTS payment_reference TEXT;

-- 3. CHARITY_PAYOUTS Table (Grouped distributions)
CREATE TABLE IF NOT EXISTS public.charity_payouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    charity_id UUID REFERENCES public.charities(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid')),
    payout_ref TEXT,
    paid_at TIMESTAMPTZ,
    admin_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. DONATIONS Table Updates
ALTER TABLE public.donations 
ADD COLUMN IF NOT EXISTS charity_payout_id UUID REFERENCES public.charity_payouts(id) ON DELETE SET NULL;

-- 5. RPC: increment_balance
CREATE OR REPLACE FUNCTION public.increment_balance(
    user_id UUID,
    amount DECIMAL
)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles 
    SET account_balance = COALESCE(account_balance, 0) + amount
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC: decrement_balance (for manual payouts)
CREATE OR REPLACE FUNCTION public.decrement_balance(
    user_id UUID,
    amount DECIMAL
)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles 
    SET account_balance = COALESCE(account_balance, 0) - amount
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. ACTIVITY_LOG Constraint Update
ALTER TABLE public.activity_log 
DROP CONSTRAINT IF EXISTS activity_log_action_type_check;

ALTER TABLE public.activity_log 
ADD CONSTRAINT activity_log_action_type_check 
CHECK (action_type IN (
  'user_signup', 'user_login', 'subscription_created', 'subscription_cancelled',
  'donation_made', 'charity_added', 'charity_updated', 'draw_created', 
  'draw_published', 'score_submitted', 'admin_action', 'system',
  'winner_paid', 'winner_verified', 'winner_paid_stripe', 
  'charity_payout_stripe', 'charity_payout_created', 'charity_payout_paid'
));

-- 8. Enable RLS on charity_payouts
ALTER TABLE public.charity_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage charity payouts" ON public.charity_payouts;
CREATE POLICY "Admins can manage charity payouts" 
ON public.charity_payouts FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Anyone can view charity payouts" ON public.charity_payouts;
CREATE POLICY "Anyone can view charity payouts" 
ON public.charity_payouts FOR SELECT 
USING (true);

SELECT '✅ Finance Schema Synchronization Complete!' as status;
