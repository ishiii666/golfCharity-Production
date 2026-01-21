-- =====================================================
-- CONTENT MANAGEMENT MIGRATION
-- Key-value store for CMS content + Legal content
-- Run this if you've already run the migration before
-- =====================================================

-- Drop existing policies (if any) to recreate them
DROP POLICY IF EXISTS "Anyone can read site content" ON public.site_content;
DROP POLICY IF EXISTS "Admins can update site content" ON public.site_content;
DROP POLICY IF EXISTS "Admins can insert site content" ON public.site_content;

-- Create site_content table
CREATE TABLE IF NOT EXISTS public.site_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id TEXT NOT NULL,
    field_name TEXT NOT NULL,
    field_value TEXT,
    field_type TEXT DEFAULT 'text',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    UNIQUE(section_id, field_name)
);

-- Enable RLS
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- Anyone can read content (for public pages)
CREATE POLICY "Anyone can read site content"
ON public.site_content FOR SELECT
USING (true);

-- Only admins can update content
CREATE POLICY "Admins can update site content"
ON public.site_content FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Only admins can insert content
CREATE POLICY "Admins can insert site content"
ON public.site_content FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- =====================================================
-- DEFAULT HOMEPAGE CONTENT
-- =====================================================
INSERT INTO public.site_content (section_id, field_name, field_value, field_type) VALUES
-- Hero section - Badge
('hero', 'badgeText', 'Live Impact Tracking', 'text'),
-- Hero section - Headline 1
('hero', 'headline1Top', 'PRECISION', 'text'),
('hero', 'headline1Middle', 'MEETS', 'text'),
('hero', 'headline1Accent', 'PURPOSE.', 'text'),
-- Hero section - Headline 2
('hero', 'headline2Top', 'EVERY ROUND', 'text'),
('hero', 'headline2Middle', 'MAKES A', 'text'),
('hero', 'headline2Accent', 'DIFFERENCE.', 'text'),
-- Hero section - Headline 3
('hero', 'headline3Top', 'YOUR GAME', 'text'),
('hero', 'headline3Middle', 'CHANGES', 'text'),
('hero', 'headline3Accent', 'LIVES.', 'text'),
-- Hero section - Headline 4
('hero', 'headline4Top', 'GOLF FOR', 'text'),
('hero', 'headline4Middle', 'A GREATER', 'text'),
('hero', 'headline4Accent', 'CAUSE.', 'text'),
-- Hero section - Subtext
('hero', 'subtext', 'Enhance your game while changing lives. We turn your passion for golf into tangible support for those who need it most.', 'textarea'),
-- Stats section
('stats', 'totalRaised', '184350', 'number'),
('stats', 'activeGolfers', '2847', 'number'),
('stats', 'charities', '24', 'number'),
-- How It Works section
('howItWorks', 'step1Title', 'Play Golf', 'text'),
('howItWorks', 'step1Desc', 'Record your official stableford scores from any registered golf course.', 'textarea'),
('howItWorks', 'step2Title', 'Enter Scores', 'text'),
('howItWorks', 'step2Desc', 'Submit your 5 most recent scores to generate your unique draw numbers.', 'textarea'),
('howItWorks', 'step3Title', 'Win & Give', 'text'),
('howItWorks', 'step3Desc', 'When you win, your chosen charity receives a donation from the prize pool.', 'textarea'),
-- Footer section
('footer', 'copyright', '© 2026 Golf Charity. All rights reserved.', 'text'),
('footer', 'tagline', 'Play for a cause.', 'text')
ON CONFLICT (section_id, field_name) DO NOTHING;

-- =====================================================
-- LEGAL CONTENT - Terms & Conditions, Privacy Policy
-- =====================================================
INSERT INTO public.site_content (section_id, field_name, field_value, field_type) VALUES
-- Terms & Conditions
('legal', 'termsTitle', 'Terms and Conditions', 'text'),
('legal', 'termsLastUpdated', '2026-01-16', 'date'),
('legal', 'termsContent', '# Terms and Conditions

Welcome to Golf Charity. By accessing and using our platform, you agree to be bound by these Terms and Conditions.

## 1. Acceptance of Terms

By creating an account or using our services, you acknowledge that you have read, understood, and agree to be bound by these terms.

## 2. Eligibility

- You must be at least 18 years old to participate
- You must be a legal resident of Australia
- You must have a valid golf handicap

## 3. Subscription and Fees

- Monthly subscription: $10 AUD
- 50% goes to prize pool, 50% to charity
- Auto-renewal unless cancelled

## 4. Draw Rules

- Draws are conducted monthly
- Winners are determined by matching stableford scores
- Prizes are distributed according to tier system

## 5. Charity Donations

- You select your preferred charity at signup
- Winning amounts are donated on your behalf
- Tax receipts provided where applicable

## 6. Limitation of Liability

Golf Charity is not responsible for:
- Technical failures
- Incorrect score submissions
- Third-party charity actions

## 7. Changes to Terms

We may update these terms at any time. Continued use constitutes acceptance.

## 8. Contact

Email: legal@golfcharity.com.au', 'richtext'),

-- Privacy Policy
('legal', 'privacyTitle', 'Privacy Policy', 'text'),
('legal', 'privacyLastUpdated', '2026-01-16', 'date'),
('legal', 'privacyContent', '# Privacy Policy

Golf Charity respects your privacy. This policy explains how we collect, use, and protect your information.

## 1. Information We Collect

### Personal Information
- Name and email address
- Golf handicap and scores
- Payment information
- Charity preferences

### Usage Data
- Login history
- Page views
- Feature usage

## 2. How We Use Your Information

- Process subscriptions and payments
- Conduct monthly draws
- Distribute prizes and donations
- Communicate important updates
- Improve our services

## 3. Data Sharing

We may share data with:
- Payment processors (Stripe)
- Partner charities
- Legal authorities when required

We never sell your personal information.

## 4. Data Security

- SSL encryption on all connections
- Secure database storage
- Regular security audits
- Access controls

## 5. Your Rights

You have the right to:
- Access your data
- Correct inaccuracies
- Delete your account
- Export your data

## 6. Cookies

We use essential cookies for:
- Authentication
- Session management
- Analytics (anonymous)

## 7. Contact

Privacy Officer: privacy@golfcharity.com.au', 'richtext')
ON CONFLICT (section_id, field_name) DO NOTHING;

-- =====================================================
-- DONE
-- =====================================================
