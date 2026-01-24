import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { getFeaturedCharities } from '../../lib/supabaseRest';
import { supabase } from '../../lib/supabase';

/**
 * CharityCarousel - Premium auto-rotating charity showcase
 */

// Default fallback charities (shown while loading or if no data)
const defaultCharities = [
    {
        id: 1,
        name: 'Loading...',
        category: 'Charity',
        description: 'Loading charity information...',
        raised: 0,
        image: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=800&h=500&fit=crop'
    }
];

export default function CharityCarousel() {
    const [charities, setCharities] = useState(defaultCharities);
    const [activeIndex, setActiveIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    // Fetch charities from database
    useEffect(() => {
        async function fetchCharities() {
            try {
                const data = await getFeaturedCharities(4);
                if (data && data.length > 0) {
                    setCharities(data);
                }
            } catch (error) {
                console.error('Error loading charities:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchCharities();
    }, []);

    // Auto-rotate every 6 seconds
    useEffect(() => {
        if (charities.length <= 1) return;

        const interval = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % charities.length);
        }, 6000);
        return () => clearInterval(interval);
    }, [charities.length]);

    const activeCharity = charities[activeIndex] || charities[0];

    if (!activeCharity) return null;


    return (
        <section className="py-24 lg:py-32 relative overflow-hidden">
            {/* Background with active charity image */}
            <div className="absolute inset-0">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeCharity.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.15 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1 }}
                        className="absolute inset-0"
                        style={{
                            backgroundImage: `url(${activeCharity.image})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            filter: 'blur(40px) saturate(0.5)'
                        }}
                    />
                </AnimatePresence>
                <div
                    className="absolute inset-0"
                    style={{
                        background: 'linear-gradient(180deg, rgba(8, 10, 9, 0.95) 0%, rgba(8, 10, 9, 0.8) 50%, rgba(8, 10, 9, 0.95) 100%)'
                    }}
                />
            </div>

            <div className="container-app relative">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <span
                        className="text-sm font-medium uppercase tracking-widest mb-4 block"
                        style={{ color: '#c9a227' }}
                    >
                        Making a Difference
                    </span>
                    <h2
                        className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6"
                        style={{ fontFamily: 'var(--font-display)', color: '#f9f5e3' }}
                    >
                        Partner Charities
                    </h2>
                    <div className="divider-gold max-w-32 mx-auto" />
                </motion.div>

                {/* Featured Charity */}
                <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center mb-12 max-w-5xl mx-auto">
                    {/* Image */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeCharity.id}
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 30 }}
                            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            className="relative aspect-[4/3] rounded-2xl overflow-hidden"
                        >
                            <img
                                src={activeCharity.image}
                                alt={activeCharity.name}
                                className="w-full h-full object-cover"
                            />
                            <div
                                className="absolute inset-0"
                                style={{
                                    background: 'linear-gradient(180deg, transparent 50%, rgba(8, 10, 9, 0.8) 100%)'
                                }}
                            />
                            <div className="absolute bottom-4 left-4">
                                <span
                                    className="px-3 py-1 rounded-full text-xs font-medium"
                                    style={{
                                        background: 'rgba(201, 162, 39, 0.2)',
                                        color: '#c9a227',
                                        border: '1px solid rgba(201, 162, 39, 0.3)'
                                    }}
                                >
                                    {activeCharity.category}
                                </span>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Content */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeCharity.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            className="text-center lg:text-left"
                        >
                            <h3
                                className="text-3xl lg:text-4xl font-bold mb-4"
                                style={{ fontFamily: 'var(--font-display)', color: '#f9f5e3' }}
                            >
                                {activeCharity.name}
                            </h3>
                            <p
                                className="text-lg mb-6 leading-relaxed"
                                style={{ color: 'var(--color-neutral-400)' }}
                            >
                                {activeCharity.description}
                            </p>
                            <div
                                className="inline-flex items-center gap-3 p-4 rounded-xl mb-8"
                                style={{
                                    background: 'rgba(201, 162, 39, 0.1)',
                                    border: '1px solid rgba(201, 162, 39, 0.2)'
                                }}
                            >
                                <span style={{ color: 'var(--color-neutral-400)' }}>Total Raised:</span>
                                <span
                                    className="text-2xl font-bold"
                                    style={{ fontFamily: 'var(--font-display)', color: '#c9a227' }}
                                >
                                    ${activeCharity.raised.toLocaleString()}
                                </span>
                            </div>
                            <div>
                                <Link to="/charities">
                                    <Button variant="outline">
                                        View All Charities
                                    </Button>
                                </Link>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Pagination Dots */}
                <div className="flex justify-center gap-2">
                    {charities.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setActiveIndex(index)}
                            className="rounded-full magnetic transition-[width,background] duration-300"
                            style={{
                                width: index === activeIndex ? '32px' : '8px',
                                height: '8px',
                                background: index === activeIndex
                                    ? 'linear-gradient(90deg, #c9a227, #a68520)'
                                    : 'rgba(255, 255, 255, 0.2)'
                            }}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
