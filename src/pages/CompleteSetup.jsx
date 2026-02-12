import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageTransition from '../components/layout/PageTransition';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { PRICE_IDS, isStripeConfigured } from '../lib/stripe';

/**
 * CompleteSetup - Mandatory page after signup
 * 
 * Users must complete their payment setup before accessing the platform.
 * This creates a Stripe Customer and subscription.
 */
export default function CompleteSetup() {
    const { user, profile, refreshProfile } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [selectedPlan, setSelectedPlan] = useState('monthly');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Check for success/cancel from Stripe redirect
    useEffect(() => {
        if (searchParams.get('success') === 'true') {
            setSuccess(true);
            // Mark setup as complete in profile
            markSetupComplete();
        }
        if (searchParams.get('canceled') === 'true') {
            setError('Payment was canceled. Please try again to access the platform.');
        }
    }, [searchParams]);

    // If already setup complete, redirect to dashboard
    useEffect(() => {
        if (profile?.setup_completed) {
            navigate('/dashboard', { replace: true });
        }
    }, [profile, navigate]);

    const markSetupComplete = async () => {
        if (!user || !isSupabaseConfigured()) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ setup_completed: true })
                .eq('id', user.id);

            if (error) throw error;

            // Refresh profile to get updated data
            if (refreshProfile) {
                await refreshProfile();
            }

            // Redirect after short delay
            setTimeout(() => {
                navigate('/dashboard', { replace: true });
            }, 2000);
        } catch (err) {
            console.error('Error marking setup complete:', err);
        }
    };

    const handleStartSetup = async () => {
        if (!user) {
            navigate('/login');
            return;
        }

        if (!isStripeConfigured()) {
            setError('Payment system not configured. Please contact support.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('Please log in to continue');
            }

            const priceId = selectedPlan === 'annual' ? PRICE_IDS.annual : PRICE_IDS.monthly;

            // Call the setup session edge function
            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-setup-session`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({
                        priceId,
                        origin: window.location.origin
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

        } catch (err) {
            console.error('Setup error:', err);
            setError(err.message || 'Failed to start setup. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Success state
    if (success) {
        return (
            <PageTransition>
                <div className="min-h-screen flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center max-w-md"
                    >
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-4">Welcome to GolfCharity!</h1>
                        <p className="text-zinc-400 mb-6">
                            Your payment is set up and you're ready to start making a difference.
                        </p>
                        <div className="w-8 h-8 mx-auto rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                        <p className="text-sm text-zinc-500 mt-4">Redirecting to dashboard...</p>
                    </motion.div>
                </div>
            </PageTransition>
        );
    }

    return (
        <PageTransition>
            <div className="min-h-screen flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-lg"
                >
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">Complete Your Setup</h1>
                        <p className="text-zinc-400">
                            Choose your plan to start playing with purpose
                        </p>
                    </div>

                    {/* Plan Selection */}
                    <div
                        className="p-6 rounded-2xl mb-6"
                        style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.05)'
                        }}
                    >
                        <h2 className="text-lg font-semibold text-white mb-4">Select Your Plan</h2>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            {/* Monthly Plan */}
                            <button
                                onClick={() => setSelectedPlan('monthly')}
                                className={`p-4 rounded-xl text-left transition-all ${selectedPlan === 'monthly'
                                    ? 'ring-2 ring-emerald-500 bg-emerald-500/10'
                                    : 'bg-zinc-800/50 hover:bg-zinc-800'
                                    }`}
                            >
                                <div className="text-2xl font-bold text-white mb-1">$11</div>
                                <div className="text-sm text-zinc-400">per month</div>
                                <div className="text-xs text-zinc-500 mt-2">Cancel anytime</div>
                            </button>

                            {/* Annual Plan */}
                            <button
                                onClick={() => setSelectedPlan('annual')}
                                className={`p-4 rounded-xl text-left transition-all relative ${selectedPlan === 'annual'
                                    ? 'ring-2 ring-emerald-500 bg-emerald-500/10'
                                    : 'bg-zinc-800/50 hover:bg-zinc-800'
                                    }`}
                            >
                                <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-emerald-500 text-white text-xs font-medium rounded-full">
                                    Save 18%
                                </div>
                                <div className="text-2xl font-bold text-white mb-1">$9</div>
                                <div className="text-sm text-zinc-400">per month</div>
                                <div className="text-xs text-zinc-500 mt-2">Billed $108/year</div>
                            </button>
                        </div>

                        {/* What's Included */}
                        <div className="border-t border-zinc-800 pt-4 mb-6">
                            <h3 className="text-sm font-medium text-zinc-300 mb-3">What's included:</h3>
                            <ul className="space-y-2">
                                {[
                                    'Enter monthly charity draws',
                                    'Track your scores and impact',
                                    'Support your chosen charity',
                                    'Win cash prizes',
                                    'Full dashboard access'
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm text-zinc-400">
                                        <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <Button
                            variant="primary"
                            fullWidth
                            onClick={handleStartSetup}
                            loading={isLoading}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Processing...' : `Continue with ${selectedPlan === 'annual' ? 'Annual' : 'Monthly'} Plan`}
                        </Button>

                        {/* Secure Note */}
                        <p className="text-center text-xs text-zinc-500 mt-4 flex items-center justify-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Secure payment powered by Stripe
                        </p>
                    </div>

                    {/* Footer Note */}
                    <p className="text-center text-sm text-zinc-500">
                        By continuing, you agree to our{' '}
                        <a href="/terms" className="text-emerald-400 hover:underline">Terms</a>
                        {' '}and{' '}
                        <a href="/privacy" className="text-emerald-400 hover:underline">Privacy Policy</a>
                    </p>
                </motion.div>
            </div>
        </PageTransition>
    );
}
