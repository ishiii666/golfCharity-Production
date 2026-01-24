import { motion } from 'framer-motion';
import PageTransition from '../components/layout/PageTransition';
import Card, { CardContent } from '../components/ui/Card';
import { HeartIcon, GolferIcon, SparkleIcon, HandshakeIcon } from '../components/ui/Icons';
import { fadeUp, staggerContainer, staggerItem } from '../utils/animations';

export default function About() {
    return (
        <PageTransition>
            <div className="py-20 lg:py-32 relative overflow-hidden">
                {/* Background Decorations */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px]" />
                    <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px]" />
                </div>

                <div className="container-app relative z-10">
                    {/* Hero Section */}
                    <div className="max-w-3xl mx-auto text-center mb-20">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
                            style={{
                                background: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid rgba(16, 185, 129, 0.2)'
                            }}
                        >
                            <HeartIcon size={16} color="#10b981" />
                            <span className="text-emerald-400 text-sm font-bold uppercase tracking-wider">Our Story</span>
                        </motion.div>

                        <motion.h1
                            variants={fadeUp}
                            initial="initial"
                            animate="animate"
                            className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-6"
                            style={{ fontFamily: 'var(--font-display)' }}
                        >
                            Precision with <span className="text-gradient-emerald">Purpose</span>
                        </motion.h1>

                        <motion.p
                            variants={fadeUp}
                            initial="initial"
                            animate="animate"
                            transition={{ delay: 0.1 }}
                            className="text-lg text-zinc-400 leading-relaxed"
                        >
                            GOLFCHARITY was founded on a simple belief: that the world's greatest game could be used to solve some of the world's greatest challenges. We combine the competitive spirit of golf with a transparent, impact-driven giving platform.
                        </motion.p>
                    </div>

                    {/* Mission Cards */}
                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        whileInView="animate"
                        viewport={{ once: true }}
                        className="grid md:grid-cols-3 gap-8 mb-32"
                    >
                        {[
                            {
                                icon: GolferIcon,
                                title: 'The Community',
                                description: 'A national network of golfers who believe every round is an opportunity to make a difference.'
                            },
                            {
                                icon: SparkleIcon,
                                title: 'The Innovation',
                                description: 'A seamless, digital-first experience that turns scorecards into life-changing donations.'
                            },
                            {
                                icon: HandshakeIcon,
                                title: 'The Impact',
                                description: 'Direct, transparent funding for verified Australian charities focusing on health, education, and the environment.'
                            }
                        ].map((item, index) => (
                            <motion.div key={index} variants={staggerItem}>
                                <Card variant="glass" className="h-full text-center p-8 group">
                                    <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
                                        <item.icon size={32} color="#10b981" strokeWidth={1.5} />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                                        {item.title}
                                    </h3>
                                    <p className="text-zinc-400 text-sm leading-relaxed">
                                        {item.description}
                                    </p>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Founder Section */}
                    <div className="max-w-5xl mx-auto">
                        <Card variant="glow" className="overflow-hidden">
                            <div className="grid md:grid-cols-2">
                                <div className="p-8 lg:p-12 flex flex-col justify-center">
                                    <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>
                                        Why We Started
                                    </h2>
                                    <div className="space-y-4 text-zinc-400">
                                        <p>
                                            In 2025, we saw a gap between the charity events we loved playing in and the daily rounds we played with friends. We wondered: what if every round mattered?
                                        </p>
                                        <p>
                                            GOLFCHARITY was born from that question. We built a platform that allows golfers to compete for massive monthly prizes while donating a portion of their winnings to causes they care about.
                                        </p>
                                        <p className="italic text-emerald-400 font-medium pt-4">
                                            "Our goal is to raise $10 million for Australian charities by 2030, one swing at a time."
                                        </p>
                                    </div>
                                </div>
                                <div className="relative aspect-square md:aspect-auto min-h-[400px]">
                                    <img
                                        src="https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&h=1000&fit=crop"
                                        alt="Golfing impact"
                                        className="absolute inset-0 w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-transparent to-transparent" />
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </PageTransition>
    );
}
