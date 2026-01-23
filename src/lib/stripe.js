/**
 * Stripe Frontend Integration
 * 
 * Provides helper functions to interact with Stripe via Supabase Edge Functions.
 * All sensitive operations (creating sessions) happen server-side in Edge Functions.
 */

import { loadStripe } from '@stripe/stripe-js';
import { supabase, isSupabaseConfigured } from './supabase';

// Initialize Stripe with publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

/**
 * Price IDs from Stripe Dashboard
 * 
 * IMPORTANT: Replace these with your actual Stripe Price IDs!
 * Get them from: Stripe Dashboard → Products → Click product → Copy "Price ID"
 */
export const PRICE_IDS = {
    monthly: 'price_1SsIYYDyu18Cp1ZO7nJxx70s',
    annual: 'price_1SsIYyDyu18Cp1ZO3iogcicJ',
};

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured() {
    return !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
}

/**
 * Get Supabase URL for Edge Functions
 */
function getSupabaseUrl() {
    return import.meta.env.VITE_SUPABASE_URL;
}

/**
 * Create a checkout session for subscription
 * Redirects user to Stripe Checkout page
 * 
 * @param {string} priceId - Stripe Price ID (from PRICE_IDS)
 */
export async function createCheckoutSession(priceId) {
    if (!isSupabaseConfigured()) {
        console.warn('⚠️ Supabase not configured. Stripe checkout unavailable.');
        alert('Payment system not configured. Please contact support.');
        return;
    }

    try {
        // Get current session token
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            alert('Please log in to subscribe.');
            window.location.href = '/login';
            return;
        }

        // Call Edge Function to create checkout session
        const response = await fetch(
            `${getSupabaseUrl()}/functions/v1/create-checkout-session`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ priceId }),
            }
        );

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        // Redirect to Stripe Checkout
        if (data.url) {
            window.location.href = data.url;
        }

    } catch (error) {
        console.error('Checkout error:', error);
        alert(`Failed to start checkout: ${error.message}`);
    }
}

/**
 * Open Stripe Customer Portal
 * Allows users to manage subscription, update payment method, cancel, etc.
 */
export async function openCustomerPortal() {
    if (!isSupabaseConfigured()) {
        console.warn('⚠️ Supabase not configured. Customer portal unavailable.');
        alert('Payment system not configured. Running in demo mode.');
        return;
    }

    try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            alert('Please log in to manage your subscription.');
            window.location.href = '/login';
            return;
        }

        // Add timeout for the fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        const response = await fetch(
            `${getSupabaseUrl()}/functions/v1/create-portal-session`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
                signal: controller.signal
            }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Portal response error:', response.status, errorText);
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            // More user-friendly error messages
            if (data.error.includes('No subscription found')) {
                alert('No active subscription found. Please subscribe first to manage your payment method.');
            } else {
                alert(`Unable to open payment manager: ${data.error}`);
            }
            return;
        }

        // Redirect to Stripe Customer Portal
        if (data.url) {
            window.location.href = data.url;
        } else {
            alert('Unable to open payment manager. Please try again later.');
        }

    } catch (error) {
        console.error('Portal error:', error);
        if (error.name === 'AbortError') {
            alert('Request timed out. Please check your connection and try again.');
        } else {
            alert(`Failed to open subscription manager: ${error.message}`);
        }
    }
}

/**
 * Create a donation checkout session
 * Redirects user to Stripe Checkout for one-time payment
 * 
 * @param {number} amount - Donation amount in dollars (min $1)
 * @param {string} charityId - UUID of the charity
 * @param {string} charityName - Name of the charity (for display)
 * @param {string|null} userId - Optional user ID (null for anonymous)
 */
export async function createDonationSession(amount, charityId, charityName, userId = null) {
    if (!isSupabaseConfigured()) {
        console.warn('⚠️ Supabase not configured. Donations unavailable.');
        alert('Payment system not configured. Please contact support.');
        return;
    }

    if (amount < 1) {
        alert('Minimum donation amount is $1');
        return;
    }

    try {
        const response = await fetch(
            `${getSupabaseUrl()}/functions/v1/create-donation-session`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount,
                    charityId,
                    charityName,
                    userId: userId || 'anonymous'
                }),
            }
        );

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        // Redirect to Stripe Checkout
        if (data.url) {
            window.location.href = data.url;
        }

    } catch (error) {
        console.error('Donation error:', error);
        alert(`Failed to start donation: ${error.message}`);
    }
}

/**
 * Cancel subscription immediately (no refund)
 * Called when user deletes their account
 * 
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function cancelSubscription() {
    if (!isSupabaseConfigured()) {
        console.warn('⚠️ Supabase not configured. Cancel unavailable.');
        return { success: true }; // In demo mode, just return success
    }

    try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return { success: false, error: 'Not authenticated' };
        }

        const response = await fetch(
            `${getSupabaseUrl()}/functions/v1/cancel-subscription`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
            }
        );

        const data = await response.json();

        if (data.error) {
            console.error('Cancel subscription error:', data.error);
            return { success: false, error: data.error };
        }

        return { success: true };

    } catch (error) {
        console.error('Cancel subscription error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get the Stripe instance (for advanced use cases)
 */
export function getStripe() {
    return stripePromise;
}

export default {
    PRICE_IDS,
    isStripeConfigured,
    createCheckoutSession,
    openCustomerPortal,
    createDonationSession,
    cancelSubscription,
    getStripe,
};
