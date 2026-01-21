import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Client Configuration
 * 
 * Environment variables:
 * - VITE_SUPABASE_URL: Your Supabase project URL
 * - VITE_SUPABASE_ANON_KEY: Your Supabase anon/public key
 * 
 * Both are safe to expose client-side (RLS protects data)
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
        '⚠️ Supabase environment variables not set. Using mock mode.\n' +
        'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local'
    );
}

// Create Supabase client
export const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        }
    })
    : null;

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => !!supabase;

// Export typed helpers for common operations
export const auth = supabase?.auth;
export const db = supabase;
