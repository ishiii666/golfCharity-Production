-- =============================================
-- SECURITY FIX: ENABLE RLS ON PUBLIC TABLES
-- This resolves the "Policy Exists RLS Disabled" errors
-- =============================================

-- Enable RLS for tables identified by Security Advisor
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draw_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SECURITY BEST PRACTICE: SET SEARCH PATH FOR FUNCTIONS
-- This resolves the "Function Search Path Mutable" warnings
-- Prevents search path hijacking
-- =============================================

ALTER FUNCTION public.decrement_balance(uuid, numeric) SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.increment_balance(uuid, numeric) SET search_path = public;
ALTER FUNCTION public.increment_charity_total(uuid, numeric) SET search_path = public;

-- =============================================
-- SECURITY FIX: TIGHTEN CONTACT INQUIRIES POLICY
-- Resolves "RLS Policy Always True" warning
-- =============================================

-- Existing policy was: CREATE POLICY "Public can submit contact inquiries" ON contact_inquiries FOR INSERT WITH CHECK (true);
-- We should use a more standard approach if possible, but for contact inquiries, 
-- public INSERT is often intentional. The warning is because WITH CHECK (true) is very permissive.
-- However, enabling RLS is the most important part for other tables.
-- For now, we will leave the logic as is since contact inquiries need to be public,
-- but the advisor flags it because it's an 'unauthenticated insert' pattern.
