import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, Navigate } from 'react-router-dom';
import PageTransition from '../components/layout/PageTransition';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { useScores } from '../hooks/useScores';
import { useSubscription } from '../hooks/useSubscription';
import { useCharities, useUserEntries } from '../hooks/useData';
import { fadeUp, staggerContainer, staggerItem } from '../utils/animations';
import { getTimeUntilDraw, getNextDrawDateFormatted, DRAW_SCHEDULE_SHORT, getTimeUntilDate, getDrawDateFromMonthYear, getDrawMonthYear } from '../utils/drawSchedule';
import CharitySelectionAlert from '../components/dashboard/CharitySelectionAlert';

export default function Dashboard() {
    const { user, isAdmin, refreshProfile } = useAuth();
    const { scores, scoreValues, hasEnoughScores, averageScore, isLoading: scoresLoading } = useScores();
    const { subscription, isActive, daysRemaining, eligibilityInfo, planLabel, isLoading: subLoading } = useSubscription();
    const { getCharityById, isLoading: charitiesLoading } = useCharities();
    const { latestResult, isLoading: entriesLoading } = useUserEntries();

    console.log('📊 Dashboard Render:', {
        userId: user?.id,
        charityId: user?.selectedCharityId,
        isAdmin,
        isLoading: scoresLoading || subLoading || charitiesLoading || entriesLoading
    });

    // Redirect admins to admin dashboard - admins cannot participate in games
    if (isAdmin) {
        return <Navigate to="/admin" replace />;
    }

    // Calculate days until draw using actual cycle context
    const currentCycleMonthYear = latestResult?.draws?.month_year || getDrawMonthYear();
    const cycleTargetDate = getDrawDateFromMonthYear(currentCycleMonthYear);
    const { days: daysUntilDraw, hours: hoursUntilDraw, isPast: isDrawOverdue } = getTimeUntilDate(cycleTargetDate);

    // Fallback for formatted text
    const nextDrawFormatted = getNextDrawDateFormatted();

    const selectedCharity = user?.selectedCharityId ? getCharityById(user.selectedCharityId) : null;
    const hasLatestResult = latestResult && latestResult.draws;

    if (scoresLoading || subLoading || charitiesLoading || entriesLoading) {
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
                    {/* Charity Selection Alert */}
                    <CharitySelectionAlert user={user} refreshProfile={refreshProfile} />

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

                    {/* Suspension Banner */}
                    {user?.status === 'suspended' && (
                        <motion.div
                            variants={fadeUp}
                            initial="initial"
                            animate="animate"
                            className="mb-8"
                        >
                            <div
                                className="p-6 rounded-2xl relative overflow-hidden"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))',
                                    border: '1px solid rgba(239, 68, 68, 0.3)'
                                }}
                            >
                                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-12 h-12 rounded-full flex items-center justify-center"
                                            style={{ background: 'rgba(239, 68, 68, 0.2)' }}
                                        >
                                            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-red-500">
                                                Account Suspended
                                            </h3>
                                            <p className="text-sm text-zinc-400">
                                                Your account is currently suspended. You will not be entered into draws until your account is active. Please contact support for more information.
                                            </p>
                                        </div>
                                    </div>
                                    <Link to="/contact">
                                        <Button variant="outline" size="md">
                                            Contact Support
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Subscription Banner - Show if not subscribed and NOT suspended (to avoid double banners) */}
                    {!isActive && user?.status !== 'suspended' && (
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
                                    className={`text-4xl font-bold mb-1 ${isDrawOverdue ? 'text-amber-500' : 'text-emerald-400'}`}
                                    style={{ fontFamily: 'var(--font-display)' }}
                                >
                                    {isDrawOverdue ? 'DUE' : (daysUntilDraw === 0 ? `${hoursUntilDraw}h` : daysUntilDraw)}
                                </div>
                                <div className="text-zinc-500 mb-2">
                                    {isDrawOverdue ? 'Draw in Progress' : (daysUntilDraw === 0 ? 'hours remaining' : 'days remaining')}
                                </div>
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
                                {hasEnoughScores ? (
                                    isActive && user?.status !== 'suspended' ? (
                                        <p className="text-xs text-center mt-3 text-emerald-400">
                                            ✓ You're entered in the next draw!
                                        </p>
                                    ) : (
                                        <p className="text-xs text-center mt-3 text-amber-500">
                                            {user?.status === 'suspended' ? 'Account suspended — not entered' : 'Subscribe to enter the draw'}
                                        </p>
                                    )
                                ) : (
                                    scores.length > 0 && (
                                        <p className="text-xs text-center mt-3 text-zinc-500">
                                            Add {5 - scores.length} more score{5 - scores.length > 1 ? 's' : ''} to enter the draw
                                        </p>
                                    )
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
                                <Link to="/profile/charity">
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
                                        {subscription?.plan === 'monthly' ? ` • ${eligibilityInfo}` : (daysRemaining > 0 && ` • ${daysRemaining} days remaining`)}
                                    </p>
                                </div>
                                <Link to="/pricing">
                                    <Button
                                        variant="outline"
                                        size="md"
                                        className="relative group overflow-hidden border-emerald-500/30 hover:border-emerald-500/50 transition-all duration-300"
                                        style={{
                                            background: 'rgba(16, 185, 129, 0.05)',
                                            borderRadius: '12px',
                                            paddingLeft: '24px',
                                            paddingRight: '24px'
                                        }}
                                    >
                                        <span className="relative z-10 flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider text-xs">
                                            Manage Plan
                                            <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </span>
                                    </Button>
                                </Link>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Draw Results Block */}
                    {hasLatestResult && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="mt-8"
                        >
                            <Card variant="glow" className="overflow-hidden border-emerald-500/20">
                                <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start">
                                    {/* Result Info */}
                                    <div className="flex-1 w-full">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div
                                                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                                                style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                                            >
                                                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                                                        Latest Draw Result
                                                    </h3>
                                                    {latestResult.gross_prize > 0 && (
                                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${latestResult.is_paid ? 'bg-emerald-500/20 text-emerald-400' :
                                                            latestResult.verification_status?.toLowerCase() === 'verified' ? 'bg-amber-500/20 text-amber-500' :
                                                                'bg-zinc-800 text-zinc-500 border border-white/5'
                                                            }`}>
                                                            {latestResult.is_paid ? 'Paid' :
                                                                latestResult.verification_status?.toLowerCase() === 'verified' ? 'Processing' :
                                                                    (latestResult.verification_status || 'Pending Verification')}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-zinc-400 text-sm">
                                                    {latestResult.draws.month_year} Result • {latestResult.matches} Match{latestResult.matches !== 1 ? 'es' : ''}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
                                            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 font-bold">Total Won</p>
                                                <p className="text-2xl font-bold text-emerald-400">${latestResult.gross_prize || 0}</p>
                                            </div>
                                            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 font-bold">Charity Donation</p>
                                                <p className="text-2xl font-bold text-amber-400">${latestResult.charity_amount || 0}</p>
                                            </div>
                                            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                                                <p className="text-[10px] text-emerald-500 uppercase tracking-widest mb-1 font-bold">Net Winnings</p>
                                                <p className="text-2xl font-bold text-white">${latestResult.net_payout || 0}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Number Matching Visual */}
                                    <div className="w-full lg:w-auto flex-shrink-0 lg:border-l lg:border-white/10 lg:pl-8 flex flex-col items-center">
                                        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4 font-bold">Matching Numbers</p>
                                        <div className="flex gap-2 justify-center flex-wrap max-w-xs transition-all duration-300">
                                            {latestResult.scores.map((num, i) => {
                                                const isMatch = latestResult.draws.winning_numbers?.includes(Number(num));
                                                return (
                                                    <div
                                                        key={i}
                                                        className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg transition-all duration-500 ${isMatch
                                                            ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-110'
                                                            : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50'
                                                            }`}
                                                    >
                                                        {num}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {latestResult.gross_prize > 0 ? (
                                            <div className="mt-4 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
                                                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Winning Entry!</p>
                                            </div>
                                        ) : (
                                            <p className="mt-4 text-[10px] text-zinc-500 uppercase tracking-widest">Better luck next time</p>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    )}
                </div>
            </div>
        </PageTransition>
    );
}
