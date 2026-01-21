import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { TrophyIcon } from '../ui/Icons';

/**
 * HowItWorksCTA - Brief CTA section linking to How It Works page
 */
export default function HowItWorksCTA() {
    return (
        <section className="py-20 lg:py-28 relative overflow-hidden">
            {/* Background gradient */}
            <div
                className="absolute inset-0"
                style={{
                    background: 'radial-gradient(ellipse at 50% 50%, rgba(16, 185, 129, 0.08) 0%, transparent 60%)'
                }}
            />

            <div className="container-app relative text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                    {/* Label */}
                    <span
                        className="text-sm font-medium uppercase tracking-[0.3em] mb-4 block"
                        style={{ color: '#10b981' }}
                    >
                        THE PROCESS
                    </span>

                    {/* Heading */}
                    <h2
                        className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4"
                        style={{ fontFamily: 'var(--font-display)' }}
                    >
                        <span className="text-white">How It </span>
                        <span className="text-gradient-emerald">Works</span>
                    </h2>

                    {/* Decorative underline */}
                    <div className="flex justify-center mb-8">
                        <div
                            className="w-24 h-1 rounded-full"
                            style={{
                                background: 'linear-gradient(90deg, #c9a227, #10b981)'
                            }}
                        />
                    </div>

                    {/* Description */}
                    <p className="text-lg max-w-2xl mx-auto mb-10 text-zinc-400">
                        Your performance on the course now fuels change across the country. Discover the
                        professional-grade draw system that turns scores into stories.
                    </p>

                    {/* CTA Button */}
                    <Link to="/how-it-works">
                        <button
                            className="px-8 py-4 rounded-xl font-semibold text-emerald-400 transition-all duration-300 flex items-center gap-3 mx-auto"
                            style={{
                                background: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid rgba(16, 185, 129, 0.3)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)';
                                e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.5)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                                e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                            }}
                        >
                            <span className="tracking-widest uppercase text-sm">Learn To Play</span>
                            <TrophyIcon size={20} />
                        </button>
                    </Link>
                </motion.div>
            </div>
        </section>
    );
}
