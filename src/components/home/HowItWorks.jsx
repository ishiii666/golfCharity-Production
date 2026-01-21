import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '../ui/Card';
import { HeartIcon, GolfFlagIcon, TargetIcon, HandshakeIcon } from '../ui/Icons';
import { getHomePageStats } from '../../lib/supabaseRest';

/**
 * HowItWorks - Premium 4-step explanation with charity focus
 * Reframed as "How You Make a Difference"
 */

const steps = [
    {
        step: '01',
        title: 'Join the Community',
        description: 'Choose your plan and select which Australian charity receives your giving percentage (10-100%).',
        icon: HeartIcon,
        color: '#10b981'
    },
    {
        step: '02',
        title: 'Play Your Round',
        description: 'Log your last 5 official Stableford scores. Your authentic game becomes your lucky numbers.',
        icon: GolfFlagIcon,
        color: '#34d399'
    },
    {
        step: '03',
        title: 'Enter the Draw',
        description: "Each month, we find the unique scoring combinations. Your game could be your ticket to giving more.",
        icon: TargetIcon,
        color: '#10b981'
    },
    {
        step: '04',
        title: 'Give Back',
        description: 'Match numbers to win. Your chosen charity receives your pledge — turning your passion into impact.',
        icon: HeartIcon,
        color: '#f43f5e'
    }
];

// Build impact stats from fetched data
function buildImpactStats(stats) {
    const avgDonation = stats.golferCount > 0
        ? Math.round((stats.totalRaised / (stats.golferCount * 10)) * 100)
        : 25;

    return [
        { label: 'Average Donation', value: `${Math.min(avgDonation, 100)}%`, color: '#10b981' },
        { label: 'Golfers This Year', value: stats.golferCount?.toLocaleString() || '0', color: '#ffffff' },
        { label: 'Total to Charities', value: `$${Math.round((stats.totalRaised || 0) / 1000)}K+`, color: '#34d399' }
    ];
}

export default function HowItWorks() {
    const [impactStats, setImpactStats] = useState([
        { label: 'Average Donation', value: '...', color: '#10b981' },
        { label: 'Golfers This Year', value: '...', color: '#ffffff' },
        { label: 'Total to Charities', value: '...', color: '#34d399' }
    ]);

    // Fetch real data from database
    useEffect(() => {
        async function fetchStats() {
            try {
                const stats = await getHomePageStats();
                setImpactStats(buildImpactStats(stats));
            } catch (error) {
                console.error('Error loading impact stats:', error);
            }
        }
        fetchStats();
    }, []);

    return (
        <section className="py-24 lg:py-32 relative overflow-hidden">
            {/* Subtle background gradient */}
            <div
                className="absolute inset-0 opacity-50"
                style={{
                    background: 'radial-gradient(ellipse at 70% 30%, rgba(16, 185, 129, 0.08) 0%, transparent 50%)'
                }}
            />


            <div className="container-app relative">
                {/* Section Header - Charity focused */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="text-center mb-16 lg:mb-20"
                >
                    <motion.span
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        className="block mb-4"
                    >
                        <HandshakeIcon size={40} className="mx-auto" color="#10b981" strokeWidth={1.5} />
                    </motion.span>
                    <span className="text-sm font-medium uppercase tracking-widest mb-4 block text-emerald-400">
                        Your Giving Journey
                    </span>
                    <h2
                        className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-white"
                        style={{ fontFamily: 'var(--font-display)' }}
                    >
                        How You <span className="text-gradient-emerald">Make a Difference</span>
                    </h2>
                    <p className="text-lg max-w-2xl mx-auto text-zinc-400">
                        Four simple steps to transform your golf game into meaningful impact
                    </p>
                </motion.div>

                {/* Steps Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mb-20">
                    {steps.map((step, index) => (
                        <motion.div
                            key={step.step}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <Card variant="glass" hoverable className="h-full text-center">
                                {/* Step Number */}
                                <span
                                    className="text-5xl font-bold mb-4 block"
                                    style={{
                                        fontFamily: 'var(--font-display)',
                                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(16, 185, 129, 0.1) 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text'
                                    }}
                                >
                                    {step.step}
                                </span>

                                {/* Floating Icon */}
                                <motion.div
                                    className="flex justify-center mb-6"
                                    animate={{
                                        y: [0, -8, 0],
                                        rotate: [0, 5, -5, 0]
                                    }}
                                    transition={{
                                        duration: 4,
                                        repeat: Infinity,
                                        ease: 'easeInOut',
                                        delay: index * 0.3
                                    }}
                                >
                                    <step.icon size={40} color={step.color} strokeWidth={1.5} />
                                </motion.div>

                                <h3
                                    className="text-xl font-bold mb-3 text-white"
                                    style={{ fontFamily: 'var(--font-display)' }}
                                >
                                    {step.title}
                                </h3>
                                <p className="text-sm leading-relaxed text-zinc-400">
                                    {step.description}
                                </p>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* Impact Stats Instead of Prize Distribution */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                    <Card variant="gradient" className="max-w-3xl mx-auto">
                        <h3
                            className="text-2xl font-bold text-center mb-8 text-white"
                            style={{ fontFamily: 'var(--font-display)' }}
                        >
                            Our Community's Impact
                        </h3>

                        <div className="grid grid-cols-3 gap-4 lg:gap-8">
                            {impactStats.map((stat) => (
                                <motion.div
                                    key={stat.label}
                                    className="text-center"
                                    whileHover={{ scale: 1.05 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                                >
                                    <div
                                        className="text-3xl lg:text-4xl font-bold mb-2"
                                        style={{ fontFamily: 'var(--font-display)', color: stat.color }}
                                    >
                                        {stat.value}
                                    </div>
                                    <div className="text-sm text-zinc-400">
                                        {stat.label}
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <p className="text-center text-sm mt-8 text-zinc-500">
                            Every golfer in our community is making a difference, one round at a time.
                        </p>
                    </Card>
                </motion.div>
            </div>
        </section>
    );
}
