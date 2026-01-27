import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { User, Heart, ArrowRight } from 'lucide-react';

/**
 * HowGivesBackHero - Narrative section for how golf supports charities
 */
export default function HowGivesBackHero() {
    return (
        <section className="relative pt-24 pb-20 overflow-hidden bg-black">
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[400px] bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.1),transparent_70%)] opacity-60" />
            </div>

            <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-center gap-4 mb-8"
                >
                    <motion.div
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="w-14 h-14 rounded-full border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                    >
                        <User className="w-7 h-7 text-emerald-500" />
                    </motion.div>
                    <motion.div
                        animate={{ y: [0, 8, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                        className="w-14 h-14 rounded-full border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                    >
                        <Heart className="w-7 h-7 text-emerald-500" />
                    </motion.div>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-5xl md:text-7xl font-bold text-white mb-8 tracking-tight leading-[1.1]"
                    style={{ fontFamily: 'var(--font-display)' }}
                >
                    How <span className="text-emerald-500 italic">Golf</span> Gives Back
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-zinc-400 max-w-2xl mx-auto text-lg md:text-xl leading-relaxed mb-12 font-medium"
                >
                    Turn your passion for golf into meaningful impact. Play your regular rounds, enter our unique lucky draw, and support Australian charities — all while winning prizes!
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-6"
                >
                    <Link to="/signup" className="group relative px-10 py-5 bg-emerald-500 text-black rounded-2xl transition-all font-black uppercase text-xs tracking-[0.2em] shadow-[0_10px_30px_rgba(16,185,129,0.2)] hover:bg-emerald-400 hover:scale-[1.02] active:scale-95 overflow-hidden">
                        <span className="relative z-10 flex items-center gap-2">Start Playing <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    </Link>
                    <Link to="/charities" className="px-10 py-5 border border-white/10 text-white hover:bg-white/5 hover:border-white/20 rounded-2xl transition-all font-black uppercase text-xs tracking-[0.2em]">
                        View Our Charities
                    </Link>
                </motion.div>
            </div>
        </section>
    );
}
