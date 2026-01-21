import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import PageTransition from '../components/layout/PageTransition';
import Button from '../components/ui/Button';
import { getActiveCharities } from '../lib/supabaseRest';
import { createDonationSession, isStripeConfigured } from '../lib/stripe';
import { useAuth } from '../context/AuthContext';

/**
 * Direct Donation Page - Donate to charities without subscription
 * Uses real charity data from database and Stripe for payment
 */
export default function Donate() {
    const { user } = useAuth();
    const [charities, setCharities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCharity, setSelectedCharity] = useState(null);
    const [donationAmount, setDonationAmount] = useState(25);
    const [customAmount, setCustomAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');

    const presetAmounts = [10, 25, 50, 100, 250];

    useEffect(() => {
        async function fetchCharities() {
            try {
                setLoading(true);
                const data = await getActiveCharities();
                setCharities(data || []);
            } catch (err) {
                console.error('Error fetching charities:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchCharities();
    }, []);

    const handleDonate = async () => {
        const amount = customAmount ? parseFloat(customAmount) : donationAmount;

        if (!selectedCharity) {
            setError('Please select a charity');
            return;
        }

        if (!amount || amount < 1) {
            setError('Please enter a valid amount (minimum $1)');
            return;
        }

        if (!isStripeConfigured()) {
            setError('Payment system is not configured. Please contact support.');
            return;
        }

        setError('');
        setIsProcessing(true);

        try {
            await createDonationSession(
                amount,
                selectedCharity.id,
                selectedCharity.name,
                user?.id || null
            );
        } catch (err) {
            console.error('Donation error:', err);
            setError('Failed to process donation. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading) {
        return (
            <PageTransition>
                <div className="pt-24 pb-16 lg:py-20">
                    <div className="container-app">
                        <div className="flex items-center justify-center min-h-[400px]">
                            <div className="text-center">
                                <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                                <p className="text-zinc-400">Loading charities...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </PageTransition>
        );
    }

    return (
        <PageTransition>
            <div className="pt-24 pb-16 lg:py-20">
                <div className="container-app max-w-4xl">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
                            style={{
                                background: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid rgba(16, 185, 129, 0.2)'
                            }}
                        >
                            <span className="text-emerald-400 text-sm font-medium">Make a Difference</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-4xl lg:text-5xl font-bold mb-4"
                            style={{ color: 'var(--color-cream-100)' }}
                        >
                            Direct{' '}
                            <span style={{ color: '#10b981' }}>Donation</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-lg max-w-2xl mx-auto"
                            style={{ color: 'var(--color-neutral-400)' }}
                        >
                            Support Australian charities directly. 100% of your donation goes to your chosen cause.
                        </motion.p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8">
                        {/* Charity Selection */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <h2 className="text-xl font-bold text-white mb-4">1. Choose a Charity</h2>

                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                {charities.map((charity) => (
                                    <button
                                        key={charity.id}
                                        onClick={() => setSelectedCharity(charity)}
                                        className={`w-full p-4 rounded-xl text-left transition-all flex items-center gap-4 ${selectedCharity?.id === charity.id
                                            ? 'ring-2 ring-emerald-500'
                                            : 'hover:bg-white/5'
                                            }`}
                                        style={{
                                            background: selectedCharity?.id === charity.id
                                                ? 'rgba(16, 185, 129, 0.1)'
                                                : 'rgba(255, 255, 255, 0.02)',
                                            border: '1px solid rgba(255, 255, 255, 0.05)'
                                        }}
                                    >
                                        {charity.image_url && (
                                            <img
                                                src={charity.image_url}
                                                alt={charity.name}
                                                className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                                            />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-white truncate">{charity.name}</div>
                                            <div className="text-sm text-zinc-400 truncate">{charity.category}</div>
                                        </div>
                                        {selectedCharity?.id === charity.id && (
                                            <svg className="w-6 h-6 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </motion.div>

                        {/* Amount Selection */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <h2 className="text-xl font-bold text-white mb-4">2. Select Amount</h2>

                            <div
                                className="p-6 rounded-xl"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    border: '1px solid rgba(255, 255, 255, 0.05)'
                                }}
                            >
                                {/* Preset Amounts */}
                                <div className="grid grid-cols-5 gap-2 mb-4">
                                    {presetAmounts.map((amount) => (
                                        <button
                                            key={amount}
                                            onClick={() => {
                                                setDonationAmount(amount);
                                                setCustomAmount('');
                                            }}
                                            className={`py-3 rounded-xl font-medium transition-all ${donationAmount === amount && !customAmount
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                                }`}
                                        >
                                            ${amount}
                                        </button>
                                    ))}
                                </div>

                                {/* Custom Amount */}
                                <div className="relative mb-6">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 text-lg">$</span>
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="Custom amount"
                                        value={customAmount}
                                        onChange={(e) => {
                                            setCustomAmount(e.target.value);
                                            if (e.target.value) setDonationAmount(0);
                                        }}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-lg placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                                    />
                                </div>

                                {/* Summary */}
                                {selectedCharity && (
                                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-6">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-zinc-400">Charity</span>
                                            <span className="text-white font-medium">{selectedCharity.name}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-zinc-400">Amount</span>
                                            <span className="text-2xl font-bold text-emerald-400">
                                                ${customAmount || donationAmount}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Error Message */}
                                {error && (
                                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
                                        <p className="text-red-400 text-sm">{error}</p>
                                    </div>
                                )}

                                {/* Donate Button */}
                                <Button
                                    variant="primary"
                                    fullWidth
                                    onClick={handleDonate}
                                    loading={isProcessing}
                                    disabled={!selectedCharity || isProcessing}
                                >
                                    {isProcessing ? 'Processing...' : `Donate $${customAmount || donationAmount}`}
                                </Button>

                                {/* Secure Payment Note */}
                                <p className="text-center text-xs text-zinc-500 mt-4 flex items-center justify-center gap-1">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    Secure payment powered by Stripe
                                </p>
                            </div>
                        </motion.div>
                    </div>

                    {/* Why Donate Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="mt-16 grid sm:grid-cols-3 gap-6"
                    >
                        {[
                            {
                                icon: (
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                ),
                                color: '#10b981',
                                title: '100% Goes to Charity',
                                description: 'We don\'t take any cut from donations'
                            },
                            {
                                icon: (
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                ),
                                color: '#f59e0b',
                                title: 'Secure & Safe',
                                description: 'Bank-level encryption via Stripe'
                            },
                            {
                                icon: (
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                ),
                                color: '#8b5cf6',
                                title: 'Tax Receipt',
                                description: 'Receive confirmation for tax purposes'
                            }
                        ].map((item, index) => (
                            <div
                                key={index}
                                className="p-6 rounded-xl text-center"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    border: '1px solid rgba(255, 255, 255, 0.05)'
                                }}
                            >
                                <div
                                    className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center"
                                    style={{ background: `${item.color}20`, color: item.color }}
                                >
                                    {item.icon}
                                </div>
                                <h3 className="font-bold text-white mb-2">{item.title}</h3>
                                <p className="text-sm text-zinc-400">{item.description}</p>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </div>
        </PageTransition>
    );
}
