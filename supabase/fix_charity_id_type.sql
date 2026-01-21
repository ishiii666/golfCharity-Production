-- =====================================================
-- Fix Charity ID Type Migration
-- Run this in Supabase SQL Editor to fix charity selection persistence
-- =====================================================

-- The selected_charity_id column was UUID but the frontend uses string IDs ('1', '2', etc.)
-- This migration changes it to TEXT to match the frontend

-- First, drop the column and recreate as TEXT
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS selected_charity_id;

ALTER TABLE public.profiles 
ADD COLUMN selected_charity_id TEXT;

-- Verify the change
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'selected_charity_id';
