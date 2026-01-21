import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { PRICE_IDS } from '../lib/stripe';

export function useCheckout() {
    const { user, isAuthenticated } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Create a checkout session and redirect to Stripe
     * @param {'monthly' | 'annual'} plan - The plan type
     */
    const createCheckoutSession = async (plan) => {
        if (!isAuthenticated) {
            setError('Please log in to subscribe');
            return { success: false, error: 'Not authenticated' };
        }

        const priceId = PRICE_IDS[plan];
        if (!priceId || priceId.includes('placeholder')) {
            console.warn('⚠️ Stripe price ID not configured for plan:', plan);
            setError('Subscription configuration pending. Please contact support.');
            return { success: false, error: 'Price ID not configured' };
        }

        setIsLoading(true);
        setError(null);

        try {
            console.log('🔄 Creating checkout session for plan:', plan);

            // Get current session for auth token
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.access_token) {
                throw new Error('No valid session');
            }

            // Call the Supabase Edge Function
            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({ priceId })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create checkout session');
            }

            if (data.url) {
                console.log('✅ Redirecting to Stripe Checkout');
                window.location.href = data.url;
                return { success: true };
            } else {
                throw new Error('No checkout URL received');
            }

        } catch (err) {
            console.error('Checkout error:', err);
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Open Stripe Customer Portal for subscription management
     */
    const openCustomerPortal = async () => {
        if (!isAuthenticated) {
            setError('Please log in to manage subscription');
            return { success: false, error: 'Not authenticated' };
        }

        setIsLoading(true);
        setError(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.access_token) {
                throw new Error('No valid session');
            }

            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({
                        returnUrl: window.location.origin + '/pricing'
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create portal session');
            }

            if (data.url) {
                window.location.href = data.url;
                return { success: true };
            } else {
                throw new Error('No portal URL received');
            }

        } catch (err) {
            console.error('Portal error:', err);
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setIsLoading(false);
        }
    };

    return {
        createCheckoutSession,
        openCustomerPortal,
        isLoading,
        error,
        clearError: () => setError(null)
    };
}

export default useCheckout;
