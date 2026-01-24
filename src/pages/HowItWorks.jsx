import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import PageTransition from '../components/layout/PageTransition';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { GolferIcon, HeartIcon, GolfFlagIcon, TargetIcon, TrophyIcon, SparkleIcon } from '../components/ui/Icons';
import { getSiteContent } from '../lib/supabaseRest';

/**
 * How It Works - Explains the golf charity and lucky draw concept
 */
export default function HowItWorks() {
    const [dynamicSteps, setDynamicSteps] = useState([
        {
            number: '01',
            title: 'Sign Up & Subscribe',
            description: 'Create your account and choose a monthly subscription plan. Select which Australian charity you want to support.',
            Icon: HeartIcon,
            color: '#22c55e',
            details: [
                'Choose from $10, $25, or $50 monthly plans',
                'Select your charity percentage (10% - 100%)',
                'Pick from 24+ verified partner charities'
            ]
        },
        {
            number: '02',
            title: 'Play Your Golf Rounds',
            description: 'Head to the course and play! Log your last 5 official Stableford scores from any registered golf club.',
            Icon: GolfFlagIcon,
            color: '#c9a227',
            details: [
                'Submit verified Stableford scores (1-45 points)',
                'Scores must be from official club rounds',
                'Your 5 scores become your unique draw numbers'
            ]
        },
        {
            number: '03',
            title: 'Enter the Draw (9th at 8PM)',
            description: 'On the 9th of every month at 8:00 PM, we analyze all player scores to create a unique 5-number winning combination.',
            Icon: TargetIcon,
            color: '#c9a227',
            details: [
                'Draw held on the 9th of every month',
                'We find the 3 LEAST common scores',
                'We find the 2 MOST common scores',
                'These 5 numbers form the winning combination'
            ]
        },
        {
            number: '04',
            title: 'Match Numbers & Win',
            description: 'If your scores match the winning numbers, you win a share of the prize pool!',
            Icon: TrophyIcon,
            color: '#c9a227',
            details: [
                'Match 3 numbers = 25% of prize pool',
                'Match 4 numbers = 35% of prize pool',
                'Match 5 numbers = 40% of prize pool (Jackpot!)'
            ]
        },
        {
            number: '05',
            title: 'Give Back to Charity',
            description: 'Your chosen charity percentage is automatically donated. Win or not, your membership always supports your charity.',
            Icon: HeartIcon,
            color: '#ef4444',
            details: [
                'Winners donate their pledged percentage',
                'Monthly subscription fee supports operations',
                '100% of charity pledges go directly to partners'
            ]
        }
    ]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchContent();
    }, []);

    const fetchContent = async () => {
        try {
            const content = await getSiteContent();
            if (content.length > 0) {
                const getField = (name) => content.find(c => c.section_id === 'howItWorks' && c.field_name === name)?.field_value;

                const newSteps = dynamicSteps.map((step, index) => {
                    const i = index + 1;
                    const title = getField(`step${i}Title`);
                    const desc = getField(`step${i}Desc`);
                    return {
                        ...step,
                        title: title || step.title,
                        description: desc || step.description
                    };
                });
                setDynamicSteps(newSteps);
            }
        } catch (error) {
            console.error('Error fetching CMS content:', error);
        } finally {
            setLoading(false);
        }
    };

    const faqs = [
        {
            question: 'What is Stableford scoring?',
            answer: 'Stableford is a golf scoring system where points are awarded based on your score at each hole relative to par. Most amateur golfers score between 20-40 points per round.'
        },
        {
            question: 'How are winners selected?',
            answer: 'We analyze all submitted scores to find statistical outliers - the 3 least common and 2 most common scores across all players. These form the winning 5-number combination.'
        },
        {
            question: 'What happens if no one matches 5 numbers?',
            answer: 'The jackpot (40% tier) rolls over to the next month, growing the prize pool until someone wins!'
        },
        {
            question: 'Can I change my charity?',
            answer: 'Yes! You can change your selected charity at any time from your dashboard. The change takes effect from your next subscription cycle.'
        },
        {
            question: 'How do I verify my scores?',
            answer: 'Scores must be from official club rounds registered with your golf club. We may request verification from your club for large wins.'
        }
    ];

    if (loading) {
        return (
            <PageTransition>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                </div>
            </PageTransition>
        );
    }

    return (
        <PageTransition>
            {/* Hero Section */}
            <section className="pt-32 pb-20 relative overflow-hidden">
                <div
                    className="absolute inset-0 opacity-30"
                    style={{
                        background: 'radial-gradient(ellipse at 50% 0%, rgba(26, 77, 46, 0.4) 0%, transparent 60%)'
                    }}
                />

                <div className="container-app relative">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-center max-w-4xl mx-auto"
                    >
                        <motion.span
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="flex items-center justify-center gap-3 mb-6"
                        >
                            <GolferIcon size={48} color="var(--color-accent-500)" strokeWidth={1.5} />
                            <HeartIcon size={40} color="#22c55e" strokeWidth={1.5} />
                        </motion.span>
                        <h1
                            className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6"
                            style={{ fontFamily: 'var(--font-display)', color: '#f9f5e3' }}
                        >
                            How <span className="text-gradient-gold">Golf Gives Back</span>
                        </h1>
                        <p
                            className="text-lg lg:text-xl max-w-2xl mx-auto mb-8"
                            style={{ color: 'var(--color-neutral-400)' }}
                        >
                            Turn your passion for golf into meaningful impact. Play your regular rounds,
                            enter our unique lucky draw, and support Australian charities — all while
                            winning prizes!
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <Link to="/signup">
                                <Button size="lg" className="magnetic">
                                    Start Playing for Good
                                </Button>
                            </Link>
                            <Link to="/charities">
                                <Button variant="outline" size="lg">
                                    View Our Charities
                                </Button>
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* The Lucky Draw Concept */}
            <section className="py-20 relative">
                <div className="container-app">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <span
                            className="text-sm font-medium uppercase tracking-widest mb-4 block"
                            style={{ color: '#c9a227' }}
                        >
                            The Concept
                        </span>
                        <h2
                            className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6"
                            style={{ fontFamily: 'var(--font-display)', color: '#f9f5e3' }}
                        >
                            Your Scores, Your <span className="text-gradient-gold">Lucky Numbers</span>
                        </h2>
                        <p className="text-lg max-w-3xl mx-auto" style={{ color: 'var(--color-neutral-400)' }}>
                            Unlike random lotteries, our draw is based on real golf performance.
                            Your authentic Stableford scores from the course become your entry numbers.
                            The more unique your scores, the better your chances!
                        </p>
                    </motion.div>

                    {/* Visual explanation */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="max-w-4xl mx-auto"
                    >
                        <Card variant="gradient" className="p-8 lg:p-12">
                            <div className="grid md:grid-cols-2 gap-8 items-center">
                                <div>
                                    <h3
                                        className="text-2xl font-bold mb-4"
                                        style={{ fontFamily: 'var(--font-display)', color: '#f9f5e3' }}
                                    >
                                        How the Draw Works
                                    </h3>
                                    <div className="space-y-4" style={{ color: 'var(--color-neutral-300)' }}>
                                        <div className="flex items-start gap-3">
                                            <TargetIcon size={20} className="flex-shrink-0 mt-0.5" color="#c9a227" strokeWidth={1.5} />
                                            <p>All player scores are analyzed at month's end</p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <SparkleIcon size={20} className="flex-shrink-0 mt-0.5" color="#c9a227" strokeWidth={1.5} />
                                            <p>We find statistical outliers in the data</p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <GolfFlagIcon size={20} className="flex-shrink-0 mt-0.5" color="#c9a227" strokeWidth={1.5} />
                                            <p>3 rarest + 2 most common = winning combo</p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <TrophyIcon size={20} className="flex-shrink-0 mt-0.5" color="#c9a227" strokeWidth={1.5} />
                                            <p>Match your scores to win & give!</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="inline-flex flex-wrap justify-center gap-3">
                                        {[32, 18, 41, 27, 35].map((num, i) => (
                                            <motion.div
                                                key={num}
                                                initial={{ opacity: 0, scale: 0 }}
                                                whileInView={{ opacity: 1, scale: 1 }}
                                                viewport={{ once: true }}
                                                transition={{ delay: i * 0.1, type: 'spring' }}
                                                className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold"
                                                style={{
                                                    background: i < 3
                                                        ? 'linear-gradient(135deg, #c9a227 0%, #d4af37 100%)'
                                                        : 'linear-gradient(135deg, #1a4d2e 0%, #0f3621 100%)',
                                                    color: i < 3 ? '#0f3621' : '#c9a227',
                                                    border: '2px solid rgba(201, 162, 39, 0.3)'
                                                }}
                                            >
                                                {num}
                                            </motion.div>
                                        ))}
                                    </div>
                                    <p className="text-sm mt-4" style={{ color: 'var(--color-neutral-500)' }}>
                                        Example winning combination
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                </div>
            </section>

            {/* Step by Step */}
            <section className="py-20 relative">
                <div
                    className="absolute inset-0 opacity-20"
                    style={{
                        background: 'radial-gradient(ellipse at 80% 50%, rgba(201, 162, 39, 0.15) 0%, transparent 50%)'
                    }}
                />

                <div className="container-app relative">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <span
                            className="text-sm font-medium uppercase tracking-widest mb-4 block"
                            style={{ color: '#c9a227' }}
                        >
                            Step by Step
                        </span>
                        <h2
                            className="text-3xl sm:text-4xl lg:text-5xl font-bold"
                            style={{ fontFamily: 'var(--font-display)', color: '#f9f5e3' }}
                        >
                            Your Journey to <span className="text-gradient-gold">Giving Back</span>
                        </h2>
                    </motion.div>

                    <div className="space-y-8 max-w-4xl mx-auto">
                        {dynamicSteps.map((step, index) => (
                            <motion.div
                                key={step.number}
                                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1, duration: 0.5 }}
                            >
                                <Card variant="glass" hoverable className="p-6 lg:p-8">
                                    <div className="flex flex-col md:flex-row gap-6">
                                        {/* Step number & icon */}
                                        <div className="flex md:flex-col items-center gap-4">
                                            <motion.div
                                                animate={{ y: [0, -5, 0] }}
                                                transition={{ duration: 3, repeat: Infinity, delay: index * 0.2 }}
                                            >
                                                <step.Icon size={40} color={step.color} strokeWidth={1.5} />
                                            </motion.div>
                                            <span
                                                className="text-4xl font-bold"
                                                style={{
                                                    fontFamily: 'var(--font-display)',
                                                    background: 'linear-gradient(135deg, rgba(201, 162, 39, 0.4) 0%, rgba(201, 162, 39, 0.1) 100%)',
                                                    WebkitBackgroundClip: 'text',
                                                    WebkitTextFillColor: 'transparent',
                                                    backgroundClip: 'text'
                                                }}
                                            >
                                                {step.number}
                                            </span>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1">
                                            <h3
                                                className="text-xl lg:text-2xl font-bold mb-3"
                                                style={{ fontFamily: 'var(--font-display)', color: '#f9f5e3' }}
                                            >
                                                {step.title}
                                            </h3>
                                            <p className="mb-4" style={{ color: 'var(--color-neutral-400)' }}>
                                                {step.description}
                                            </p>
                                            <ul className="space-y-2">
                                                {step.details.map((detail, i) => (
                                                    <li
                                                        key={i}
                                                        className="flex items-start gap-2 text-sm"
                                                        style={{ color: 'var(--color-neutral-300)' }}
                                                    >
                                                        <span style={{ color: '#c9a227' }}>✓</span>
                                                        {detail}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Prize Pool Breakdown */}
            <section className="py-20 relative">
                <div className="container-app">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-12"
                    >
                        <span
                            className="text-sm font-medium uppercase tracking-widest mb-4 block"
                            style={{ color: '#c9a227' }}
                        >
                            Prize Distribution
                        </span>
                        <h2
                            className="text-3xl sm:text-4xl lg:text-5xl font-bold"
                            style={{ fontFamily: 'var(--font-display)', color: '#f9f5e3' }}
                        >
                            Win Big, <span className="text-gradient-gold">Give Bigger</span>
                        </h2>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                        {[
                            { match: '5 Numbers', prize: '40%', label: 'Jackpot', color: '#f59e0b', featured: true },
                            { match: '4 Numbers', prize: '35%', label: 'Second Tier', color: '#ffffff', featured: false },
                            { match: '3 Numbers', prize: '25%', label: 'Third Tier', color: '#a1a1aa', featured: false }
                        ].map((tier, index) => (
                            <motion.div
                                key={tier.match}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card
                                    variant="glass"
                                    hoverable
                                    className={`text-center p-8 ${tier.featured ? 'ring-1 ring-emerald-500/30' : ''}`}
                                >
                                    <div
                                        className="text-5xl lg:text-6xl font-bold mb-2"
                                        style={{ fontFamily: 'var(--font-display)', color: tier.color }}
                                    >
                                        {tier.prize}
                                    </div>
                                    <div className="text-lg font-semibold mb-1 text-white">
                                        {tier.label}
                                    </div>
                                    <div className="text-sm text-zinc-400">
                                        Match {tier.match}
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>

                    <motion.p
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="text-center mt-8 text-sm text-zinc-500"
                    >
                        No jackpot winner? The 40% rolls over to next month's draw!
                    </motion.p>
                </div>
            </section>

            {/* FAQs */}
            <section className="py-20 relative">
                <div className="container-app">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-12"
                    >
                        <span
                            className="text-sm font-medium uppercase tracking-widest mb-4 block"
                            style={{ color: '#c9a227' }}
                        >
                            Questions?
                        </span>
                        <h2
                            className="text-3xl sm:text-4xl lg:text-5xl font-bold"
                            style={{ fontFamily: 'var(--font-display)', color: '#f9f5e3' }}
                        >
                            Frequently Asked <span className="text-gradient-gold">Questions</span>
                        </h2>
                    </motion.div>

                    <div className="max-w-3xl mx-auto space-y-4">
                        {faqs.map((faq, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Card variant="glass-subtle" className="p-6">
                                    <h4
                                        className="font-semibold mb-2"
                                        style={{ color: '#f9f5e3', fontFamily: 'var(--font-display)' }}
                                    >
                                        {faq.question}
                                    </h4>
                                    <p className="text-sm" style={{ color: 'var(--color-neutral-400)' }}>
                                        {faq.answer}
                                    </p>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-24 relative overflow-hidden">
                <div
                    className="absolute inset-0 opacity-40"
                    style={{
                        background: 'radial-gradient(ellipse at 50% 100%, rgba(26, 77, 46, 0.4) 0%, transparent 60%)'
                    }}
                />

                <div className="container-app relative">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center max-w-2xl mx-auto"
                    >
                        <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="mb-6"
                        >
                            <TargetIcon size={48} className="mx-auto" color="var(--color-accent-500)" strokeWidth={1.5} />
                        </motion.div>
                        <h2
                            className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6"
                            style={{ fontFamily: 'var(--font-display)', color: '#f9f5e3' }}
                        >
                            Ready to <span className="text-gradient-gold">Make a Difference?</span>
                        </h2>
                        <p className="text-lg mb-8" style={{ color: 'var(--color-neutral-400)' }}>
                            Join thousands of golfers who are already playing for purpose.
                            Your next round could change someone's life.
                        </p>
                        <Link to="/signup">
                            <Button size="lg" className="magnetic">
                                Get Started Today
                            </Button>
                        </Link>
                    </motion.div>
                </div>
            </section>
        </PageTransition>
    );
}
