import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { useSiteContent } from '../../hooks/useSiteContent';

/**
 * LuckyNumbersReveal - Animated lucky numbers reveal section
 * Shows 5 cards with winning numbers that reveal one by one,
 * then displays the Winner & Benefactor announcement
 */

export default function LuckyNumbersReveal() {
    const { getContent } = useSiteContent();
    const containerRef = useRef(null);
    const isInView = useInView(containerRef, { once: true, margin: '-100px' });
    const [revealedCards, setRevealedCards] = useState([]);
    const [showWinner, setShowWinner] = useState(false);

    // Sample lucky numbers (these come from DB)
    const luckyNumbers = getContent('reveal', 'luckyNumbers', '36, 42, 38, 42, 39')
        .split(',')
        .map(n => n.trim())
        .filter(n => n !== '');

    // Winner info (from DB)
    const winnerInfo = {
        daysUnlocked: getContent('reveal', 'impactDays', '14'),
        impact: getContent('reveal', 'impactDesc', 'medical support for families in rural Australia')
    };

    // Reveal cards one by one when in view
    useEffect(() => {
        if (!isInView) return;

        const revealSequence = async () => {
            for (let i = 0; i < luckyNumbers.length; i++) {
                await new Promise(resolve => setTimeout(resolve, 400));
                setRevealedCards(prev => [...prev, i]);
            }
            // Show winner after all cards revealed
            await new Promise(resolve => setTimeout(resolve, 800));
            setShowWinner(true);
        };

        revealSequence();
    }, [isInView, luckyNumbers.length]);

    return (
        <section ref={containerRef} className="py-20 lg:py-28 relative overflow-hidden">
            {/* Background */}
            <div
                className="absolute inset-0"
                style={{
                    background: 'radial-gradient(ellipse at 50% 50%, rgba(16, 185, 129, 0.05) 0%, transparent 60%)'
                }}
            />

            <div className="container-app relative">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-12"
                >
                    <h2
                        className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 text-white"
                        style={{ fontFamily: 'var(--font-display)' }}
                    >
                        {getContent('reveal', 'title', 'THE MOMENT OF IMPACT')}
                    </h2>
                    <p className="text-lg text-zinc-400">
                        {getContent('reveal', 'subtitle', 'Every round has the power to change a story.')}
                    </p>
                </motion.div>

                {/* Lucky Number Cards */}
                <div className="flex justify-center gap-4 lg:gap-6 mb-12 flex-wrap">
                    {luckyNumbers.map((number, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.8, rotateY: 180 }}
                            animate={revealedCards.includes(index) ? {
                                opacity: 1,
                                scale: 1,
                                rotateY: 0
                            } : {}}
                            transition={{
                                duration: 0.6,
                                ease: [0.16, 1, 0.3, 1]
                            }}
                            className="relative"
                        >
                            <div
                                className="w-32 h-44 sm:w-40 sm:h-52 lg:w-48 lg:h-64 rounded-2xl flex items-center justify-center"
                                style={{
                                    background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)',
                                    border: '2px solid rgba(16, 185, 129, 0.4)',
                                    boxShadow: revealedCards.includes(index)
                                        ? '0 0 30px rgba(16, 185, 129, 0.3), inset 0 0 20px rgba(16, 185, 129, 0.1)'
                                        : 'none'
                                }}
                            >
                                <AnimatePresence>
                                    {revealedCards.includes(index) && (
                                        <motion.span
                                            initial={{ opacity: 0, scale: 0.5 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ duration: 0.3, delay: 0.2 }}
                                            className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white"
                                            style={{ fontFamily: 'var(--font-display)' }}
                                        >
                                            {number}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Winner & Benefactor Announcement */}
                <AnimatePresence>
                    {showWinner && (
                        <motion.div
                            initial={{ opacity: 0, y: 40, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                            className="text-center"
                        >
                            {/* Label */}
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="text-sm tracking-[0.3em] uppercase mb-4 block"
                                style={{ color: '#c9a227' }}
                            >
                                {getContent('reveal', 'impactLabel', 'BREAKTHROUGH ACHIEVED')}
                            </motion.span>

                            {/* Winner Title */}
                            <motion.h3
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3, duration: 0.5 }}
                                className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6"
                                style={{ fontFamily: 'var(--font-display)' }}
                            >
                                <span dangerouslySetInnerHTML={{
                                    __html: getContent('reveal', 'impactTitle', 'WINNER & <span class="text-gradient-emerald">BENEFACTOR</span>')
                                }} />
                            </motion.h3>

                            {/* Impact Message */}
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="text-lg text-zinc-400 max-w-xl mx-auto"
                            >
                                {getContent('reveal', 'impactPrefix', 'Your round just unlocked')}{' '}
                                <span className="font-bold text-white">{winnerInfo.daysUnlocked} days</span>
                                {' '} {getContent('reveal', 'impactInfix', 'of')} {winnerInfo.impact}.
                            </motion.p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </section>
    );
}
