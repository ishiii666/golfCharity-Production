import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import PageTransition from '../../components/layout/PageTransition';
import Card, { CardContent } from '../../components/ui/Card';
import { CountUp } from '../../components/ui/AnimatedNumber';
import { staggerContainer, staggerItem, fadeUp } from '../../utils/animations';
import { getAdminStats } from '../../lib/supabaseRest';

// Helper function to format timestamps as relative time
function formatTimeAgo(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
}

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalAdmins: 0,
        activeSubscribers: 0,
        totalCharities: 0,
        totalDonated: 0,
        recentActivity: [],
        loading: true
    });

    // Fetch stats using direct REST API (bypasses slow Supabase client)
    useEffect(() => {
        const fetchStats = async () => {
            try {
                console.log('📊 Fetching admin stats via REST API...');
                const data = await getAdminStats();
                console.log('📊 Stats received:', data);
                setStats({ ...data, loading: false });
            } catch (error) {
                console.error('Stats fetch failed:', error);
                setStats(prev => ({ ...prev, loading: false }));
            }
        };

        fetchStats();
    }, []);

    // Dynamic quick stats based on real data
    const quickStats = [
        { label: 'Active Players', value: stats.totalUsers, color: 'text-emerald-400', icon: '👥' },
        { label: 'Partner Charities', value: stats.totalCharities, color: 'text-amber-400', icon: '💚' },
        { label: 'Total Donated', value: stats.totalDonated, prefix: '$', color: 'text-rose-400', icon: '💰' }
    ];

    // Admin navigation cards
    const adminCards = [
        {
            title: 'Draw Control',
            description: 'Run pre-draw analysis and publish monthly results',
            icon: (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            ),
            to: '/admin/draw',
            color: 'from-orange-500 to-amber-500',
            stat: 'Next draw',
            statValue: 'Feb 1'
        },
        {
            title: 'User Management',
            description: 'View, edit, and manage player accounts',
            icon: (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            ),
            to: '/admin/users',
            color: 'from-violet-500 to-purple-500',
            stat: 'Total players',
            statValue: stats.loading ? '...' : stats.totalUsers
        },
        {
            title: 'Charity Manager',
            description: 'Add, edit, and feature partner charities',
            icon: (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
            ),
            to: '/admin/charities',
            color: 'from-rose-500 to-pink-500',
            stat: 'Charities',
            statValue: stats.loading ? '...' : stats.totalCharities
        },
        {
            title: 'Draw Management',
            description: 'Run draws and verify winners',
            icon: (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            to: '/admin/draws',
            color: 'from-emerald-500 to-green-500',
            stat: 'Status',
            statValue: 'Ready'
        },
        {
            title: 'Content Editor',
            description: 'Edit homepage copy, T&Cs, and privacy policy',
            icon: (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
            ),
            to: '/admin/content',
            color: 'from-cyan-500 to-teal-500',
            stat: 'Sections',
            statValue: '4'
        },
        {
            title: 'Reports',
            description: 'View analytics and donation reports',
            icon: (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            ),
            to: '/admin/reports',
            color: 'from-lime-500 to-green-500',
            stat: 'Available',
            statValue: '3'
        }
    ];

    return (
        <PageTransition>
            <div className="py-8 lg:py-12">
                <div className="container-app">
                    {/* Header */}
                    <motion.div
                        variants={fadeUp}
                        initial="initial"
                        animate="animate"
                        className="mb-8"
                    >
                        <span
                            className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-4"
                            style={{ background: 'rgba(201, 162, 39, 0.2)', color: '#c9a227' }}
                        >
                            Admin Panel
                        </span>
                        <h1
                            className="text-3xl lg:text-4xl font-bold mb-2"
                            style={{ fontFamily: 'var(--font-display)', color: '#f9f5e3' }}
                        >
                            Dashboard
                        </h1>
                        <p style={{ color: 'var(--color-neutral-400)' }}>
                            Manage GOLFCHARITY platform operations
                        </p>
                    </motion.div>

                    {/* Quick Stats */}
                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        animate="animate"
                        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
                    >
                        {quickStats.map((stat) => (
                            <motion.div key={stat.label} variants={staggerItem}>
                                <Card variant="glass" padding="p-5">
                                    <p className="text-sm mb-1" style={{ color: 'var(--color-neutral-500)' }}>
                                        {stat.label}
                                    </p>
                                    <p className={`text-3xl font-bold ${stat.color}`}>
                                        {stats.loading ? (
                                            <span className="inline-flex gap-1">
                                                <span className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <span className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <span className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </span>
                                        ) : (
                                            <>
                                                {stat.prefix}
                                                <CountUp end={stat.value} duration={1.5} />
                                            </>
                                        )}
                                    </p>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Admin Cards Grid */}
                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        animate="animate"
                        className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {adminCards.map((card) => (
                            <motion.div key={card.title} variants={staggerItem}>
                                <Link to={card.to} className="block h-full">
                                    <Card
                                        variant="glass"
                                        hoverable={true}
                                        padding="p-6"
                                        className="h-full"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div
                                                className={`w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br ${card.color} text-white`}
                                            >
                                                {card.icon}
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs" style={{ color: 'var(--color-neutral-500)' }}>
                                                    {card.stat}
                                                </p>
                                                <p className="text-lg font-bold" style={{ color: 'var(--color-cream-100)' }}>
                                                    {card.statValue}
                                                </p>
                                            </div>
                                        </div>
                                        <h3
                                            className="text-lg font-bold mb-2"
                                            style={{ color: 'var(--color-cream-100)' }}
                                        >
                                            {card.title}
                                        </h3>
                                        <p className="text-sm" style={{ color: 'var(--color-neutral-400)' }}>
                                            {card.description}
                                        </p>
                                    </Card>
                                </Link>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Recent Activity */}
                    <motion.div
                        variants={fadeUp}
                        initial="initial"
                        animate="animate"
                        className="mt-8"
                    >
                        <Card variant="glass">
                            <CardContent>
                                <h3 className="text-lg font-bold mb-4 text-white">
                                    Recent Activity
                                </h3>
                                <div className="space-y-3">
                                    {stats.loading ? (
                                        <div className="flex items-center justify-center py-8">
                                            <span className="inline-flex gap-1">
                                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </span>
                                        </div>
                                    ) : stats.recentActivity && stats.recentActivity.length > 0 ? (
                                        stats.recentActivity.map((activity, index) => (
                                            <div
                                                key={activity.id || index}
                                                className="flex items-center justify-between py-2 border-b border-white/10"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activity.action_type === 'user_signup' ? 'bg-emerald-500/20' :
                                                        activity.action_type === 'donation_made' ? 'bg-amber-500/20' :
                                                            activity.action_type === 'subscription_created' ? 'bg-violet-500/20' :
                                                                activity.action_type === 'draw_published' ? 'bg-rose-500/20' :
                                                                    'bg-zinc-500/20'
                                                        }`}>
                                                        {activity.action_type === 'user_signup' && <span className="text-emerald-400">👤</span>}
                                                        {activity.action_type === 'donation_made' && <span className="text-amber-400">💰</span>}
                                                        {activity.action_type === 'subscription_created' && <span className="text-violet-400">⭐</span>}
                                                        {activity.action_type === 'draw_published' && <span className="text-rose-400">🎯</span>}
                                                        {activity.action_type === 'system' && (
                                                            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                        {!['user_signup', 'donation_made', 'subscription_created', 'draw_published', 'system'].includes(activity.action_type) && (
                                                            <span className="text-zinc-400">📋</span>
                                                        )}
                                                    </div>
                                                    <span className="text-zinc-300">
                                                        {activity.description}
                                                    </span>
                                                </div>
                                                <span className="text-sm text-zinc-500">
                                                    {activity.created_at ? formatTimeAgo(activity.created_at) : 'Just now'}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex items-center justify-between py-2 border-b border-white/10">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                                <span className="text-zinc-300">
                                                    Dashboard connected - Run migration to enable activity logging
                                                </span>
                                            </div>
                                            <span className="text-sm text-zinc-500">Just now</span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </PageTransition>
    );
}
