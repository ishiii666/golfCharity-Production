import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CountUp } from '../ui/AnimatedNumber';
import { staggerContainer, staggerItem } from '../../utils/animations';
import { getHomePageStats } from '../../lib/supabaseRest';

export default function StatsCounter() {
    const [liveStats, setLiveStats] = useState({
        totalRaised: 184350, // Fallback mock
        charityCount: 24,
        golferCount: 2847,
        livesImpacted: 438
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                const data = await getHomePageStats();
                if (data) {
                    setLiveStats(data);
                }
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, []);

    const dynamicStats = [
        {
            value: liveStats.totalRaised,
            prefix: '$',
            suffix: '',
            label: 'Raised for Charity',
            color: 'text-teal-400',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
            )
        },
        {
            value: liveStats.golferCount,
            prefix: '',
            suffix: '',
            label: 'Active Players',
            color: 'text-violet-400',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            )
        },
        {
            value: liveStats.charityCount,
            prefix: '',
            suffix: '',
            label: 'Partner Charities',
            color: 'text-amber-400',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
            )
        },
        {
            value: liveStats.livesImpacted, // This is Wins Awarded in the count query context
            prefix: '',
            suffix: '',
            label: 'Wins Awarded',
            color: 'text-rose-400',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
            )
        }
    ];

    return (
        <section className="py-16 lg:py-24 relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-slate-950" />
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 via-violet-500/5 to-amber-500/5" />

            <div className="relative container-app">
                <motion.div
                    variants={staggerContainer}
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true, margin: "-50px" }}
                    className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12"
                >
                    {dynamicStats.map((stat, index) => (
                        <motion.div
                            key={stat.label}
                            variants={staggerItem}
                            className="text-center group"
                        >
                            {/* Icon */}
                            <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center ${stat.color} group-hover:scale-110 transition-transform duration-300`}>
                                {stat.icon}
                            </div>

                            {/* Number */}
                            <div className={`text-3xl sm:text-4xl lg:text-5xl font-bold ${stat.color} mb-2`}>
                                <CountUp
                                    end={stat.value}
                                    prefix={stat.prefix}
                                    suffix={stat.suffix}
                                    duration={2}
                                    delay={index * 0.2}
                                />
                            </div>

                            {/* Label */}
                            <div className="text-slate-400 font-medium">
                                {stat.label}
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
