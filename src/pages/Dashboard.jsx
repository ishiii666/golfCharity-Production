import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, Navigate } from 'react-router-dom';
import PageTransition from '../components/layout/PageTransition';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { useScores } from '../hooks/useScores';
import { useSubscription } from '../hooks/useSubscription';
import { useCharities } from '../hooks/useData';
import { fadeUp, staggerContainer, staggerItem } from '../utils/animations';
import { getTimeUntilDraw, getNextDrawDateFormatted, DRAW_SCHEDULE_SHORT } from '../utils/drawSchedule';

export default function Dashboard() {
    const { user, isAdmin } = useAuth();
    const { scores, scoreValues, hasEnoughScores, averageScore, isLoading: scoresLoading } = useScores();
    const { subscription, isActive, daysRemaining, planLabel, isLoading: subLoading } = useSubscription();
    const { getCharityById } = useCharities();

    // Redirect admins to admin dashboard - admins cannot participate in games
    if (isAdmin) {
        return <Navigate to="/admin" replace />;
    }

    // Calculate days until next draw using centralized schedule (9th at 8PM EST)
    const { days: daysUntilDraw, hours: hoursUntilDraw } = getTimeUntilDraw();
    const nextDrawFormatted = getNextDrawDateFormatted();

    const selectedCharity = user?.selectedCharityId ? getCharityById(user.selectedCharityId) : null;

    if (scoresLoading || subLoading) {
        return (
            <PageTransition>
                <div className="min-h-screen flex items-center justify-center">
                    <div
                        className="w-12 h-12 rounded-full border-2 animate-spin"
                        style={{ borderColor: 'rgba(16, 185, 129, 0.2)', borderTopColor: '#10b981' }}
                    />
                </div>
            </PageTransition>
        );
    }

    return (
        <PageTransition>
            <div className="py-8 lg:py-12">
                <div className="container-app">
                    {/* Header */}
                    <motion.div
                        variants={fadeUp}
                        initial="initial"
                        animate="animate"
                        className="mb-8"
                    >
                        <h1
                            className="text-3xl lg:text-4xl font-bold mb-2 text-white"
                            style={{ fontFamily: 'var(--font-display)' }}
                        >
                            Welcome back, {user?.fullName?.split(' ')[0] || 'Golfer'}
                        </h1>
                        <p className="text-zinc-400">
                            Your dashboard for the noble game
                        </p>
                    </motion.div>

                    {/* Subscription Banner - Show if not subscribed */}
                    {!isActive && (
                        <motion.div
                            variants={fadeUp}
                            initial="initial"
                            animate="animate"
                            className="mb-8"
                        >
                            <div
                                className="p-6 rounded-2xl relative overflow-hidden"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05))',
                                    border: '1px solid rgba(16, 185, 129, 0.3)'
                                }}
                            >
                                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-12 h-12 rounded-full flex items-center justify-center"
                                            style={{ background: 'rgba(16, 185, 129, 0.2)' }}
                                        >
                                            <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-emerald-400">
                                                Subscribe to Unlock All Features
                                            </h3>
                                            <p className="text-sm text-zinc-400">
                                                Join our community of golfers making a difference. Enter monthly draws, track scores, and support charities.
                                            </p>
                                        </div>
                                    </div>
                                    <Link to="/pricing">
                                        <Button variant="primary" size="md">
                                            View Plans
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        animate="animate"
                        className="grid lg:grid-cols-3 gap-6"
                    >
                        {/* Draw Countdown */}
                        <motion.div variants={staggerItem}>
                            <Card variant="glow" className="text-center h-full">
                                <h3 className="text-sm uppercase tracking-wider mb-2 text-zinc-400">
                                    Next Draw
                                </h3>
                                <div
                                    className="text-4xl font-bold mb-1 text-emerald-400"
                                    style={{ fontFamily: 'var(--font-display)' }}
                                >
                                    {daysUntilDraw === 0 ? `${hoursUntilDraw}h` : daysUntilDraw}
                                </div>
                                <div className="text-zinc-500 mb-2">{daysUntilDraw === 0 ? 'hours remaining' : 'days remaining'}</div>
                                <div className="text-xs text-amber-400 font-medium">{DRAW_SCHEDULE_SHORT}</div>
                            </Card>
                        </motion.div>

                        {/* Current Scores */}
                        <motion.div variants={staggerItem}>
                            <Card variant="glass" className="h-full">
                                <h3 className="text-sm uppercase tracking-wider mb-4 text-zinc-400">
                                    Your Draw Numbers
                                </h3>
                                <div className="flex gap-2 justify-center flex-wrap">
                                    {scoreValues.length > 0 ? (
                                        scoreValues.map((score, i) => (
                                            <div
                                                key={i}
                                                className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg"
                                                style={{
                                                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%)',
                                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                                    color: '#ffffff'
                                                }}
                                            >
                                                {score}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-zinc-500">
                                            No scores entered yet
                                        </p>
                                    )}
                                </div>
                                {!hasEnoughScores && scores.length > 0 && (
                                    <p className="text-xs text-center mt-3 text-emerald-400">
                                        Add {5 - scores.length} more score{5 - scores.length > 1 ? 's' : ''} to enter the draw
                                    </p>
                                )}
                                <Link to="/scores" className="block mt-4">
                                    <Button variant="outline" size="sm" fullWidth>
                                        Update Scores
                                    </Button>
                                </Link>
                            </Card>
                        </motion.div>

                        {/* Selected Charity */}
                        <motion.div variants={staggerItem}>
                            <Card variant="glass" className="h-full">
                                <h3 className="text-sm uppercase tracking-wider mb-4 text-zinc-400">
                                    Your Charity
                                </h3>
                                {selectedCharity ? (
                                    <>
                                        <div
                                            className="font-bold text-lg mb-1 text-white"
                                            style={{ fontFamily: 'var(--font-display)' }}
                                        >
                                            {selectedCharity.name}
                                        </div>
                                        <div className="text-sm mb-3 text-zinc-400">
                                            {user?.donationPercentage}% of winnings donated
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-sm mb-3 text-zinc-500">
                                        No charity selected
                                    </p>
                                )}
                                <Link to="/charities">
                                    <Button variant="outline" size="sm">
                                        {selectedCharity ? 'Change Charity' : 'Select Charity'}
                                    </Button>
                                </Link>
                            </Card>
                        </motion.div>
                    </motion.div>

                    {/* Subscription Status */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="mt-8"
                    >
                        <Card variant="glass">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3
                                            className="font-semibold"
                                            style={{ fontFamily: 'var(--font-display)', color: '#f9f5e3' }}
                                        >
                                            Subscription
                                        </h3>
                                        <span
                                            className="px-3 py-1 rounded-full text-xs font-medium"
                                            style={{
                                                background: isActive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                color: isActive ? '#22c55e' : '#ef4444',
                                                border: `1px solid ${isActive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                                            }}
                                        >
                                            {isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    <p className="text-sm" style={{ color: 'var(--color-neutral-400)' }}>
                                        {planLabel}
                                        {daysRemaining > 0 && ` • ${daysRemaining} days remaining`}
                                    </p>
                                </div>
                                <Link to="/pricing">
                                    <Button variant="outline" size="sm">
                                        Manage Subscription
                                    </Button>
                                </Link>
                            </div>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </PageTransition>
    );
}
