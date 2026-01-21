import { forwardRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Input = forwardRef(({
    label,
    error,
    success,
    icon: Icon,
    type = 'text',
    className = '',
    helperText,
    ...props
}, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    const borderColor = error
        ? 'border-rose-500 focus:border-rose-500'
        : success
            ? 'border-emerald-500 focus:border-emerald-500'
            : 'border-white/10 focus:border-emerald-500';

    const ringColor = error
        ? 'focus:ring-rose-500/20'
        : success
            ? 'focus:ring-emerald-500/20'
            : 'focus:ring-emerald-500/20';

    return (
        <div className={`space-y-2 ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-zinc-300">
                    {label}
                </label>
            )}

            <div className="relative">
                {Icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                        <Icon className="w-5 h-5" />
                    </div>
                )}

                <input
                    ref={ref}
                    type={type}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className={`
            w-full
            ${Icon ? 'pl-12' : 'pl-4'} pr-4 py-3
            bg-zinc-900/80
            border ${borderColor}
            rounded-xl
            text-white placeholder-zinc-500
            transition-all duration-200
            focus:outline-none focus:ring-4 ${ringColor}
          `}
                    {...props}
                />

                <AnimatePresence>
                    {isFocused && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute inset-0 -z-10 rounded-xl bg-emerald-500/5 blur-xl"
                        />
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {(error || helperText) && (
                    <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`text-sm ${error ? 'text-rose-400' : 'text-zinc-500'}`}
                    >
                        {error || helperText}
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    );
});

Input.displayName = 'Input';

export default Input;

export function Select({
    label,
    error,
    options = [],
    className = '',
    ...props
}) {
    return (
        <div className={`space-y-2 ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-zinc-300">
                    {label}
                </label>
            )}

            <select
                className={`
          w-full px-4 py-3
          bg-zinc-900/80
          border ${error ? 'border-rose-500' : 'border-white/10'}
          rounded-xl
          text-white
          transition-all duration-200
          focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500
          appearance-none
          bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2371717a%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')]
          bg-[length:1.5rem] bg-[right_0.75rem_center] bg-no-repeat
        `}
                {...props}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>

            {error && (
                <p className="text-sm text-rose-400">{error}</p>
            )}
        </div>
    );
}
