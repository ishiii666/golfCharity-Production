import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Heart,
    Trophy,
    ChevronRight,
    CheckCircle2,
    Flag,
    Target,
    Coins,
    UserPlus,
    CheckCircle,
    User,
    ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import PageTransition from '../components/layout/PageTransition';
import { cn } from '../utils/cn';

const STEPS = [
    {
        id: "01",
        title: "Sign Up & Subscribe",
        desc: "Create your account and choose a monthly subscription plan. Select which Australian charity you want to support.",
        icon: UserPlus,
        color: "text-emerald-500",
        items: [
            "Choose from $10, $25, or $50 monthly plans",
            "Select your charity percentage (10% - 100%)",
            "Pick from 24+ verified partner charities"
        ]
    },
    {
        id: "02",
        title: "Play Your Golf Rounds",
        desc: "Head to the course and play! Log your last 5 official Stableford scores from any registered golf club.",
        icon: Flag,
        color: "text-emerald-500",
        items: [
            "Submit verified Stableford scores (1-45 points)",
            "Scores must be from official club rounds",
            "Your 5 scores become your unique draw numbers"
        ]
    },
    {
        id: "03",
        title: "Enter the Monthly Draw",
        desc: "Each month, we analyze all player scores to create a unique 5-number combination for the draw.",
        icon: Target,
        color: "text-emerald-500",
        items: [
            "We find the 3 LEAST common scores",
            "We find the 2 MOST common scores",
            "These 5 numbers form the winning combination"
        ]
    },
    {
        id: "04",
        title: "Match Numbers & Win",
        desc: "If your scores match the winning numbers, you win a share of the prize pool!",
        icon: Trophy,
        color: "text-emerald-500",
        items: [
            "Match 3 numbers = 25% of prize pool",
            "Match 4 numbers = 35% of prize pool",
            "Match 5 numbers = 40% of prize pool (Jackpot!)"
        ]
    },
    {
        id: "05",
        title: "Give Back to Charity",
        desc: "Your chosen charity percentage is automatically donated. Win or not, your subscription always supports your charity.",
        icon: Heart,
        color: "text-rose-500",
        items: [
            "Winners donate their pledged percentage",
            "Monthly subscription fee supports operations",
            "100% of charity pledges go directly to partners"
        ]
    }
];

const FAQS = [
    {
        question: "What is Stableford scoring?",
        answer: "Stableford is a golf scoring system where points are awarded based on your score at each hole relative to par. Most amateur golfers score between 20-40 points per round."
    },
    {
        question: "How are winners selected?",
        answer: "We analyze all submitted scores to find statistical outliers - the 3 least common and 2 most common scores across all players. These form the winning 5-number combination."
    },
    {
        question: "What happens if no one matches 5 numbers?",
        answer: "The jackpot (40% tier) rolls over to the next month, growing the prize pool until someone wins!"
    },
    {
        question: "Can I change my charity?",
        answer: "Yes! You can change your selected charity at any time from your dashboard. The change takes effect from your next subscription cycle."
    },
    {
        question: "How do I verify my scores?",
        answer: "Scores must be from official club rounds registered with your golf club. We may request verification from your club for large wins."
    }
];

