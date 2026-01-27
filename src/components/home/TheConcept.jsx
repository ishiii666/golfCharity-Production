import { motion } from 'framer-motion';
import { CheckCircle, Target, Coins, Trophy } from 'lucide-react';

/**
 * TheConcept - Explains the unique draw mechanics
 */
export default function TheConcept() {
    return (
        <section className="py-16 md:py-24 px-6 relative bg-[#020202]">
            <div className="max-w-7xl mx-auto text-center">
                <motion.span
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    className="text-emerald-500/80 text-[10px] font-black tracking-[0.4em] uppercase mb-6 block"
                >
                    THE CONCEPT
                </motion.span>
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    className="text-3xl md:text-5xl font-bold text-white mb-8 tracking-tight"
                    style={{ fontFamily: 'var(--font-display)' }}
                >
                    Your Scores, Your <span className="text-emerald-500">Lucky Numbers</span>
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    className="text-zinc-500 max-w-3xl mx-auto text-lg leading-relaxed mb-12 font-medium"
                >
                    Unlike random lotteries, our draw is based on real golf performance. Your authentic Stableford scores from the course become your entry numbers. The more unique your scores, the better your chances!
                </motion.p>

                {/* How the Draw Works Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="max-w-4xl mx-auto bg-zinc-900/10 border border-white/5 p-10 md:p-14 rounded-[2.5rem] text-left relative overflow-hidden group shadow-2xl hover:border-emerald-500/20 transition-all duration-500"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />

                    <div className="grid md:grid-cols-2 gap-12 relative z-10 items-center">
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-8 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>How the Draw Works</h3>
                            <div className="space-y-5">
                                {[
                                    { text: "All player scores are analyzed on the 9th of each month", icon: <CheckCircle className="w-5 h-5 text-emerald-500" /> },
                                    { text: "We find statistical outliers in the data", icon: <Target className="w-5 h-5 text-emerald-500" /> },
                                    { text: "3 rarest + 2 most common = winning combo", icon: <Coins className="w-5 h-5 text-emerald-500" /> },
                                    { text: "Match your scores to win & give!", icon: <Trophy className="w-5 h-5 text-emerald-500" /> }
                                ].map((item, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -10 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="flex items-center gap-4 group/item"
                                    >
                                        <div className="shrink-0 group-hover/item:scale-110 transition-transform">{item.icon}</div>
                                        <span className="text-zinc-300 font-medium text-sm md:text-base group-hover/item:text-white transition-colors">{item.text}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col items-center">
                            <div className="flex flex-wrap justify-center gap-3 mb-6">
                                {[32, 18, 41, 27, 35].map((num, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ scale: 0, rotate: -20 }}
                                        whileInView={{ scale: 1, rotate: 0 }}
                                        transition={{ type: "spring", stiffness: 200, delay: i * 0.1 }}
                                        className="w-12 h-12 md:w-14 md:h-14 rounded-full border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.1)] hover:bg-emerald-500/20 transition-colors"
                                    >
                                        <span className="text-white font-black text-lg">{num}</span>
                                    </motion.div>
                                ))}
                            </div>
                            <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">Example winning combination</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
