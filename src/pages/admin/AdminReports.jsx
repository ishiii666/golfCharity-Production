import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PageTransition from '../../components/layout/PageTransition';
import Card, { CardContent, CardHeader } from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
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
    getDrawWinnersExport,
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

    // Expansion & Winner detail states
    const [expandedDrawId, setExpandedDrawId] = useState(null);
    const [drawWinnersList, setDrawWinnersList] = useState({});
    const [isLoadingWinners, setIsLoadingWinners] = useState(false);
    const [selectedWinner, setSelectedWinner] = useState(null);
    const [payoutDetails, setPayoutDetails] = useState(null);
    const [isFetchingPayout, setIsFetchingPayout] = useState(false);
    const [isWinnerModalOpen, setIsWinnerModalOpen] = useState(false);

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
                'Charity Beneficiary': winner.charities?.name || 'N/A',
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
            case 'charity_supporters':
                const supporterMatrix = [];
                charityData.forEach(c => {
                    (c.supporters || []).forEach(s => {
                        supporterMatrix.push({
                            'Charity': c.name,
                            'Supporter Name': s.name,
                            'Supporter Email': s.email,
                            'Donation Percentage': `${s.percentage}%`
                        });
                    });
                });
                exportToCSV(supporterMatrix, 'Charity_Supporter_Matrix');
                break;
            default:
                console.warn('Unknown export type');
        }
    };

    const toggleExpandDraw = async (drawId) => {
        if (expandedDrawId === drawId) {
            setExpandedDrawId(null);
            return;
        }

        setExpandedDrawId(drawId);

        if (!drawWinnersList[drawId]) {
            setIsLoadingWinners(true);
            try {
                const winners = await getDrawWinnersExport(drawId);
                setDrawWinnersList(prev => ({ ...prev, [drawId]: winners }));
            } catch (error) {
                console.error('Error fetching winners:', error);
            } finally {
                setIsLoadingWinners(false);
            }
        }
    };

    const fetchPayoutDetails = async (winner) => {
        const userId = winner.userId || winner.user_id;
        if (!userId) return;
        setIsFetchingPayout(true);
        try {
            const details = await getWinnerProfileWithBanking(userId);
            setPayoutDetails(details);
        } catch (error) {
            console.warn('Failed to fetch banking details:', error);
        } finally {
            setIsFetchingPayout(false);
        }
    };

    const handleDownloadStatement = (winner) => {
        if (!winner) return;
        const drawMonth = drawReports.find(d => d.id === expandedDrawId)?.month_year || 'Monthly Draw';

        const receiptData = [{
            'Transaction Type': 'Prize Settlement',
            'Winner Name': winner['Name'] || winner.profiles?.full_name,
            'Winner Email': winner['Email'] || winner.profiles?.email,
            'Draw Cycle': drawMonth,
            'Match Tier': winner['Match Tier'] || `${winner.tier}-Match`,
            'Gross Prize (AUD)': (winner['Gross Prize'] || winner.gross_prize).toFixed(2),
            'Charity Donation (AUD)': (winner['Charity Donation'] || winner.charity_amount).toFixed(2),
            'Charity Beneficiary': winner['Charity Name'] || winner.charities?.name || 'Assigned Charity',
            'Net Payout Amount (AUD)': (winner['Net Payout'] || winner.net_payout).toFixed(2),
            'Settlement Status': (winner.isPaid || winner.is_paid) ? 'PAID' : 'PENDING',
            'Payment Reference': winner.paymentReference || winner.payout_ref || 'N/A',
            'Bank Name': payoutDetails?.bank_name || 'N/A',
            'Account Holder': payoutDetails?.full_name || 'N/A'
        }];

        exportToCSV(receiptData, `Receipt_${(winner['Name'] || winner.profiles?.full_name).replace(/\s+/g, '_')}_${drawMonth.replace(/\s+/g, '_')}`);
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
                                                {drawReports.map(draw => {
                                                    const isExpanded = expandedDrawId === draw.id;
                                                    const winners = drawWinnersList[draw.id] || [];
                                                    return (
                                                        <div key={draw.id} className={`rounded-2xl transition-all duration-300 ${isExpanded ? 'bg-zinc-800/80 border border-zinc-700/50 p-2' : 'bg-zinc-800/50'}`}>
                                                            <div
                                                                className="p-4 flex items-center justify-between cursor-pointer group"
                                                                onClick={() => toggleExpandDraw(draw.id)}
                                                            >
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-12 h-12 rounded-xl bg-zinc-900 flex flex-col items-center justify-center border border-zinc-700">
                                                                        <span className="text-[8px] font-black text-zinc-500 uppercase leading-none mb-1">{draw.month_year.split(' ')[1]}</span>
                                                                        <span className="text-sm font-black text-white leading-none uppercase">{draw.month_year.split(' ')[0].slice(0, 3)}</span>
                                                                    </div>
                                                                    <div>
                                                                        <div className="flex items-center gap-3 mb-1">
                                                                            <h3 className="font-bold text-white text-base">{draw.month_year}</h3>
                                                                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest ${draw.status === 'published' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                                                                                {draw.status}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-500 uppercase tracking-tight">
                                                                            <span>{draw.participants_count || 0} Players</span>
                                                                            <span className="w-1 h-1 rounded-full bg-zinc-700" />
                                                                            <span className="text-zinc-400">{(draw.tier1_winners || 0) + (draw.tier2_winners || 0) + (draw.tier3_winners || 0)} Winners</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-6">
                                                                    <div className="hidden lg:flex gap-1.5 bg-black/20 p-2 rounded-lg border border-zinc-700/50">
                                                                        {draw.winning_numbers?.map((num, i) => (
                                                                            <span key={i} className="w-7 h-7 rounded-md bg-zinc-800 flex items-center justify-center text-[10px] font-black text-amber-500 border border-zinc-700">
                                                                                {num}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="text-lg font-black text-emerald-400 leading-none mb-1">{formatCurrency(draw.prize_pool)}</p>
                                                                        <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Total Prize Pool</p>
                                                                    </div>
                                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${isExpanded ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-zinc-900 border-zinc-700 text-zinc-500 group-hover:text-zinc-300'}`}>
                                                                        <svg className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                                                                        </svg>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <AnimatePresence>
                                                                {isExpanded && (
                                                                    <motion.div
                                                                        initial={{ height: 0, opacity: 0 }}
                                                                        animate={{ height: 'auto', opacity: 1 }}
                                                                        exit={{ height: 0, opacity: 0 }}
                                                                        className="overflow-hidden bg-black/20 rounded-xl"
                                                                    >
                                                                        <div className="p-4 border-t border-zinc-700/50">
                                                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 px-2">
                                                                                <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Winner Distribution Audit</h5>
                                                                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                                                                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Draw Charity Impact:</span>
                                                                                    <span className="text-[10px] text-emerald-400 font-black">{formatCurrency(draw.total_charity)}</span>
                                                                                </div>
                                                                            </div>

                                                                            {isLoadingWinners && winners.length === 0 ? (
                                                                                <div className="py-8 text-center text-[10px] font-black uppercase text-zinc-600 tracking-widest animate-pulse">Syncing Winner Records...</div>
                                                                            ) : winners.length === 0 ? (
                                                                                <div className="py-8 text-center text-zinc-600 text-[10px] font-bold uppercase italic">No winners recorded for this cycle.</div>
                                                                            ) : (
                                                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                                                    {winners.map((winner, idx) => (
                                                                                        <div
                                                                                            key={idx}
                                                                                            onClick={() => {
                                                                                                setSelectedWinner(winner);
                                                                                                setIsWinnerModalOpen(true);
                                                                                                fetchPayoutDetails(winner);
                                                                                            }}
                                                                                            className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/50 border border-zinc-700/30 cursor-pointer hover:border-emerald-500/30 hover:bg-zinc-800 transition-all group"
                                                                                        >
                                                                                            <div className="flex items-center gap-3">
                                                                                                <div className={`w-1 h-10 rounded-full ${winner['Match Tier']?.includes('5') ? 'bg-amber-500' : winner['Match Tier']?.includes('4') ? 'bg-violet-500' : 'bg-teal-500'}`} />
                                                                                                <div className="flex flex-col">
                                                                                                    <p className="text-xs font-bold text-white uppercase tracking-tight group-hover:text-emerald-400 transition-colors leading-tight mb-0.5">{winner['Name']}</p>
                                                                                                    <p className="text-[9px] text-zinc-500 font-mono truncate max-w-[120px] leading-none mb-1">{winner['Email']}</p>
                                                                                                    <p className="text-[8px] text-zinc-400 font-black uppercase tracking-widest leading-none truncate max-w-[120px]">
                                                                                                        {winner['Charity Name'] || 'Assigned Charity'}
                                                                                                    </p>
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="text-right">
                                                                                                <p className="text-xs font-black text-emerald-400 leading-none mb-1">{formatCurrency(winner['Net Payout'])}</p>
                                                                                                <div className="flex flex-col items-end gap-0.5">
                                                                                                    <p className="text-[8px] text-rose-500 font-black leading-none italic uppercase tracking-tighter">
                                                                                                        +{formatCurrency(winner['Charity Donation'])} Gift
                                                                                                    </p>
                                                                                                    <div className="flex items-center gap-1.5">
                                                                                                        <span className={`text-[8px] font-black uppercase tracking-widest px-1 rounded bg-zinc-800 ${winner['Match Tier']?.includes('5') ? 'text-amber-500' : winner['Match Tier']?.includes('4') ? 'text-violet-400' : 'text-teal-400'}`}>
                                                                                                            {winner['Match Tier']?.split('-')[0]} Match
                                                                                                        </span>
                                                                                                        <span className={`text-[8px] font-black uppercase tracking-widest ${winner.isPaid ? 'text-emerald-500' : 'text-zinc-600'}`}>
                                                                                                            {winner.isPaid ? 'PAID' : 'PENDING'}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </CardContent>
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
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-lg bg-zinc-800 overflow-hidden border border-zinc-700 shrink-0">
                                                                        <img
                                                                            src={charity.logo_url || 'https://images.unsplash.com/photo-1599305090748-39322251147d?auto=format&fit=crop&q=80&w=200'}
                                                                            alt={charity.name}
                                                                            className="w-full h-full object-cover"
                                                                            referrerPolicy="no-referrer"
                                                                            onError={(e) => {
                                                                                e.target.onerror = null;
                                                                                e.target.src = 'https://images.unsplash.com/photo-1599305090748-39322251147d?auto=format&fit=crop&q=80&w=200';
                                                                            }}
                                                                        />
                                                                    </div>
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
                                                                <div className="w-10 h-10 rounded-xl bg-zinc-800 overflow-hidden border border-zinc-700 shrink-0">
                                                                    <img
                                                                        src={charity.logo_url || 'https://images.unsplash.com/photo-1599305090748-39322251147d?auto=format&fit=crop&q=80&w=200'}
                                                                        alt={charity.name}
                                                                        className="w-full h-full object-cover"
                                                                        referrerPolicy="no-referrer"
                                                                        onError={(e) => {
                                                                            e.target.onerror = null;
                                                                            e.target.src = 'https://images.unsplash.com/photo-1599305090748-39322251147d?auto=format&fit=crop&q=80&w=200';
                                                                        }}
                                                                    />
                                                                </div>
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
                                                                                    {gift.stripe_ref || gift.payout_ref || '--'}
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

                                {/* Section 3: Active Impact Base & Supporter Preferences */}
                                <Card variant="glass">
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h2 className="text-lg font-bold text-white uppercase tracking-wider">3. Active Supporter Impact Preferences</h2>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Live Supporter Matrix & Donation Commitment Ratios</p>
                                                    <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/10 text-teal-500 font-black border border-teal-500/20">
                                                        COMMUNITY AUDIT
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] text-teal-500 font-black uppercase tracking-[0.2em]">Engagement Hub</span>
                                                <Button variant="ghost" size="sm" onClick={() => handleExport('charity_supporters')} className="h-8 text-[10px] font-black uppercase border border-white/5">
                                                    Export Roster
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-zinc-700/50 text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-black">
                                                    <th className="px-6 py-4">Beneficiary Charity</th>
                                                    <th className="px-6 py-4 text-center">Active Base</th>
                                                    <th className="px-6 py-4">Supporter Roster (Sample)</th>
                                                    <th className="px-6 py-4 text-right">Impact Commitment</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-800/50">
                                                {charityData.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="4" className="px-6 py-12 text-center text-zinc-500 italic">No charity engagement data available.</td>
                                                    </tr>
                                                ) : charityData.map(charity => (
                                                    <tr key={charity.id} className="hover:bg-white/[0.02] transition-colors group text-xs">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-zinc-800 overflow-hidden border border-zinc-700 shrink-0">
                                                                    <img
                                                                        src={charity.logo_url || 'https://images.unsplash.com/photo-1599305090748-39322251147d?auto=format&fit=crop&q=80&w=200'}
                                                                        alt={charity.name}
                                                                        className="w-full h-full object-cover"
                                                                        referrerPolicy="no-referrer"
                                                                        onError={(e) => {
                                                                            e.target.onerror = null;
                                                                            e.target.src = 'https://images.unsplash.com/photo-1599305090748-39322251147d?auto=format&fit=crop&q=80&w=200';
                                                                        }}
                                                                    />
                                                                </div>
                                                                <span className="font-bold text-white uppercase tracking-tight">{charity.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-base font-black text-white leading-none">{charity.supporter_count}</span>
                                                                <span className="text-[8px] text-zinc-500 font-black uppercase mt-1">Supporters</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col gap-2 max-w-[250px]">
                                                                {charity.supporters && charity.supporters.length > 0 ? (
                                                                    <>
                                                                        {charity.supporters.slice(0, 2).map((supporter, sIdx) => (
                                                                            <div key={sIdx} className="flex flex-col">
                                                                                <span className="text-[10px] text-zinc-300 font-bold uppercase tracking-tight truncate leading-none mb-0.5">
                                                                                    {supporter.name}
                                                                                </span>
                                                                                <span className="text-[8px] text-zinc-600 font-mono truncate">{supporter.email}</span>
                                                                            </div>
                                                                        ))}
                                                                        {charity.supporters.length > 2 && (
                                                                            <span className="text-[9px] text-zinc-500 font-black italic uppercase tracking-tighter">
                                                                                + {charity.supporters.length - 2} more community members
                                                                            </span>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <span className="text-[9px] text-zinc-700 italic uppercase font-bold tracking-widest">No Active Connections</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex flex-col items-end gap-2">
                                                                {charity.supporters && charity.supporters.length > 0 ? (
                                                                    charity.supporters.slice(0, 2).map((supporter, sIdx) => (
                                                                        <div key={sIdx} className="flex items-center gap-2">
                                                                            <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                                                                <motion.div
                                                                                    initial={{ width: 0 }}
                                                                                    animate={{ width: `${supporter.percentage}%` }}
                                                                                    className="h-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.3)]"
                                                                                />
                                                                            </div>
                                                                            <span className="text-[10px] font-black text-teal-400">{supporter.percentage}%</span>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <span className="text-[9px] text-zinc-700 font-black uppercase tracking-widest">0% Allocation</span>
                                                                )}
                                                            </div>
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
                                                                <div className="flex items-center gap-1.5 mb-1">
                                                                    <div className="w-4 h-4 rounded-sm bg-zinc-800 overflow-hidden border border-zinc-700 shrink-0">
                                                                        <img
                                                                            src={winner.charities?.logo_url || 'https://images.unsplash.com/photo-1599305090748-39322251147d?auto=format&fit=crop&q=80&w=200'}
                                                                            alt={winner.charities?.name}
                                                                            className="w-full h-full object-cover"
                                                                            referrerPolicy="no-referrer"
                                                                            onError={(e) => {
                                                                                e.target.onerror = null;
                                                                                e.target.src = 'https://images.unsplash.com/photo-1599305090748-39322251147d?auto=format&fit=crop&q=80&w=200';
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <span className="text-[10px] text-zinc-300 font-bold uppercase truncate max-w-[100px]">{winner.charities?.name || 'Charity'}</span>
                                                                </div>
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
                                            <p className="text-[10px] text-zinc-500 mt-1 italic">Based on plan mix</p>
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

            {/* Winner Settlement Archive Modal */}
            {selectedWinner && (
                <Modal
                    isOpen={isWinnerModalOpen}
                    onClose={() => { setIsWinnerModalOpen(false); setSelectedWinner(null); setPayoutDetails(null); }}
                    title="Settlement Archive"
                    size="lg"
                >
                    <div className="flex flex-col lg:flex-row gap-8 pb-10" data-lenis-prevent="true">
                        {/* LEFT: Structural Receipt */}
                        <div className="flex-1 lg:max-w-[400px]">
                            <div className="bg-[#f8f9fa] dark:bg-white text-zinc-950 p-8 rounded-lg shadow-2xl relative overflow-hidden flex flex-col font-mono" style={{ boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5)' }}>
                                <div className="text-center space-y-2 mb-6 border-b border-dashed border-zinc-300 pb-6">
                                    <h3 className="text-2xl font-black tracking-tighter uppercase">GOLFCHARITY.</h3>
                                    <p className="text-[10px] uppercase font-bold tracking-widest opacity-60">Digital Settlement Receipt</p>
                                    <div className="flex justify-center gap-1 mt-2">
                                        {[...Array(30)].map((_, i) => <div key={i} className="w-1 h-0.5 bg-zinc-950/10" />)}
                                    </div>
                                </div>

                                <div className="space-y-4 text-xs">
                                    <div className="flex justify-between border-b border-zinc-100 pb-2">
                                        <span className="opacity-50 uppercase font-bold text-[9px]">Transaction Access</span>
                                        <span className="font-bold">STRIPE_ESCROW_API</span>
                                    </div>
                                    <div className="flex justify-between border-b border-zinc-100 pb-2">
                                        <span className="opacity-50 uppercase font-bold text-[9px]">Internal Audit ID</span>
                                        <span className="font-bold">#WIN_{(selectedWinner.id || 'N/A').slice(0, 8).toUpperCase()}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-zinc-100 pb-2">
                                        <span className="opacity-50 uppercase font-bold text-[9px]">Cycle Period</span>
                                        <span className="font-bold">{drawReports.find(d => d.id === expandedDrawId)?.month_year || 'Historical'}</span>
                                    </div>

                                    <div className="pt-4 pb-2">
                                        <p className="opacity-50 uppercase font-bold text-[9px] mb-1">Beneficiary Account</p>
                                        <p className="font-black text-lg uppercase tracking-tight">{selectedWinner['Name'] || selectedWinner.profiles?.full_name}</p>
                                        <p className="text-[10px] opacity-60 font-bold tracking-tight">{selectedWinner['Email'] || selectedWinner.profiles?.email}</p>
                                    </div>

                                    <div className="py-4 border-y border-dashed border-zinc-300 space-y-3">
                                        <div className="flex justify-between">
                                            <span className="opacity-60">Gross Prize Pool ({selectedWinner['Match Tier'] || `${selectedWinner.tier}-Match`})</span>
                                            <span className="font-bold">{formatCurrency(selectedWinner['Gross Prize'] || selectedWinner.gross_prize)}</span>
                                        </div>
                                        <div className="flex justify-between text-rose-600">
                                            <span className="opacity-60">Charity Contribution (10%)</span>
                                            <span className="font-bold">-{formatCurrency(selectedWinner['Charity Donation'] || selectedWinner.charity_amount)}</span>
                                        </div>
                                        <div className="text-[9px] text-rose-600/60 font-black uppercase text-right leading-none -mt-2">
                                            Beneficiary: {selectedWinner['Charity Name'] || selectedWinner.charities?.name || 'Assigned Charity'}
                                        </div>
                                        <div className="flex justify-between font-black text-xl pt-2 border-t border-zinc-100 mt-2">
                                            <span className="uppercase">Net Payable</span>
                                            <span className="text-emerald-700">{formatCurrency(selectedWinner['Net Payout'] || selectedWinner.net_payout)}</span>
                                        </div>
                                    </div>

                                    {(selectedWinner.paymentReference || selectedWinner.payout_ref) && (
                                        <div className="bg-zinc-100 p-4 rounded text-[10px] space-y-1">
                                            <p className="opacity-50 uppercase font-black tracking-widest text-[8px]">External Reference</p>
                                            <p className="break-all font-bold font-mono">{selectedWinner.paymentReference || selectedWinner.payout_ref}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-8 flex flex-col items-center gap-2 opacity-30">
                                    <div className="h-10 w-full flex items-end gap-0.5 px-2">
                                        {[...Array(40)].map((_, i) => (
                                            <div key={i} className="bg-zinc-950 flex-1" style={{ height: `${Math.random() * 100}%`, minWidth: '1px' }} />
                                        ))}
                                    </div>
                                    <p className="text-[8px] uppercase tracking-[0.4em] font-black">Authorized via central ledger</p>
                                </div>

                                <div className="absolute bottom-0 left-0 right-0 flex justify-between px-0 overflow-hidden">
                                    {[...Array(20)].map((_, i) => (
                                        <div key={i} className="w-4 h-4 bg-zinc-950 rotate-45 translate-y-2 shrink-0 shadow-inner" />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Admin Actions */}
                        <div className="flex-1 flex flex-col justify-between">
                            <div className="space-y-6">
                                <div className="space-y-1">
                                    <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Operational Status</h4>
                                    <div className={`p-6 rounded-3xl border transition-all duration-500 flex items-center justify-between ${(selectedWinner.isPaid || selectedWinner.is_paid) ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${(selectedWinner.isPaid || selectedWinner.is_paid) ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-500'}`}>
                                                {(selectedWinner.isPaid || selectedWinner.is_paid) ? (
                                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                ) : (
                                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{selectedWinner['Match Tier'] || `${selectedWinner.tier}-Match`} Fulfillment</p>
                                                <p className={`text-2xl font-black uppercase tracking-tighter ${(selectedWinner.isPaid || selectedWinner.is_paid) ? 'text-emerald-400' : 'text-amber-500'}`}>
                                                    {(selectedWinner.isPaid || selectedWinner.is_paid) ? 'Paid & Settled' : 'Verified Claim'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Banking Target</h4>
                                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-[9px] font-black text-zinc-400 uppercase tracking-widest">AU Domestic</span>
                                    </div>

                                    {payoutDetails ? (
                                        <div className="grid grid-cols-2 gap-y-8">
                                            <div>
                                                <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Institution</p>
                                                <p className="text-sm font-black text-white uppercase">{payoutDetails.bank_name || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">BSB Number</p>
                                                <p className="text-sm font-black text-white font-mono">{payoutDetails.bsb_number || '---'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Account No.</p>
                                                <p className="text-sm font-black text-white font-mono">{payoutDetails.account_number || '---'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Settlement Ref</p>
                                                <p className="text-sm font-black text-emerald-400 font-mono tracking-tighter truncate uppercase italic">GOLF_{(selectedWinner.id || 'N/A').slice(0, 8)}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-10 text-center">
                                            <div className="w-8 h-8 mx-auto mb-4 border-2 border-zinc-800 border-t-zinc-600 rounded-full animate-spin" />
                                            <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Accessing secure credentials...</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions Area */}
                            <div className="space-y-4 pt-8 border-t border-white/5 mt-8">
                                {(selectedWinner.isPaid || selectedWinner.is_paid) ? (
                                    <div className="grid grid-cols-1 gap-4">
                                        <Button
                                            variant="secondary"
                                            className="h-16 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl border border-white/5 bg-white/5 text-emerald-400"
                                            onClick={() => handleDownloadStatement(selectedWinner)}
                                        >
                                            Digital Receipt
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="p-8 rounded-3xl bg-amber-500/5 border border-amber-500/10 text-center">
                                        <p className="text-[11px] font-black uppercase text-amber-500 tracking-[0.2em] mb-3">⚠️ Payment Pending</p>
                                        <p className="text-[11px] text-zinc-500 leading-relaxed font-medium">
                                            Verification is complete but settlement is pending.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </PageTransition>
    );
}
