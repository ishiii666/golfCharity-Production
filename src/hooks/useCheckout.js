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

            // Call the Supabase Edge Function using the client helper
            const { data, error: functionError } = await supabase.functions.invoke(
                'create-checkout-session',
                {
                    body: { priceId }
                }
            );

            if (functionError) {
                console.error('Function error:', functionError);
                throw new Error(functionError.message || 'Failed to create checkout session');
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
            const { data, error: functionError } = await supabase.functions.invoke(
                'create-portal-session',
                {
                    body: {
                        returnUrl: window.location.origin + '/pricing'
                    }
                }
            );

            if (functionError) {
                console.error('Function error:', functionError);
                throw new Error(functionError.message || 'Failed to create portal session');
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
