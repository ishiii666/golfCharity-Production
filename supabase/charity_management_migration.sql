-- =====================================================
-- Charity Management Enhancement Migration
-- Run this in Supabase SQL Editor
-- =====================================================

-- Check if charities table exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'charities') THEN
    CREATE TABLE public.charities (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      image_url TEXT,
      featured BOOLEAN DEFAULT FALSE,
      status TEXT DEFAULT 'active',
      total_raised DECIMAL(12,2) DEFAULT 0,
      supporters INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- Add new columns if they don't exist
DO $$
BEGIN
  -- Long description for detailed charity info
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'charities' AND column_name = 'long_description') THEN
    ALTER TABLE public.charities ADD COLUMN long_description TEXT;
  END IF;
  
  -- Logo URL for charity logo
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'charities' AND column_name = 'logo_url') THEN
    ALTER TABLE public.charities ADD COLUMN logo_url TEXT;
  END IF;
  
  -- Website URL
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'charities' AND column_name = 'website_url') THEN
    ALTER TABLE public.charities ADD COLUMN website_url TEXT;
  END IF;
  
  -- Location/Region
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'charities' AND column_name = 'location') THEN
    ALTER TABLE public.charities ADD COLUMN location TEXT DEFAULT 'National';
  END IF;
  
  -- Contact email
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'charities' AND column_name = 'contact_email') THEN
    ALTER TABLE public.charities ADD COLUMN contact_email TEXT;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.charities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read charities" ON public.charities;
DROP POLICY IF EXISTS "Anyone can read active charities" ON public.charities;
DROP POLICY IF EXISTS "Admins can insert charities" ON public.charities;
DROP POLICY IF EXISTS "Admins can update charities" ON public.charities;
DROP POLICY IF EXISTS "Admins can delete charities" ON public.charities;
DROP POLICY IF EXISTS "Allow all charity operations" ON public.charities;
DROP POLICY IF EXISTS "Allow charity insert" ON public.charities;
DROP POLICY IF EXISTS "Allow charity update" ON public.charities;
DROP POLICY IF EXISTS "Allow charity delete" ON public.charities;

-- For testing: Allow all operations on charities
-- In production, restrict to admins only
CREATE POLICY "Anyone can read charities" ON public.charities
  FOR SELECT USING (true);

CREATE POLICY "Allow charity insert" ON public.charities
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow charity update" ON public.charities
  FOR UPDATE USING (true);

CREATE POLICY "Allow charity delete" ON public.charities
  FOR DELETE USING (true);

-- =====================================================
-- Storage Bucket Setup (Run this separately if needed)
-- =====================================================
-- Note: Storage bucket creation is done via Supabase Dashboard
-- Go to: Storage > New Bucket > Name: "charity-images" > Public: Yes

SELECT '✅ Charity table enhanced! Now create storage bucket in Supabase Dashboard.' AS status;
