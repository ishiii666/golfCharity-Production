-- =====================================================
-- REPORTS MIGRATION
-- Adds verification fields for winner review panel
-- =====================================================

-- Add verification fields to draw_entries
ALTER TABLE public.draw_entries 
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' 
    CHECK (verification_status IN ('pending', 'verified', 'rejected'));

ALTER TABLE public.draw_entries 
ADD COLUMN IF NOT EXISTS proof_url TEXT;

ALTER TABLE public.draw_entries 
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

ALTER TABLE public.draw_entries 
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id);

-- Index for verification queries
CREATE INDEX IF NOT EXISTS idx_draw_entries_verification 
ON public.draw_entries(verification_status);

-- =====================================================
-- DONE
-- =====================================================