export default function HowItWorks() {
    const [openFaq, setOpenFaq] = useState(null);

    return (
        <PageTransition>
            <main className="min-h-screen bg-black text-white selection:bg-emerald-500 selection:text-white font-sans overflow-x-hidden pt-0">
                {/* Hero Section */}
                <section className="relative pt-12 pb-10 overflow-hidden">
                    <div className="absolute inset-0 z-0 pointer-events-none">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[400px] bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.1),transparent_70%)] opacity-60" />
                    </div>

                    <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center justify-center gap-4 mb-6"
                        >
                            <motion.div
                                animate={{ y: [0, -8, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="w-12 h-12 rounded-full border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                            >
                                <User className="w-6 h-6 text-emerald-500" />
                            </motion.div>
                            <motion.div
                                animate={{ y: [0, 8, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                                className="w-12 h-12 rounded-full border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                            >
                                <Heart className="w-6 h-6 text-emerald-500" />
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

                {/* The Concept Section */}
                <section className="py-8 px-6 relative bg-[#020202]">
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
                                            { text: "All player scores are analyzed at month's end", icon: <CheckCircle className="w-5 h-5 text-emerald-500" /> },
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

                {/* Step by Step Section */}
                <section className="py-16 px-6 bg-black">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-16">
                            <motion.span
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                className="text-emerald-500/80 text-[10px] font-black tracking-[0.4em] uppercase mb-6 block"
                            >
                                STEP BY STEP
                            </motion.span>
                            <motion.h2
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                className="text-3xl md:text-5xl font-bold text-white tracking-tight"
                                style={{ fontFamily: 'var(--font-display)' }}
                            >
                                Your Journey to <span className="text-emerald-500 italic">Giving Back</span>
                            </motion.h2>
                        </div>

                        <div className="space-y-6 md:space-y-8">
                            {STEPS.map((step, idx) => (
                                <motion.div
                                    key={step.id}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    whileHover={{ y: -5, scale: 1.01 }}
                                    className="group relative bg-[#0a0a0a] border border-white/5 hover:border-emerald-500/30 p-8 md:p-12 rounded-[2.5rem] transition-all duration-500 overflow-hidden shadow-xl"
                                >
                                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] group-hover:scale-125 transition-all duration-1000 pointer-events-none rotate-12">
                                        <step.icon className="w-56 h-56 text-white" />
                                    </div>

                                    <div className="relative z-10">
                                        <div className="flex flex-col md:flex-row gap-8 items-start">
                                            <div className="shrink-0">
                                                <span className="text-5xl font-bold text-white/5 group-hover:text-emerald-500/10 transition-colors uppercase italic tracking-tighter block mb-4" style={{ fontFamily: 'var(--font-display)' }}>{step.id}</span>
                                                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center bg-white/5 group-hover:bg-emerald-500/10 transition-all duration-500", step.color)}>
                                                    <step.icon className="w-7 h-7" />
                                                </div>
                                            </div>
                                            <div>
                                                <h3 className="text-xl md:text-2xl font-bold text-white mb-4 flex items-center gap-4 tracking-tight group-hover:text-emerald-400 transition-colors">
                                                    {step.title}
                                                </h3>
                                                <p className="text-zinc-500 text-base md:text-lg leading-relaxed mb-6 max-w-2xl font-medium">
                                                    {step.desc}
                                                </p>
                                                <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-4">
                                                    {step.items.map((item, i) => (
                                                        <motion.div
                                                            key={i}
                                                            initial={{ opacity: 0 }}
                                                            whileInView={{ opacity: 1 }}
                                                            transition={{ delay: 0.3 + (i * 0.1) }}
                                                            className="flex items-center gap-3 text-zinc-400 group-hover:text-zinc-300 transition-colors"
                                                        >
                                                            <CheckCircle2 className="w-4 h-4 text-emerald-500/50 shrink-0" />
                                                            <span className="text-sm font-medium">{item}</span>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Prize Distribution Section */}
                <section className="py-16 px-6 relative overflow-hidden bg-[#020202]">
                    <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
                    <div className="max-w-7xl mx-auto text-center">
                        <motion.span
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            className="text-emerald-500/80 text-[10px] font-black tracking-[0.4em] uppercase mb-6 block"
                        >
                            PRIZE DISTRIBUTION
                        </motion.span>
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            className="text-3xl md:text-5xl font-bold text-white mb-16 tracking-tight"
                            style={{ fontFamily: 'var(--font-display)' }}
                        >
                            Win Big, <span className="text-emerald-500 italic">Give Bigger</span>
                        </motion.h2>

                        <div className="grid md:grid-cols-3 gap-8 mb-16">
                            {[
                                { percent: "40%", label: "Jackpot", desc: "Match 5 Numbers", glow: "border-emerald-500/30 bg-[#0a0a0a]", highlight: "shadow-[0_0_50px_rgba(16,185,129,0.1)] border-emerald-500/40 scale-105 z-10" },
                                { percent: "35%", label: "Second Tier", desc: "Match 4 Numbers", glow: "border-white/5 bg-[#0a0a0a]", highlight: "hover:border-emerald-500/20" },
                                { percent: "25%", label: "Third Tier", desc: "Match 3 Numbers", glow: "border-white/5 bg-[#0a0a0a]", highlight: "hover:border-emerald-500/20" }
                            ].map((tier, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className={cn(
                                        "p-10 md:p-12 rounded-[2.5rem] border transition-all duration-500 group",
                                        tier.glow,
                                        tier.highlight
                                    )}
                                >
                                    <span className="text-5xl md:text-6xl font-bold text-white group-hover:text-emerald-400 mb-6 block tracking-tighter transition-all duration-500" style={{ fontFamily: 'var(--font-display)' }}>{tier.percent}</span>
                                    <h4 className="text-lg md:text-xl font-bold text-white mb-2 tracking-tight">{tier.label}</h4>
                                    <p className="text-zinc-500 text-[10px] uppercase tracking-[0.2em] font-bold">{tier.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* FAQ Section */}
                <section className="py-16 px-6 bg-black">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-16">
                            <motion.span
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                className="text-emerald-500/80 text-[10px] font-black tracking-[0.4em] uppercase mb-6 block"
                            >
                                QUESTIONS?
                            </motion.span>
                            <motion.h2
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                className="text-3xl md:text-5xl font-bold text-white tracking-tight"
                                style={{ fontFamily: 'var(--font-display)' }}
                            >
                                Frequently Asked <span className="text-emerald-500 italic">Questions</span>
                            </motion.h2>
                        </div>

                        <div className="space-y-4">
                            {FAQS.map((faq, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden group hover:border-emerald-500/20 transition-all duration-300 shadow-lg"
                                >
                                    <button
                                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                        className="w-full flex items-center justify-between p-7 text-left transition-colors"
                                    >
                                        <span className="text-base md:text-lg font-bold text-white group-hover:text-emerald-400 transition-colors tracking-tight">{faq.question}</span>
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300",
                                            openFaq === i ? "border-emerald-500 bg-emerald-500 text-black rotate-180" : "border-white/10 text-white"
                                        )}>
                                            <ChevronRight className={cn("w-4 h-4 transition-transform", openFaq === i ? "rotate-90" : "")} />
                                        </div>
                                    </button>
                                    <AnimatePresence>
                                        {openFaq === i && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="px-7 pb-8 text-zinc-400 text-sm md:text-base leading-relaxed font-medium border-t border-white/5 pt-4">
                                                    {faq.answer}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-16 px-6 bg-[#020202]">
                    <div className="max-w-4xl mx-auto bg-zinc-950 border border-white/5 p-12 md:p-16 rounded-[3rem] text-center relative overflow-hidden shadow-2xl group/cta">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none group-hover/cta:bg-emerald-500/10 transition-colors duration-700" />

                        <motion.h2
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            className="text-3xl md:text-5xl font-bold text-white mb-8 relative z-10 leading-tight tracking-tight"
                            style={{ fontFamily: 'var(--font-display)' }}
                        >
                            Ready to Make <br />a <span className="text-emerald-500 italic">Difference?</span>
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-zinc-500 text-base md:text-lg mb-10 relative z-10 max-w-xl mx-auto leading-relaxed font-medium"
                        >
                            Join the community of golfers who are playing for something bigger than the game. Your rounds have power.
                        </motion.p>
                        <Link to="/signup" className="group/btn relative inline-flex items-center gap-4 px-12 py-5 bg-emerald-500 text-black font-black uppercase text-xs tracking-[0.3em] rounded-full hover:bg-emerald-400 hover:scale-[1.05] transition-all shadow-[0_15px_40px_-10px_rgba(16,185,129,0.3)] relative z-10 overflow-hidden">
                            <span className="relative z-10 flex items-center gap-3">Join the Club <ChevronRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" /></span>
                            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
                        </Link>
                    </div>
                </section>
            </main>
        </PageTransition>
    );
}
