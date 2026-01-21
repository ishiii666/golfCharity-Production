import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * EntryAnimation - Cinematic Entry Loading Screen
 * 
 * A majestic, heavy loading animation that plays once when the app loads.
 * Uses a 5-phase state machine: line → drop → impact → logo → exit
 * 
 * Visual Style: Minimalist Luxury (Deep Black, White, Emerald Green)
 */

// Animation phases
const PHASES = {
    LINE: 'line',
    DROP: 'drop',
    IMPACT: 'impact',
    LOGO: 'logo',
    EXIT: 'exit',
    COMPLETE: 'complete'
};

// Timing constants (in milliseconds) - ~3.5 second total
const TIMING = {
    LINE_DURATION: 200,      // 0s - 0.2s (instant start)
    DROP_DURATION: 1500,     // 0.2s - 1.7s (faster drop)
    IMPACT_DURATION: 150,    // 1.7s - 1.85s
    LOGO_DURATION: 1200,     // 1.85s - 3.05s
    EXIT_DURATION: 400,      // Fade out duration
    TOTAL: 3050              // Total animation time
};

// Custom easing for heavy, gravity-defying drop
const heavyDropEasing = [0.45, 0, 0.55, 1];
const circOut = [0, 0.55, 0.45, 1];

export default function EntryAnimation({ onComplete }) {
    const [phase, setPhase] = useState(PHASES.LINE);
    const [isVisible, setIsVisible] = useState(true);

    // Phase state machine
    useEffect(() => {
        const timers = [];

        // Phase 2: Drop starts after line completes
        timers.push(setTimeout(() => {
            setPhase(PHASES.DROP);
        }, TIMING.LINE_DURATION));

        // Phase 3: Impact when ball reaches center
        timers.push(setTimeout(() => {
            setPhase(PHASES.IMPACT);
        }, TIMING.LINE_DURATION + TIMING.DROP_DURATION));

        // Phase 4: Logo reveal after impact
        timers.push(setTimeout(() => {
            setPhase(PHASES.LOGO);
        }, TIMING.LINE_DURATION + TIMING.DROP_DURATION + TIMING.IMPACT_DURATION));

        // Phase 5: Exit
        timers.push(setTimeout(() => {
            setPhase(PHASES.EXIT);
        }, TIMING.TOTAL));

        // Complete - remove from DOM
        timers.push(setTimeout(() => {
            setIsVisible(false);
            setPhase(PHASES.COMPLETE);
            onComplete?.();
        }, TIMING.TOTAL + TIMING.EXIT_DURATION));

        return () => timers.forEach(clearTimeout);
    }, [onComplete]);

    // Variants for the vertical gradient line
    const lineVariants = {
        initial: { scaleY: 0, opacity: 0 },
        animate: {
            scaleY: 1,
            opacity: 1,
            transition: {
                duration: 0.2,
                ease: circOut
            }
        },
        exit: {
            opacity: 0,
            transition: { duration: 0.15 }
        }
    };

    // Variants for the dropping ball
    const ballVariants = {
        initial: {
            y: '-100vh',
            scale: 1,
            opacity: 1
        },
        drop: {
            y: 0,
            transition: {
                duration: 1.5,
                ease: heavyDropEasing
            }
        },
        impact: {
            scale: [1, 1.2, 1],
            transition: {
                duration: 0.15,
                times: [0, 0.5, 1]
            }
        },
        dissolve: {
            scale: 12,
            opacity: 0,
            transition: {
                duration: 0.4,
                ease: 'easeOut'
            }
        }
    };

    // Variants for shockwave rings
    const shockwaveVariants = {
        initial: {
            scale: 0,
            opacity: 0.8
        },
        animate: {
            scale: 18,
            opacity: 0,
            transition: {
                duration: 0.75,
                ease: 'easeOut'
            }
        }
    };

    // Variants for logo container
    const logoVariants = {
        initial: { opacity: 0, y: 20 },
        animate: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.4,
                ease: 'easeOut'
            }
        }
    };

    // Variants for the horizontal divider
    const dividerVariants = {
        initial: { scaleX: 0 },
        animate: {
            scaleX: 1,
            transition: {
                duration: 0.3,
                delay: 0.15,
                ease: circOut
            }
        }
    };

    // Variants for subtitle
    const subtitleVariants = {
        initial: { opacity: 0, y: 10 },
        animate: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.3,
                delay: 0.3,
                ease: 'easeOut'
            }
        }
    };

    // Exit animation for entire overlay
    const overlayVariants = {
        visible: { opacity: 1 },
        exit: {
            opacity: 0,
            transition: {
                duration: 0.5,
                ease: 'easeInOut'
            }
        }
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: '#020202', pointerEvents: phase === PHASES.EXIT ? 'none' : 'auto' }}
                    variants={overlayVariants}
                    initial="visible"
                    animate={phase === PHASES.EXIT ? 'exit' : 'visible'}
                    exit="exit"
                >
                    {/* Phase 1: Vertical Gradient Line */}
                    <AnimatePresence>
                        {(phase === PHASES.LINE || phase === PHASES.DROP) && (
                            <motion.div
                                className="absolute h-[60vh] w-[0.5px]"
                                style={{
                                    background: 'linear-gradient(to bottom, transparent, rgba(16, 185, 129, 0.3), transparent)',
                                    transformOrigin: 'center'
                                }}
                                variants={lineVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                            />
                        )}
                    </AnimatePresence>

                    {/* Phase 2 & 3: The Dropping Ball */}
                    <AnimatePresence>
                        {(phase === PHASES.DROP || phase === PHASES.IMPACT || phase === PHASES.LOGO) && (
                            <motion.div
                                className="absolute rounded-full bg-white"
                                style={{
                                    width: '1.25rem',
                                    height: '1.25rem',
                                    boxShadow: '0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px rgba(255, 255, 255, 0.4)'
                                }}
                                variants={ballVariants}
                                initial="initial"
                                animate={
                                    phase === PHASES.DROP ? 'drop' :
                                        phase === PHASES.IMPACT ? 'impact' :
                                            phase === PHASES.LOGO ? 'dissolve' : 'initial'
                                }
                            />
                        )}
                    </AnimatePresence>

                    {/* Phase 3: Shockwave Rings */}
                    <AnimatePresence>
                        {(phase === PHASES.IMPACT || phase === PHASES.LOGO) && (
                            <>
                                {/* First shockwave */}
                                <motion.div
                                    className="absolute rounded-full border-2"
                                    style={{
                                        width: '2rem',
                                        height: '2rem',
                                        borderColor: 'rgba(16, 185, 129, 0.6)'
                                    }}
                                    variants={shockwaveVariants}
                                    initial="initial"
                                    animate="animate"
                                />
                                {/* Second shockwave (delayed) */}
                                <motion.div
                                    className="absolute rounded-full border"
                                    style={{
                                        width: '2rem',
                                        height: '2rem',
                                        borderColor: 'rgba(16, 185, 129, 0.4)'
                                    }}
                                    initial={{ scale: 0, opacity: 0.6 }}
                                    animate={{
                                        scale: 18,
                                        opacity: 0,
                                        transition: {
                                            duration: 0.9,
                                            delay: 0.08,
                                            ease: 'easeOut'
                                        }
                                    }}
                                />
                            </>
                        )}
                    </AnimatePresence>

                    {/* Phase 4: Logo and Title Reveal */}
                    <AnimatePresence>
                        {(phase === PHASES.LOGO || phase === PHASES.EXIT) && (
                            <motion.div
                                className="absolute flex flex-col items-center"
                                variants={logoVariants}
                                initial="initial"
                                animate="animate"
                            >
                                {/* Logo image */}
                                <motion.div
                                    className="mb-4"
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{
                                        scale: 1,
                                        rotate: 0,
                                        transition: { duration: 0.3, ease: 'easeOut' }
                                    }}
                                >
                                    <div
                                        className="w-16 h-16 rounded-full overflow-hidden"
                                        style={{
                                            boxShadow: '0 0 30px rgba(16, 185, 129, 0.5)'
                                        }}
                                    >
                                        <img
                                            src="/logo.png"
                                            alt="GolfCharity Logo"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </motion.div>

                                {/* Main Title */}
                                <motion.h1
                                    className="text-4xl md:text-5xl font-bold tracking-wider"
                                    style={{
                                        color: 'white',
                                        textShadow: '0 0 20px rgba(255, 255, 255, 0.3)'
                                    }}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{
                                        opacity: 1,
                                        y: 0,
                                        transition: { duration: 0.3, delay: 0.1 }
                                    }}
                                >
                                    GOLF<span style={{ color: '#10b981' }}>CHARITY</span>
                                </motion.h1>

                                {/* Horizontal Divider */}
                                <motion.div
                                    className="mt-4 h-[1px] w-48"
                                    style={{
                                        background: 'linear-gradient(to right, transparent, #10b981, transparent)',
                                        transformOrigin: 'center'
                                    }}
                                    variants={dividerVariants}
                                    initial="initial"
                                    animate="animate"
                                />

                                {/* Subtitle */}
                                <motion.p
                                    className="mt-4 text-sm tracking-[0.3em] uppercase"
                                    style={{ color: 'rgba(255, 255, 255, 0.6)' }}
                                    variants={subtitleVariants}
                                    initial="initial"
                                    animate="animate"
                                >
                                    Play • Give • Win
                                </motion.p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
