import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Button from '../ui/Button';
import { fadeUp, staggerContainer, staggerItem } from '../../utils/animations';
import { DRAW_SCHEDULE_TEXT, getNextDrawDateFormatted, getCountdownString } from '../../utils/drawSchedule';

export default function Hero() {
    return (
        <section className="relative min-h-[90vh] flex items-center overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0">
                {/* Dark gradient base */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />

                {/* Animated gradient orbs */}
                <motion.div
                    animate={{
                        x: [0, 50, 0],
                        y: [0, 30, 0],
                        scale: [1, 1.1, 1]
                    }}
                    transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-teal-500/20 blur-[120px]"
                />
                <motion.div
                    animate={{
                        x: [0, -30, 0],
                        y: [0, 50, 0],
                        scale: [1, 1.2, 1]
                    }}
                    transition={{
                        duration: 25,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-violet-500/15 blur-[100px]"
                />
                <motion.div
                    animate={{
                        x: [0, 40, 0],
                        y: [0, -40, 0]
                    }}
                    transition={{
                        duration: 15,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    className="absolute top-1/2 right-1/3 w-[300px] h-[300px] rounded-full bg-amber-500/10 blur-[80px]"
                />

                {/* Grid pattern overlay */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0wIDBoNjB2NjBIMHoiLz48cGF0aCBkPSJNMzAgMzBoMXYxaC0xeiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIvPjwvZz48L3N2Zz4=')] opacity-50" />
            </div>

            {/* Content */}
            <div className="relative container-app py-20">
                <motion.div
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                    className="max-w-3xl mx-auto text-center"
                >
                    {/* Badge */}
                    <motion.div variants={staggerItem}>
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-sm font-medium mb-6">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                            </span>
                            Now accepting players Australia-wide
                        </span>
                    </motion.div>

                    {/* Main Headline */}
                    <motion.h1
                        variants={staggerItem}
                        className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight mb-6"
                    >
                        Your Golf Scores{' '}
                        <span className="text-gradient">Change Lives</span>
                    </motion.h1>

                    {/* Subheadline */}
                    <motion.p
                        variants={staggerItem}
                        className="text-lg sm:text-xl text-slate-400 mb-8 max-w-2xl mx-auto leading-relaxed"
                    >
                        Enter your last 5 official Stableford scores. Match 3, 4, or 5 numbers in our draw on the
                        <span className="text-amber-400 font-medium"> 9th of every month at 8:00 PM EST</span>.
                        <span className="text-white font-medium"> Win for yourself and raise money for charity.</span>
                    </motion.p>

                    {/* CTA Buttons */}
                    <motion.div
                        variants={staggerItem}
                        className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
                    >
                        <Link to="/signup">
                            <Button size="lg" className="text-lg px-10">
                                Start Playing
                                <svg className="w-5 h-5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </Button>
                        </Link>
                        <Link to="/how-it-works">
                            <Button variant="outline" size="lg" className="text-lg">
                                How It Works
                            </Button>
                        </Link>
                    </motion.div>

                    {/* Next Draw Banner */}
                    <motion.div
                        variants={staggerItem}
                        className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500/10 to-teal-500/10 border border-amber-500/20 mb-8"
                    >
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-amber-300 font-semibold">Next Draw:</span>
                        </div>
                        <span className="text-white font-medium">{getNextDrawDateFormatted()}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-teal-400 font-medium">{getCountdownString()}</span>
                    </motion.div>

                    {/* Trust Indicators */}
                    <motion.div
                        variants={staggerItem}
                        className="flex flex-wrap justify-center gap-6 text-sm text-slate-500"
                    >
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <span>Secure & Verified</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>$9/month from $108/year</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            <span>10-100% to Charity</span>
                        </div>
                    </motion.div>
                </motion.div>

                {/* Scroll Indicator */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.5 }}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2"
                >
                    <motion.div
                        animate={{ y: [0, 8, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-6 h-10 rounded-full border-2 border-slate-600 flex justify-center"
                    >
                        <motion.div
                            animate={{ y: [0, 12, 0], opacity: [1, 0.5, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="w-1.5 h-3 bg-slate-500 rounded-full mt-2"
                        />
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
