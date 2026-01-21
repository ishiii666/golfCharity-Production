-- =====================================================
-- Delete Old Dummy Charities
-- Run this in Supabase SQL Editor to remove old data
-- =====================================================

-- Option 1: Delete ALL charities (start fresh)
DELETE FROM public.charities;

-- After running this, go to /admin/charities and add new charities
-- with the image upload feature

SELECT '✅ All old charities deleted! You can now add fresh charities.' AS status;
