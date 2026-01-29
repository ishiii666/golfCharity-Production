import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navigate, Link } from 'react-router-dom';
import PageTransition from '../../components/layout/PageTransition';
import Card, { CardContent, CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useUserEntries } from '../../hooks/useData';
import { fadeUp, staggerContainer, staggerItem } from '../../utils/animations';

export default function MyWinnings() {
    const { user, isAdmin } = useAuth();
    const { entries, latestResult, isLoading: entriesLoading } = useUserEntries();

    // Redirect admins - they don't have winnings
    if (isAdmin) {
        return <Navigate to="/admin" replace />;
    }

    const winningEntries = entries.filter(e => e.gross_prize > 0);
    const totalWinnings = entries.reduce((acc, curr) => acc + (Number(curr.gross_prize) || 0), 0);
    const totalDonated = entries.reduce((acc, curr) => acc + (Number(curr.charity_amount) || 0), 0);

    // Calculate this month's winnings
    const currentMonth = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const thisMonthWinnings = entries
        .filter(e => e.draws?.month_year === currentMonth)
        .reduce((acc, curr) => acc + (Number(curr.gross_prize) || 0), 0);

    return (
        <PageTransition>
            <div className="py-8 lg:py-12">
                <div className="container-app max-w-4xl">
                    {/* Header */}
                    <motion.div
                        variants={fadeUp}
                        initial="initial"
                        animate="animate"
                        className="mb-8"
                    >
                        <h1 className="text-3xl lg:text-4xl font-bold mb-2 text-white" style={{ fontFamily: 'var(--font-display)' }}>
                            My Winnings
                        </h1>
                        <p className="text-zinc-400">
                            Track your success and your impact
                        </p>
                    </motion.div>

                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        animate="animate"
                        className="space-y-6"
                    >
                        {/* Winnings Overview */}
                        <motion.div variants={staggerItem}>
                            <Card variant="glow">
                                <CardContent className="pt-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="text-center md:text-left bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1 font-bold">Total Winnings</p>
                                            <p className="text-4xl font-black text-emerald-400 font-display">${totalWinnings.toFixed(2)}</p>
                                            <p className="text-[10px] text-zinc-500 mt-2 uppercase font-bold tracking-wider">Lifetime Gross</p>
                                        </div>
                                        <div className="text-center md:text-left bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1 font-bold">This Month</p>
                                            <p className="text-3xl font-black text-white font-display">${thisMonthWinnings.toFixed(2)}</p>
                                            <p className="text-[10px] text-zinc-500 mt-2 uppercase font-bold tracking-wider">{currentMonth} Result</p>
                                        </div>
                                        <div className="text-center md:text-left bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-4 rounded-2xl border border-amber-500/10">
                                            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1 font-bold">Total Donated</p>
                                            <p className="text-3xl font-black text-amber-400 font-display">${totalDonated.toFixed(2)}</p>
                                            <p className="text-[10px] text-zinc-500 mt-2 uppercase font-bold tracking-wider">Driven by your wins</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Recent Win History */}
                        <motion.div variants={staggerItem}>
                            <Card variant="glass">
                                <CardHeader>
                                    <h2 className="text-xl font-bold text-white">Winning History</h2>
                                </CardHeader>
                                <CardContent>
                                    {entriesLoading ? (
                                        <div className="py-12 flex justify-center">
                                            <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                                        </div>
                                    ) : winningEntries.length > 0 ? (
                                        <div className="space-y-4">
                                            {winningEntries.map((entry) => (
                                                <div
                                                    key={entry.id}
                                                    className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/30 transition-colors"
                                                >
                                                    <div className="flex flex-col md:flex-row justify-between gap-6">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3 mb-1">
                                                                <h3 className="font-bold text-white text-lg">
                                                                    {entry.draws?.month_year || 'Unknown'} Draw
                                                                </h3>
                                                                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                                                                    {entry.matches} DRAW POOL
                                                                </span>
                                                            </div>

                                                            {entry.charities && (
                                                                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
                                                                    Donated <span className="text-amber-400">${Number(entry.charity_amount).toFixed(2)}</span> to <span className="text-white">{entry.charities.name}</span>
                                                                </p>
                                                            )}

                                                            <div className="flex gap-1.5">
                                                                {entry.scores?.map((num, i) => {
                                                                    const isMatch = entry.draws?.winning_numbers?.includes(Number(num));
                                                                    return (
                                                                        <span
                                                                            key={i}
                                                                            className={`w-7 h-7 rounded-lg text-[10px] flex items-center justify-center font-black ${isMatch
                                                                                ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg'
                                                                                : 'bg-zinc-800 text-zinc-500 border border-white/5'
                                                                                }`}
                                                                        >
                                                                            {num}
                                                                        </span>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>

                                                        <div className="flex md:flex-col md:items-end justify-between items-center bg-black/20 md:bg-transparent p-3 md:p-0 rounded-xl md:text-right gap-4 md:gap-2">
                                                            <div>
                                                                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Gross Prize</p>
                                                                <p className="font-black text-emerald-400 text-xl font-display font-black tracking-tight">${Number(entry.gross_prize).toFixed(2)}</p>
                                                            </div>
                                                            <div className="md:border-t md:border-white/5 md:pt-2">
                                                                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Net Payout</p>
                                                                <p className="font-black text-white text-lg font-display font-black tracking-tight">${Number(entry.net_payout).toFixed(2)}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <h3 className="text-white font-medium">No winnings yet</h3>
                                            <p className="text-zinc-500 text-sm mt-1">Keep playing to support your charity and win!</p>
                                            <Link to="/dashboard" className="inline-block mt-4">
                                                <Button variant="outline" size="sm">Go to Dashboard</Button>
                                            </Link>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    </motion.div>
                </div>
            </div>
        </PageTransition>
    );
}

