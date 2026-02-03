import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigate, Link } from 'react-router-dom';
import PageTransition from '../../components/layout/PageTransition';
import Card, { CardContent, CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useUserEntries, useUserStats } from '../../hooks/useData';
import { fadeUp, staggerContainer, staggerItem } from '../../utils/animations';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function MyWinnings() {
    const { user, isAdmin } = useAuth();
    const { entries, isLoading: entriesLoading } = useUserEntries();
    const { stats, isLoading: statsLoading } = useUserStats();
    const [activeTab, setActiveTab] = useState('history'); // 'history' or 'payouts'

    // Redirect admins - they don't have winnings
    if (isAdmin) {
        return <Navigate to="/admin" replace />;
    }

    const winningEntries = entries.filter(e => e.gross_prize > 0);
    const totalWinnings = stats?.totalWinnings || 0;
    const totalDonated = stats?.totalCharityImpact || 0;

    // Calculate this month's winnings
    const currentMonth = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const thisMonthWinnings = entries
        .filter(e => e.draws?.month_year === currentMonth)
        .reduce((acc, curr) => acc + (Number(curr.gross_prize) || 0), 0);

    const isLoading = entriesLoading || statsLoading;

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
                            Track your success and your community impact
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
                            <Card variant="glass" padding="p-0" className="overflow-hidden">
                                <CardContent className="p-0">
                                    <div className="grid grid-cols-2 md:grid-cols-3 divide-x divide-white/5">
                                        <div className="p-6 text-center md:text-left">
                                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 font-black">Total Winnings</p>
                                            <p className="text-3xl font-black text-emerald-400 font-display">{formatCurrency(totalWinnings)}</p>
                                            <p className="text-[9px] text-zinc-600 mt-2 uppercase font-bold tracking-wider">Lifetime Gross</p>
                                        </div>
                                        <div className="p-6 text-center md:text-left">
                                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 font-black">This Month</p>
                                            <p className="text-3xl font-black text-white font-display">{formatCurrency(thisMonthWinnings)}</p>
                                            <p className="text-[9px] text-zinc-600 mt-2 uppercase font-bold tracking-wider">{currentMonth}</p>
                                        </div>
                                        <div className="p-6 text-center md:text-left col-span-2 md:col-span-1 border-t md:border-t-0 border-white/5">
                                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 font-black">Charity Impact</p>
                                            <p className="text-3xl font-black text-amber-400 font-display">{formatCurrency(totalDonated)}</p>
                                            <p className="text-[9px] text-zinc-600 mt-2 uppercase font-bold tracking-wider">Driven by your wins</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Tabs */}
                        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl w-fit">
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-emerald-500 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                Win History
                            </button>
                            <button
                                onClick={() => setActiveTab('payouts')}
                                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'payouts' ? 'bg-emerald-500 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                Payouts & Transfers
                            </button>
                        </div>

                        {/* Tab Content */}
                        <motion.div variants={staggerItem}>
                            <AnimatePresence mode="wait">
                                {activeTab === 'history' ? (
                                    <motion.div
                                        key="history"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                    >
                                        <Card variant="glass">
                                            <CardHeader className="border-b border-white/5 pb-4">
                                                <h2 className="text-lg font-bold text-white uppercase tracking-tight">Draw Results Ledger</h2>
                                            </CardHeader>
                                            <CardContent className="pt-6">
                                                {isLoading ? (
                                                    <div className="py-12 flex justify-center">
                                                        <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                                                    </div>
                                                ) : winningEntries.length > 0 ? (
                                                    <div className="space-y-4">
                                                        {winningEntries.map((entry) => (
                                                            <div
                                                                key={entry.id}
                                                                className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/30 transition-all duration-300 group"
                                                            >
                                                                <div className="flex flex-col md:flex-row justify-between gap-6">
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-3 mb-2">
                                                                            <h3 className="font-bold text-white text-lg">
                                                                                {entry.draws?.month_year || 'Unknown'} Draw
                                                                            </h3>
                                                                            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                                                                                {entry.matches} MATCHES
                                                                            </span>
                                                                        </div>

                                                                        {entry.charities && (
                                                                            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-4">
                                                                                Impact: <span className="text-amber-400">{formatCurrency(entry.charity_amount)}</span> donated to <span className="text-white">{entry.charities.name}</span>
                                                                            </p>
                                                                        )}

                                                                        <div className="flex gap-1.5">
                                                                            {entry.scores?.map((num, i) => {
                                                                                const isMatch = entry.draws?.winning_numbers?.includes(Number(num));
                                                                                return (
                                                                                    <span
                                                                                        key={i}
                                                                                        className={`w-8 h-8 rounded-xl text-xs flex items-center justify-center font-black transition-transform group-hover:scale-110 ${isMatch
                                                                                            ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                                                                                            : 'bg-zinc-800/80 text-zinc-500 border border-white/5'
                                                                                            }`}
                                                                                    >
                                                                                        {num}
                                                                                    </span>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex md:flex-col md:items-end justify-between items-center bg-black/40 md:bg-transparent p-4 md:p-0 rounded-2xl md:text-right gap-4">
                                                                        <div className="flex flex-col md:items-end">
                                                                            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-0.5">Net Payout</p>
                                                                            <p className="font-black text-white text-2xl font-display tracking-tight">{formatCurrency(entry.net_payout)}</p>
                                                                            <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">from {formatCurrency(entry.gross_prize)} gross</p>
                                                                        </div>
                                                                        <div className="flex flex-col items-end">
                                                                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border transition-all ${entry.is_paid
                                                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                                                                                : entry.verification_status === 'verified'
                                                                                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                                                    : 'bg-zinc-800 text-zinc-500 border border-white/5'
                                                                                }`}>
                                                                                {entry.is_paid
                                                                                    ? 'Settled'
                                                                                    : entry.verification_status === 'verified'
                                                                                        ? 'Processing'
                                                                                        : (entry.verification_status || 'Pending')}
                                                                            </span>
                                                                            <p className="text-[8px] text-zinc-700 mt-1 uppercase font-bold">{entry.paid_at ? formatDate(entry.paid_at) : 'Awaiting payout'}</p>
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
                                                        <h3 className="text-white font-medium">No results recorded</h3>
                                                        <p className="text-zinc-500 text-sm mt-1">Winning results will appear here after verification.</p>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="payouts"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                    >
                                        <Card variant="glass">
                                            <CardHeader className="border-b border-white/5 pb-4">
                                                <h2 className="text-lg font-bold text-white uppercase tracking-tight">Financial Transaction Log</h2>
                                            </CardHeader>
                                            <CardContent className="pt-6">
                                                {isLoading ? (
                                                    <div className="py-12 flex justify-center">
                                                        <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                                                    </div>
                                                ) : stats?.payouts?.length > 0 ? (
                                                    <div className="overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/30">
                                                        <table className="w-full text-left text-[11px]">
                                                            <thead>
                                                                <tr className="bg-white/[0.02] text-[9px] uppercase tracking-widest text-zinc-500 font-black border-b border-white/5">
                                                                    <th className="px-6 py-4">Transaction / Type</th>
                                                                    <th className="px-6 py-4">Date</th>
                                                                    <th className="px-6 py-4 text-right">Reference</th>
                                                                    <th className="px-6 py-4 text-right">Amount</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-white/5">
                                                                {stats.payouts.map((tx) => (
                                                                    <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                                                                        <td className="px-6 py-4">
                                                                            <span className="font-black text-white block">{tx.type}</span>
                                                                            <span className={`text-[9px] uppercase font-bold ${tx.status === 'Settled' || tx.status === 'Confirmed' ? 'text-emerald-500' : 'text-zinc-500'}`}>{tx.status}</span>
                                                                        </td>
                                                                        <td className="px-6 py-4 text-zinc-400">
                                                                            {formatDate(tx.date)}
                                                                        </td>
                                                                        <td className="px-6 py-4 text-right">
                                                                            <code className="bg-white/5 px-2 py-0.5 rounded text-[9px] text-zinc-400">{tx.reference?.substring(0, 12)}...</code>
                                                                        </td>
                                                                        <td className="px-6 py-4 text-right font-black text-white">
                                                                            {formatCurrency(tx.amount)}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-12">
                                                        <p className="text-zinc-500 text-sm">No payout history found.</p>
                                                        <p className="text-[10px] text-zinc-600 mt-2 uppercase font-black tracking-widest">Funds successfully settled will appear in this ledger.</p>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </motion.div>
                </div>
            </div>
        </PageTransition >
    );
}

