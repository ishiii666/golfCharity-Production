import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '../ui/Card';
import { HeartIcon, GolfFlagIcon, TargetIcon, HandshakeIcon } from '../ui/Icons';
import { getSiteContent } from '../../lib/supabaseRest';

/**
 * HowItWorks - Premium dynamic explanation with charity focus
 */

const defaultSteps = [
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
    },
    {
        step: '05',
        title: 'Impact Lives',
        description: 'Your contribution directly supports verified charities across Australia.',
        icon: HeartIcon,
        color: '#ef4444'
    }
];


export default function HowItWorks() {
    const [dynamicSteps, setDynamicSteps] = useState(defaultSteps);

    // Fetch real data from database
    useEffect(() => {
        async function fetchData() {
            try {

                // Fetch CMS content
                const content = await getSiteContent();
                if (content.length > 0) {
                    const getField = (name) => {
                        const field = content.find(c => c.section_id === 'howItWorks' && c.field_name === name);
                        return field ? field.field_value : null;
                    };

                    const newSteps = [];
                    // Try to get up to 5 steps from CMS
                    for (let i = 1; i <= 5; i++) {
                        const title = getField(`step${i}Title`);
                        const desc = getField(`step${i}Desc`);
                        if (title && desc) {
                            // Map to default icons based on index
                            const originalStep = defaultSteps[i - 1] || defaultSteps[0];
                            newSteps.push({
                                step: `0${i}`,
                                title,
                                description: desc,
                                icon: originalStep.icon,
                                color: originalStep.color
                            });
                        }
                    }

                    if (newSteps.length > 0) {
                        setDynamicSteps(newSteps);
                    }
                }
            } catch (error) {
                console.error('Error loading data:', error);
            }
        }
        fetchData();
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
                        Follow our unique process to transform your golf game into meaningful impact
                    </p>
                </motion.div>

                {/* Steps Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 lg:gap-8 mb-20">
                    {dynamicSteps.map((step, index) => (
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


            </div>
        </section>
    );
}
