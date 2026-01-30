import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import PageTransition from '../components/layout/PageTransition';
import { getFaqs } from '../lib/supabaseRest';

/**
 * FAQ Page - Comprehensive frequently asked questions
 */
export default function FAQ() {
    const [openIndex, setOpenIndex] = useState(null);
    const [faqsData, setFaqsData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFaqs = async () => {
            try {
                const data = await getFaqs();
                if (data.length > 0) {
                    // Group by category
                    const grouped = data.reduce((acc, current) => {
                        const category = current.category || 'General';
                        if (!acc[category]) acc[category] = [];
                        acc[category].push({ q: current.question, a: current.answer });
                        return acc;
                    }, {});

                    const formatted = Object.keys(grouped).map(cat => ({
                        category: cat,
                        questions: grouped[cat]
                    }));
                    setFaqsData(formatted);
                }
            } catch (error) {
                console.error('Error fetching faqs:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchFaqs();
    }, []);

    const toggleQuestion = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    // Flatten for index tracking
    let globalIndex = 0;

    if (loading) {
        return <div className="min-h-screen py-24 text-center text-zinc-500">Loading help articles...</div>;
    }

    const displayFaqs = faqsData.length > 0 ? faqsData : [
        {
            category: 'Getting Started',
            questions: [
                {
                    q: 'How does GolfCharity work?',
                    a: 'GolfCharity is a unique charity lottery where your golf scores become your lucky numbers! Simply subscribe, enter your last 5 official Stableford scores, and choose a charity to support.'
                }
            ]
        }
    ];

    return (
        <PageTransition>
            <div className="pt-24 pb-16 lg:py-20">
                <div className="container-app max-w-4xl">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
                            style={{
                                background: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid rgba(16, 185, 129, 0.2)'
                            }}
                        >
                            <span className="text-emerald-400 text-sm font-medium">Help Center</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-4xl lg:text-7xl font-black mb-4 text-white tracking-tighter"
                            style={{ fontFamily: 'var(--font-display)' }}
                        >
                            Frequently Asked <span className="text-emerald-500 italic">Questions</span>
                        </motion.h1>
                    </div>

                    {/* FAQ Categories */}
                    <div className="space-y-12">
                        {displayFaqs.map((category, catIndex) => (
                            <motion.div
                                key={catIndex}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * catIndex }}
                            >
                                {/* Category Header */}
                                <div className="flex items-center gap-4 mb-8">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                                        style={{
                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        }}
                                    >
                                        <span className="text-white text-sm font-black">{catIndex + 1}</span>
                                    </div>
                                    <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight uppercase" style={{ fontFamily: 'var(--font-display)' }}>
                                        {category.category}
                                    </h2>
                                    <div className="h-px flex-grow bg-gradient-to-r from-emerald-500/20 to-transparent" />
                                </div>

                                {/* Questions */}
                                <div className="space-y-3">
                                    {category.questions.map((faq, qIndex) => {
                                        const currentIndex = globalIndex++;
                                        const isOpen = openIndex === currentIndex;

                                        return (
                                            <div
                                                key={qIndex}
                                                className="rounded-xl overflow-hidden"
                                                style={{
                                                    background: 'rgba(255, 255, 255, 0.02)',
                                                    border: `1px solid ${isOpen ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.05)'}`
                                                }}
                                            >
                                                {/* Question Button */}
                                                <button
                                                    onClick={() => toggleQuestion(currentIndex)}
                                                    className="w-full px-6 py-5 flex items-center justify-between text-left transition-colors hover:bg-white/5"
                                                >
                                                    <span className="text-lg font-bold text-white pr-6 leading-tight">{faq.q}</span>
                                                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-white/10 text-emerald-500'}`}>
                                                        <svg className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                                        </svg>
                                                    </div>
                                                </button>

                                                {/* Answer */}
                                                <AnimatePresence>
                                                    {isOpen && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div
                                                                className="px-6 pb-4 text-zinc-400 leading-relaxed"
                                                                style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}
                                                            >
                                                                <div className="pt-4">
                                                                    {faq.a}
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Still have questions? */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="mt-16 text-center p-8 rounded-2xl"
                        style={{
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)',
                            border: '1px solid rgba(16, 185, 129, 0.2)'
                        }}
                    >
                        <div className="text-4xl mb-4">🤔</div>
                        <h3 className="text-xl font-bold text-white mb-2">Still have questions?</h3>
                        <p className="text-zinc-400 mb-6">
                            Can't find the answer you're looking for? Our friendly team is here to help.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <Link
                                to="/contact"
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all hover:scale-105"
                                style={{
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    color: '#fff'
                                }}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                Contact Support
                            </Link>
                            <Link
                                to="/how-it-works"
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all hover:bg-white/10"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: '#fff'
                                }}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                How It Works
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </div>
        </PageTransition>
    );
}
