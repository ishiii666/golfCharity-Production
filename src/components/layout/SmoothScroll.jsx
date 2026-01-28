import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
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
    const { pathname } = useLocation();

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
        window.lenis = lenis;

        // RAF loop
        let rafId;
        function raf(time) {
            lenis.raf(time);
            rafId = requestAnimationFrame(raf);
        }

        requestAnimationFrame(raf);

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            lenis.destroy();
            window.lenis = null;
        };
    }, []);

    // Reset scroll on pathname change (safety backup for ScrollToTop)
    useEffect(() => {
        if (lenisRef.current) {
            lenisRef.current.scrollTo(0, { immediate: true });
        }
    }, [pathname]);

    return children;
}
