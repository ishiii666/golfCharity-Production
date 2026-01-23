import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { getSiteContent } from '../../lib/supabaseRest';

// Default headlines (used while loading or if DB fails)
const defaultHeadlines = [
    { top: 'PRECISION', middle: 'MEETS', accent: 'PURPOSE.' },
    { top: 'EVERY ROUND', middle: 'MAKES A', accent: 'DIFFERENCE.' },
    { top: 'YOUR GAME', middle: 'CHANGES', accent: 'LIVES.' },
    { top: 'GOLF FOR', middle: 'A GREATER', accent: 'CAUSE.' }
];

// Charity showcase data
const charityShowcase = [
    {
        id: 1,
        name: 'Beyond Blue',
        category: 'MENTAL HEALTH',
        impact: 'YOUTH SUCCESS',
        caption: 'MENTAL WELLNESS',
        image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=600&fit=crop'
    },
    {
        id: 2,
        name: 'Cancer Council',
        category: 'HEALTH RESEARCH',
        impact: 'LIFE SAVING',
        caption: 'LIFE SAVING',
        image: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=600&h=600&fit=crop'
    },
    {
        id: 3,
        name: 'Salvation Army',
        category: 'COMMUNITY SUPPORT',
        impact: 'HOUSING HOPE',
        caption: 'COMMUNITY HOPE',
        image: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=600&h=600&fit=crop'
    },
    {
        id: 4,
        name: 'Red Cross',
        category: 'HUMANITARIAN',
        impact: 'DISASTER RELIEF',
        caption: 'HELPING HANDS',
        image: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=600&h=600&fit=crop'
    },
    {
        id: 5,
        name: 'WWF Australia',
        category: 'ENVIRONMENT',
        impact: 'WILDLIFE PROTECTION',
        caption: 'PLANET EARTH',
        image: 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=600&h=600&fit=crop'
    }
];

