import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import PageTransition from '../components/layout/PageTransition';
import ScrollytellingHero from '../components/home/ScrollytellingHero';
import CharityImpactSection from '../components/home/CharityImpactSection';
import ImpactMoment from '../components/home/ImpactMoment';
import HowItWorksCTA from '../components/home/HowItWorksCTA';
import CharityCarousel from '../components/home/CharityCarousel';
import HowItWorks from '../components/home/HowItWorks';
import LeaderboardSection from '../components/home/LeaderboardSection';
import WhyJoinSection from '../components/home/WhyJoinSection';
import Button from '../components/ui/Button';
import { GolferIcon, HeartIcon } from '../components/ui/Icons';

export default function Home() {
    return (
        <PageTransition>
            {/* Scrollytelling Hero - Main narrative */}
            <ScrollytellingHero />

            {/* Gradient Transition from Hero to Content */}
            <div
                className="relative h-32 -mt-32 z-10"
                style={{
                    background: 'linear-gradient(to bottom, transparent 0%, rgba(9, 9, 11, 0.5) 30%, rgba(9, 9, 11, 0.9) 70%, rgb(9, 9, 11) 100%)'
                }}
            />

            {/* Impact Moment - Visual Breakthrough */}
            <ImpactMoment />

            {/* Charity Impact Section - Community Achievement */}
            <CharityImpactSection />

            {/* How It Works CTA - Brief intro section */}
            <HowItWorksCTA />

            {/* Leaderboard Of Impact - Show real player rankings */}
            <LeaderboardSection />

            {/* Charity Carousel - Moved UP for prominence */}
            <CharityCarousel />

            {/* How It Works - Reframed as giving journey */}
            <HowItWorks />

            {/* Why Join Our Community */}
            <WhyJoinSection />



            {/* Final CTA Section - Charity focused */}
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
                                    Start Giving Today
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

