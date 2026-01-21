-- =============================================
-- GOLFCHARITY RLS POLICIES SETUP
-- Run this script in Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. PROFILES TABLE SETUP
-- =============================================

-- First, ensure the profiles table has the necessary columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS subscription_type TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS total_donated DECIMAL DEFAULT 0;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- Policy: Admins can read ALL profiles
CREATE POLICY "Admins can read all profiles" ON profiles
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
);

-- Policy: Admins can update ALL profiles
CREATE POLICY "Admins can update all profiles" ON profiles
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
);

-- =============================================
-- 2. CHARITIES TABLE SETUP
-- =============================================

-- Create charities table if it doesn't exist
CREATE TABLE IF NOT EXISTS charities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to charities table (if they don't exist)
ALTER TABLE charities ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
ALTER TABLE charities ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE charities ADD COLUMN IF NOT EXISTS total_raised DECIMAL DEFAULT 0;
ALTER TABLE charities ADD COLUMN IF NOT EXISTS supporters INTEGER DEFAULT 0;
ALTER TABLE charities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read charities" ON charities;
DROP POLICY IF EXISTS "Admins can insert charities" ON charities;
DROP POLICY IF EXISTS "Admins can update charities" ON charities;
DROP POLICY IF EXISTS "Admins can delete charities" ON charities;

-- Enable RLS on charities
ALTER TABLE charities ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read charities (public data)
CREATE POLICY "Anyone can read charities" ON charities
FOR SELECT USING (true);

-- Policy: Only admins can insert charities
CREATE POLICY "Admins can insert charities" ON charities
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
);

-- Policy: Only admins can update charities
CREATE POLICY "Admins can update charities" ON charities
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
);

-- Policy: Only admins can delete charities
CREATE POLICY "Admins can delete charities" ON charities
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
);

-- =============================================
-- 3. DRAWS TABLE SETUP
-- =============================================

-- Create draws table for managing lottery draws (skip if exists)
CREATE TABLE IF NOT EXISTS draws (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_date DATE NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, running, completed
    winning_numbers INTEGER[],
    winner_id UUID REFERENCES profiles(id),
    prize_pool DECIMAL DEFAULT 0,
    participants INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read completed draws" ON draws;
DROP POLICY IF EXISTS "Admins can manage draws" ON draws;

-- Enable RLS on draws
ALTER TABLE draws ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read completed draws (results are public)
-- Using text cast to handle both enum and text status columns
CREATE POLICY "Anyone can read completed draws" ON draws
FOR SELECT USING (status::text = 'completed' OR 
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
);

-- Policy: Admins can manage draws
CREATE POLICY "Admins can manage draws" ON draws
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
);

-- =============================================
-- 4. SCORES TABLE SETUP
-- =============================================

-- Create scores table for user golf scores
CREATE TABLE IF NOT EXISTS scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) NOT NULL,
    stableford_points INTEGER NOT NULL,
    course_name TEXT,
    played_at DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own scores" ON scores;
DROP POLICY IF EXISTS "Users can insert own scores" ON scores;
DROP POLICY IF EXISTS "Admins can read all scores" ON scores;

-- Enable RLS on scores
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own scores
CREATE POLICY "Users can read own scores" ON scores
FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own scores
CREATE POLICY "Users can insert own scores" ON scores
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can read all scores
CREATE POLICY "Admins can read all scores" ON scores
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
);

-- =============================================
-- 5. INSERT SAMPLE DATA
-- =============================================

-- Insert sample charities (if table is empty)
INSERT INTO charities (name, category, description, image_url, featured, status, total_raised, supporters)
SELECT * FROM (VALUES
    ('Cancer Council Australia', 'Health Research', 'Leading cancer research and support services', 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400&h=300&fit=crop', true, 'active', 45000, 234),
    ('Beyond Blue', 'Mental Health', 'Supporting mental health awareness and resources', 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400&h=300&fit=crop', true, 'active', 38000, 189),
    ('Salvation Army', 'Homelessness', 'Helping those experiencing homelessness', 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400&h=300&fit=crop', false, 'active', 52000, 312),
    ('RSPCA Australia', 'Animal Welfare', 'Protecting and caring for animals', 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=400&h=300&fit=crop', true, 'active', 28000, 156),
    ('Australian Red Cross', 'Humanitarian', 'Humanitarian aid and disaster relief', 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=400&h=300&fit=crop', true, 'active', 41000, 223)
) AS t(name, category, description, image_url, featured, status, total_raised, supporters)
WHERE NOT EXISTS (SELECT 1 FROM charities LIMIT 1);

-- =============================================
-- 6. VERIFY SETUP
-- =============================================

-- Check that tables exist
SELECT 'profiles' as table_name, COUNT(*) as row_count FROM profiles
UNION ALL
SELECT 'charities', COUNT(*) FROM charities
UNION ALL
SELECT 'draws', COUNT(*) FROM draws
UNION ALL
SELECT 'scores', COUNT(*) FROM scores;

-- Success message
SELECT 'RLS policies setup complete!' as message;
