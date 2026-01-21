import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import PageTransition from '../../components/layout/PageTransition';
import Card, { CardContent, CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { fadeUp, staggerContainer, staggerItem } from '../../utils/animations';
import { createCheckoutSession, openCustomerPortal, PRICE_IDS, isStripeConfigured } from '../../lib/stripe';

const plans = [
    {
        id: 'monthly',
        name: 'Monthly',
        price: 11,
        period: 'month',
        features: [
            'Enter monthly charity draws',
            'Track unlimited golf scores',
            'Choose your charity',
            'Basic analytics'
        ],
        popular: false
    },
    {
        id: 'annual',
        name: 'Annual',
        price: 108,
        period: 'year',
        monthlyEquiv: 9,
        savings: '18%',
        features: [
            'Everything in Monthly',
            '2 bonus draw entries per year',
            'Advanced score analytics',
            'Priority support',
            'Exclusive member events'
        ],
        popular: true
    }
];

// Helper function to get card brand styling
const getCardBrandStyle = (brand) => {
    const styles = {
        visa: { background: 'linear-gradient(135deg, #1a1f71, #00a8e1)' },
        mastercard: { background: 'linear-gradient(135deg, #eb001b, #f79e1b)' },
        amex: { background: 'linear-gradient(135deg, #006fcf, #00a4e4)' },
        discover: { background: 'linear-gradient(135deg, #ff6000, #ffde00)' },
        default: { background: 'linear-gradient(135deg, #4a4a4a, #6a6a6a)' }
    };
    return styles[brand?.toLowerCase()] || styles.default;
};

export default function Subscription() {
    const { user, isAdmin } = useAuth();

    // Admins don't need subscriptions - redirect to admin panel
    if (isAdmin) {
        return <Navigate to="/admin" replace />;
    }

    const [searchParams, setSearchParams] = useSearchParams();
    const [currentPlan] = useState(user?.subscription?.plan || 'annual');
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [billingHistory] = useState([
        { date: '2026-01-01', amount: 108, status: 'paid', description: 'Annual subscription' },
        { date: '2025-01-01', amount: 108, status: 'paid', description: 'Annual subscription' },
        { date: '2024-01-01', amount: 108, status: 'paid', description: 'Annual subscription' }
    ]);

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

    // Handle subscribe/switch plan
    const handleSubscribe = async (planId) => {
        if (!isStripeConfigured()) {
            alert('Payment system not configured. Please contact support.');
            return;
        }
        setIsLoading(true);
        try {
            await createCheckoutSession(PRICE_IDS[planId]);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle manage subscription (opens Stripe Customer Portal)
    const handleManageSubscription = async () => {
        if (!isStripeConfigured()) {
            alert('Payment system not configured. Please contact support.');
            return;
        }

        // Check if user has a Stripe subscription
        const stripeCustomerId = user?.subscription?.stripe_customer_id;
        if (!stripeCustomerId) {
            alert('No active Stripe subscription found. If you have a subscription, it may not be linked to Stripe yet. Please subscribe first.');
            return;
        }

        setIsLoading(true);
        try {
            await openCustomerPortal();
        } finally {
            setIsLoading(false);
        }
    };

    // Get subscription from user data - no fake fallbacks
    const subscription = user?.subscription || null;
    const hasActiveSubscription = subscription?.status === 'active' || subscription?.status === 'trialing';

    return (
        <PageTransition>
            <div className="py-8 lg:py-12">
                <div className="container-app max-w-4xl">
                    {/* Header */}
                    <motion.div
                        variants={fadeUp}
                        initial="initial"
                        animate="animate"
                        className="mb-8"
                    >
                        <h1 className="text-3xl lg:text-4xl font-bold mb-2" style={{ color: 'var(--color-cream-100)' }}>
                            Subscription
                        </h1>
                        <p style={{ color: 'var(--color-neutral-400)' }}>
                            Manage your subscription and billing
                        </p>
                    </motion.div>

                    {/* Success/Error Message */}
                    {successMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 rounded-xl"
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

                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        animate="animate"
                        className="space-y-6"
                    >
                        {/* Current Subscription Status */}
                        <motion.div variants={staggerItem}>
                            <Card variant="glass">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-xl font-bold" style={{ color: 'var(--color-cream-100)' }}>
                                            Current Subscription
                                        </h2>
                                        {hasActiveSubscription ? (
                                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-400">
                                                ✓ Active
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-zinc-500/20 text-zinc-400">
                                                No Subscription
                                            </span>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {hasActiveSubscription ? (
                                        <div className="flex flex-col md:flex-row gap-6 items-start">
                                            <div className="flex-1">
                                                <div className="flex items-baseline gap-2 mb-2">
                                                    <span className="text-3xl font-bold" style={{ color: '#c9a227' }}>
                                                        {currentPlan === 'annual' ? '$108' : '$11'}
                                                    </span>
                                                    <span style={{ color: 'var(--color-neutral-500)' }}>
                                                        /{currentPlan === 'annual' ? 'year' : 'month'}
                                                    </span>
                                                </div>
                                                <p className="text-lg font-medium mb-4" style={{ color: 'var(--color-cream-200)' }}>
                                                    {currentPlan === 'annual' ? 'Annual Plan' : 'Monthly Plan'}
                                                    {currentPlan === 'annual' && (
                                                        <span className="ml-2 px-2 py-1 rounded text-xs bg-green-500/20 text-green-400">
                                                            SAVE 18%
                                                        </span>
                                                    )}
                                                </p>
                                                <div className="space-y-2 text-sm" style={{ color: 'var(--color-neutral-400)' }}>
                                                    {subscription?.current_period_end && (
                                                        <p>
                                                            <span className="font-medium" style={{ color: 'var(--color-cream-200)' }}>Next billing date:</span>{' '}
                                                            {new Date(subscription.current_period_end).toLocaleDateString('en-AU', {
                                                                year: 'numeric',
                                                                month: 'long',
                                                                day: 'numeric'
                                                            })}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleManageSubscription}
                                                    disabled={isLoading}
                                                >
                                                    {isLoading ? 'Loading...' : 'Manage Subscription'}
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-6">
                                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
                                                <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                                </svg>
                                            </div>
                                            <h3 className="text-lg font-semibold text-white mb-2">No Active Subscription</h3>
                                            <p className="text-zinc-400 mb-4">Choose a plan below to start playing with purpose</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Available Plans */}
                        <motion.div variants={staggerItem}>
                            <Card variant="glass">
                                <CardHeader>
                                    <h2 className="text-xl font-bold" style={{ color: 'var(--color-cream-100)' }}>
                                        Available Plans
                                    </h2>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        {plans.map(plan => (
                                            <div
                                                key={plan.id}
                                                className={`p-6 rounded-xl relative ${currentPlan === plan.id ? 'ring-2 ring-[#c9a227]' : ''
                                                    }`}
                                                style={{
                                                    background: plan.popular
                                                        ? 'linear-gradient(135deg, rgba(26, 77, 46, 0.4), rgba(201, 162, 39, 0.1))'
                                                        : 'rgba(26, 77, 46, 0.3)'
                                                }}
                                            >
                                                {plan.popular && (
                                                    <span
                                                        className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-medium"
                                                        style={{ background: '#c9a227', color: '#0f3621' }}
                                                    >
                                                        MOST POPULAR
                                                    </span>
                                                )}

                                                <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-cream-100)' }}>
                                                    {plan.name}
                                                </h3>

                                                <div className="flex items-baseline gap-1 mb-4">
                                                    <span className="text-3xl font-bold" style={{ color: '#c9a227' }}>
                                                        ${plan.price}
                                                    </span>
                                                    <span style={{ color: 'var(--color-neutral-500)' }}>
                                                        /{plan.period}
                                                    </span>
                                                </div>

                                                {plan.monthlyEquiv && (
                                                    <p className="text-sm mb-4" style={{ color: 'var(--color-neutral-400)' }}>
                                                        That's only ${plan.monthlyEquiv}/month
                                                        <span className="ml-2 text-green-400">Save {plan.savings}!</span>
                                                    </p>
                                                )}

                                                <ul className="space-y-2 mb-6">
                                                    {plan.features.map((feature, i) => (
                                                        <li key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-neutral-300)' }}>
                                                            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                            {feature}
                                                        </li>
                                                    ))}
                                                </ul>

                                                {/* Show different UI based on subscription status */}
                                                {hasActiveSubscription ? (
                                                    currentPlan === plan.id ? (
                                                        // Current plan - show badge
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
                                                        // Other plan while subscribed - show message
                                                        <div
                                                            className="w-full py-3 px-4 rounded-lg text-center font-medium"
                                                            style={{
                                                                background: 'rgba(201, 162, 39, 0.1)',
                                                                color: 'var(--color-neutral-400)',
                                                                border: '1px solid rgba(201, 162, 39, 0.2)'
                                                            }}
                                                        >
                                                            Already subscribed to {currentPlan === 'annual' ? 'Annual' : 'Monthly'}
                                                        </div>
                                                    )
                                                ) : (
                                                    // Not subscribed - show subscribe button
                                                    <Button
                                                        variant="primary"
                                                        fullWidth
                                                        disabled={isLoading}
                                                        onClick={() => handleSubscribe(plan.id)}
                                                    >
                                                        {isLoading ? 'Loading...' : 'Subscribe to ' + plan.name}
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Payment Method - Only show for active subscribers */}
                        {hasActiveSubscription && (
                            <motion.div variants={staggerItem}>
                                <Card variant="glass">
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-xl font-bold" style={{ color: 'var(--color-cream-100)' }}>
                                                Payment Method
                                            </h2>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleManageSubscription}
                                                disabled={isLoading || subscription.status !== 'active'}
                                            >
                                                {isLoading ? 'Loading...' : 'Edit'}
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div
                                            className="flex items-center gap-4 p-4 rounded-xl"
                                            style={{ background: 'rgba(26, 77, 46, 0.3)' }}
                                        >
                                            <div
                                                className="w-14 h-10 rounded-lg flex items-center justify-center"
                                                style={{
                                                    background: getCardBrandStyle(subscription.payment_method_brand || 'visa').background
                                                }}
                                            >
                                                <span className="text-white text-xs font-bold uppercase">
                                                    {subscription.payment_method_brand || 'VISA'}
                                                </span>
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium" style={{ color: 'var(--color-cream-200)' }}>
                                                    •••• •••• •••• {subscription.payment_method_last4 || '4242'}
                                                </p>
                                                <p className="text-sm" style={{ color: 'var(--color-neutral-500)' }}>
                                                    Expires {subscription.payment_method_exp_month || 12}/{subscription.payment_method_exp_year || 2027}
                                                </p>
                                            </div>
                                            <span
                                                className="px-2 py-1 rounded text-xs"
                                                style={{ background: 'rgba(201, 162, 39, 0.2)', color: '#c9a227' }}
                                            >
                                                Default
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}

                        {/* Billing History - Only show for active subscribers */}
                        {hasActiveSubscription && (
                            <motion.div variants={staggerItem}>
                                <Card variant="glass">
                                    <CardHeader>
                                        <h2 className="text-xl font-bold" style={{ color: 'var(--color-cream-100)' }}>
                                            Billing History
                                        </h2>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {billingHistory.map((item, i) => (
                                                <div
                                                    key={i}
                                                    className="flex items-center justify-between p-4 rounded-xl"
                                                    style={{ background: 'rgba(26, 77, 46, 0.2)' }}
                                                >
                                                    <div>
                                                        <p className="font-medium" style={{ color: 'var(--color-cream-200)' }}>
                                                            {item.description}
                                                        </p>
                                                        <p className="text-sm" style={{ color: 'var(--color-neutral-500)' }}>
                                                            {new Date(item.date).toLocaleDateString('en-AU', {
                                                                year: 'numeric',
                                                                month: 'long',
                                                                day: 'numeric'
                                                            })}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold" style={{ color: '#c9a227' }}>
                                                            ${item.amount.toFixed(2)}
                                                        </p>
                                                        <span
                                                            className="text-xs px-2 py-1 rounded"
                                                            style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e' }}
                                                        >
                                                            {item.status.toUpperCase()}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-4 text-center">
                                            <Button variant="ghost" size="sm">
                                                Download All Invoices
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </motion.div>

                    {/* Cancel Modal */}
                    {showCancelModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <div
                                className="absolute inset-0 bg-black/60"
                                onClick={() => setShowCancelModal(false)}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="relative w-full max-w-md p-6 rounded-2xl"
                                style={{
                                    background: 'rgba(15, 54, 33, 0.98)',
                                    border: '1px solid rgba(201, 162, 39, 0.2)'
                                }}
                            >
                                <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--color-cream-100)' }}>
                                    Cancel Subscription?
                                </h3>
                                <p className="mb-6" style={{ color: 'var(--color-neutral-400)' }}>
                                    Are you sure you want to cancel? You'll lose access to:
                                </p>
                                <ul className="space-y-2 mb-6">
                                    {['Monthly charity draws', 'Score tracking', 'Community features'].map((item, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-neutral-300)' }}>
                                            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        fullWidth
                                        onClick={() => setShowCancelModal(false)}
                                    >
                                        Keep Subscription
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        fullWidth
                                        className="text-red-400 hover:bg-red-500/10"
                                    >
                                        Yes, Cancel
                                    </Button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </div>
            </div>
        </PageTransition>
    );
}
