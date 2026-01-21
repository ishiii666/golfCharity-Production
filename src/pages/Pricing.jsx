import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PageTransition from '../components/layout/PageTransition';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { useCheckout } from '../hooks/useCheckout';
import { openCustomerPortal, isStripeConfigured } from '../lib/stripe';
import { HeartIcon, GolfFlagIcon } from '../components/ui/Icons';

/**
 * Pricing - Smart subscription page
 * 
 * Shows different content based on user status:
 * - Not logged in: Marketing page with "Get Started" buttons
 * - Logged in, no subscription: "Subscribe Now" buttons
 * - Logged in, has subscription: Current plan status + manage button
 */

const plans = [
    {
        id: 'monthly',
        name: 'Monthly',
        price: 11,
        period: 'month',
        description: 'Perfect for casual golfers',
        features: [
            'Enter monthly charity draws',
            'Track your Stableford scores',
            'Support your chosen charity',
            'Win prizes while giving back',
            'Cancel anytime'
        ],
        popular: false
    },
    {
        id: 'annual',
        name: 'Annual',
        price: 9,
        period: 'month',
        billedAs: '$108/year',
        savings: 'Save 18%',
        description: 'Best value for dedicated golfers',
        features: [
            'All Monthly features',
            '2 months FREE',
            'Priority support',
            'Exclusive charity events access',
            'Annual impact report'
        ],
        popular: true
    }
];

