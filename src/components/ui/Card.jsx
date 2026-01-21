import { motion } from 'framer-motion';

/**
 * Premium Card Component with Glassmorphism
 * 
 * Features:
 * - Multiple glassmorphism variants
 * - Optional hover lift effect
 * - Emerald/zinc dark mode aesthetic
 * - Works over textured or video backgrounds
 */

const variants = {
    default: `
    bg-white/[0.03]
    ring-1 ring-inset ring-white/5
    backdrop-blur-sm
  `,
    glass: `
    bg-white/5
    backdrop-blur-xl
    ring-1 ring-inset ring-white/10
  `,
    'glass-subtle': `
    bg-emerald-500/5
    backdrop-blur-md
    ring-1 ring-inset ring-emerald-500/10
  `,
    solid: `
    bg-zinc-900
    ring-1 ring-inset ring-white/5
  `,
    gradient: `
    bg-gradient-to-br from-emerald-500/10 to-emerald-600/5
    backdrop-blur-md
    ring-1 ring-inset ring-emerald-500/15
  `,
    glow: `
    bg-emerald-500/10
    backdrop-blur-xl
    ring-1 ring-inset ring-emerald-500/20
  `,
    emerald: `
    bg-gradient-to-br from-emerald-500/10 to-emerald-600/5
    backdrop-blur-md
    ring-1 ring-inset ring-emerald-400/20
  `
};

export default function Card({
    children,
    variant = 'glass',
    className = '',
    hoverable = false,
    padding = 'p-6',
    ...props
}) {
    const Component = hoverable ? motion.div : 'div';
    const motionProps = hoverable ? {
        whileHover: {
            y: -6,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 30px rgba(16, 185, 129, 0.1)',
            transition: { type: 'spring', stiffness: 300, damping: 25 }
        }
    } : {};

    return (
        <Component
            className={`
                ${variants[variant]}
                ${padding}
                rounded-2xl
                transition-all duration-300
                ${hoverable ? 'cursor-pointer' : ''}
                ${className}
            `}
            style={{
                willChange: hoverable ? 'transform, box-shadow' : 'auto',
                isolation: 'isolate'
            }}
            {...motionProps}
            {...props}
        >
            {children}
        </Component>
    );
}

export function CardHeader({ children, className = '' }) {
    return (
        <div className={`mb-4 ${className}`}>
            {children}
        </div>
    );
}

export function CardTitle({ children, className = '' }) {
    return (
        <h3
            className={`text-xl font-bold text-white ${className}`}
            style={{ fontFamily: 'var(--font-display)' }}
        >
            {children}
        </h3>
    );
}

export function CardDescription({ children, className = '' }) {
    return (
        <p className={`text-sm mt-1 text-zinc-400 ${className}`}>
            {children}
        </p>
    );
}

export function CardContent({ children, className = '' }) {
    return (
        <div className={className}>
            {children}
        </div>
    );
}

export function CardFooter({ children, className = '' }) {
    return (
        <div className={`mt-6 pt-4 border-t border-white/5 ${className}`}>
            {children}
        </div>
    );
}
