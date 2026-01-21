import { motion } from 'framer-motion';

/**
 * Premium Button Component
 * 
 * Features:
 * - Emerald gradient with glow effects
 * - Shimmer effect on hover
 * - Magnetic class support for cursor
 * - Multiple variants: primary, secondary, accent, outline, ghost
 */

const variants = {
  primary: `
    bg-gradient-to-r from-emerald-600 to-emerald-700
    hover:from-emerald-500 hover:to-emerald-600
    text-white
    border border-emerald-500/20
    hover:border-emerald-400/40
    shadow-lg shadow-emerald-500/20
    hover:shadow-emerald-500/40
  `,
  secondary: `
    bg-white/5
    backdrop-blur-md
    hover:bg-white/10
    text-white
    ring-1 ring-inset ring-white/10
    hover:ring-white/20
  `,
  accent: `
    bg-gradient-to-r from-amber-500 to-amber-600
    hover:from-amber-400 hover:to-amber-500
    text-zinc-900
    shadow-lg shadow-amber-500/30
  `,
  outline: `
    bg-transparent
    border-2 border-emerald-500
    text-emerald-400
    hover:bg-emerald-500/10
    hover:border-emerald-400
  `,
  ghost: `
    bg-transparent
    hover:bg-white/5
    text-zinc-300
    hover:text-white
  `,
  danger: `
    bg-gradient-to-r from-rose-600 to-rose-700
    hover:from-rose-500 hover:to-rose-600
    text-white
    shadow-lg shadow-rose-500/20
  `
};

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
  xl: 'px-12 py-5 text-xl'
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  ...props
}) {
  return (
    <motion.button
      whileHover={!disabled ? {
        scale: 1.02,
        y: -2,
        transition: { type: 'spring', stiffness: 400, damping: 25 }
      } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      disabled={disabled || loading}
      className={`
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        relative overflow-hidden
        inline-flex items-center justify-center gap-2
        font-semibold rounded-xl
        transition-all duration-300 ease-out
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-zinc-950
        magnetic
        ${className}
      `}
      {...props}
    >
      {/* Shimmer effect overlay - hidden to prevent visual artifacts */}
      <span
        className="absolute inset-0 pointer-events-none opacity-0"
        aria-hidden="true"
      />

      {loading && (
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {!loading && Icon && iconPosition === 'left' && <Icon className="w-5 h-5" />}
      <span className="relative z-10">{children}</span>
      {!loading && Icon && iconPosition === 'right' && <Icon className="w-5 h-5" />}
    </motion.button>
  );
}
