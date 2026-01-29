import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link, Navigate } from 'react-router-dom';
import PageTransition from '../../components/layout/PageTransition';
import Card, { CardContent, CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { fadeUp, staggerContainer, staggerItem } from '../../utils/animations';
import { ArrowRightIcon, HeartIcon, GolfFlagIcon, CalendarIcon, TrophyIcon } from '../../components/ui/Icons';
import CharityDetailsModal from '../../components/ui/CharityDetailsModal';
import { getActiveCharities, getUserImpactStats } from '../../lib/supabaseRest';
import { useToast } from '../../components/ui/Toast';

export default function MyCharity() {
    const { user, isAdmin, updateProfile } = useAuth();

    // Admins cannot participate in games - redirect to admin panel
    if (isAdmin) {
        return <Navigate to="/admin" replace />;
    }

    // Charities from database
    const [charities, setCharities] = useState([]);
    const [charitiesLoading, setChairtiesLoading] = useState(true);

    // User preferences
    const [selectedCharity, setSelectedCharity] = useState(null);
    const [donationPercentage, setDonationPercentage] = useState(10);
    const [isSaving, setIsSaving] = useState(false);
    const [viewingCharity, setViewingCharity] = useState(null);
    const { addToast } = useToast();
    const [isInitialized, setIsInitialized] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Track original values to detect changes
    const [originalCharity, setOriginalCharity] = useState(null);
    const [originalPercentage, setOriginalPercentage] = useState(10);

    // Real impact stats from database
    const [impactStats, setImpactStats] = useState({
        totalDonated: 0,
        roundsPlayed: 0,
        monthsActive: 0,
        impactRank: 'N/A'
    });
    const [impactLoading, setImpactLoading] = useState(true);

    // Fetch charities from database
    useEffect(() => {
        const fetchCharities = async () => {
            try {
                setChairtiesLoading(true);
                const data = await getActiveCharities();
                const transformedCharities = (data || []).map(charity => ({
                    id: charity.id,
                    name: charity.name || 'Unnamed Charity',
                    category: charity.category || 'Uncategorized',
                    description: charity.description || '',
                    image: charity.image_url || 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400&h=300&fit=crop',
                    totalRaised: charity.total_raised || 0,
                    goalAmount: charity.goal_amount || 10000,
                    supporters: charity.supporter_count || 0,
                    featured: charity.featured || false,
                    location: charity.location || 'National'
                }));
                setCharities(transformedCharities);
            } catch (error) {
                console.error('Error fetching charities:', error);
            } finally {
                setChairtiesLoading(false);
            }
        };
        fetchCharities();
    }, []);

    // Sync state with user profile when it loads
    useEffect(() => {
        if (user && !isInitialized && charities.length > 0) {
            // Set charity ID from user profile, default to first charity if not set
            const charityId = user.selectedCharityId || (charities[0]?.id || null);
            setSelectedCharity(charityId);
            setOriginalCharity(charityId);

            // Set donation percentage from user profile, default to 10, minimum 10
            const percentage = user.donationPercentage || 10;
            const finalPercentage = Math.max(10, percentage);
            setDonationPercentage(finalPercentage);
            setOriginalPercentage(finalPercentage);

            setIsInitialized(true);
            setHasUnsavedChanges(false);
            console.log('📝 MyCharity initialized with:', { charityId, percentage });
        }
    }, [user, isInitialized, charities]);

    // Detect changes
    useEffect(() => {
        if (isInitialized) {
            const charityChanged = String(selectedCharity) !== String(originalCharity);
            const percentageChanged = donationPercentage !== originalPercentage;
            setHasUnsavedChanges(charityChanged || percentageChanged);
        }
    }, [selectedCharity, donationPercentage, originalCharity, originalPercentage, isInitialized]);

    // Fetch real impact stats from database
    useEffect(() => {
        const fetchImpactStats = async () => {
            if (!user?.id) return;
            setImpactLoading(true);
            try {
                const stats = await getUserImpactStats(user.id);
                setImpactStats(stats);
            } catch (error) {
                console.error('Error fetching impact stats:', error);
            } finally {
                setImpactLoading(false);
            }
        };
        fetchImpactStats();
    }, [user?.id]);

    // Get current charity data from fetched charities
    const currentCharity = useMemo(() => {
        if (!selectedCharity) return null;
        return charities.find(c => String(c.id) === String(selectedCharity));
    }, [selectedCharity, charities]);

    const handleSave = async () => {
        setIsSaving(true);
        const result = await updateProfile({
            selected_charity_id: selectedCharity,
            donation_percentage: donationPercentage
        });
        setIsSaving(false);

        if (result.success) {
            addToast('success', 'Charity preferences saved!');
            // Update original values to match saved values
            setOriginalCharity(selectedCharity);
            setOriginalPercentage(donationPercentage);
            setHasUnsavedChanges(false);
        } else {
            addToast('error', 'Error: ' + (result.error || 'Failed to save'));
        }
    };

    return (
        <>
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
                                My Charity
                            </h1>
                            <p style={{ color: 'var(--color-neutral-400)' }}>
                                Choose where your contributions go and track your impact
                            </p>
                        </motion.div>

                        <motion.div
                            variants={staggerContainer}
                            initial="initial"
                            animate="animate"
                            className="space-y-6"
                        >
                            {/* Current Charity */}
                            <motion.div variants={staggerItem}>
                                <Card variant="glass">
                                    <CardHeader>
                                        <h2 className="text-xl font-bold" style={{ color: 'var(--color-cream-100)' }}>
                                            Your Selected Charity
                                        </h2>
                                    </CardHeader>
                                    <CardContent>
                                        {currentCharity && (
                                            <div className="flex flex-col md:flex-row gap-6">
                                                <img
                                                    src={currentCharity.image}
                                                    alt={currentCharity.name}
                                                    className="w-full md:w-48 h-32 object-cover rounded-xl"
                                                />
                                                <div className="flex-1">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div>
                                                            <h3 className="text-xl font-bold" style={{ color: 'var(--color-cream-100)' }}>
                                                                {currentCharity.name}
                                                            </h3>
                                                            <span
                                                                className="inline-block px-2 py-1 rounded-full text-xs"
                                                                style={{ background: 'rgba(201, 162, 39, 0.2)', color: '#c9a227' }}
                                                            >
                                                                {currentCharity.category}
                                                            </span>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-2xl font-bold" style={{ color: '#c9a227' }}>
                                                                ${currentCharity.totalRaised.toLocaleString()}
                                                            </p>
                                                            <p className="text-xs" style={{ color: 'var(--color-neutral-500)' }}>
                                                                Total raised by community
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm mb-4" style={{ color: 'var(--color-neutral-400)' }}>
                                                        {currentCharity.description}
                                                    </p>
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex-1 h-2 rounded-full" style={{ background: 'rgba(26, 77, 46, 0.5)' }}>
                                                            <div
                                                                className="h-full rounded-full"
                                                                style={{
                                                                    width: `${Math.min((currentCharity.totalRaised / (currentCharity.goalAmount || 10000)) * 100, 100)}%`,
                                                                    background: 'linear-gradient(90deg, #1a4d2e, #c9a227)'
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="text-sm" style={{ color: 'var(--color-neutral-400)' }}>
                                                            {Math.round((currentCharity.totalRaised / (currentCharity.goalAmount || 10000)) * 100)}% of goal
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {/* Your Impact */}
                            <motion.div variants={staggerItem}>
                                <Card variant="glass">
                                    <CardHeader>
                                        <h2 className="text-xl font-bold" style={{ color: 'var(--color-cream-100)' }}>
                                            Your Impact
                                        </h2>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {[
                                                { label: 'Total Donated', value: impactLoading ? '...' : `$${impactStats.totalDonated.toLocaleString()}`, Icon: HeartIcon },
                                                { label: 'Rounds Played', value: impactLoading ? '...' : impactStats.roundsPlayed.toString(), Icon: GolfFlagIcon },
                                                { label: 'Months Active', value: impactLoading ? '...' : impactStats.monthsActive.toString(), Icon: CalendarIcon },
                                                { label: 'Impact Rank', value: impactLoading ? '...' : impactStats.impactRank, Icon: TrophyIcon }
                                            ].map(stat => (
                                                <div
                                                    key={stat.label}
                                                    className="text-center p-4 rounded-xl"
                                                    style={{ background: 'rgba(26, 77, 46, 0.3)' }}
                                                >
                                                    <div className="flex justify-center mb-2">
                                                        <stat.Icon className="w-6 h-6 text-emerald-400" />
                                                    </div>
                                                    <div className="text-xl font-bold" style={{ color: '#10b981' }}>{stat.value}</div>
                                                    <div className="text-xs" style={{ color: 'var(--color-neutral-500)' }}>{stat.label}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {/* Donation Percentage */}
                            <motion.div variants={staggerItem}>
                                <Card variant="glass">
                                    <CardHeader>
                                        <h2 className="text-xl font-bold text-white">
                                            Donation Preference
                                        </h2>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="mb-4 text-zinc-400">
                                            Choose what percentage of your prize winnings you'd like to donate to charity.
                                        </p>
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="flex-1 relative h-6 flex items-center">
                                                {/* Background track - full width */}
                                                <div
                                                    className="absolute inset-x-0 h-2 rounded-full"
                                                    style={{ background: 'rgba(16, 185, 129, 0.2)' }}
                                                />
                                                {/* Filled track - matches actual percentage */}
                                                <div
                                                    className="absolute left-0 h-2 rounded-full"
                                                    style={{
                                                        width: `${donationPercentage}%`,
                                                        background: 'linear-gradient(90deg, #10b981, #f59e0b)'
                                                    }}
                                                />
                                                {/* Slider container - positioned from 10% to 100% of track */}
                                                <div
                                                    className="absolute h-6 flex items-center"
                                                    style={{ left: '10%', right: '0' }}
                                                >
                                                    <input
                                                        type="range"
                                                        min="10"
                                                        max="100"
                                                        value={donationPercentage}
                                                        onChange={(e) => setDonationPercentage(parseInt(e.target.value))}
                                                        className="w-full h-2 appearance-none cursor-pointer bg-transparent"
                                                        style={{ WebkitAppearance: 'none' }}
                                                    />
                                                </div>
                                            </div>
                                            <span className="text-2xl font-bold w-20 text-center text-emerald-400">
                                                {donationPercentage}%
                                            </span>
                                        </div>
                                        <p className="text-sm text-zinc-500">
                                            {donationPercentage === 100
                                                ? '🌟 Amazing! You\'re donating all your winnings to charity!'
                                                : donationPercentage >= 50
                                                    ? '💚 Wonderful! You\'re making a big difference!'
                                                    : 'Every bit helps make a difference.'}
                                        </p>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {/* Change Charity */}
                            <motion.div variants={staggerItem}>
                                <Card variant="glass">
                                    <CardHeader>
                                        <h2 className="text-xl font-bold text-white">
                                            Change Charity
                                        </h2>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto p-1 -m-1">
                                            {charities.map(charity => (
                                                <div
                                                    key={charity.id}
                                                    className={`p-4 rounded-xl transition-colors relative group cursor-pointer ${selectedCharity === charity.id
                                                        ? 'ring-2 ring-emerald-500'
                                                        : 'hover:bg-white/5'
                                                        }`}
                                                    style={{
                                                        background: selectedCharity === charity.id
                                                            ? 'rgba(16, 185, 129, 0.1)'
                                                            : 'rgba(16, 185, 129, 0.05)'
                                                    }}
                                                    onClick={() => setSelectedCharity(charity.id)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <img
                                                            src={charity.image}
                                                            alt={charity.name}
                                                            className="w-12 h-12 rounded-lg object-cover"
                                                        />
                                                        <div className="flex-1">
                                                            <p className="font-medium" style={{ color: 'var(--color-cream-200)' }}>
                                                                {charity.name}
                                                            </p>
                                                            <p className="text-xs" style={{ color: 'var(--color-neutral-500)' }}>
                                                                {charity.category}
                                                            </p>
                                                        </div>
                                                        {selectedCharity === charity.id ? (
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-xs text-[#c9a227]">Selected</span>
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#c9a227">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            </div>
                                                        ) : (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                                onClick={() => setViewingCharity(charity)}
                                                            >
                                                                Details <ArrowRightIcon size={14} className="ml-1" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {/* Save Button */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex justify-end"
                            >
                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving || !hasUnsavedChanges}
                                    variant={hasUnsavedChanges ? 'primary' : 'ghost'}
                                    style={{
                                        opacity: hasUnsavedChanges ? 1 : 0.5,
                                        cursor: hasUnsavedChanges ? 'pointer' : 'default'
                                    }}
                                >
                                    {isSaving ? 'Saving...' : 'Save Preferences'}
                                </Button>
                            </motion.div>
                        </motion.div>
                    </div>
                </div>
            </PageTransition>
            <CharityDetailsModal
                isOpen={!!viewingCharity}
                onClose={() => setViewingCharity(null)}
                charity={viewingCharity}
                onSelect={(charity) => {
                    setSelectedCharity(charity.id);
                    setViewingCharity(null);
                    addToast('success', `You selected ${charity.name}! Remember to save your preferences.`);
                }}
            />
        </>
    );
}
