-- =====================================================
-- Profile Settings Migration
-- Run in Supabase SQL Editor
-- =====================================================

-- Add new columns to profiles table for settings
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'VIC',
ADD COLUMN IF NOT EXISTS golf_handicap DECIMAL(4,1),
ADD COLUMN IF NOT EXISTS home_club TEXT,
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
  "email": true,
  "drawResults": true,
  "newsletter": false,
  "charityUpdates": true
}'::jsonb;

-- Add check constraint for valid Australian states
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_state_check'
  ) THEN
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_state_check 
    CHECK (state IN ('NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT') OR state IS NULL);
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_state ON public.profiles(state);
