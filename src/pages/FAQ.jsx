import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import PageTransition from '../components/layout/PageTransition';

/**
 * FAQ Page - Comprehensive frequently asked questions
 */
export default function FAQ() {
    const [openIndex, setOpenIndex] = useState(null);

    const faqs = [
        {
            category: 'Getting Started',
            questions: [
                {
                    q: 'How does GolfCharity work?',
                    a: 'GolfCharity is a unique charity lottery where your golf scores become your lucky numbers! Simply subscribe, enter your last 5 official Stableford scores, and choose a charity to support. Each month, we draw winning numbers - if your scores match, you win prizes and a portion goes directly to your chosen charity.'
                },
                {
                    q: 'What are Stableford scores and why do you use them?',
                    a: 'Stableford is a scoring system used in golf where you earn points based on your performance relative to par. We use Stableford scores (typically ranging from 0-45 per round) because they create a fair and exciting range of numbers for our charity lottery, making every round of golf you play potentially lucky!'
                },
                {
                    q: 'Do I need to be a professional golfer to participate?',
                    a: 'Absolutely not! GolfCharity is designed for golfers of all skill levels. Whether you\'re a weekend warrior or a club champion, your scores have an equal chance of matching the winning numbers. The beauty of our system is that lower and higher scores all have the same probability of winning.'
                }
            ]
        },
        {
            category: 'Subscriptions & Payments',
            questions: [
                {
                    q: 'What subscription plans are available?',
                    a: 'We offer two plans: Monthly at $11/month, perfect for trying us out, and Annual at $9/month ($108 billed yearly) which saves you 18%. Both plans include unlimited score entries, full charity selection, priority support, and entry into all monthly draws.'
                },
                {
                    q: 'Can I cancel my subscription anytime?',
                    a: 'Yes! You can cancel your subscription at any time from your account settings. You\'ll continue to have access until the end of your current billing period. We believe in earning your loyalty through value, not contracts.'
                },
                {
                    q: 'Are payments secure?',
                    a: 'Absolutely. All payments are processed through Stripe, a world-leading payment platform trusted by millions of businesses. We never store your credit card details on our servers. Your financial information is encrypted with bank-level security.'
                }
            ]
        },
        {
            category: 'The Charity Draw',
            questions: [
                {
                    q: 'How are winners selected each month?',
                    a: 'Our unique algorithm analyzes all entered scores and selects the least common score combinations as winners. This means rare, unique score patterns have better odds! The draw is conducted transparently on the last day of each month, and results are published immediately.'
                },
                {
                    q: 'What happens when I win?',
                    a: 'When you win, you\'ll receive an email notification and see your win in your dashboard. Your prize is automatically split according to your chosen donation percentage - you set this when selecting your charity. For example, if you chose 50%, half goes to your charity and half to you!'
                },
                {
                    q: 'How much can I win?',
                    a: 'Prize amounts vary based on the monthly pool and the tier you match. Matching all 5 numbers wins the jackpot, while matching 4 or 3 numbers wins smaller prizes. Check the Results page to see recent winning amounts and the current jackpot estimate.'
                }
            ]
        },
        {
            category: 'Charities & Impact',
            questions: [
                {
                    q: 'How do I choose which charity receives my donations?',
                    a: 'After subscribing, visit the "My Charity" section to browse our partner charities. Each charity profile shows their mission, impact, and total raised. Select one that resonates with you and set your donation percentage (10-100% of winnings). You can change your charity anytime.'
                },
                {
                    q: 'How do charities get the donation money?',
                    a: 'Donations are transferred directly to charities at the end of each month. We maintain complete transparency - you can track your contributions in your dashboard, and charities receive detailed reports. 100% of the donation portion goes to charity; we don\'t take any cut from donations.'
                },
                {
                    q: 'Can my golf club or company become a charity partner?',
                    a: 'We\'re always looking to expand our charity network! If you know an Australian registered charity that would be a great fit, please contact us through our Contact page. We verify all charities and ensure they meet our partnership criteria.'
                }
            ]
        },
        {
            category: 'Account & Scores',
            questions: [
                {
                    q: 'How do I enter my golf scores?',
                    a: 'Log in to your dashboard and navigate to "My Scores". Enter your 5 most recent official Stableford scores from verified rounds. Include the course name and date played. These scores become your draw numbers for that month\'s lottery.'
                },
                {
                    q: 'Do my scores need to be verified?',
                    a: 'We trust our community, but we do conduct random audits. Scores should be from official rounds at recognized golf courses. If selected for verification, you may need to provide your golf club handicap record. Falsified scores result in account termination.'
                },
                {
                    q: 'Can I update my scores after entering them?',
                    a: 'You can update your scores up until the draw deadline (last day of each month at 11:59 PM AEST). After the draw, scores are locked for that month. New scores you enter will apply to the next month\'s draw.'
                }
            ]
        }
    ];

    const toggleQuestion = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    // Flatten for index tracking
    let globalIndex = 0;

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
                            className="text-4xl lg:text-5xl font-bold mb-4"
                            style={{ color: 'var(--color-cream-100)' }}
                        >
                            Frequently Asked{' '}
                            <span style={{ color: '#10b981' }}>Questions</span>
                        </motion.h1>
                    </div>

                    {/* FAQ Categories */}
                    <div className="space-y-8">
                        {faqs.map((category, catIndex) => (
                            <motion.div
                                key={catIndex}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * catIndex }}
                            >
                                {/* Category Header */}
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                                    <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                                        style={{
                                            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                                        }}
                                    >
                                        <span className="text-white text-sm font-bold">{catIndex + 1}</span>
                                    </div>
                                    {category.category}
                                </h2>

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
                                                    className="w-full px-6 py-4 flex items-center justify-between text-left transition-colors hover:bg-white/5"
                                                >
                                                    <span className="font-medium text-white pr-4">{faq.q}</span>
                                                    <motion.div
                                                        animate={{ rotate: isOpen ? 180 : 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="flex-shrink-0"
                                                    >
                                                        <svg
                                                            className="w-5 h-5"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke={isOpen ? '#10b981' : '#71717a'}
                                                            strokeWidth={2}
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </motion.div>
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
