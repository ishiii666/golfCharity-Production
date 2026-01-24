import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

/**
 * useSubscription - Hook for managing user subscription status
 * 
 * Features:
 * - Check subscription status from database
 * - SELF-HEALING: If no subscription found but user has stripe_customer_id,
 *   automatically syncs from Stripe via edge function
 * - Handles all subscription states
 */

// Mock subscription for development
const MOCK_SUBSCRIPTION = {
    id: 'sub_mock',
    status: 'active',
    plan: 'annual',
    current_period_start: '2025-01-15',
    current_period_end: '2026-01-15',
    stripe_customer_id: 'cus_mock',
    stripe_subscription_id: 'sub_mock_stripe'
};

export function useSubscription() {
    const { user, isAuthenticated } = useAuth();
    const [subscription, setSubscription] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Call the verify-subscription edge function to sync from Stripe
    const verifyAndSyncFromStripe = useCallback(async () => {
        console.log('[SUBSCRIPTION] Self-healing: Calling verify-subscription...');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                console.log('[SUBSCRIPTION] No session for verify');
                return null;
            }

            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const response = await fetch(
                `${supabaseUrl}/functions/v1/verify-subscription`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const result = await response.json();
            console.log('[SUBSCRIPTION] Verify result:', result);

            if (result.subscription) {
                console.log('[SUBSCRIPTION] ✅ Synced from Stripe:', result.subscription.status, result.subscription.plan);
                return result.subscription;
            }

            return null;
        } catch (err) {
            console.error('[SUBSCRIPTION] Verify error:', err);
            return null;
        }
    }, []);

    // Fetch subscription with self-healing fallback
    const fetchSubscription = useCallback(async () => {
        // If not authenticated or no Supabase, use mock data immediately
        if (!isAuthenticated || !isSupabaseConfigured()) {
            setSubscription(MOCK_SUBSCRIPTION);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        // Set timeout for protection
        const timeoutId = setTimeout(() => {
            console.warn('[SUBSCRIPTION] Timeout - setting null');
            setIsLoading(false);
        }, 8000);

        try {
            console.log('[SUBSCRIPTION] Step 1: Checking database for user:', user.id);

            // Step 1: Try to get from database
            const { data: results, error: dbError } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1);

            if (dbError) {
                throw dbError;
            }

            const data = results && results.length > 0 ? results[0] : null;

            if (data) {
                // Found in database - use it
                clearTimeout(timeoutId);
                console.log('[SUBSCRIPTION] ✅ Found in database:', data.status, data.plan);
                setSubscription(data);
                setIsLoading(false);
                return;
            }

            // Step 2: Not in database - check if user has stripe_customer_id
            console.log('[SUBSCRIPTION] Step 2: No DB record, checking profile for stripe_customer_id...');

            // Check if user profile has a stripe customer ID (meaning they subscribed before)
            const hasStripeCustomer = user?.stripeCustomerId || false;

            // Also check from profile directly
            const { data: profile } = await supabase
                .from('profiles')
                .select('stripe_customer_id')
                .eq('id', user.id)
                .single();

            if (profile?.stripe_customer_id) {
                // User HAS a Stripe customer ID but NO subscription record
                // This is the mismatch we need to heal!
                console.log('[SUBSCRIPTION] 🔄 SELF-HEALING: User has stripe_customer_id but no subscription record');
                console.log('[SUBSCRIPTION] Syncing from Stripe...');

                const syncedSub = await verifyAndSyncFromStripe();

                clearTimeout(timeoutId);

                if (syncedSub) {
                    setSubscription(syncedSub);
                } else {
                    // Stripe sync returned nothing - user truly has no subscription
                    setSubscription(null);
                }
                setIsLoading(false);
                return;
            }

            // Step 3: No stripe_customer_id - user has never subscribed
            clearTimeout(timeoutId);
            console.log('[SUBSCRIPTION] User has no stripe_customer_id - never subscribed');
            setSubscription(null);
            setIsLoading(false);

        } catch (err) {
            clearTimeout(timeoutId);
            console.error('[SUBSCRIPTION] Error:', err);
            setError(err.message);
            setSubscription(null);
            setIsLoading(false);
        }
    }, [user?.id, isAuthenticated, verifyAndSyncFromStripe]);

    // Initial fetch
    useEffect(() => {
        fetchSubscription();
    }, [fetchSubscription]);

    // Derived state - check status case-insensitively
    const status = subscription?.status?.toLowerCase();
    const isActive = status === 'active' || status === 'trialing';
    const isPastDue = status === 'past_due';
    const isCancelled = status === 'cancelled' || status === 'canceled';

    // Debug logging (only log when subscription state changes)
    useEffect(() => {
        if (!isLoading) {
            console.log('[SUBSCRIPTION] Final state:', {
                isActive,
                plan: subscription?.plan,
                draw: subscription?.assigned_draw_id
            });
        }
    }, [isLoading, subscription, user?.email, isActive]);

    const daysRemaining = subscription?.current_period_end
        ? Math.max(0, Math.ceil((new Date(subscription.current_period_end) - new Date()) / (1000 * 60 * 60 * 24)))
        : 0;

    // Build a human-friendly eligibility message
    const eligibilityInfo = subscription?.plan === 'annual'
        ? 'Eligible for all draws'
        : subscription?.assigned_draw_id
            ? `Assigned to ${subscription.assigned_draw_month || 'current cycle'}`
            : (isActive ? 'Entered in next draw' : 'No active draw entry');

    const planLabel = subscription?.plan === 'annual' ? 'Annual Plan - $108/year' : 'Monthly Plan - $9/month';

    return {
        subscription,
        isLoading,
        error,
        isActive,
        isPastDue,
        isCancelled,
        daysRemaining,
        eligibilityInfo,
        planLabel,
        refresh: fetchSubscription
    };
}

export default useSubscription;

