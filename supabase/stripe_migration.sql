-- =====================================================
-- STRIPE INTEGRATION - Database Migration
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add Stripe customer ID to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer 
ON public.profiles(stripe_customer_id);

-- Update subscriptions table with Stripe fields
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_method_brand TEXT,
ADD COLUMN IF NOT EXISTS payment_method_last4 TEXT,
ADD COLUMN IF NOT EXISTS payment_method_exp_month INTEGER,
ADD COLUMN IF NOT EXISTS payment_method_exp_year INTEGER;

-- Create indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription 
ON public.subscriptions(stripe_subscription_id);

-- Ensure donations table exists with Stripe fields
CREATE TABLE IF NOT EXISTS public.donations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  charity_id UUID REFERENCES public.charities(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'aud',
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  source TEXT CHECK (source IN ('direct', 'prize_split', 'subscription')),
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for donations
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if exists, then create
DROP POLICY IF EXISTS "Users can view own donations" ON public.donations;
CREATE POLICY "Users can view own donations" 
ON public.donations FOR SELECT USING (user_id = auth.uid());

-- Admin can view all donations
DROP POLICY IF EXISTS "Admins can view all donations" ON public.donations;
CREATE POLICY "Admins can view all donations" 
ON public.donations FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Create function to increment charity total
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

SELECT '✅ Stripe database migration complete!' AS status;