export default function ScrollytellingHero() {
    const [currentHeadline, setCurrentHeadline] = useState(0);
    const [currentCharity, setCurrentCharity] = useState(0);
    const [headlines, setHeadlines] = useState(defaultHeadlines);
    const [badgeText, setBadgeText] = useState('Live Impact Tracking');
    const [subtext, setSubtext] = useState('Enhance your game while changing lives. We turn your passion for golf into tangible support for those who need it most.');

    // Fetch content from database
    useEffect(() => {
        const fetchContent = async () => {
            try {
                const content = await getSiteContent();
                if (content.length > 0) {
                    // Helper to get field value
                    const getField = (name) => content.find(c => c.section_id === 'hero' && c.field_name === name)?.field_value;

                    // Update badge text
                    const badge = getField('badgeText');
                    if (badge) setBadgeText(badge);

                    // Update subtext
                    const sub = getField('subtext');
                    if (sub) setSubtext(sub);

                    // Build headlines from database
                    const newHeadlines = [];
                    for (let i = 1; i <= 4; i++) {
                        const top = getField(`headline${i}Top`);
                        const middle = getField(`headline${i}Middle`);
                        const accent = getField(`headline${i}Accent`);
                        if (top && middle && accent) {
                            newHeadlines.push({ top, middle, accent });
                        }
                    }
                    if (newHeadlines.length > 0) {
                        setHeadlines(newHeadlines);
                    }
                    console.log('🏠 Hero content loaded from database');
                }
            } catch (error) {
                console.error('Error fetching hero content:', error);
            }
        };
        fetchContent();
    }, []);

    // Auto-rotate headlines every 4 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentHeadline(prev => (prev + 1) % headlines.length);
        }, 4000);
        return () => clearInterval(interval);
    }, [headlines.length]);

    // Auto-rotate charities every 5 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentCharity(prev => (prev + 1) % charityShowcase.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const headline = headlines[currentHeadline];
    const charity = charityShowcase[currentCharity];

    return (
        <section className="relative min-h-screen overflow-hidden">
            {/* Background - Video with overlay */}
            <div className="absolute inset-0">
                <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                    className="absolute w-full h-full object-cover"
                    poster="https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=1920&q=80"
                >
                    <source
                        src="https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-golf-course-surrounded-by-trees-4826-large.mp4"
                        type="video/mp4"
                    />
                </video>

                {/* Dark overlay */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: 'linear-gradient(135deg, rgba(9, 9, 11, 0.9) 0%, rgba(9, 9, 11, 0.85) 50%, rgba(2, 2, 2, 0.8) 100%)'
                    }}
                />

                {/* Left-to-right gradient blur for content separation */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: 'linear-gradient(90deg, rgba(9, 9, 11, 0.95) 0%, rgba(9, 9, 11, 0.7) 40%, rgba(9, 9, 11, 0.3) 60%, transparent 100%)'
                    }}
                />

                {/* Subtle grid texture */}
                <div
                    className="absolute inset-0 opacity-10"
                    style={{
                        backgroundImage: `linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px)`,
                        backgroundSize: '60px 60px'
                    }}
                />
            </div>

            {/* Main Content - Split Layout */}
            <div className="relative z-10 min-h-screen flex items-center">
                <div className="container-app w-full">
                    <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center min-h-screen py-24 lg:py-0">

                        {/* LEFT SIDE - Text Content */}
                        <div className="flex flex-col gap-4 sm:gap-6 relative z-20">
                            {/* Live indicator */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="flex items-center gap-2"
                            >
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute h-full w-full rounded-full bg-green-400 opacity-75" />
                                    <span className="relative rounded-full h-2 w-2 bg-green-500" />
                                </span>
                                <span className="text-xs uppercase tracking-[0.3em] font-medium text-green-400">
                                    {badgeText}
                                </span>
                            </motion.div>

                            {/* Auto-rotating Headlines */}
                            <div className="relative h-[160px] sm:h-[180px] lg:h-[220px] pointer-events-none">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentHeadline}
                                        initial={{ opacity: 0, y: 40 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -40 }}
                                        transition={{ duration: 0.6, ease: 'easeOut' }}
                                        className="absolute inset-0 pointer-events-none"
                                    >
                                        <h1
                                            className="text-4xl sm:text-6xl lg:text-7xl font-black leading-[0.9] tracking-tight"
                                            style={{ fontFamily: 'var(--font-display)' }}
                                        >
                                            <span className="block text-white">{headline.top}</span>
                                            <span className="block text-white">{headline.middle}</span>
                                            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-300 italic">
                                                {headline.accent}
                                            </span>
                                        </h1>
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {/* Subtext */}
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="text-sm sm:text-lg max-w-md leading-relaxed text-zinc-400 italic pointer-events-none"
                            >
                                {subtext}
                            </motion.p>

                            {/* CTA Buttons - Using z-50 to ensure they are on top and clickable */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                                className="flex flex-wrap gap-4 relative z-50 pointer-events-auto"
                            >
                                <Link to="/signup" className="cursor-pointer">
                                    <button
                                        className="px-6 py-4 sm:px-10 sm:py-5 rounded-full font-bold text-black bg-white hover:bg-emerald-400 hover:scale-105 transition-all duration-300 flex items-center gap-2 group shadow-2xl cursor-pointer"
                                    >
                                        Start Now
                                        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                        </svg>
                                    </button>
                                </Link>
                                <Link to="/how-it-works" className="cursor-pointer">
                                    <button
                                        className="px-6 py-4 sm:px-10 sm:py-5 rounded-full font-bold text-white border-2 border-zinc-600 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all duration-300 cursor-pointer"
                                    >
                                        How It Works
                                    </button>
                                </Link>
                            </motion.div>
                        </div>

                        {/* RIGHT SIDE - Charity Showcase */}
                        <div className="relative flex items-center justify-center lg:justify-end">
                            {/* Decorative ring - pointer-events-none is CRITICAL here */}
                            <div
                                className="absolute w-[320px] h-[320px] sm:w-[400px] sm:h-[400px] lg:w-[480px] lg:h-[480px] rounded-full opacity-20 pointer-events-none"
                                style={{
                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                    background: 'radial-gradient(circle, transparent 60%, rgba(16, 185, 129, 0.05) 100%)'
                                }}
                            />

                            {/* Rotating charity images */}
                            <div className="relative w-[280px] h-[280px] sm:w-[340px] sm:h-[340px] lg:w-[400px] lg:h-[400px]">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={charity.id}
                                        initial={{ opacity: 0, scale: 0.9, rotate: -5 }}
                                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, rotate: 5 }}
                                        transition={{ duration: 0.8, ease: 'easeOut' }}
                                        className="absolute inset-0"
                                    >
                                        {/* Circular image container */}
                                        <div
                                            className="relative w-full h-full rounded-full overflow-hidden border-4 border-emerald-500/30 shadow-2xl"
                                            style={{
                                                boxShadow: '0 0 60px rgba(16, 185, 129, 0.2), inset 0 0 30px rgba(0,0,0,0.3)'
                                            }}
                                        >
                                            <img
                                                src={charity.image}
                                                alt={charity.name}
                                                className="w-full h-full object-cover"
                                            />
                                            {/* Gradient overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                        </div>
                                    </motion.div>
                                </AnimatePresence>

                                {/* Caption under image - styled like reference */}
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={charity.id + '-caption'}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.5, delay: 0.2 }}
                                        className="absolute -bottom-20 left-1/2 -translate-x-1/2 text-center"
                                    >
                                        <h3
                                            className="text-2xl sm:text-3xl font-bold tracking-wide text-white whitespace-nowrap"
                                            style={{ fontFamily: 'var(--font-display)' }}
                                        >
                                            {charity.caption}
                                        </h3>
                                        <div className="w-12 h-1 bg-emerald-500 mx-auto mt-3 rounded-full" />
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scroll indicator */}
            <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
            >
                <span className="text-xs uppercase tracking-widest text-zinc-500">Scroll</span>
                <div className="w-px h-8 bg-gradient-to-b from-emerald-500 to-transparent" />
            </motion.div>
        </section>
    );
}
