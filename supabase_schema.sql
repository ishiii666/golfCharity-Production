-- =====================================================
-- GOLFCHARITY Database Schema - SAFE VERSION
-- Handles existing tables with DROP IF EXISTS
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- DROP EXISTING TABLES (in correct order for foreign keys)
-- =====================================================
DROP TABLE IF EXISTS public.verification_uploads CASCADE;
DROP TABLE IF EXISTS public.donations CASCADE;
DROP TABLE IF EXISTS public.draw_entries CASCADE;
DROP TABLE IF EXISTS public.draws CASCADE;
DROP TABLE IF EXISTS public.scores CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.charities CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop existing types
DROP TYPE IF EXISTS verification_status CASCADE;
DROP TYPE IF EXISTS draw_status CASCADE;
DROP TYPE IF EXISTS subscription_status CASCADE;
DROP TYPE IF EXISTS subscription_plan CASCADE;

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- =====================================================
-- PROFILES TABLE
-- =====================================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  selected_charity_id UUID,
  donation_percentage INTEGER DEFAULT 20 CHECK (donation_percentage >= 10 AND donation_percentage <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'past_due', 'trialing');
CREATE TYPE subscription_plan AS ENUM ('monthly', 'annual');

CREATE TABLE public.subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan subscription_plan DEFAULT 'monthly',
  status subscription_status DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CHARITIES TABLE
-- =====================================================
CREATE TABLE public.charities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT,
  logo_url TEXT,
  image_url TEXT,
  website_url TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  total_raised DECIMAL(12,2) DEFAULT 0,
  supporter_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SCORES TABLE
-- =====================================================
CREATE TABLE public.scores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 45),
  played_date DATE NOT NULL,
  course_name TEXT,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scores_user_date ON public.scores(user_id, played_date DESC);

-- =====================================================
-- DRAWS TABLE
-- =====================================================
CREATE TYPE draw_status AS ENUM ('pending', 'processing', 'published');

CREATE TABLE public.draws (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  draw_date DATE UNIQUE NOT NULL,
  status draw_status DEFAULT 'pending',
  winning_numbers INTEGER[],
  least_popular INTEGER[],
  most_popular INTEGER[],
  total_entries INTEGER DEFAULT 0,
  prize_pool DECIMAL(12,2) DEFAULT 0,
  jackpot_carryover DECIMAL(12,2) DEFAULT 0,
  five_match_prize DECIMAL(12,2) DEFAULT 0,
  four_match_prize DECIMAL(12,2) DEFAULT 0,
  three_match_prize DECIMAL(12,2) DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- DRAW ENTRIES TABLE
-- =====================================================
CREATE TABLE public.draw_entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  draw_id UUID REFERENCES public.draws(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  scores INTEGER[] NOT NULL,
  matches INTEGER DEFAULT 0,
  prize_won DECIMAL(12,2) DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(draw_id, user_id)
);

-- =====================================================
-- DONATIONS TABLE
-- =====================================================
CREATE TABLE public.donations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  charity_id UUID REFERENCES public.charities(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  source TEXT CHECK (source IN ('prize_split', 'direct', 'subscription')),
  draw_id UUID REFERENCES public.draws(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- VERIFICATION UPLOADS TABLE
-- =====================================================
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.verification_uploads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  draw_entry_id UUID REFERENCES public.draw_entries(id) ON DELETE CASCADE NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  status verification_status DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- AUTO-CREATE PROFILE TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draw_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_uploads ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Subscriptions
CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT USING (user_id = auth.uid());

-- Charities (public read)
CREATE POLICY "Anyone can view charities" ON public.charities FOR SELECT USING (is_active = TRUE);

-- Scores
CREATE POLICY "Users can view own scores" ON public.scores FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own scores" ON public.scores FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own scores" ON public.scores FOR DELETE USING (user_id = auth.uid());

-- Draws (public read for published)
CREATE POLICY "Anyone can view published draws" ON public.draws FOR SELECT USING (status = 'published');

-- Draw Entries
CREATE POLICY "Users can view own entries" ON public.draw_entries FOR SELECT USING (user_id = auth.uid());

-- Donations
CREATE POLICY "Users can view own donations" ON public.donations FOR SELECT USING (user_id = auth.uid());

-- Verification Uploads
CREATE POLICY "Users can view own uploads" ON public.verification_uploads FOR SELECT USING (user_id = auth.uid());

-- =====================================================
-- SEED CHARITIES
-- =====================================================
INSERT INTO public.charities (name, slug, category, description, is_featured, is_active) VALUES
('Beyond Blue', 'beyond-blue', 'Mental Health', 'Supporting Australians affected by anxiety, depression and suicide.', true, true),
('Cancer Council', 'cancer-council', 'Health Research', 'Funding research and prevention programs for all Australians affected by cancer.', true, true),
('Salvation Army', 'salvation-army', 'Community Support', 'Providing emergency relief and housing support for Australians in need.', true, true),
('Red Cross Australia', 'red-cross', 'Humanitarian', 'Providing humanitarian services including disaster relief and blood services.', true, true),
('Starlight Foundation', 'starlight', 'Children', 'Brightening the lives of seriously ill children and their families.', false, true),
('RSPCA', 'rspca', 'Animal Welfare', 'Preventing cruelty to animals and promoting kindness.', false, true);

-- =====================================================
-- CREATE PROFILES FOR EXISTING USERS
-- =====================================================
INSERT INTO public.profiles (id, email, full_name)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

SELECT '✅ Schema created successfully!' AS status;
