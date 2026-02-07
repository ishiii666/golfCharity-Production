import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { cn } from "../../utils/cn";
import { Zap } from "lucide-react";
import { useSiteContent } from "../../hooks/useSiteContent";

// Valid video source
const VIDEO_SRC = "https://assets.mixkit.co/videos/preview/mixkit-tree-branches-in-the-breeze-1198-large.mp4";

export default function ImpactMoment() {
    const { getContent, loading } = useSiteContent();
    const containerRef = useRef(null);
    const isInView = useInView(containerRef, { once: false, amount: 0.5 });
    const [animationState, setAnimationState] = useState("IDLE");
    const [isMobile, setIsMobile] = useState(false);

    // Scores for the 5 slabs (from DB)
    const SCORES = getContent('reveal', 'luckyNumbers', '36, 42, 38, 42, 39')
        .split(',')
        .map(n => n.trim())
        .filter(n => n !== '')
        .map(n => parseInt(n) || 0);

    const WINNING_INDICES = [0, 2, 4];

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    useEffect(() => {
        if (isInView) {
            setAnimationState("IDLE");
            const matchTimer = setTimeout(() => setAnimationState("MATCH"), 6000);
            const revealTimer = setTimeout(() => setAnimationState("REVEAL"), 8500);
            return () => { clearTimeout(matchTimer); clearTimeout(revealTimer); };
        } else {
            setAnimationState("IDLE");
        }
    }, [isInView]);

    const title = getContent('reveal', 'title', 'THE MOMENT OF IMPACT');
    const subtitle = getContent('reveal', 'subtitle', 'Where every swing ripples beyond the fairway. Join the community turning passion into progress.');
    const winnerInfo = {
        daysUnlocked: getContent('reveal', 'impactDays', '14'),
        impact: getContent('reveal', 'impactDesc', 'medical support for families in rural Australia')
    };

    return (
        <section ref={containerRef} className="pt-4 pb-12 lg:pt-6 lg:pb-16 relative bg-zinc-950 overflow-hidden min-h-[500px] md:min-h-[600px]">
            {/* Background */}
            <div
                className="absolute inset-0"
                style={{
                    background: 'radial-gradient(ellipse at 50% 50%, rgba(16, 185, 129, 0.05) 0%, transparent 60%)'
                }}
            />

            <motion.div
                className="container-app relative z-10"
                animate={{
                    opacity: animationState === "REVEAL" ? 0 : 1,
                    filter: animationState === "REVEAL" ? "blur(10px)" : "blur(0px)",
                    scale: animationState === "REVEAL" ? 0.95 : 1
                }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
            >
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="text-center mb-12"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={isInView ? { opacity: 1, scale: 1 } : {}}
                        transition={{ delay: 0.2, duration: 0.8 }}
                        className="inline-block px-4 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 mb-6"
                    >
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500">
                            {getContent('reveal', 'badgeText', 'The Ultimate Payoff')}
                        </span>
                    </motion.div>

                    <h2
                        className="text-4xl sm:text-5xl lg:text-7xl font-black mb-4 text-white leading-[0.9] tracking-tighter uppercase"
                        style={{ fontFamily: 'var(--font-display)' }}
                        dangerouslySetInnerHTML={{ __html: title }}
                    />
                    <motion.div
                        initial={{ width: 0 }}
                        animate={isInView ? { width: "60px" } : { width: 0 }}
                        transition={{ delay: 0.5, duration: 1 }}
                        className="h-1 bg-gradient-to-r from-emerald-500 to-transparent mx-auto mb-6"
                    />
                    <p className="text-base md:text-lg text-zinc-400 max-w-2xl mx-auto font-medium leading-relaxed">
                        {subtitle}
                    </p>
                </motion.div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6 justify-center items-center">
                    {SCORES.map((score, index) => {
                        const isWinner = WINNING_INDICES.includes(index);
                        const isCenteredMobile = index === 2;
                        return (
                            <Slab
                                key={index}
                                score={score}
                                isWinner={isWinner}
                                state={animationState}
                                index={index}
                                isMobile={isMobile}
                                className={cn(
                                    "relative aspect-[3/4] md:aspect-[4/5] w-full max-w-[200px] mx-auto",
                                    isCenteredMobile && "col-span-2 md:col-span-1"
                                )}
                            />
                        );
                    })}
                </div>
            </motion.div>

            <AnimatePresence>
                {animationState === "REVEAL" && (
                    <motion.div
                        className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none px-6"
                        initial={{ opacity: 0, scale: 0.8, filter: "blur(20px)" }}
                        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                        exit={{ opacity: 0, scale: 1.2, filter: "blur(20px)" }}
                        transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                    >
                        <div className="bg-zinc-950/90 backdrop-blur-2xl px-6 py-10 md:p-16 rounded-[2rem] md:rounded-[3rem] border border-emerald-500/20 text-center w-full max-w-[95%] md:max-w-4xl shadow-[0_0_50px_rgba(16,185,129,0.2)]">
                            <motion.span
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 1.2 }}
                                className="text-emerald-500 font-black text-[10px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.5em] mb-4 md:mb-6 block"
                            >
                                {getContent('reveal', 'impactLabel', 'Breakthrough Achieved')}
                            </motion.span>
                            <h2 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black text-white mb-6 tracking-tighter uppercase italic leading-[0.9] break-words">
                                <span dangerouslySetInnerHTML={{
                                    __html: getContent('reveal', 'impactTitle', 'WINNER & <br /><span class="text-emerald-500">BENEFACTOR</span>')
                                }} />
                            </h2>
                            <div className="h-px w-16 md:w-24 bg-emerald-500/50 mx-auto mb-6 md:mb-8" />
                            <p className="text-zinc-400 text-sm md:text-2xl font-medium leading-relaxed">
                                {getContent('reveal', 'impactPrefix', 'Your round just unlocked')} <span className="text-white font-bold">{winnerInfo.daysUnlocked} days</span> {getContent('reveal', 'impactInfix', 'of')} {winnerInfo.impact}.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section >
    );
}

function Slab({ score, isWinner, state, index, isMobile, className }) {
    const [randomDuration, setRandomDuration] = useState(2);

    useEffect(() => {
        setRandomDuration(2 + Math.random());
    }, []);

    const bobVariants = {
        idle: {
            y: [0, -10, 0],
            transition: {
                duration: randomDuration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: index * 0.1
            }
        },
        match: {
            y: 0,
            scale: isWinner ? 1.1 : 0.9,
            opacity: isWinner ? 1 : 0.5,
            borderColor: isWinner ? "#f97316" : "#27272a",
            transition: { duration: 0.5, type: "spring" }
        },
        reveal: {
            scale: 1,
            opacity: isWinner ? 1 : 0.3,
            transition: { duration: 0.3 }
        }
    };

    const shakeVariants = {
        match: isWinner ? {
            x: [-2, 2, -2, 2, 0],
            transition: { duration: 0.3, repeat: 2 }
        } : { x: 0 }
    };

    return (
        <motion.div className={className} variants={bobVariants} initial="idle" animate={state === "IDLE" ? "idle" : state === "MATCH" ? "match" : "reveal"}>
            <motion.div
                className={cn(
                    "w-full h-full rounded-xl overflow-hidden bg-black flex items-center justify-center border-4 relative perspective-1000",
                    state === "MATCH" && isWinner ? "border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.6)]" : "border-zinc-800"
                )}
                style={{ transformStyle: "preserve-3d" }}
                variants={shakeVariants}
                animate={state === "MATCH" ? "match" : ""}
                whileHover={!isMobile && state === "IDLE" ? { rotateX: 5, rotateY: 5, scale: 1.02 } : {}}
            >
                <div className="absolute inset-0 z-0">
                    <video src={VIDEO_SRC} className="w-full h-full object-cover" autoPlay muted loop playsInline preload="none" />
                </div>

                {isWinner && state === "REVEAL" ? (
                    isMobile ? <MobileReveal /> : <DesktopShatter score={score} />
                ) : (
                    <div className="absolute inset-0 bg-black z-10 flex items-center justify-center">
                        <span className="text-4xl md:text-6xl font-mono text-white font-bold tracking-tighter tabular-nums drop-shadow-md">{score}</span>
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}

function DesktopShatter({ score }) {
    return (
        <div className="absolute inset-0 z-10 w-full h-full pointer-events-none">
            {/* The Main Shatter Blocks */}
            <motion.div initial={{ x: 0, y: 0, opacity: 1 }} animate={{ x: -80, y: -80, opacity: 0, rotate: -25 }} transition={{ duration: 1, ease: "circOut" }} className="absolute top-0 left-0 w-1/2 h-1/2 bg-zinc-900 border-r border-b border-white/10 flex items-end justify-end overflow-hidden">
                <span className="absolute bottom-[-1.5rem] right-[-1rem] text-6xl font-mono text-white font-bold opacity-30">{score}</span>
            </motion.div>
            <motion.div initial={{ x: 0, y: 0, opacity: 1 }} animate={{ x: 80, y: -80, opacity: 0, rotate: 25 }} transition={{ duration: 1, ease: "circOut" }} className="absolute top-0 right-0 w-1/2 h-1/2 bg-zinc-900 border-l border-b border-white/10 flex items-end justify-start overflow-hidden">
                <span className="absolute bottom-[-1.5rem] left-[-1rem] text-6xl font-mono text-white font-bold opacity-30">{score}</span>
            </motion.div>
            <motion.div initial={{ x: 0, y: 0, opacity: 1 }} animate={{ x: -80, y: 80, opacity: 0, rotate: -15 }} transition={{ duration: 1, ease: "circOut" }} className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-zinc-900 border-r border-t border-white/10 flex items-start justify-end overflow-hidden">
                <span className="absolute top-[-1.5rem] right-[-1rem] text-6xl font-mono text-white font-bold opacity-30">{score}</span>
            </motion.div>
            <motion.div initial={{ x: 0, y: 0, opacity: 1 }} animate={{ x: 80, y: 80, opacity: 0, rotate: 15 }} transition={{ duration: 1, ease: "circOut" }} className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-zinc-900 border-l border-t border-white/10 flex items-start justify-start overflow-hidden">
                <span className="absolute top-[-1.5rem] left-[-1rem] text-6xl font-mono text-white font-bold opacity-30">{score}</span>
            </motion.div>

            {/* Random Glass Particles */}
            {[...Array(12)].map((_, i) => (
                <motion.div
                    key={i}
                    initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                    animate={{
                        x: (Math.random() - 0.5) * 300,
                        y: (Math.random() - 0.5) * 300,
                        scale: Math.random() * 1.5,
                        opacity: 0,
                        rotate: Math.random() * 360
                    }}
                    transition={{ duration: 0.8 + Math.random() * 0.5, ease: "easeOut" }}
                    className="absolute top-1/2 left-1/2 w-4 h-4 bg-emerald-500/40 backdrop-blur-sm border border-white/20"
                    style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }}
                />
            ))}
        </div>
    );
}

function MobileReveal() {
    return (
        <motion.div
            className="absolute inset-0 bg-zinc-900 z-10 flex items-center justify-center border-4 border-emerald-500"
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 1, ease: "circOut" }}
        >
            <Zap className="w-12 h-12 text-emerald-400 animate-pulse" />
        </motion.div>
    );
}
