import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from './Button';

export default function BackButton({ to, label = 'Back', className = '' }) {
    const navigate = useNavigate();

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={className}
        >
            <Button
                variant="ghost"
                size="sm"
                onClick={() => to ? navigate(to) : navigate(-1)}
                className="group flex items-center gap-2 p-0 text-slate-400 hover:text-emerald-400 transition-colors bg-transparent border-none shadow-none ring-0 hover:ring-0"
            >
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-emerald-500/10 transition-colors">
                    <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </div>
                <span className="font-bold text-sm uppercase tracking-widest">{label}</span>
            </Button>
        </motion.div>
    );
}
