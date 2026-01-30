import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import PageTransition from '../components/layout/PageTransition';
import ImpactMoment from '../components/home/ImpactMoment';
import TheConcept from '../components/home/TheConcept';
import LuckyNumbersReveal from '../components/home/LuckyNumbersReveal';
import HowGivesBackHero from '../components/home/HowGivesBackHero';
import LeaderboardSection from '../components/home/LeaderboardSection';
import HowItWorks from '../components/home/HowItWorks';
import Button from '../components/ui/Button';
import { GolferIcon, HeartIcon } from '../components/ui/Icons';
import { useSiteContent } from '../hooks/useSiteContent';

// Note: Other components like ScrollytellingHero, CharityImpactSection, etc. 
// are kept in the project but removed from the Home page layout as requested.

export default function Home() {
    const { getContent, loading } = useSiteContent();
    const [isReady, setIsReady] = useState(() => {
        // Correct check for sessionStorage
        return sessionStorage.getItem('entryAnimationPlayed') === 'true';
    });

    useEffect(() => {
        if (!isReady) {
            // Wait for EntryAnimation (3.05s total + 0.5s fade-out + 0.05s buffer)
            const timer = setTimeout(() => {
                setIsReady(true);
            }, 3600);
            return () => clearTimeout(timer);
        }
    }, [isReady]);

    if (!isReady || loading) {
        return <div className="min-h-screen bg-[#020202] flex items-center justify-center">
            {!loading && <div className="text-zinc-800 animate-pulse font-bold tracking-widest text-xs">INITIALIZING...</div>}
        </div>;
    }

    return (
        <PageTransition>
            {/* 1. Impact Moment - Visual Breakthrough */}
            <ImpactMoment />

            {/* 2. The Concept - How the Draw Works */}
            <TheConcept />

            {/* 3. The Reveal - Animated Lucky Numbers & Impact */}
            <LuckyNumbersReveal />

            {/* 4. How Golf Gives Back Hero */}
            <HowGivesBackHero />

            {/* 5. Leaderboard Of Impact - Show real player rankings */}
            <LeaderboardSection />

            {/* 6. Final CTA Section - Charity focused */}
            <section className="py-24 lg:py-32 relative overflow-hidden">
                {/* Background effects */}
                <div className="absolute inset-0">
                    <motion.div
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.2, 0.3, 0.2]
                        }}
                        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
                        style={{ background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)' }}
                    />
                </div>

                <div className="container-app relative text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <motion.div
                            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                            className="flex items-center justify-center gap-3 mb-6"
                        >
                            <GolferIcon size={48} color="var(--color-accent-500)" strokeWidth={1.5} />
                            <HeartIcon size={40} color="#ef4444" strokeWidth={1.5} />
                        </motion.div>
                        <h2
                            className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-white"
                            style={{ fontFamily: 'var(--font-display)' }}
                        >
                            Play With <span className="text-gradient-emerald">Purpose</span>
                        </h2>
                        <p className="text-lg max-w-xl mx-auto mb-10 text-zinc-400">
                            Join thousands of golfers turning their passion into positive change.
                            Every round you play supports Australian charities.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link to="/signup">
                                <Button size="lg" variant="accent" className="magnetic">
                                    {getContent('hero', 'ctaText', 'Start Giving Today')}
                                </Button>
                            </Link>
                            <Link to="/charities">
                                <Button size="lg" variant="outline">
                                    Explore Charities
                                </Button>
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>
        </PageTransition>
    );
}


