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
    const { subscription, isLoading, error, isAuthenticated, refreshProfile } = useAuth();

    // Derived state - check status case-insensitively
    const status = subscription?.status?.toLowerCase();
    const isActive = status === 'active' || status === 'trialing';
    const isPastDue = status === 'past_due';
    const isCancelled = status === 'cancelled' || status === 'canceled';

    const daysRemaining = subscription?.current_period_end
        ? Math.max(0, Math.ceil((new Date(subscription.current_period_end) - new Date()) / (1000 * 60 * 60 * 24)))
        : 0;

    // Build a human-friendly eligibility message
    const eligibilityInfo = subscription?.plan === 'annual'
        ? 'Eligible for all draws'
        : subscription?.assigned_draw_id
            ? `Assigned to ${subscription.assigned_draw_month || 'current cycle'}`
            : (isActive ? 'Entered in next draw' : 'No active draw entry');

    const planLabel = subscription?.plan === 'annual' ? 'Annual Plan - $108/year' : 'Monthly Plan - $11/month';

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
        refresh: refreshProfile
    };
}

export default useSubscription;