export default function Pricing() {
    const { isAuthenticated, isSubscribed, subscription, isLoading: authLoading } = useAuth();
    const { createCheckoutSession, isLoading, error, clearError } = useCheckout();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [manageLoading, setManageLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showSwitchModal, setShowSwitchModal] = useState(false);
    const [pendingSwitchPlan, setPendingSwitchPlan] = useState(null);

    // Get current plan from subscription
    const currentPlan = subscription?.plan || null;

    // Handle success/cancel URL params from Stripe redirect
    useEffect(() => {
        if (searchParams.get('success') === 'true') {
            setSuccessMessage('🎉 Subscription successful! Welcome to Golf Charity!');
            searchParams.delete('success');
            setSearchParams(searchParams);
        } else if (searchParams.get('canceled') === 'true') {
            setSuccessMessage('Checkout was canceled. You can try again anytime.');
            searchParams.delete('canceled');
            setSearchParams(searchParams);
        }
    }, [searchParams, setSearchParams]);

    const handleSubscribe = async (planId) => {
        if (!isAuthenticated) {
            // Redirect to signup with return URL
            navigate('/signup?redirect=/pricing');
            return;
        }

        setSelectedPlan(planId);
        clearError();

        const result = await createCheckoutSession(planId);

        if (!result.success) {
            console.error('Subscription failed:', result.error);
        }

        setSelectedPlan(null);
    };

    const handleManageSubscription = async () => {
        if (!isStripeConfigured()) {
            alert('Payment system not configured. Please contact support.');
            return;
        }

        setManageLoading(true);
        try {
            await openCustomerPortal();
        } finally {
            setManageLoading(false);
        }
    };

    // Handle plan switch button click
    const handleSwitchPlan = (targetPlanId) => {
        setPendingSwitchPlan(targetPlanId);
        setShowSwitchModal(true);
    };

    // Confirm plan switch
    const confirmPlanSwitch = async () => {
        setShowSwitchModal(false);
        // For now, redirect to Stripe Customer Portal where they can change plans
        await handleManageSubscription();
        setPendingSwitchPlan(null);
    };

    // Format date helper
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-AU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    // Determine header text based on user status
    const getHeaderContent = () => {
        if (isSubscribed) {
            return {
                title: 'Your Subscription',
                subtitle: 'Manage your subscription and billing'
            };
        }
        if (isAuthenticated) {
            return {
                title: 'Choose Your Plan',
                subtitle: 'Start playing with purpose today'
            };
        }
        return {
            title: <>Play With <span className="text-gradient-emerald">Purpose</span></>,
            subtitle: 'Join our community of golfers making a difference. Every subscription supports Australian charities.'
        };
    };

    const header = getHeaderContent();

    return (
        <PageTransition>
            <div className="py-16 lg:py-24">
                <div className="container-app max-w-5xl">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-16"
                    >
                        {!isSubscribed && (
                            <motion.div
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                className="inline-block mb-4"
                            >
                                <HeartIcon size={48} color="#10b981" strokeWidth={1.5} />
                            </motion.div>
                        )}
                        <h1
                            className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4"
                            style={{ fontFamily: 'var(--font-display)', color: '#f9f5e3' }}
                        >
                            {header.title}
                        </h1>
                        <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--color-neutral-400)' }}>
                            {header.subtitle}
                        </p>
                    </motion.div>

                    {/* Success/Error Messages */}
                    {successMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="max-w-md mx-auto mb-8 p-4 rounded-xl text-center"
                            style={{
                                background: successMessage.includes('canceled')
                                    ? 'rgba(234, 179, 8, 0.1)'
                                    : 'rgba(34, 197, 94, 0.1)',
                                border: successMessage.includes('canceled')
                                    ? '1px solid rgba(234, 179, 8, 0.3)'
                                    : '1px solid rgba(34, 197, 94, 0.3)'
                            }}
                        >
                            <p className={successMessage.includes('canceled') ? 'text-yellow-400' : 'text-green-400'}>
                                {successMessage}
                            </p>
                        </motion.div>
                    )}

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="max-w-md mx-auto mb-8 p-4 rounded-xl text-center"
                            style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                        >
                            <p className="text-red-400">{error}</p>
                        </motion.div>
                    )}

                    {/* Current Subscription Card - Only for subscribed users */}
                    {isSubscribed && subscription && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-12"
                        >
                            <Card variant="glass" className="p-6">
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-xl font-bold text-white">
                                                {currentPlan === 'annual' ? 'Annual Plan' : 'Monthly Plan'}
                                            </h3>
                                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-400">
                                                ✓ Active
                                            </span>
                                        </div>
                                        <p className="text-zinc-400 mb-2">
                                            {currentPlan === 'annual' ? '$108/year' : '$11/month'}
                                        </p>
                                        {/* Subscription Dates */}
                                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                                            <div className="flex items-center gap-2">
                                                <span style={{ color: 'var(--color-neutral-500)' }}>Subscribed on:</span>
                                                <span style={{ color: 'var(--color-neutral-300)' }}>
                                                    {formatDate(subscription.current_period_start || subscription.created_at)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span style={{ color: 'var(--color-neutral-500)' }}>Next billing:</span>
                                                <span style={{ color: '#10b981' }}>
                                                    {formatDate(subscription.current_period_end)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    )}

                    {/* Pricing Cards */}
                    <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                        {plans.map((plan, index) => (
                            <motion.div
                                key={plan.id}
                                initial={{ opacity: 0, y: 40 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                className="relative"
                            >
                                {/* Popular Badge */}
                                {plan.popular && (
                                    <div
                                        className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-sm font-medium z-10"
                                        style={{
                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                            color: 'white'
                                        }}
                                    >
                                        Most Popular
                                    </div>
                                )}

                                {/* Current Plan Badge */}
                                {isSubscribed && currentPlan === plan.id && (
                                    <div
                                        className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-sm font-medium z-10"
                                        style={{
                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                            color: 'white'
                                        }}
                                    >
                                        Your Plan
                                    </div>
                                )}

                                <Card
                                    variant={plan.popular && !isSubscribed ? 'gradient' : 'glass'}
                                    hoverable
                                    className="h-full text-center flex flex-col"
                                    style={{
                                        border: isSubscribed && currentPlan === plan.id
                                            ? '2px solid rgba(201, 162, 39, 0.5)'
                                            : plan.popular
                                                ? '2px solid rgba(16, 185, 129, 0.5)'
                                                : '1px solid rgba(255, 255, 255, 0.1)'
                                    }}
                                >
                                    {/* Plan Name */}
                                    <h2
                                        className="text-2xl font-bold mb-2"
                                        style={{ fontFamily: 'var(--font-display)', color: '#f9f5e3' }}
                                    >
                                        {plan.name}
                                    </h2>
                                    <p className="text-sm mb-6" style={{ color: 'var(--color-neutral-400)' }}>
                                        {plan.description}
                                    </p>

                                    {/* Price */}
                                    <div className="mb-6">
                                        <div className="flex items-end justify-center gap-1">
                                            <span
                                                className="text-5xl font-bold"
                                                style={{
                                                    fontFamily: 'var(--font-display)',
                                                    color: plan.popular ? '#10b981' : '#c9a227'
                                                }}
                                            >
                                                ${plan.price}
                                            </span>
                                            <span className="text-lg mb-2" style={{ color: 'var(--color-neutral-400)' }}>
                                                /{plan.period}
                                            </span>
                                        </div>
                                        {plan.billedAs && (
                                            <p className="text-sm mt-2" style={{ color: 'var(--color-neutral-500)' }}>
                                                Billed as {plan.billedAs}
                                            </p>
                                        )}
                                        {plan.savings && (
                                            <span
                                                className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium"
                                                style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}
                                            >
                                                {plan.savings}
                                            </span>
                                        )}
                                        {!plan.savings && !plan.billedAs && (
                                            <div className="h-8" />
                                        )}
                                    </div>

                                    {/* Features */}
                                    <ul className="space-y-3 mb-8 text-left flex-grow">
                                        {plan.features.map((feature, i) => (
                                            <li
                                                key={i}
                                                className="flex items-center gap-3"
                                                style={{ color: 'var(--color-neutral-300)' }}
                                            >
                                                <svg
                                                    className="w-5 h-5 flex-shrink-0"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke={plan.popular ? '#10b981' : '#c9a227'}
                                                    strokeWidth={2}
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>

                                    {/* CTA Button - Different based on subscription status */}
                                    <div className="mt-auto">
                                        {isSubscribed ? (
                                            currentPlan === plan.id ? (
                                                <div
                                                    className="w-full py-3 px-4 rounded-lg text-center font-medium"
                                                    style={{
                                                        background: 'rgba(34, 197, 94, 0.2)',
                                                        color: '#22c55e',
                                                        border: '1px solid rgba(34, 197, 94, 0.3)'
                                                    }}
                                                >
                                                    ✓ Your Current Plan
                                                </div>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    size="lg"
                                                    fullWidth
                                                    onClick={() => handleSwitchPlan(plan.id)}
                                                    loading={manageLoading}
                                                >
                                                    Switch to {plan.name}
                                                </Button>
                                            )
                                        ) : (
                                            <Button
                                                variant={plan.popular ? 'accent' : 'outline'}
                                                size="lg"
                                                fullWidth
                                                loading={isLoading && selectedPlan === plan.id}
                                                onClick={() => handleSubscribe(plan.id)}
                                                className="magnetic"
                                            >
                                                {isLoading && selectedPlan === plan.id
                                                    ? 'Redirecting...'
                                                    : isAuthenticated
                                                        ? `Subscribe to ${plan.name}`
                                                        : `Get Started`
                                                }
                                            </Button>
                                        )}
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>

                    {/* Trust Badges - Only show for non-subscribed users */}
                    {!isSubscribed && (
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="mt-16 text-center"
                        >
                            <div className="flex flex-wrap justify-center gap-8 mb-8">
                                <div className="flex items-center gap-2" style={{ color: 'var(--color-neutral-400)' }}>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    <span className="text-sm">Secure payments via Stripe</span>
                                </div>
                                <div className="flex items-center gap-2" style={{ color: 'var(--color-neutral-400)' }}>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                    <span className="text-sm">Supporting Australian charities</span>
                                </div>
                                <div className="flex items-center gap-2" style={{ color: 'var(--color-neutral-400)' }}>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-sm">Cancel anytime</span>
                                </div>
                            </div>

                            {/* FAQ Link */}
                            <p style={{ color: 'var(--color-neutral-500)' }}>
                                Have questions?{' '}
                                <Link
                                    to="/how-it-works"
                                    className="underline hover:text-white transition-colors"
                                >
                                    Learn how it works
                                </Link>
                            </p>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Plan Switch Modal */}
            {showSwitchModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-md p-6 rounded-2xl"
                        style={{ background: '#1a4d2e', border: '1px solid rgba(16, 185, 129, 0.3)' }}
                    >
                        <h3 className="text-xl font-bold mb-4" style={{ color: '#10b981' }}>
                            Switch to {pendingSwitchPlan === 'annual' ? 'Annual' : 'Monthly'} Plan
                        </h3>

                        {/* Downgrade Warning for Annual → Monthly */}
                        {currentPlan === 'annual' && pendingSwitchPlan === 'monthly' && (
                            <div
                                className="mb-4 p-4 rounded-xl"
                                style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)' }}
                            >
                                <p className="text-yellow-400 text-sm mb-2 font-medium">
                                    ⚠️ You're switching to a lower plan
                                </p>
                                <p className="text-sm" style={{ color: 'var(--color-neutral-400)' }}>
                                    Your current annual plan will remain active until <strong className="text-white">{formatDate(subscription?.current_period_end)}</strong>.
                                    After this date, you'll be charged <strong className="text-white">$11/month</strong>.
                                </p>
                            </div>
                        )}

                        {/* Upgrade Info for Monthly → Annual */}
                        {currentPlan === 'monthly' && pendingSwitchPlan === 'annual' && (
                            <div
                                className="mb-4 p-4 rounded-xl"
                                style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}
                            >
                                <p className="text-emerald-400 text-sm mb-2 font-medium">
                                    🎉 Great choice! You'll save 18%
                                </p>
                                <p className="text-sm" style={{ color: 'var(--color-neutral-400)' }}>
                                    Your unused monthly balance will be credited. You'll be charged <strong className="text-white">$108/year</strong> starting immediately.
                                </p>
                            </div>
                        )}

                        <div className="mb-4">
                            <div className="flex justify-between py-2 border-b border-white/10">
                                <span style={{ color: 'var(--color-neutral-400)' }}>Current Plan</span>
                                <span className="text-white font-medium">
                                    {currentPlan === 'annual' ? 'Annual ($108/year)' : 'Monthly ($11/month)'}
                                </span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span style={{ color: 'var(--color-neutral-400)' }}>New Plan</span>
                                <span className="text-emerald-400 font-medium">
                                    {pendingSwitchPlan === 'annual' ? 'Annual ($108/year)' : 'Monthly ($11/month)'}
                                </span>
                            </div>
                            {currentPlan === 'annual' && pendingSwitchPlan === 'monthly' && subscription?.current_period_end && (
                                <div className="flex justify-between py-2 border-t border-white/10">
                                    <span style={{ color: 'var(--color-neutral-400)' }}>Monthly starts on</span>
                                    <span className="text-white font-medium">
                                        {formatDate(subscription.current_period_end)}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="ghost"
                                fullWidth
                                onClick={() => {
                                    setShowSwitchModal(false);
                                    setPendingSwitchPlan(null);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                fullWidth
                                onClick={confirmPlanSwitch}
                            >
                                Confirm Switch
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </PageTransition>
    );
}
