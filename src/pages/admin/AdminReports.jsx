import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import PageTransition from '../../components/layout/PageTransition';
import Card, { CardContent, CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import BackButton from '../../components/ui/BackButton';
import { fadeUp, staggerContainer, staggerItem } from '../../utils/animations';
import { useAuth } from '../../context/AuthContext';
import {
    getDrawAnalysisReport,
    getCharityDonationsReport,
    getJackpotHistory,
    getSubscriptionReport,
    getMonthlyRevenue,
    getMonthlyUserGrowth,
    getReportStats,
    getSettledPlayerPayouts,
    getCharityPayouts,
    getWinnerAuditReport,
    getWinnerProfileWithBanking,
    exportToCSV
} from '../../lib/supabaseRest';

const TABS = [
    { id: 'draws', label: 'Draw Analysis', icon: '🎯' },
    { id: 'charities', label: 'Charity Donations', icon: '💚' },
    { id: 'winners', label: 'Winners Hub', icon: '🏆' },
    { id: 'subscriptions', label: 'Subscriptions', icon: '👥' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
];

export default function AdminReports() {
    const { user } = useAuth() || {};
    const [activeTab, setActiveTab] = useState('draws');
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('6m');

    // Data states
    const [stats, setStats] = useState(null);
    const [drawReports, setDrawReports] = useState([]);
    const [charityData, setCharityData] = useState([]);
    const [jackpotData, setJackpotData] = useState({ history: [], current: 0 });
    const [subscriptionData, setSubscriptionData] = useState({ active: 0, inactive: 0, eligible: 0 });
    const [revenueData, setRevenueData] = useState([]);
    const [userGrowthData, setUserGrowthData] = useState([]);
    const [payoutHistory, setPayoutHistory] = useState([]); // Direct Gift Settlements
    const [playerHistory, setPlayerHistory] = useState([]); // Player Prize & Winner-Led Charity
    const [winnersData, setWinnersData] = useState([]);     // Full Winner Audit Report

    // Fetch data on mount
    useEffect(() => {
        fetchAllData();
    }, [timeRange]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const months = timeRange === '1m' ? 1 : timeRange === '3m' ? 3 : timeRange === '6m' ? 6 : 12;

            const [statsData, draws, charities, jackpot, subs, revenue, growth, winners] = await Promise.all([
                getReportStats(),
                getDrawAnalysisReport(),
                getCharityDonationsReport(),
                getJackpotHistory(),
                getSubscriptionReport(),
                getMonthlyRevenue(months),
                getMonthlyUserGrowth(months),
                getWinnerAuditReport()
            ]);

            setStats(statsData);
            setDrawReports(draws);
            setCharityData(charities);
            setJackpotData(jackpot);
            setSubscriptionData(subs);
            setRevenueData(revenue);
            setUserGrowthData(growth);
            setWinnersData(winners);

            // Fetch payout history for real-time audit
            const [pHistory, plHistory] = await Promise.all([
                getCharityPayouts(),
                getSettledPlayerPayouts()
            ]);
            setPayoutHistory(pHistory);
            setPlayerHistory(plHistory);

            console.log('📊 Real-time report data synchronized');
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };


    const handleDownloadReceipt = async (winner) => {
        if (!winner || !winner.is_paid) return;

        try {
            // Fetch banking/profile details for the receipt
            const details = await getWinnerProfileWithBanking(winner.user_id);

            const receiptData = [{
                'Transaction Type': 'Prize Settlement',
                'Winner Name': winner.profiles?.full_name || 'Anonymous',
                'Winner Email': winner.profiles?.email || 'N/A',
                'Draw Cycle': winner.draws?.month_year || 'N/A',
                'Match Tier': winner.tier === 1 ? '5-Match Jackpot' : winner.tier === 2 ? '4-Match Pool' : '3-Match Pool',
                'Gross Prize (AUD)': parseFloat(winner.gross_prize || 0).toFixed(2),
                'Charity Donation (AUD)': parseFloat(winner.charity_amount || 0).toFixed(2),
                'Net Payout Amount (AUD)': parseFloat(winner.net_payout || 0).toFixed(2),
                'Settlement Status': 'PAID',
                'Payment Reference': winner.payout_ref || 'N/A',
                'Payment Date': winner.updated_at ? new Date(winner.updated_at).toLocaleString() : 'N/A',
                'Bank Name': details?.bank_name || 'N/A',
                'Account Holder': details?.full_name || 'N/A'
            }];

            exportToCSV(receiptData, `Receipt_${winner.profiles?.full_name.replace(' ', '_')}_${winner.draws?.month_year.replace(' ', '_')}`);
            addToast('success', 'Digital receipt downloaded');
        } catch (error) {
            console.error('Receipt download error:', error);
            addToast('error', 'Failed to generate receipt');
        }
    };

    const handleExport = (type) => {
        switch (type) {
            case 'revenue':
                exportToCSV(revenueData, 'monthly_revenue');
                break;
            case 'users':
                exportToCSV(userGrowthData, 'user_growth');
                break;
            case 'charity_winners':
                exportToCSV(charityData.map(c => ({
                    'Charity': c.name,
                    'Supporters': c.supporter_count,
                    'Winner Contribution': c.winner_donations,
                    'Total Raised': c.total_raised,
                    'Payout Status': c.payout_status,
                    'Cycle': c.next_cycle_status
                })), 'Charity_Winner_Impact');
                break;
            case 'charity_direct':
                const allGifts = [];
                charityData.forEach(c => {
                    (c.direct_gifts_detail || []).forEach(g => {
                        allGifts.push({
                            'Charity': c.name,
                            'Donor': g.donor,
                            'Amount': g.amount,
                            'Date': new Date(g.date).toLocaleDateString()
                        });
                    });
                });
                exportToCSV(allGifts, 'Charity_Direct_Gifts_Ledger');
                break;
            case 'winners':
                exportToCSV(winnersData.map(w => ({
                    'Month/Year': w.draws?.month_year || 'N/A',
                    'Winner': w.profiles?.full_name || 'Anonymous',
                    'Email': w.profiles?.email || 'N/A',
                    'Tier': `${w.tier}-Match`,
                    'Gross Prize': w.gross_prize,
                    'Charity Donation': w.charity_amount,
                    'Charity Beneficiary': w.charities?.name || 'N/A',
                    'Status': w.is_paid ? 'PAID' : w.verification_status,
                    'Payout Ref': w.payout_ref || '--'
                })), 'Winner_Audit_Report');
                break;
            default:
                console.warn('Unknown export type');
        }
    };

    const formatCurrency = (value) => `$${(Number(value) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    if (loading) {
        return (
            <PageTransition>
                <div className="py-8 lg:py-12">
                    <div className="container-app">
                        <div className="flex items-center justify-center min-h-[400px]">
                            <div className="text-center">
                                <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                                <p className="text-zinc-400 font-bold uppercase tracking-widest text-[10px]">Syncing Real-time Reports...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </PageTransition>
        );
    }

    return (
        <PageTransition>
            <div className="py-8 lg:py-12">
                <div className="container-app">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
                        <div className="mb-4 md:mb-0">
                            <BackButton to="/admin" label="Admin Dashboard" className="mb-6" />
                            <motion.div
                                variants={fadeUp}
                                initial="initial"
                                animate="animate"
                            >
                                <h1
                                    className="text-3xl lg:text-4xl font-bold mb-2"
                                    style={{ fontFamily: 'var(--font-display)', color: '#f9f5e3' }}
                                >
                                    Reports & Analytics
                                </h1>
                                <p style={{ color: 'var(--color-neutral-400)' }}>
                                    Live revenue tracking and donor metrics
                                </p>
                            </motion.div>
                        </div>
                        <div className="flex items-center gap-4">
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2 border-emerald-500/30 font-black text-[10px] uppercase tracking-widest"
                                onClick={fetchAllData}
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Refresh Sync
                            </Button>
                            <select
                                value={timeRange}
                                onChange={(e) => setTimeRange(e.target.value)}
                                className="px-4 py-2 rounded-xl text-sm font-bold"
                                style={{
                                    background: 'rgba(26, 77, 46, 0.3)',
                                    border: '1px solid rgba(201, 162, 39, 0.2)',
                                    color: '#f9f5e3'
                                }}
                            >
                                <option value="1m" style={{ background: '#0f3621' }}>Last Month</option>
                                <option value="3m" style={{ background: '#0f3621' }}>Last 3 Months</option>
                                <option value="6m" style={{ background: '#0f3621' }}>Last 6 Months</option>
                                <option value="1y" style={{ background: '#0f3621' }}>Last Year</option>
                            </select>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        animate="animate"
                        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
                    >
                        {[
                            { label: 'Total Revenue', value: formatCurrency(stats?.totalRevenue), color: '#c9a227' },
                            { label: 'Active Subscribers', value: stats?.activeSubscribers?.toLocaleString() || '0', color: '#22c55e' },
                            { label: 'Community Impact', value: formatCurrency(stats?.totalDonated), color: '#a855f7' },
                            { label: 'Direct | Prize', value: `${formatCurrency(stats?.totalDirectPaid)} | ${formatCurrency(stats?.winnerLedPending)}`, color: '#ec4899' }
                        ].map((stat) => (
                            <motion.div key={stat.label} variants={staggerItem}>
                                <Card variant="glass" padding="p-5">
                                    <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--color-neutral-500)' }}>{stat.label}</p>
                                    <p className={`text-${stat.label.includes('|') ? 'lg' : '2xl'} font-black`} style={{ color: stat.color }}>{stat.value}</p>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Tabs */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                    }`}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {/* DRAW ANALYSIS TAB */}
                        {activeTab === 'draws' && (
                            <div className="space-y-8">
                                <Card variant="glass">
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-lg font-bold" style={{ color: 'var(--color-cream-100)' }}>
                                                Draw Analysis
                                            </h2>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {drawReports.length === 0 ? (
                                            <p className="text-zinc-400 text-center py-8">No draw data yet</p>
                                        ) : (
                                            <div className="space-y-4">
                                                {drawReports.map(draw => (
                                                    <div key={draw.id} className="p-4 rounded-xl bg-zinc-800/50">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <h3 className="font-semibold text-white">{draw.month_year}</h3>
                                                            <span className={`px-2 py-1 rounded text-xs ${draw.status === 'published' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                                                                }`}>
                                                                {draw.status}
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
                                                            <div>
                                                                <p className="text-zinc-500">5-Match</p>
                                                                <p className="text-amber-400 font-semibold">{draw.tier1_winners || 0}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-zinc-500">4-Match</p>
                                                                <p className="text-violet-400 font-semibold">{draw.tier2_winners || 0}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-zinc-500">3-Match</p>
                                                                <p className="text-teal-400 font-semibold">{draw.tier3_winners || 0}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-zinc-500">Prize Pool</p>
                                                                <p className="text-green-400 font-semibold">{formatCurrency(draw.prize_pool)}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-zinc-500">To Charity</p>
                                                                <p className="text-pink-400 font-semibold">{formatCurrency(draw.total_charity)}</p>
                                                            </div>
                                                        </div>
                                                        {draw.winning_numbers && (
                                                            <div className="mt-3 flex gap-2">
                                                                {draw.winning_numbers.map((num, i) => (
                                                                    <span key={i} className="w-8 h-8 rounded-lg bg-zinc-700 flex items-center justify-center text-sm font-bold text-amber-400">
                                                                        {num}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Prize Settlement Ledger - Moved here as read-only audit */}
                                <Card variant="glass" className="mt-8">
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-lg font-bold text-white uppercase tracking-wider">Settled Prize History</h2>
                                            <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Winner Payouts</span>
                                        </div>
                                    </CardHeader>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-zinc-700/50 text-[10px] uppercase tracking-widest text-zinc-500">
                                                    <th className="px-6 py-4">Paid Date</th>
                                                    <th className="px-6 py-4">Winner</th>
                                                    <th className="px-6 py-4">Tier</th>
                                                    <th className="px-6 py-4">Draw</th>
                                                    <th className="px-6 py-4">Amount</th>
                                                    <th className="px-6 py-4">Ref</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-800/50">
                                                {playerHistory.filter(w => !w.isCharity).length === 0 ? (
                                                    <tr>
                                                        <td colSpan="6" className="px-6 py-12 text-center text-zinc-500 italic">No prize settlement records found.</td>
                                                    </tr>
                                                ) : playerHistory.filter(w => !w.isCharity).slice(0, 10).map(winner => (
                                                    <tr key={winner.id} className="hover:bg-white/5 transition-colors text-xs">
                                                        <td className="px-6 py-4 text-zinc-400">
                                                            {winner.paid_at ? new Date(winner.paid_at).toLocaleDateString() : 'N/A'}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-white">{winner.profiles?.full_name}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-[10px] text-zinc-500 uppercase tracking-tighter">
                                                                {winner.tier}-match
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-zinc-300">
                                                            {winner.draws?.month_year}
                                                        </td>
                                                        <td className="px-6 py-4 font-black text-emerald-400">
                                                            {formatCurrency(winner.net_payout)}
                                                        </td>
                                                        <td className="px-6 py-4 text-zinc-500 font-mono text-[10px]">
                                                            {winner.payment_reference || winner.payout_ref || '--'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </div>
                        )}

                        {/* CHARITY DONATIONS TAB */}
                        {activeTab === 'charities' && (
                            <div className="space-y-8">
                                {/* Section 1: Charity Winner-Led Distribution Audit */}
                                <Card variant="glass">
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h2 className="text-lg font-bold text-white uppercase tracking-wider">1. Winner-Led Distribution Audit Hub</h2>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Audit Trail of Player Prize Contributions</p>
                                                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-black border border-emerald-500/20">
                                                        TOTAL PENDING: {formatCurrency(stats?.winnerLedPending)}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Distributed Ledger</span>
                                        </div>
                                    </CardHeader>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-zinc-700/50 text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-black">
                                                    <th className="px-6 py-4">Beneficiary Charity</th>
                                                    <th className="px-6 py-4">Contribution Source</th>
                                                    <th className="px-6 py-4 text-center">Status</th>
                                                    <th className="px-6 py-4 text-right">Total Fund Amount</th>
                                                    <th className="px-6 py-4 text-right">Reference</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-800/50">
                                                {charityData.filter(c => c.winner_led_detail?.length > 0).length === 0 ? (
                                                    <tr>
                                                        <td colSpan="5" className="px-6 py-12 text-center text-zinc-500 italic">No winner-led distributions found in this report cycle.</td>
                                                    </tr>
                                                ) : charityData.filter(c => c.winner_led_detail?.length > 0).map(charity => (
                                                    charity.winner_led_detail.map((record, rIdx) => (
                                                        <tr key={`${charity.id}-${rIdx}`} className={`hover:bg-white/5 transition-colors text-xs ${record.status === 'paid' ? 'bg-emerald-500/[0.02]' : ''}`}>
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-[10px]">🏢</div>
                                                                    <span className="font-bold text-white uppercase tracking-tight">{charity.name}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">
                                                                    {record.contribution_source}
                                                                </div>
                                                                <div className="text-[9px] text-zinc-600 uppercase mt-0.5">Draw: {record.draw_name}</div>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase transition-all ${record.status === 'paid'
                                                                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                                                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                                                    }`}>
                                                                    {record.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-right font-black text-white">
                                                                {formatCurrency(record.amount)}
                                                            </td>
                                                            <td className="px-6 py-4 text-right text-zinc-500 font-mono text-[9px]">
                                                                {record.payout_ref || '--'}
                                                            </td>
                                                        </tr>
                                                    ))
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>

                                <Card variant="glass">
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h2 className="text-lg font-bold uppercase tracking-wider" style={{ color: 'var(--color-pink-100)' }}>
                                                    2. Direct Donation Comprehensive Audit
                                                </h2>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Unified Ledger of All Individual Contributions & Settlements</p>
                                                    <span className="text-[10px] px-2 py-0.5 rounded bg-pink-500/10 text-pink-500 font-black border border-pink-500/20">
                                                        TOTAL SETTLED: {formatCurrency(stats?.totalDirectPaid)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] text-pink-500 font-black uppercase tracking-[0.2em]">Source of Truth</span>
                                                <Button variant="ghost" size="sm" onClick={() => handleExport('charity_direct')} className="h-8 text-[10px] font-black uppercase border border-white/5">
                                                    Export Hub
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-12">
                                            {charityData.filter(c => c.direct_gifts_detail?.length > 0).length === 0 ? (
                                                <p className="text-zinc-500 text-center py-12 italic border border-dashed border-zinc-800 rounded-3xl">No direct gifts found in this audit cycle.</p>
                                            ) : (
                                                charityData.filter(c => c.direct_gifts_detail?.length > 0).map(charity => (
                                                    <div key={charity.id} className="space-y-4">
                                                        <div className="flex items-center justify-between px-5 bg-gradient-to-r from-zinc-900 to-black p-4 rounded-2xl border border-white/5 shadow-xl">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-xl">🎁</div>
                                                                <div>
                                                                    <h3 className="font-black text-white text-base uppercase tracking-tight">{charity.name}</h3>
                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
                                                                        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em]">Direct Gift Donor Ledger</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-[9px] text-zinc-500 uppercase font-black tracking-widest block mb-1">TOTAL DIRECT GIFTS RECEIVED</span>
                                                                <span className="text-2xl font-black text-pink-400 leading-none">{formatCurrency(charity.direct_donations)}</span>
                                                            </div>
                                                        </div>

                                                        <div className="overflow-hidden rounded-3xl border border-white/5 bg-zinc-900/20 backdrop-blur-sm">
                                                            <table className="w-full text-left text-xs">
                                                                <thead>
                                                                    <tr className="bg-white/[0.02] text-[9px] uppercase tracking-[0.25em] text-zinc-500 font-black">
                                                                        <th className="px-8 py-5">Donor / Beneficiary</th>
                                                                        <th className="px-6 py-5 text-center">Contribution Date</th>
                                                                        <th className="px-6 py-5 text-center">Payout Status</th>
                                                                        <th className="px-6 py-5 text-right">Stripe Reference</th>
                                                                        <th className="px-8 py-5 text-right">Amount</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-white/[0.03]">
                                                                    {charity.direct_gifts_detail.map((gift, idx) => (
                                                                        <tr key={idx} className="group hover:bg-white/[0.03] transition-all duration-300">
                                                                            <td className="px-8 py-5">
                                                                                <div className="flex flex-col">
                                                                                    <span className="font-black text-zinc-100 group-hover:text-white transition-colors uppercase tracking-tight">{gift.donor}</span>
                                                                                    <span className="text-[10px] text-zinc-600 font-mono mt-0.5">{gift.email || 'Portal Record'}</span>
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-6 py-5 text-center text-zinc-400 font-medium">
                                                                                {new Date(gift.date).toLocaleDateString()}
                                                                            </td>
                                                                            <td className="px-6 py-5 text-center">
                                                                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${gift.status === 'paid'
                                                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                                                                                    : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                                                    }`}>
                                                                                    {gift.status}
                                                                                </span>
                                                                            </td>
                                                                            <td className="px-6 py-5 text-right">
                                                                                <span className="font-mono text-[9px] text-zinc-600 group-hover:text-zinc-400 transition-colors">
                                                                                    {gift.payout_ref || '--'}
                                                                                </span>
                                                                            </td>
                                                                            <td className="px-8 py-5 text-right">
                                                                                <span className={`text-sm font-black transition-colors ${gift.status === 'paid' ? 'text-white' : 'text-zinc-500'}`}>
                                                                                    {formatCurrency(gift.amount)}
                                                                                </span>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Global Stats Footer */}
                                <div className="mt-8 p-6 rounded-2xl border border-zinc-800" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Total Community Impact</span>
                                            <span className="text-4xl font-black text-white mt-1">
                                                {formatCurrency(charityData?.reduce((sum, c) => sum + (c.total_raised || 0), 0) || 0)}
                                            </span>
                                        </div>
                                        <div className="text-left md:text-right">
                                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Supporters</div>
                                            <div className="text-xl font-bold text-white">
                                                {charityData?.reduce((sum, c) => sum + (c.supporter_count || 0), 0)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* WINNERS HUB TAB */}
                        {activeTab === 'winners' && (
                            <Card variant="glass">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-lg font-bold text-white uppercase tracking-wider">Comprehensive Winner Ledger</h2>
                                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mt-1">Audit trail of all prize distributions and verification statuses</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Button variant="ghost" size="sm" onClick={() => handleExport('winners')} className="h-8 text-[10px] font-black uppercase border border-white/5">
                                                Export Winner Data
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-zinc-700/50 text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-black">
                                                <th className="px-6 py-5">Winner Profile</th>
                                                <th className="px-6 py-5 text-center">Draw Period</th>
                                                <th className="px-4 py-5 text-center">Pool</th>
                                                <th className="px-4 py-5 text-right">Gross Prize</th>
                                                <th className="px-4 py-5 text-right">Charity (10%)</th>
                                                <th className="px-4 py-5 text-right">Paid (Net)</th>
                                                <th className="px-6 py-5 text-center">Status</th>
                                                <th className="px-6 py-5 text-center">Receipt</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800/50">
                                            {winnersData.length === 0 ? (
                                                <tr>
                                                    <td colSpan="7" className="px-6 py-12 text-center text-zinc-500 italic">No winner records found for this period.</td>
                                                </tr>
                                            ) : (
                                                winnersData.map((winner, idx) => (
                                                    <tr key={winner.id || idx} className="group hover:bg-white/[0.03] transition-all text-xs">
                                                        <td className="px-6 py-5">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-zinc-100 uppercase tracking-tight">{winner.profiles?.full_name || 'Anonymous'}</span>
                                                                <span className="text-[9px] text-zinc-600 font-mono mt-0.5">{winner.profiles?.email || 'System Record'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5 text-center text-zinc-400 font-bold uppercase">
                                                            {winner.draws?.month_year || 'N/A'}
                                                        </td>
                                                        <td className="px-6 py-5 text-center">
                                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${winner.tier === 1 ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                                                winner.tier === 2 ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' :
                                                                    'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                                                                }`}>
                                                                {winner.tier === 1 ? '5M Jackpot' : winner.tier === 2 ? '4M Pool' : '3M Pool'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-5 text-right font-bold text-zinc-300">
                                                            {formatCurrency(winner.gross_prize)}
                                                        </td>
                                                        <td className="px-4 py-5 text-right">
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-[10px] text-zinc-300 font-bold uppercase truncate max-w-[100px] mb-1">{winner.charities?.name || 'Charity'}</span>
                                                                <span className="text-[10px] text-rose-500 font-black">-{formatCurrency(winner.charity_amount)}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-5 text-right font-black text-emerald-400">
                                                            {formatCurrency(winner.net_payout)}
                                                        </td>
                                                        <td className="px-6 py-5 text-center">
                                                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${winner.is_paid
                                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                                                                : winner.verification_status === 'verified'
                                                                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                                    : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                                                                }`}>
                                                                {winner.is_paid ? 'PAID' : (winner.verification_status || 'PENDING')}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-5 text-center">
                                                            {winner.is_paid ? (
                                                                <button
                                                                    onClick={() => handleDownloadReceipt(winner)}
                                                                    className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/50 transition-all group/receipt"
                                                                    title="Download Digital Receipt"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                                    </svg>
                                                                </button>
                                                            ) : (
                                                                <span className="text-[10px] text-zinc-600 font-black uppercase tracking-tighter">—</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        )}

                        {activeTab === 'subscriptions' && (
                            <Card variant="glass">
                                <CardHeader>
                                    <h2 className="text-lg font-bold" style={{ color: 'var(--color-cream-100)' }}>
                                        Subscription Overview
                                    </h2>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid md:grid-cols-4 gap-4 mb-6">
                                        <div className="p-4 rounded-xl bg-emerald-500/10 text-center">
                                            <p className="text-3xl font-bold text-emerald-400">{subscriptionData.active}</p>
                                            <p className="text-sm text-zinc-400">Active</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-red-500/10 text-center">
                                            <p className="text-3xl font-bold text-red-400">{subscriptionData.inactive}</p>
                                            <p className="text-sm text-zinc-400">Inactive</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-blue-500/10 text-center">
                                            <p className="text-3xl font-bold text-blue-400">{subscriptionData.total}</p>
                                            <p className="text-sm text-zinc-400">Total</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-amber-500/10 text-center">
                                            <p className="text-3xl font-bold text-amber-400">{subscriptionData.eligible}</p>
                                            <p className="text-sm text-zinc-400">Draw Eligible</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Monthly Platform Revenue</p>
                                            <p className="text-2xl font-black text-white">{formatCurrency(subscriptionData.platformRevenue)}</p>
                                            <p className="text-[10px] text-zinc-500 mt-1 italic">$4.00 per active subscriber</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                                            <p className="text-[10px] text-emerald-500 uppercase tracking-widest mb-1">Prize Pool Contribution</p>
                                            <p className="text-2xl font-black text-emerald-400">{formatCurrency(subscriptionData.prizePoolRevenue)}</p>
                                            <p className="text-[10px] text-emerald-500/60 mt-1 italic">$5.00 per active subscriber</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* ANALYTICS TAB */}
                        {activeTab === 'analytics' && (
                            <div className="grid lg:grid-cols-2 gap-6">
                                {/* Revenue Chart */}
                                <Card variant="glass">
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-lg font-bold" style={{ color: 'var(--color-cream-100)' }}>
                                                Monthly Revenue
                                            </h2>
                                            <Button variant="ghost" size="sm" onClick={() => handleExport('revenue')}>
                                                Export CSV
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {revenueData.length === 0 ? (
                                            <p className="text-zinc-400 text-center py-8">No revenue data yet</p>
                                        ) : (
                                            <>
                                                <div className="flex items-end gap-2 h-48">
                                                    {revenueData.map((month) => {
                                                        const maxValue = Math.max(...revenueData.map(m => m.value));
                                                        return (
                                                            <div key={month.month} className="flex-1 flex flex-col items-center">
                                                                <div
                                                                    className="w-full rounded-t-lg transition-opacity hover:opacity-80"
                                                                    style={{
                                                                        height: `${maxValue > 0 ? (month.value / maxValue) * 100 : 0}%`,
                                                                        background: 'linear-gradient(180deg, #22c55e, #16a34a)',
                                                                        minHeight: '20px'
                                                                    }}
                                                                />
                                                                <p className="text-xs mt-2" style={{ color: 'var(--color-neutral-500)' }}>
                                                                    {month.month}
                                                                </p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <div className="flex justify-between mt-4 text-sm">
                                                    <span style={{ color: 'var(--color-neutral-500)' }}>
                                                        Total: {formatCurrency(revenueData.reduce((sum, m) => sum + m.value, 0))}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* User Growth Chart */}
                                <Card variant="glass">
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-lg font-bold" style={{ color: 'var(--color-cream-100)' }}>
                                                User Growth
                                            </h2>
                                            <Button variant="ghost" size="sm" onClick={() => handleExport('users')}>
                                                Export CSV
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {userGrowthData.length === 0 ? (
                                            <p className="text-zinc-400 text-center py-8">No user data yet</p>
                                        ) : (
                                            <>
                                                <div className="flex items-end gap-2 h-48">
                                                    {userGrowthData.map((month) => {
                                                        const maxValue = Math.max(...userGrowthData.map(m => m.value));
                                                        return (
                                                            <div key={month.month} className="flex-1 flex flex-col items-center">
                                                                <div
                                                                    className="w-full rounded-t-lg transition-opacity hover:opacity-80"
                                                                    style={{
                                                                        height: `${maxValue > 0 ? (month.value / maxValue) * 100 : 0}%`,
                                                                        background: 'linear-gradient(180deg, #a855f7, #7c3aed)',
                                                                        minHeight: '20px'
                                                                    }}
                                                                />
                                                                <p className="text-xs mt-2" style={{ color: 'var(--color-neutral-500)' }}>
                                                                    {month.month}
                                                                </p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <div className="flex justify-between mt-4 text-sm">
                                                    <span style={{ color: 'var(--color-neutral-500)' }}>
                                                        Total new users: {userGrowthData.reduce((sum, m) => sum + m.value, 0)}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </PageTransition>
    );
}
