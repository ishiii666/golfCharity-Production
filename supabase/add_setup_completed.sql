-- Migration: Add setup_completed column to profiles table
-- This tracks whether a user has completed their Stripe payment setup

-- Add setup_completed column (defaults to false for new users)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT false;

-- Update existing users with subscriptions to have setup_completed = true
UPDATE profiles 
SET setup_completed = true 
WHERE stripe_customer_id IS NOT NULL;

-- Also mark users with active subscriptions as setup complete
UPDATE profiles p
SET setup_completed = true
FROM subscriptions s
WHERE p.id = s.user_id AND s.status = 'active';

-- Create index for faster lookups on setup_completed
CREATE INDEX IF NOT EXISTS idx_profiles_setup_completed ON profiles(setup_completed);

-- Grant necessary permissions
GRANT SELECT, UPDATE ON profiles TO authenticated;
