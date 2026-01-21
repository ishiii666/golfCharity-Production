-- =====================================================
-- Admin Activity Log Migration (FIXED)
-- Run this in Supabase SQL Editor
-- =====================================================

-- First, drop the table if it exists (clean slate)
DROP TABLE IF EXISTS public.activity_log CASCADE;

-- Create activity_log table for tracking admin/system events
-- Using a simpler constraint to avoid Supabase issues
CREATE TABLE public.activity_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_type TEXT,
  target_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add the constraint separately (safer approach)
ALTER TABLE public.activity_log 
ADD CONSTRAINT activity_log_action_type_check 
CHECK (action_type IN (
  'user_signup', 'user_login', 'subscription_created', 'subscription_cancelled',
  'donation_made', 'charity_added', 'charity_updated', 'draw_created', 
  'draw_published', 'score_submitted', 'admin_action', 'system'
));

-- Index for efficient recent queries (admin dashboard)
CREATE INDEX idx_activity_log_created ON public.activity_log(created_at DESC);
CREATE INDEX idx_activity_log_action ON public.activity_log(action_type);
CREATE INDEX idx_activity_log_user ON public.activity_log(user_id);

-- Enable RLS
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies - drop existing first to avoid conflicts
DROP POLICY IF EXISTS "Admins can view all activity" ON public.activity_log;
DROP POLICY IF EXISTS "Admins can insert activity" ON public.activity_log;
DROP POLICY IF EXISTS "System can insert activity" ON public.activity_log;
DROP POLICY IF EXISTS "Anon can read for admin stats" ON public.activity_log;

-- Allow anyone to read (for admin dashboard using anon key)
CREATE POLICY "Anyone can read activity" ON public.activity_log
  FOR SELECT USING (true);

-- Allow anyone to insert (for logging from frontend)
CREATE POLICY "Anyone can insert activity" ON public.activity_log
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- Seed some initial activity for testing
-- =====================================================
INSERT INTO public.activity_log (action_type, description, metadata) VALUES
  ('system', 'Admin dashboard connected to database', '{"component": "AdminDashboard"}'),
  ('system', 'Activity logging enabled', '{"version": "1.0"}');

-- =====================================================
-- Update RLS for subscriptions and donations
-- =====================================================

-- Subscriptions policies
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Anon can count subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;

CREATE POLICY "Anyone can read subscriptions" ON public.subscriptions
  FOR SELECT USING (true);

-- Donations policies  
DROP POLICY IF EXISTS "Admins can view all donations" ON public.donations;
DROP POLICY IF EXISTS "Anon can sum donations" ON public.donations;
DROP POLICY IF EXISTS "Users can view own donations" ON public.donations;

CREATE POLICY "Anyone can read donations" ON public.donations
  FOR SELECT USING (true);

SELECT '✅ Activity log table and policies created!' AS status;
