import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import PageTransition from '../components/layout/PageTransition';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { ArrowRightIcon } from '../components/ui/Icons';
import CharityDetailsModal from '../components/ui/CharityDetailsModal';
import { useAuth } from '../context/AuthContext';
import { getActiveCharities } from '../lib/supabaseRest';
import { createDonationSession, isStripeConfigured } from '../lib/stripe';
import { useToast } from '../components/ui/Toast';
import { CheckIcon } from '../components/ui/Icons';

// Sort options
const sortOptions = [
    { value: 'popular', label: 'Most Popular' },
    { value: 'raised', label: 'Most Raised' },
    { value: 'name', label: 'A-Z' },
    { value: 'recent', label: 'Recently Added' }
];

export default function Charities() {
    // Safe auth access with fallbacks for when auth context isn't ready
    let auth = {};
    try {
        auth = useAuth() || {};
    } catch (e) {
        console.error('Auth context error:', e);
    }
    const { updateProfile, isAuthenticated, isSubscribed } = auth;

    const [charities, setCharities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [sortBy, setSortBy] = useState('popular');
    const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
    const [viewMode, setViewMode] = useState('grid');
    const [expandedCategories, setExpandedCategories] = useState(false);
    const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
    const [selectedCharity, setSelectedCharity] = useState(null);
    const { addToast } = useToast();

    // Donation modal state
    const [donateCharity, setDonateCharity] = useState(null);
    const [donateAmount, setDonateAmount] = useState(25);
    const [customAmount, setCustomAmount] = useState('');
    const [isDonating, setIsDonating] = useState(false);

    // Quick donation amounts
    const donationAmounts = [10, 25, 50, 100];

    // Handle donation
    const handleDonate = async () => {
        if (!donateCharity) return;

        const amount = customAmount ? parseFloat(customAmount) : donateAmount;
        if (!amount || amount < 1) {
            alert('Please enter a valid donation amount (minimum $1)');
            return;
        }

        if (!isStripeConfigured()) {
            alert('Payment system not configured. Please contact support.');
            return;
        }

        setIsDonating(true);
        try {
            await createDonationSession(
                amount,
                donateCharity.id,
                donateCharity.name,
                auth.user?.id || null
            );
        } catch (error) {
            console.error('Donation error:', error);
        } finally {
            setIsDonating(false);
        }
    };

    // Handle success/cancel redirection from Stripe
    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const donationStatus = queryParams.get('donation');
        const charityName = queryParams.get('charity');

        if (donationStatus === 'success') {
            addToast('success', `Thank you! Your donation to ${charityName || 'charity'} was successful.`);
            // Clean URL
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
        } else if (donationStatus === 'canceled') {
            addToast('error', 'Donation was canceled.');
            // Clean URL
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
        }
    }, [addToast]);

    // Fetch charities from database
    const fetchCharities = async () => {
        try {
            const data = await getActiveCharities();
            const transformedCharities = (data || []).map(charity => ({
                id: charity.id,
                name: charity.name || 'Unnamed Charity',
                category: charity.category || 'Uncategorized',
                description: charity.description || '',
                long_description: charity.long_description || '',
                image: charity.image || charity.image_url,
                logo: charity.logo || charity.logo_url,
                totalRaised: charity.total_raised || 0,
                goalAmount: charity.goal_amount || 10000,
                supporters: charity.supporter_count || 0,
                featured: charity.featured || false,
                location: charity.location || 'National',
                website_url: charity.website_url || ''
            }));
            setCharities(transformedCharities);
        } catch (error) {
            console.error('Error fetching charities:', error);
            setCharities([]);
        }
    };

    // Initial fetch and real-time subscription
    useEffect(() => {
        setLoading(true);
        fetchCharities().finally(() => setLoading(false));

        // Set up real-time subscription for charities table
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseKey) {
            import('@supabase/supabase-js').then(({ createClient }) => {
                const supabase = createClient(supabaseUrl, supabaseKey);

                // Subscribe to charities changes
                const charitiesChannel = supabase
                    .channel('charities-realtime')
                    .on('postgres_changes',
                        { event: '*', schema: 'public', table: 'charities' },
                        (payload) => {
                            console.log('🔄 Charity updated:', payload);
                            fetchCharities();
                        }
                    )
                    .subscribe();

                // Subscribe to donations changes (to refresh totals)
                const donationsChannel = supabase
                    .channel('donations-realtime')
                    .on('postgres_changes',
                        { event: 'INSERT', schema: 'public', table: 'donations' },
                        (payload) => {
                            console.log('💰 New donation:', payload);
                            fetchCharities();
                        }
                    )
                    .subscribe();

                // Cleanup on unmount
                return () => {
                    supabase.removeChannel(charitiesChannel);
                    supabase.removeChannel(donationsChannel);
                };
            });
        }
    }, []);

    // Get unique categories from fetched data
    const categories = useMemo(() => {
        if (!charities || charities.length === 0) return ['All'];
        const cats = ['All', ...new Set(charities.map(c => c.category).filter(Boolean))];
        return cats;
    }, [charities]);

    // Handle charity selection
    const handleSelectCharity = async (charity) => {
        if (!updateProfile) {
            console.error('updateProfile not available');
            return;
        }
        try {
            const result = await updateProfile({
                selected_charity_id: String(charity.id)
            });
            setSelectedCharity(null);
            if (result && result.success) {
                addToast('success', `You selected ${charity.name}! Go to My Charity to set your donation percentage.`);
            }
        } catch (error) {
            console.error('Error selecting charity:', error);
        }
    };

    // Filter and sort charities
    const filteredCharities = useMemo(() => {
        if (!charities || charities.length === 0) return [];

        let result = charities.filter(charity => {
            const name = charity.name || '';
            const description = charity.description || '';
            const category = charity.category || '';

            const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                category.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'All' || category === selectedCategory;
            const matchesFeatured = !showFeaturedOnly || charity.featured;
            return matchesSearch && matchesCategory && matchesFeatured;
        });

        // Sort
        switch (sortBy) {
            case 'raised':
                result.sort((a, b) => (b.totalRaised || 0) - (a.totalRaised || 0));
                break;
            case 'popular':
                result.sort((a, b) => (b.supporters || 0) - (a.supporters || 0));
                break;
            case 'name':
                result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                break;
            case 'recent':
                result.sort((a, b) => String(b.id || '').localeCompare(String(a.id || '')));
                break;
            default:
                break;
        }

        return result;
    }, [charities, searchQuery, selectedCategory, sortBy, showFeaturedOnly]);

    // Stats
    const totalRaised = (charities || []).reduce((sum, c) => sum + (c.totalRaised || 0), 0);
    const totalSupporters = (charities || []).reduce((sum, c) => sum + (c.supporters || 0), 0);

    // Visible categories (show 5 or all)
    const visibleCategories = expandedCategories ? categories : categories.slice(0, 6);

    // Loading state
    if (loading) {
        return (
            <PageTransition>
                <div className="pt-24 pb-12 lg:py-16">
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
        <>
            <PageTransition>
                <div className="pt-24 pb-12 lg:py-16">
                    <div className="container-app">

                        {/* Header */}
                        <div className="text-center mb-12">
                            <h1 className="text-4xl lg:text-5xl font-bold mb-4" style={{ color: 'var(--color-cream-100)' }}>
                                Our Charity Partners
                            </h1>
                            <p className="text-xl max-w-2xl mx-auto" style={{ color: 'var(--color-neutral-400)' }}>
                                {charities.length > 0
                                    ? `Choose from ${charities.length} amazing charities making a difference`
                                    : 'No charities available yet. Check back soon!'}
                            </p>
                        </div>

                        {/* Stats Bar */}
                        {charities.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                    <div className="text-2xl font-bold text-emerald-400">{charities.length}</div>
                                    <div className="text-sm text-zinc-400">Charities</div>
                                </div>
                                <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                    <div className="text-2xl font-bold text-emerald-400">${(totalRaised / 1000).toFixed(0)}K</div>
                                    <div className="text-sm text-zinc-400">Total Raised</div>
                                </div>
                                <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                    <div className="text-2xl font-bold text-emerald-400">{totalSupporters.toLocaleString()}</div>
                                    <div className="text-sm text-zinc-400">Supporters</div>
                                </div>
                                <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                    <div className="text-2xl font-bold text-emerald-400">{categories.length - 1}</div>
                                    <div className="text-sm text-zinc-400">Categories</div>
                                </div>
                            </div>
                        )}

                        {/* Search and Filter */}
                        <div className="mb-8 space-y-4">
                            <div className="flex flex-wrap gap-4">
                                <div className="flex-1 min-w-[200px]">
                                    <Input
                                        placeholder="Search charities..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="relative">
                                    <button
                                        onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                                        className="px-4 py-3 rounded-xl bg-zinc-800 text-white flex items-center gap-2"
                                    >
                                        Sort: {sortOptions.find(o => o.value === sortBy)?.label}
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    {sortDropdownOpen && (
                                        <div className="absolute right-0 mt-2 w-48 rounded-xl bg-zinc-800 shadow-lg z-10">
                                            {sortOptions.map(option => (
                                                <button
                                                    key={option.value}
                                                    onClick={() => {
                                                        setSortBy(option.value);
                                                        setSortDropdownOpen(false);
                                                    }}
                                                    className="w-full px-4 py-2 text-left text-white hover:bg-zinc-700 first:rounded-t-xl last:rounded-b-xl"
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Categories */}
                            <div className="flex flex-wrap gap-2">
                                {visibleCategories.map(category => (
                                    <button
                                        key={category}
                                        onClick={() => setSelectedCategory(category)}
                                        className={`px-4 py-2 rounded-full text-sm transition-colors ${selectedCategory === category
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                            }`}
                                    >
                                        {category}
                                    </button>
                                ))}
                                {categories.length > 6 && (
                                    <button
                                        onClick={() => setExpandedCategories(!expandedCategories)}
                                        className="px-4 py-2 rounded-full text-sm bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                                    >
                                        {expandedCategories ? 'Show Less' : `+${categories.length - 6} More`}
                                    </button>
                                )}
                            </div>

                            {/* Active Filters Summary */}
                            {(searchQuery || selectedCategory !== 'All' || showFeaturedOnly) && (
                                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-neutral-400)' }}>
                                    <span>Showing {filteredCharities.length} of {charities.length} charities</span>
                                    <button
                                        onClick={() => {
                                            setSearchQuery('');
                                            setSelectedCategory('All');
                                            setShowFeaturedOnly(false);
                                        }}
                                        className="ml-2 underline hover:text-white transition-colors"
                                    >
                                        Clear filters
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Charities Grid */}
                        {filteredCharities.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredCharities.map((charity) => (
                                    <Card key={charity.id} className="overflow-hidden hover:scale-[1.02] transition-transform">
                                        <div className="relative">
                                            <img
                                                src={charity.image && charity.image.includes('unsplash') ? charity.image.split('?')[0] + '?ixlib=rb-1.2.1&auto=format&fit=crop&q=80&w=600' : charity.image}
                                                alt={charity.name}
                                                className="w-full h-48 object-cover"
                                                referrerPolicy="no-referrer"
                                                loading="lazy"
                                            />
                                            {charity.featured && (
                                                <span className="absolute top-3 left-3 px-2 py-1 bg-emerald-500 text-white text-xs rounded-full">
                                                    Featured
                                                </span>
                                            )}
                                        </div>
                                        <div className="p-6">
                                            <h3 className="text-xl font-bold text-white mb-2">{charity.name}</h3>
                                            <span className="inline-block px-3 py-1 bg-zinc-800 text-zinc-300 text-xs rounded-full mb-3">
                                                {charity.category}
                                            </span>
                                            <p className="text-zinc-400 text-sm mb-4 line-clamp-2">
                                                {charity.description || 'Supporting important causes in our community.'}
                                            </p>
                                            <div className="flex justify-between text-sm mb-2">
                                                <div>
                                                    <span className="text-emerald-400 font-bold">${(charity.totalRaised || 0).toLocaleString()}</span>
                                                    <span className="text-zinc-500 ml-1">raised</span>
                                                </div>
                                                <div>
                                                    <span className="text-white font-bold">{(charity.supporters || 0).toLocaleString()}</span>
                                                    <span className="text-zinc-500 ml-1">supporters</span>
                                                </div>
                                            </div>
                                            {/* Goal Progress Bar */}
                                            <div className="mb-4">
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-zinc-400">
                                                        {Math.min(Math.round((charity.totalRaised / (charity.goalAmount || 10000)) * 100), 100)}% of goal
                                                    </span>
                                                    <span className="text-zinc-500">
                                                        ${(charity.goalAmount || 10000).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="h-2 rounded-full bg-zinc-700 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                                                        style={{ width: `${Math.min((charity.totalRaised / (charity.goalAmount || 10000)) * 100, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex gap-2 flex-wrap">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setSelectedCharity(charity)}
                                                >
                                                    Learn More
                                                </Button>
                                                {isSubscribed && (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setDonateCharity(charity);
                                                                setDonateAmount(25);
                                                                setCustomAmount('');
                                                            }}
                                                        >
                                                            💚 Donate
                                                        </Button>
                                                        <Button
                                                            variant="primary"
                                                            size="sm"
                                                            onClick={() => handleSelectCharity(charity)}
                                                        >
                                                            Select
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16">
                                <p className="text-zinc-400 text-lg">
                                    {searchQuery || selectedCategory !== 'All'
                                        ? 'No charities found matching your filters.'
                                        : 'No charities available yet.'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </PageTransition>

            {/* Charity Details Modal */}
            <CharityDetailsModal
                charity={selectedCharity}
                isOpen={!!selectedCharity}
                onClose={() => setSelectedCharity(null)}
                onSelect={isAuthenticated ? handleSelectCharity : undefined}
            />

            {/* Donation Modal */}
            <AnimatePresence>
                {donateCharity && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/70"
                            onClick={() => setDonateCharity(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-md p-6 rounded-2xl"
                            style={{
                                background: 'linear-gradient(135deg, rgba(15, 54, 33, 0.98), rgba(9, 9, 11, 0.98))',
                                border: '1px solid rgba(16, 185, 129, 0.3)'
                            }}
                        >
                            {/* Close button */}
                            <button
                                onClick={() => setDonateCharity(null)}
                                className="absolute top-4 right-4 text-zinc-400 hover:text-white"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            {/* Header */}
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                    <span className="text-3xl">💚</span>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-1">
                                    Donate to {donateCharity.name}
                                </h3>
                                <p className="text-sm text-zinc-400">
                                    Make a direct donation to support their cause
                                </p>
                            </div>

                            {/* Amount Selection */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-zinc-300 mb-3">
                                    Select Amount
                                </label>
                                <div className="grid grid-cols-4 gap-2 mb-4">
                                    {donationAmounts.map(amount => (
                                        <button
                                            key={amount}
                                            onClick={() => {
                                                setDonateAmount(amount);
                                                setCustomAmount('');
                                            }}
                                            className={`py-3 px-4 rounded-xl font-medium transition-all ${donateAmount === amount && !customAmount
                                                ? 'bg-emerald-500 text-white ring-2 ring-emerald-400'
                                                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                                }`}
                                        >
                                            ${amount}
                                        </button>
                                    ))}
                                </div>

                                {/* Custom Amount */}
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="Custom amount"
                                        value={customAmount}
                                        onChange={(e) => {
                                            setCustomAmount(e.target.value);
                                            if (e.target.value) setDonateAmount(0);
                                        }}
                                        className="w-full pl-8 pr-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Summary */}
                            <div className="p-4 rounded-xl bg-zinc-800/50 mb-6">
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-400">Donation Amount</span>
                                    <span className="text-xl font-bold text-emerald-400">
                                        ${customAmount || donateAmount}
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <Button
                                    variant="ghost"
                                    fullWidth
                                    onClick={() => setDonateCharity(null)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="accent"
                                    fullWidth
                                    onClick={handleDonate}
                                    disabled={isDonating}
                                >
                                    {isDonating ? 'Processing...' : 'Donate Now'}
                                </Button>
                            </div>

                            {/* Secure payment note */}
                            <p className="text-center text-xs text-zinc-500 mt-4">
                                🔒 Secure payment powered by Stripe
                            </p>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
