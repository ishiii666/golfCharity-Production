import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { HeartIcon, HandshakeIcon, GolfFlagIcon, SparkleIcon } from '../ui/Icons';
import { getHomePageStats } from '../../lib/supabaseRest';

/**
 * CharityImpactSection - Animated charity impact statistics
 * 
 * Features animated counters and floating icons to showcase
 * the charitable impact of the platform.
 */

// Animated counter hook
function useCounter(end, duration = 2000, startCounting = false) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!startCounting) return;

        let startTime;
        let animationFrame;

        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);

            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            setCount(Math.floor(easeOutQuart * end));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [end, duration, startCounting]);

    return count;
}

// Build impacts array from fetched data
function buildImpacts(stats) {
    return [
        {
            value: stats.totalRaised || 0,
            prefix: '$',
            suffix: '+',
            label: 'Raised for Charity',
            description: 'Direct donations to Australian charities',
            icon: HeartIcon,
            color: '#ef4444'
        },
        {
            value: stats.charityCount || 0,
            prefix: '',
            suffix: '',
            label: 'Partner Charities',
            description: 'Trusted organizations making a difference',
            icon: HandshakeIcon,
            color: '#10b981'
        },
        {
            value: stats.golferCount || 0,
            prefix: '',
            suffix: '',
            label: 'Golfers Giving Back',
            description: 'Players who play with purpose',
            icon: GolfFlagIcon,
            color: '#f59e0b'
        },
        {
            value: stats.livesImpacted || 0,
            prefix: '',
            suffix: '+',
            label: 'Lives Impacted',
            description: 'People helped through your rounds',
            icon: SparkleIcon,
            color: '#8b5cf6'
        }
    ];
}


function ImpactCard({ impact, index, inView }) {
    const count = useCounter(impact.value, 2500, inView);

    const formatNumber = (num) => {
        if (num >= 1000) {
            return num.toLocaleString();
        }
        return num;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: index * 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="relative group h-full"
        >
            <div
                className="relative h-full min-h-[180px] p-6 lg:p-8 rounded-2xl overflow-hidden transition-shadow duration-500 flex flex-col"
                style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.15)',
                }}
            >
                {/* Floating icon */}
                <motion.div
                    className="absolute top-4 right-4"
                    animate={{
                        y: [0, -8, 0],
                        rotate: [0, 5, -5, 0]
                    }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: index * 0.5
                    }}
                >
                    <impact.icon size={32} color={impact.color} strokeWidth={1.5} />
                </motion.div>

                {/* Glow effect on hover */}
                <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                        background: `radial-gradient(circle at center, ${impact.color}15 0%, transparent 70%)`
                    }}
                />

                {/* Content */}
                <div className="relative flex-1 flex flex-col justify-center">
                    <div
                        className="text-4xl lg:text-5xl font-bold mb-2"
                        style={{ fontFamily: 'var(--font-display)', color: impact.color }}
                    >
                        {impact.prefix}{formatNumber(count)}{impact.suffix}
                    </div>
                    <h3 className="text-lg font-semibold mb-1 text-white">
                        {impact.label}
                    </h3>
                    <p className="text-sm text-zinc-400">
                        {impact.description}
                    </p>
                </div>
            </div>
        </motion.div>
    );
}

export default function CharityImpactSection() {
    const containerRef = useRef(null);
    const isInView = useInView(containerRef, { once: true, margin: '-100px' });
    const [impacts, setImpacts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch real data from database on mount
    useEffect(() => {
        async function fetchStats() {
            try {
                const stats = await getHomePageStats();
                setImpacts(buildImpacts(stats));
            } catch (error) {
                console.error('Error loading impact stats:', error);
                // Use fallback values if fetch fails
                setImpacts(buildImpacts({ totalRaised: 0, charityCount: 0, golferCount: 0, livesImpacted: 0 }));
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, []);

    return (

        <section className="py-20 lg:py-28 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute inset-0">
                {/* Radial gradient */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: 'radial-gradient(ellipse at 50% 0%, rgba(201, 162, 39, 0.08) 0%, transparent 60%)'
                    }}
                />

                {/* Floating hearts background */}
                {[...Array(6)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute text-2xl opacity-10"
                        style={{
                            left: `${15 + i * 15}%`,
                            top: `${20 + (i % 3) * 25}%`
                        }}
                        animate={{
                            y: [0, -20, 0],
                            opacity: [0.05, 0.15, 0.05],
                            scale: [1, 1.1, 1]
                        }}
                        transition={{
                            duration: 5 + i,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: i * 0.8
                        }}
                    >
                        <HeartIcon size={24} color="#ef4444" strokeWidth={1.5} />
                    </motion.div>
                ))}
            </div>

            <div className="container-app relative" ref={containerRef}>
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="text-center mb-16"
                >
                    <h2
                        className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 text-white"
                        style={{ fontFamily: 'var(--font-display)' }}
                    >
                        Our <span className="text-gradient-emerald">Impact</span> Together
                    </h2>
                    <p className="text-lg max-w-2xl mx-auto text-zinc-400">
                        Every round you play contributes to a better Australia.
                        Here's what our community has achieved together.
                    </p>
                </motion.div>

                {/* Impact Grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {impacts.map((impact, index) => (
                        <ImpactCard
                            key={impact.label}
                            impact={impact}
                            index={index}
                            inView={isInView}
                        />
                    ))}
                </div>

                {/* Mission Statement */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="mt-16 text-center"
                >
                    <div
                        className="inline-block px-8 py-6 rounded-2xl max-w-3xl"
                        style={{
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)',
                            border: '1px solid rgba(16, 185, 129, 0.2)'
                        }}
                    >
                        <p
                            className="text-xl lg:text-2xl italic text-white"
                            style={{ fontFamily: 'var(--font-display)' }}
                        >
                            "Golf is more than a game — it's an opportunity to give back.
                            Every swing, every score, every round matters."
                        </p>
                        <p className="mt-4 text-sm text-emerald-400">
                            — The GolfCharity Mission
                        </p>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
