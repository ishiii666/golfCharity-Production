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
    getWinnersForVerification,
    updateWinnerVerification,
    getSubscriptionReport,
    getMonthlyRevenue,
    getMonthlyUserGrowth,
    getReportStats,
    getSettledPlayerPayouts,
    getCharityPayouts,
    exportToCSV
} from '../../lib/supabaseRest';

const TABS = [
    { id: 'draws', label: 'Draw Analysis', icon: '🎯' },
    { id: 'charities', label: 'Charity Donations', icon: '💚' },
    { id: 'winners', label: 'Winner Verification', icon: '🏆' },
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
    const [winners, setWinners] = useState([]);
    const [subscriptionData, setSubscriptionData] = useState({ active: 0, inactive: 0, eligible: 0 });
    const [revenueData, setRevenueData] = useState([]);
    const [userGrowthData, setUserGrowthData] = useState([]);
    const [payoutHistory, setPayoutHistory] = useState([]); // Direct Gift Settlements
    const [playerHistory, setPlayerHistory] = useState([]); // Player Prize & Winner-Led Charity

    // Fetch data on mount
    useEffect(() => {
        fetchAllData();
    }, [timeRange]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const months = timeRange === '1m' ? 1 : timeRange === '3m' ? 3 : timeRange === '6m' ? 6 : 12;

            const [statsData, draws, charities, jackpot, winnersData, subs, revenue, growth] = await Promise.all([
                getReportStats(),
                getDrawAnalysisReport(),
                getCharityDonationsReport(),
                getJackpotHistory(),
                getWinnersForVerification(),
                getSubscriptionReport(),
                getMonthlyRevenue(months),
                getMonthlyUserGrowth(months)
            ]);

            setStats(statsData);
            setDrawReports(draws);
            setCharityData(charities);
            setJackpotData(jackpot);
            setWinners(winnersData);
            setSubscriptionData(subs);
            setRevenueData(revenue);
            setUserGrowthData(growth);

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

    const handleVerifyWinner = async (entryId, status) => {
        const result = await updateWinnerVerification(entryId, status, user?.id);
        if (result.success) {
            setWinners(prev => prev.map(w =>
                w.id === entryId ? { ...w, verification_status: status } : w
            ));
            // Refresh stats since verification might affect donations
            fetchAllData();
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
                exportToCSV(winners.map(w => ({
                    draw: w.draws?.month_year,
                    user: w.profiles?.full_name || 'Unknown',
                    tier: w.tier,
                    gross_prize: w.gross_prize,
                    charity_amount: w.charity_amount,
                    net_payout: w.net_payout,
                    status: w.verification_status
                })), 'winners');
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
                            { label: 'Total Donated', value: formatCurrency(stats?.totalDonated), color: '#a855f7' },
                            { label: 'Current Jackpot', value: formatCurrency(jackpotData.current), color: '#f59e0b' }
                        ].map((stat) => (
                            <motion.div key={stat.label} variants={staggerItem}>
                                <Card variant="glass" padding="p-5">
                                    <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--color-neutral-500)' }}>{stat.label}</p>
                                    <p className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</p>
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
                        )}

                        {/* CHARITY DONATIONS TAB */}
                        {activeTab === 'charities' && (
                            <div className="space-y-8">
                                {/* Section 1: Macro Charity Impact Overview */}
                                <Card variant="glass">
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h2 className="text-lg font-bold text-white uppercase tracking-wider">1. Macro Charity Impact Overview</h2>
                                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mt-1">Consolidated All-Time Performance</p>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={() => handleExport('charity_winners')}>
                                                Export Impact
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {(!charityData || charityData.length === 0) ? (
                                            <p className="text-zinc-400 text-center py-8">No charity impact data yet</p>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="text-left text-zinc-500 uppercase text-[10px] tracking-widest border-b border-zinc-800">
                                                            <th className="pb-3 pl-2">Charity</th>
                                                            <th className="pb-3">Supporters</th>
                                                            <th className="pb-3 text-emerald-400">Winner Share</th>
                                                            <th className="pb-3 text-pink-400">Direct Gifts</th>
                                                            <th className="pb-3">Cycle</th>
                                                            <th className="pb-3 text-right pr-2">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {charityData.map((charity, i) => (
                                                            <tr key={charity.id || i} className="border-b border-zinc-800/50 hover:bg-white/5 transition-colors group">
                                                                <td className="py-4 pl-2">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 p-1">
                                                                            <img
                                                                                src={charity.logo}
                                                                                alt=""
                                                                                className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                                                                            />
                                                                        </div>
                                                                        <div className="font-bold text-white">{charity.name}</div>
                                                                    </div>
                                                                </td>
                                                                <td className="py-4">
                                                                    <div className="text-white font-medium">{charity.supporter_count}</div>
                                                                    <div className="text-[10px] text-zinc-500">Active Players</div>
                                                                </td>
                                                                <td className="py-4 font-bold text-emerald-400">
                                                                    {formatCurrency(charity.winner_donations)}
                                                                </td>
                                                                <td className="py-4 font-bold text-pink-400">
                                                                    {formatCurrency(charity.direct_donations)}
                                                                </td>
                                                                <td className="py-4">
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${charity.next_cycle_status === 'open' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                                                                        {charity.next_cycle_status}
                                                                    </span>
                                                                </td>
                                                                <td className="py-4 text-right pr-2">
                                                                    <div className={`text-[10px] font-black uppercase tracking-tighter ${charity.payout_status === 'settled' ? 'text-zinc-500' : 'text-amber-500 animate-pulse'}`}>
                                                                        {charity.payout_status === 'payout_pending' ? 'Pending settlement' : 'Settled'}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Section 2: Charity Winner-Led Distribution Audit */}
                                <Card variant="glass">
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h2 className="text-lg font-bold text-white uppercase tracking-wider">2. Charity Winner-Led Distribution Audit</h2>
                                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mt-1">Micro-Donations from Player Winnings</p>
                                            </div>
                                            <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Live Shares</span>
                                        </div>
                                    </CardHeader>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-zinc-700/50 text-[10px] uppercase tracking-widest text-zinc-500">
                                                    <th className="px-6 py-4">Paid Date</th>
                                                    <th className="px-6 py-4">Beneficiary</th>
                                                    <th className="px-6 py-4">Winner/Origin</th>
                                                    <th className="px-6 py-4">Amount</th>
                                                    <th className="px-6 py-4">Reference</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-800/50">
                                                {playerHistory.filter(p => p.isCharity).length === 0 ? (
                                                    <tr>
                                                        <td colSpan="5" className="px-6 py-12 text-center text-zinc-500 italic">No winner-led charity payout records found.</td>
                                                    </tr>
                                                ) : playerHistory.filter(p => p.isCharity).slice(0, 5).map(payout => (
                                                    <tr key={payout.id} className="hover:bg-white/5 transition-colors text-xs">
                                                        <td className="px-6 py-4 text-zinc-400">
                                                            {new Date(payout.paid_at).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-white">{payout.profiles?.full_name}</div>
                                                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Community Prize Share</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-zinc-300">Winner Led Share</div>
                                                            <div className="text-[10px] text-zinc-500 uppercase">Draw Distribution</div>
                                                        </td>
                                                        <td className="px-6 py-4 font-black text-emerald-400">
                                                            {formatCurrency(payout.net_payout)}
                                                        </td>
                                                        <td className="px-6 py-4 text-zinc-500 font-mono text-[10px]">
                                                            {payout.payment_reference || '--'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>

                                <div className="pt-8 mb-4">
                                    <h2 className="text-xl font-bold text-pink-500 uppercase tracking-tighter flex items-center gap-2">
                                        <span className="w-8 h-px bg-pink-500/30"></span>
                                        Direct Donation Intelligence Hub
                                        <span className="flex-1 h-px bg-pink-500/30"></span>
                                    </h2>
                                </div>

                                {/* Section 3: Direct Donation Detail Ledger (Section 2 original) */}
                                <Card variant="glass">
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h2 className="text-lg font-bold" style={{ color: 'var(--color-pink-100)' }}>
                                                    3. Direct Gift Donor Ledger
                                                </h2>
                                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mt-1">Individual Contributions via Donate Portal</p>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={() => handleExport('charity_direct')}>
                                                Export Gifts
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-6">
                                            {charityData.filter(c => c.direct_gifts_detail?.length > 0).length === 0 ? (
                                                <p className="text-zinc-500 text-center py-12 italic">No direct gifts recorded in this period.</p>
                                            ) : (
                                                charityData.filter(c => c.direct_gifts_detail?.length > 0).map(charity => (
                                                    <div key={charity.id} className="space-y-3">
                                                        <div className="flex items-center justify-between px-2">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-5 h-5 rounded bg-pink-500/20 flex items-center justify-center text-[10px]">🎁</div>
                                                                <h3 className="font-bold text-zinc-300 text-sm uppercase tracking-tight">{charity.name}</h3>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-xs text-zinc-500 mr-2">Total Direct:</span>
                                                                <span className="text-sm font-black text-pink-400">{formatCurrency(charity.direct_donations)}</span>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                            {charity.direct_gifts_detail.map((gift, idx) => (
                                                                <div key={idx} className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/50 hover:border-pink-500/20 transition-all">
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <div>
                                                                            <p className="text-xs font-black text-white leading-none">{gift.donor}</p>
                                                                            <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-tighter">
                                                                                {new Date(gift.date).toLocaleDateString()}
                                                                            </p>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <p className="text-sm font-black text-white">{formatCurrency(gift.amount)}</p>
                                                                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded mt-1 inline-block ${gift.status === 'paid'
                                                                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                                                                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                                                                }`}>
                                                                                {gift.status === 'paid' ? 'Paid' : 'Unpaid'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Section 4: Direct Donation Settlement Audit (Section 3 original) */}
                                <Card variant="glass">
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h2 className="text-lg font-bold text-white uppercase tracking-wider">4. Direct Donation Settlement Audit</h2>
                                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mt-1">Official Payment Trail to Multi-Charities</p>
                                            </div>
                                            <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest text-right">Settled Ledger</span>
                                        </div>
                                    </CardHeader>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-zinc-700/50 text-[10px] uppercase tracking-widest text-zinc-500">
                                                    <th className="px-6 py-4">Date</th>
                                                    <th className="px-6 py-4">Charity</th>
                                                    <th className="px-6 py-4">Amount</th>
                                                    <th className="px-6 py-4">Reference</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-800/50">
                                                {payoutHistory.filter(p => !p.donations || p.donations.some(d => d.source === 'direct')).length === 0 ? (
                                                    <tr>
                                                        <td colSpan="4" className="px-6 py-12 text-center text-zinc-500 italic">No direct donation payout history found.</td>
                                                    </tr>
                                                ) : payoutHistory.filter(p => !p.donations || p.donations.some(d => d.source === 'direct')).slice(0, 5).map(payout => (
                                                    <tr key={payout.id} className="hover:bg-white/5 transition-colors text-xs">
                                                        <td className="px-6 py-4 text-zinc-400">
                                                            {new Date(payout.created_at).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-white">{payout.charities?.name}</div>
                                                        </td>
                                                        <td className="px-6 py-4 font-black text-white">
                                                            {formatCurrency(payout.amount)}
                                                        </td>
                                                        <td className="px-6 py-4 text-zinc-500 font-mono text-[10px]">
                                                            {payout.payout_ref || '--'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
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
                                        <div className="flex items-center gap-12">
                                            <div className="text-left md:text-right">
                                                <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Winner Split</div>
                                                <div className="text-xl font-bold text-emerald-400">
                                                    {formatCurrency(charityData?.reduce((sum, c) => sum + (c.winner_donations || 0), 0) || 0)}
                                                </div>
                                            </div>
                                            <div className="text-left md:text-right">
                                                <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Direct Gifts</div>
                                                <div className="text-xl font-bold text-pink-400">
                                                    {formatCurrency(charityData?.reduce((sum, c) => sum + (c.direct_donations || 0), 0) || 0)}
                                                </div>
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
                            </div>
                        )}

                        {/* WINNER VERIFICATION TAB */}
                        {activeTab === 'winners' && (
                            <div className="space-y-8">
                                <Card variant="glass">
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-lg font-bold" style={{ color: 'var(--color-cream-100)' }}>
                                                Winner Verification
                                            </h2>
                                            <Button variant="ghost" size="sm" onClick={() => handleExport('winners')}>
                                                Export CSV
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {winners.length === 0 ? (
                                            <p className="text-zinc-400 text-center py-8">No winners to verify</p>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="text-left text-zinc-500">
                                                            <th className="pb-3">Draw</th>
                                                            <th className="pb-3">User</th>
                                                            <th className="pb-3">Prize (G/N)</th>
                                                            <th className="pb-3">Charity</th>
                                                            <th className="pb-3">Verification</th>
                                                            <th className="pb-3">Payout</th>
                                                            <th className="pb-3 text-right">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {winners.map(winner => (
                                                            <tr key={winner.id} className="border-t border-zinc-800 hover:bg-white/5 transition-colors">
                                                                <td className="py-3 text-white">
                                                                    <div className="font-bold">{winner.draws?.month_year || 'N/A'}</div>
                                                                    <div className="text-[10px] text-zinc-500">Tier {winner.tier}</div>
                                                                </td>
                                                                <td className="py-3 text-white">
                                                                    <div className="font-medium">{winner.profiles?.full_name || 'Unknown'}</div>
                                                                    <div className="text-[10px] text-zinc-500 font-mono">{winner.user_id.slice(0, 8)}</div>
                                                                </td>
                                                                <td className="py-3">
                                                                    <div className="text-white font-bold">{formatCurrency(winner.gross_prize)}</div>
                                                                    <div className="text-[10px] text-emerald-400 font-bold tracking-tighter">NET: {formatCurrency(winner.net_payout)}</div>
                                                                </td>
                                                                <td className="py-3 text-pink-400">
                                                                    <div className="text-[10px] font-medium text-pink-500 uppercase tracking-widest mb-1">Impact</div>
                                                                    {formatCurrency(winner.charity_amount)}
                                                                </td>
                                                                <td className="py-3">
                                                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${winner.verification_status === 'verified' ? 'bg-green-500/10 text-green-400' :
                                                                        winner.verification_status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                                                                            'bg-amber-500/10 text-amber-500'
                                                                        }`}>
                                                                        {winner.verification_status || 'pending'}
                                                                    </span>
                                                                </td>
                                                                <td className="py-3">
                                                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${winner.is_paid ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-500'}`}>
                                                                        {winner.is_paid ? 'Paid' : 'Unpaid'}
                                                                    </span>
                                                                </td>
                                                                <td className="py-3 text-right">
                                                                    {(!winner.verification_status ||
                                                                        winner.verification_status.toLowerCase() === 'pending' ||
                                                                        winner.verification_status.toLowerCase() === 'unverified') ? (
                                                                        <div className="flex gap-2 justify-end">
                                                                            <button
                                                                                onClick={() => handleVerifyWinner(winner.id, 'verified')}
                                                                                title="Verify Winner"
                                                                                className="w-8 h-8 flex items-center justify-center bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500 hover:text-white transition-all shadow-lg shadow-green-500/10"
                                                                            >
                                                                                ✓
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleVerifyWinner(winner.id, 'rejected')}
                                                                                title="Reject Winner"
                                                                                className="w-8 h-8 flex items-center justify-center bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/10"
                                                                            >
                                                                                ✕
                                                                            </button>
                                                                        </div>
                                                                    ) : winner.is_paid ? (
                                                                        <div className="flex items-center justify-end gap-1 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                                                                            <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                                            </svg>
                                                                            Locked
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center justify-end gap-2 text-[10px] text-emerald-500/80 font-bold uppercase tracking-widest bg-emerald-500/5 px-2 py-1 rounded-lg border border-emerald-500/20">
                                                                            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                                                            Pushed to Finance
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Prize Settlement Ledger */}
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

                        {/* SUBSCRIPTIONS TAB */}
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
            </div >
        </PageTransition >
    );
}
