import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';

/**
 * CustomCursor - Premium custom cursor with magnetic effect
 * 
 * Features:
 * - Small dot that follows cursor precisely
 * - Larger ring with smooth lag
 * - Magnetic pull toward interactive elements
 * - Expands on hover of buttons/links
 * - Hidden on touch devices
 */
export default function CustomCursor() {
    const cursorRef = useRef(null);
    const ringRef = useRef(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMagnetic, setIsMagnetic] = useState(false);

    // Motion values for smooth cursor movement
    const cursorX = useMotionValue(-100);
    const cursorY = useMotionValue(-100);

    // Spring physics for the ring (delayed follow)
    const springConfig = { damping: 25, stiffness: 300, mass: 0.5 };
    const ringX = useSpring(cursorX, springConfig);
    const ringY = useSpring(cursorY, springConfig);

    useEffect(() => {
        // Check if touch device
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (isTouchDevice) return;

        setIsVisible(true);

        const moveCursor = (e) => {
            cursorX.set(e.clientX);
            cursorY.set(e.clientY);
        };

        // Track interactive elements for hover effects
        const handleMouseOver = (e) => {
            const target = e.target;

            // Check if hovering over interactive element
            const isInteractive = target.closest('button, a, [role="button"], input, textarea, select, .interactive');
            const isMagneticElement = target.closest('.magnetic');

            if (isInteractive) {
                setIsExpanded(true);
            }

            if (isMagneticElement) {
                setIsMagnetic(true);
            }
        };

        const handleMouseOut = (e) => {
            const target = e.target;
            const isInteractive = target.closest('button, a, [role="button"], input, textarea, select, .interactive');
            const isMagneticElement = target.closest('.magnetic');

            if (isInteractive) {
                setIsExpanded(false);
            }

            if (isMagneticElement) {
                setIsMagnetic(false);
            }
        };

        const handleMouseLeave = () => {
            cursorX.set(-100);
            cursorY.set(-100);
        };

        window.addEventListener('mousemove', moveCursor);
        window.addEventListener('mouseover', handleMouseOver);
        window.addEventListener('mouseout', handleMouseOut);
        document.documentElement.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            window.removeEventListener('mousemove', moveCursor);
            window.removeEventListener('mouseover', handleMouseOver);
            window.removeEventListener('mouseout', handleMouseOut);
            document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [cursorX, cursorY]);

    if (!isVisible) return null;

    return (
        <>
            {/* Cursor Dot - Follows precisely */}
            <motion.div
                ref={cursorRef}
                className="pointer-events-none fixed z-[9999] mix-blend-difference"
                style={{
                    x: cursorX,
                    y: cursorY,
                    translateX: '-50%',
                    translateY: '-50%'
                }}
            >
                <motion.div
                    animate={{
                        scale: isMagnetic ? 1.5 : isExpanded ? 0.5 : 1,
                        opacity: isExpanded ? 0.8 : 1
                    }}
                    transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                    className="w-2 h-2 rounded-full"
                    style={{
                        background: 'linear-gradient(135deg, #c9a227 0%, #fcd34d 100%)'
                    }}
                />
            </motion.div>

            {/* Cursor Ring - Smooth follow with lag */}
            <motion.div
                ref={ringRef}
                className="pointer-events-none fixed z-[9998]"
                style={{
                    x: ringX,
                    y: ringY,
                    translateX: '-50%',
                    translateY: '-50%'
                }}
            >
                <motion.div
                    animate={{
                        width: isExpanded ? 60 : 32,
                        height: isExpanded ? 60 : 32,
                        opacity: isExpanded ? 0.3 : 0.5,
                        borderColor: isExpanded ? 'rgba(249, 245, 227, 0.5)' : 'rgba(201, 162, 39, 0.4)'
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                    className="rounded-full border"
                    style={{
                        borderWidth: '1px'
                    }}
                />
            </motion.div>
        </>
    );
}
