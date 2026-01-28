import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import PageTransition from '../components/layout/PageTransition';
import Button from '../components/ui/Button';
import { HeartIcon, UsersIcon, GolfFlagIcon } from '../components/ui/Icons';
import { getHomePageStats, getCharityDonationsReport, getActiveCharities } from '../lib/supabaseRest';

/**
 * Community Impact Page - Shows real impact stats from database
 */
export default function Impact() {
    const [stats, setStats] = useState(null);
    const [charityDonations, setCharityDonations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);

                // Fetch all data in parallel
                const [statsData, donationsData] = await Promise.all([
                    getHomePageStats(),
                    getCharityDonationsReport()
                ]);

                setStats(statsData);
                setCharityDonations(Array.isArray(donationsData) ? donationsData : (donationsData?.charities || []));
            } catch (error) {
                console.error('Error fetching impact data:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const impactCards = stats ? [
        {
            value: `$${(stats.totalRaised || 0).toLocaleString()}`,
            label: 'Total Raised',
            description: 'Donated to Australian charities',
            icon: HeartIcon,
            color: '#ef4444'
        },
        {
            value: stats.charityCount || 0,
            label: 'Partner Charities',
            description: 'Organizations making a difference',
            icon: HeartIcon,
            color: '#10b981'
        },
        {
            value: stats.golferCount || 0,
            label: 'Active Golfers',
            description: 'Community members giving back',
            icon: UsersIcon,
            color: '#f59e0b'
        },
        {
            value: `${stats.livesImpacted || 0}+`,
            label: 'Lives Impacted',
            description: 'People helped through donations',
            icon: GolfFlagIcon,
            color: '#8b5cf6'
        }
    ] : [];

    if (loading) {
        return (
            <PageTransition>
                <div className="pt-24 pb-16 lg:py-20">
                    <div className="container-app">
                        <div className="flex items-center justify-center min-h-[400px]">
                            <div className="text-center">
                                <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                                <p className="text-zinc-400">Loading impact data...</p>
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
                <div className="container-app">
                    {/* Header */}
                    <div className="text-center mb-16">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
                            style={{
                                background: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid rgba(16, 185, 129, 0.2)'
                            }}
                        >
                            <span className="text-emerald-400 text-sm font-medium">Our Community</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-4xl lg:text-5xl font-bold mb-4"
                            style={{ color: 'var(--color-cream-100)' }}
                        >
                            Community{' '}
                            <span style={{ color: '#10b981' }}>Impact</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-lg max-w-2xl mx-auto"
                            style={{ color: 'var(--color-neutral-400)' }}
                        >
                            Together, our golfers are making a real difference across Australia.
                        </motion.p>
                    </div>

                    {/* Impact Stats Grid */}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                        {impactCards.map((card, index) => (
                            <motion.div
                                key={card.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * index }}
                                className="p-6 rounded-2xl text-center"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    border: '1px solid rgba(255, 255, 255, 0.05)'
                                }}
                            >
                                <div
                                    className="w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center"
                                    style={{ background: `${card.color}20` }}
                                >
                                    <card.icon size={24} color={card.color} strokeWidth={1.5} />
                                </div>
                                <div
                                    className="text-3xl font-bold mb-2"
                                    style={{ color: card.color }}
                                >
                                    {card.value}
                                </div>
                                <div className="text-white font-medium mb-1">{card.label}</div>
                                <div className="text-sm text-zinc-500">{card.description}</div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Charity Donations Breakdown */}
                    {charityDonations.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="mb-16"
                        >
                            <h2 className="text-2xl font-bold text-white mb-8 text-center">
                                Donations by Charity
                            </h2>

                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {charityDonations.slice(0, 9).map((charity, index) => (
                                    <div
                                        key={charity.id || index}
                                        className="p-4 rounded-xl flex items-center gap-4"
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.02)',
                                            border: '1px solid rgba(255, 255, 255, 0.05)'
                                        }}
                                    >
                                        {charity.image_url && (
                                            <img
                                                src={charity.image_url && charity.image_url.includes('unsplash') ? charity.image_url.split('?')[0] + '?ixlib=rb-1.2.1&auto=format&fit=crop&q=80&w=100' : charity.image_url}
                                                alt={charity.name}
                                                className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                                                referrerPolicy="no-referrer"
                                                loading="lazy"
                                            />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-white font-medium truncate">{charity.name}</div>
                                            <div className="text-emerald-400 text-sm">
                                                ${(charity.total_raised || 0).toLocaleString()} raised
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* CTA Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="text-center p-8 rounded-2xl"
                        style={{
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)',
                            border: '1px solid rgba(16, 185, 129, 0.2)'
                        }}
                    >
                        <h3 className="text-2xl font-bold text-white mb-4">
                            Be Part of the Impact
                        </h3>
                        <p className="text-zinc-400 mb-6 max-w-xl mx-auto">
                            Join our community of golfers making a difference. Every round you play supports Australian charities.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <Link to="/signup">
                                <Button variant="primary">Join the Community</Button>
                            </Link>
                            <Link to="/charities">
                                <Button variant="outline">View Charities</Button>
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </div>
        </PageTransition>
    );
}
