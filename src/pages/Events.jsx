import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import PageTransition from '../components/layout/PageTransition';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

/**
 * Charity Events Page - Coming Soon
 * Ready for real events data when table is added to database
 */
export default function Events() {
    const [email, setEmail] = useState('');
    const [subscribed, setSubscribed] = useState(false);

    const handleSubscribe = (e) => {
        e.preventDefault();
        // TODO: Save email to database when events are implemented
        setSubscribed(true);
        setEmail('');
    };

    return (
        <PageTransition>
            <div className="pt-24 pb-16 lg:py-20">
                <div className="container-app">
                    {/* Header */}
                    <div className="text-center mb-16">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
                            style={{
                                background: 'rgba(201, 162, 39, 0.1)',
                                border: '1px solid rgba(201, 162, 39, 0.2)'
                            }}
                        >
                            <span style={{ color: '#c9a227' }} className="text-sm font-medium">Coming Soon</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-4xl lg:text-5xl font-bold mb-4"
                            style={{ color: 'var(--color-cream-100)' }}
                        >
                            Charity{' '}
                            <span style={{ color: '#10b981' }}>Events</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-lg max-w-2xl mx-auto"
                            style={{ color: 'var(--color-neutral-400)' }}
                        >
                            Exciting charity golf events are coming soon. Be the first to know!
                        </motion.p>
                    </div>

                    {/* Coming Soon Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="max-w-2xl mx-auto"
                    >
                        <div
                            className="p-8 lg:p-12 rounded-2xl text-center"
                            style={{
                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)',
                                border: '1px solid rgba(16, 185, 129, 0.2)'
                            }}
                        >
                            {/* Golf Event Icon */}
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.2)' }}>
                                <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>

                            <h2 className="text-2xl font-bold text-white mb-4">
                                Charity Golf Tournaments
                            </h2>

                            <p className="text-zinc-400 mb-8 max-w-md mx-auto">
                                We're planning exclusive charity golf events where you can play, connect with fellow golfers, and raise funds for great causes.
                            </p>

                            {/* What to Expect */}
                            <div className="grid sm:grid-cols-3 gap-4 mb-8">
                                {[
                                    { icon: '🏌️', label: 'Tournament Days' },
                                    { icon: '🏆', label: 'Prizes & Awards' },
                                    { icon: '💚', label: 'Charity Auctions' }
                                ].map((item, index) => (
                                    <div
                                        key={index}
                                        className="p-4 rounded-xl"
                                        style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                                    >
                                        <div className="text-3xl mb-2">{item.icon}</div>
                                        <div className="text-sm text-zinc-300">{item.label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Email Subscription */}
                            {subscribed ? (
                                <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                                    <p className="text-emerald-400 flex items-center justify-center gap-2">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Thanks! We'll notify you when events are announced.
                                    </p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                                    <Input
                                        type="email"
                                        placeholder="Enter your email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="flex-1"
                                    />
                                    <Button type="submit" variant="primary">
                                        Notify Me
                                    </Button>
                                </form>
                            )}
                        </div>
                    </motion.div>

                    {/* Alternative Actions */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="mt-12 text-center"
                    >
                        <p className="text-zinc-400 mb-4">In the meantime, explore other ways to contribute:</p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <Link to="/charities">
                                <Button variant="outline">Browse Charities</Button>
                            </Link>
                            <Link to="/donate">
                                <Button variant="ghost">Make a Donation</Button>
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </div>
        </PageTransition>
    );
}
