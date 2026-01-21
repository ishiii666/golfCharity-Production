import { useEffect, useState, useRef } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

export default function AnimatedNumber({
    value,
    duration = 1.5,
    prefix = '',
    suffix = '',
    decimals = 0,
    className = ''
}) {
    const [displayValue, setDisplayValue] = useState(0);
    const prevValue = useRef(0);

    const spring = useSpring(0, {
        stiffness: 50,
        damping: 20,
        duration: duration * 1000
    });

    useEffect(() => {
        spring.set(value);

        const unsubscribe = spring.on('change', (latest) => {
            setDisplayValue(latest);
        });

        prevValue.current = value;

        return unsubscribe;
    }, [value, spring]);

    const formattedValue = decimals > 0
        ? displayValue.toFixed(decimals)
        : Math.round(displayValue).toLocaleString();

    return (
        <motion.span
            className={className}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
            {prefix}{formattedValue}{suffix}
        </motion.span>
    );
}

export function CountUp({
    end,
    start = 0,
    duration = 2,
    delay = 0,
    prefix = '',
    suffix = '',
    className = ''
}) {
    const [count, setCount] = useState(start);
    const [hasStarted, setHasStarted] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !hasStarted) {
                    setHasStarted(true);
                }
            },
            { threshold: 0.1 }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => observer.disconnect();
    }, [hasStarted]);

    useEffect(() => {
        if (!hasStarted) return;

        const timer = setTimeout(() => {
            const startTime = Date.now();
            const endTime = startTime + duration * 1000;

            const tick = () => {
                const now = Date.now();
                const remaining = Math.max(endTime - now, 0);
                const progress = 1 - remaining / (duration * 1000);

                // Ease out cubic
                const eased = 1 - Math.pow(1 - progress, 3);
                const current = start + (end - start) * eased;

                setCount(Math.round(current));

                if (progress < 1) {
                    requestAnimationFrame(tick);
                }
            };

            tick();
        }, delay * 1000);

        return () => clearTimeout(timer);
    }, [hasStarted, start, end, duration, delay]);

    return (
        <span ref={ref} className={className}>
            {prefix}{count.toLocaleString()}{suffix}
        </span>
    );
}
