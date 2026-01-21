-- =====================================================
-- Subscription Policies for Admin Testing
-- Run this in Supabase SQL Editor
-- =====================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Anyone can read subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Anon can count subscriptions" ON public.subscriptions;

-- Allow reading subscriptions (for admin and user pages)
CREATE POLICY "Anyone can read subscriptions" ON public.subscriptions
  FOR SELECT USING (true);

-- Allow inserting subscriptions (for admin assignment and Stripe webhooks)
DROP POLICY IF EXISTS "Allow insert subscriptions" ON public.subscriptions;
CREATE POLICY "Allow insert subscriptions" ON public.subscriptions
  FOR INSERT WITH CHECK (true);

-- Allow updating subscriptions (for plan changes)
DROP POLICY IF EXISTS "Allow update subscriptions" ON public.subscriptions;
CREATE POLICY "Allow update subscriptions" ON public.subscriptions
  FOR UPDATE USING (true);

-- Allow deleting subscriptions (for cancellation)
DROP POLICY IF EXISTS "Allow delete subscriptions" ON public.subscriptions;
CREATE POLICY "Allow delete subscriptions" ON public.subscriptions
  FOR DELETE USING (true);

SELECT '✅ Subscription policies updated for testing!' AS status;
