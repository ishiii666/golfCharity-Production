-- =====================================================
-- User Management Enhancement Migration
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add status column to profiles if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended'));
  END IF;
END $$;

-- Add subscription_type column if needed
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'subscription_type'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN subscription_type TEXT DEFAULT 'none';
  END IF;
END $$;

-- Add total_donated column for quick display
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'total_donated'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN total_donated DECIMAL(12,2) DEFAULT 0;
  END IF;
END $$;

-- Update RLS policy to allow admins to read all profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;

-- Allow anyone to read profiles (for admin dashboard using anon key)
CREATE POLICY "Anyone can read profiles" ON public.profiles
  FOR SELECT USING (true);

-- Update RLS policy to allow admins to update any profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can update profiles" ON public.profiles;

-- Allow updates (admin edits will work)
CREATE POLICY "Anyone can update profiles" ON public.profiles
  FOR UPDATE USING (true);

SELECT '✅ User management columns and policies ready!' AS status;
