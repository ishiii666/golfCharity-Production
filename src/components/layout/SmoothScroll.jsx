import { useEffect, useRef } from 'react';
import Lenis from '@studio-freight/lenis';

/**
 * SmoothScroll Provider - Wraps the app with Lenis smooth scrolling
 * 
 * Provides buttery-smooth scroll experience essential for:
 * - Scrollytelling animations
 * - Parallax effects
 * - Premium feel
 */
export default function SmoothScroll({ children }) {
    const lenisRef = useRef(null);

    useEffect(() => {
        // Initialize Lenis
        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Exponential easing
            orientation: 'vertical',
            gestureOrientation: 'vertical',
            smoothWheel: true,
            wheelMultiplier: 1,
            touchMultiplier: 2,
            infinite: false,
        });

        lenisRef.current = lenis;

        // RAF loop
        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }

        requestAnimationFrame(raf);

        // Make lenis available globally for GSAP ScrollTrigger
        window.lenis = lenis;

        return () => {
            lenis.destroy();
            window.lenis = null;
        };
    }, []);

    return children;
}
