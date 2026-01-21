import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Button from '../ui/Button';
import { HeartIcon, GolfFlagIcon, TargetIcon, SparkleIcon, TrophyIcon, UsersIcon } from '../ui/Icons';
import { getHomePageStats } from '../../lib/supabaseRest';

/**
 * WhyJoinSection - Premium cards section explaining reasons to join
 * Connected to database for dynamic stats
 */

// Default card content - can be managed via CMS
const defaultCards = [
    {
        id: 'purpose',
        icon: HeartIcon,
        color: '#10b981',
        title: 'Play with Purpose',
        description: 'Transform every round into real impact. Your Stableford scores become lottery numbers that fund Australian charities.'
    },
    {
        id: 'impact',
        icon: TargetIcon,
        color: '#f59e0b',
        title: 'Track Your Impact',
        description: 'Watch your contributions grow in real-time. See exactly how your rounds translate into dollars for causes you care about.'
    },
    {
        id: 'community',
        icon: UsersIcon,
        color: '#8b5cf6',
        title: 'Join the Movement',
        description: 'Connect with thousands of golfers who believe the game is bigger than the scorecard. Together, we\'re changing lives.'
    },
    {
        id: 'prizes',
        icon: TrophyIcon,
        color: '#ec4899',
        title: 'Win While Giving',
        description: 'Monthly draws with real prizes. The rarer your scores, the better your odds. Win cash while your charity wins too.'
    },
    {
        id: 'transparency',
        icon: SparkleIcon,
        color: '#06b6d4',
        title: '100% Transparent',
        description: 'Every dollar tracked. Every charity vetted. See exactly where donations go with our real-time impact dashboard.'
    },
    {
        id: 'easy',
        icon: GolfFlagIcon,
        color: '#84cc16',
        title: 'Effortlessly Easy',
        description: 'Log your scores in seconds. Pick your charity once. We handle the rest - from draws to donations to tax receipts.'
    }
];

export default function WhyJoinSection() {
    const [stats, setStats] = useState({ golferCount: 0, totalRaised: 0, charityCount: 0 });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                const data = await getHomePageStats();
                setStats(data);
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchStats();
    }, []);

    return (
        <section className="py-24 lg:py-32 relative overflow-hidden">
            {/* Background gradient */}
            <div
                className="absolute inset-0"
                style={{
                    background: 'radial-gradient(ellipse at 30% 50%, rgba(16, 185, 129, 0.05) 0%, transparent 50%)'
                }}
            />

            <div className="container-app relative">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="text-center mb-16"
                >
                    <span className="text-sm font-medium uppercase tracking-widest mb-4 block text-emerald-400">
                        The GolfCharity Difference
                    </span>
                    <h2
                        className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-white"
                        style={{ fontFamily: 'var(--font-display)' }}
                    >
                        Why Join{' '}
                        <span className="text-gradient-emerald">Our Community?</span>
                    </h2>
                    <p className="text-lg max-w-2xl mx-auto text-zinc-400">
                        Every birdie, par, and bogey you make creates real change.
                        Here's why golfers across Australia are choosing to play with purpose.
                    </p>
                </motion.div>

                {/* Cards Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                    {defaultCards.map((card, index) => (
                        <motion.div
                            key={card.id}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{
                                delay: index * 0.1,
                                duration: 0.5,
                                ease: [0.16, 1, 0.3, 1]
                            }}
                            whileHover={{ y: -5, transition: { duration: 0.2 } }}
                            className="group"
                        >
                            <div
                                className="h-full p-6 lg:p-8 rounded-2xl transition-all duration-300"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                }}
                            >
                                {/* Icon */}
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                                    style={{
                                        background: `${card.color}15`,
                                    }}
                                >
                                    <card.icon size={24} color={card.color} strokeWidth={1.5} />
                                </div>

                                {/* Content */}
                                <h3
                                    className="text-xl font-bold mb-3 text-white"
                                    style={{ fontFamily: 'var(--font-display)' }}
                                >
                                    {card.title}
                                </h3>
                                <p className="text-zinc-400 leading-relaxed">
                                    {card.description}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Live Stats Bar */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="rounded-2xl p-6 lg:p-8"
                    style={{
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)',
                        border: '1px solid rgba(16, 185, 129, 0.2)'
                    }}
                >
                    <div className="grid sm:grid-cols-3 gap-6 text-center mb-6">
                        <div>
                            <div className="text-3xl lg:text-4xl font-bold text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                                {isLoading ? '...' : stats.golferCount?.toLocaleString() || '0'}
                            </div>
                            <div className="text-sm text-zinc-400">Active Golfers</div>
                        </div>
                        <div>
                            <div className="text-3xl lg:text-4xl font-bold text-emerald-400 mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                                ${isLoading ? '...' : (stats.totalRaised || 0).toLocaleString()}
                            </div>
                            <div className="text-sm text-zinc-400">Raised for Charity</div>
                        </div>
                        <div>
                            <div className="text-3xl lg:text-4xl font-bold text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                                {isLoading ? '...' : stats.charityCount || '0'}
                            </div>
                            <div className="text-sm text-zinc-400">Partner Charities</div>
                        </div>
                    </div>

                    {/* CTA */}
                    <div className="text-center">
                        <Link to="/signup">
                            <Button variant="accent" size="lg" className="magnetic">
                                Start Your Journey Today
                            </Button>
                        </Link>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
