import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import PageTransition from '../../components/layout/PageTransition';
import Card, { CardContent, CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
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
    const [charityData, setCharityData] = useState({ charities: [], total: 0 });
    const [jackpotData, setJackpotData] = useState({ history: [], current: 0 });
    const [winners, setWinners] = useState([]);
    const [subscriptionData, setSubscriptionData] = useState({ active: 0, inactive: 0, eligible: 0 });
    const [revenueData, setRevenueData] = useState([]);
    const [userGrowthData, setUserGrowthData] = useState([]);

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

            console.log('📊 All report data loaded');
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
            case 'charities':
                exportToCSV(charityData.charities.map(c => ({
                    name: c.name,
                    category: c.category,
                    total_raised: c.total_raised,
                    percentage: c.percentage
                })), 'charity_donations');
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

    const formatCurrency = (value) => `$${(value || 0).toLocaleString()}`;

    if (loading) {
        return (
            <PageTransition>
                <div className="py-8 lg:py-12">
                    <div className="container-app">
                        <div className="flex items-center justify-center min-h-[400px]">
                            <div className="text-center">
                                <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                                <p className="text-zinc-400">Loading reports...</p>
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
                    <motion.div
                        variants={fadeUp}
                        initial="initial"
                        animate="animate"
                        className="flex items-center justify-between mb-8"
                    >
                        <div>
                            <h1
                                className="text-3xl lg:text-4xl font-bold mb-2"
                                style={{ fontFamily: 'var(--font-display)', color: '#f9f5e3' }}
                            >
                                Reports & Analytics
                            </h1>
                            <p style={{ color: 'var(--color-neutral-400)' }}>
                                Track revenue, user growth, and donation metrics
                            </p>
                        </div>
                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                            className="px-4 py-2 rounded-xl"
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
                    </motion.div>

                    {/* Quick Stats */}
                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        animate="animate"
                        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
                    >
                        {[
                            { label: 'Total Revenue', value: formatCurrency(stats?.totalRevenue), color: '#c9a227' },
                            { label: 'Active Players', value: stats?.totalUsers?.toLocaleString() || '0', color: '#22c55e' },
                            { label: 'Total Donated', value: formatCurrency(stats?.totalDonated), color: '#a855f7' },
                            { label: 'Current Jackpot', value: formatCurrency(jackpotData.current), color: '#f59e0b' }
                        ].map((stat) => (
                            <motion.div key={stat.label} variants={staggerItem}>
                                <Card variant="glass" padding="p-4">
                                    <p className="text-sm mb-1" style={{ color: 'var(--color-neutral-500)' }}>{stat.label}</p>
                                    <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
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
                            <Card variant="glass">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-lg font-bold" style={{ color: 'var(--color-cream-100)' }}>
                                            Donations by Charity
                                        </h2>
                                        <Button variant="ghost" size="sm" onClick={() => handleExport('charities')}>
                                            Export CSV
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {charityData.charities.length === 0 ? (
                                        <p className="text-zinc-400 text-center py-8">No donation data yet</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {charityData.charities.map((charity, i) => (
                                                <div key={charity.id || i}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span style={{ color: 'var(--color-cream-200)' }}>{charity.name}</span>
                                                        <span style={{ color: '#c9a227' }}>{formatCurrency(charity.total_raised)}</span>
                                                    </div>
                                                    <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(26, 77, 46, 0.5)' }}>
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${charity.percentage}%` }}
                                                            transition={{ delay: 0.1 + i * 0.05, duration: 0.5 }}
                                                            className="h-full rounded-full"
                                                            style={{
                                                                background: i === 0
                                                                    ? 'linear-gradient(90deg, #c9a227, #a68520)'
                                                                    : 'linear-gradient(90deg, #1a4d2e, #0f3621)'
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className="mt-6 p-4 rounded-xl" style={{ background: 'rgba(201, 162, 39, 0.1)' }}>
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium" style={{ color: 'var(--color-cream-200)' }}>
                                                Total Donations
                                            </span>
                                            <span className="text-2xl font-bold" style={{ color: '#c9a227' }}>
                                                {formatCurrency(charityData.total)}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* WINNER VERIFICATION TAB */}
                        {activeTab === 'winners' && (
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
                                                        <th className="pb-3">Tier</th>
                                                        <th className="pb-3">Prize</th>
                                                        <th className="pb-3">Charity</th>
                                                        <th className="pb-3">Status</th>
                                                        <th className="pb-3">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {winners.map(winner => (
                                                        <tr key={winner.id} className="border-t border-zinc-800">
                                                            <td className="py-3 text-white">{winner.draws?.month_year || 'N/A'}</td>
                                                            <td className="py-3 text-white">{winner.profiles?.full_name || 'Unknown'}</td>
                                                            <td className="py-3">
                                                                <span className={`px-2 py-1 rounded text-xs ${winner.tier === 1 ? 'bg-amber-500/20 text-amber-400' :
                                                                    winner.tier === 2 ? 'bg-violet-500/20 text-violet-400' :
                                                                        'bg-teal-500/20 text-teal-400'
                                                                    }`}>
                                                                    {winner.tier}-Match
                                                                </span>
                                                            </td>
                                                            <td className="py-3 text-green-400">{formatCurrency(winner.gross_prize)}</td>
                                                            <td className="py-3 text-pink-400">{formatCurrency(winner.charity_amount)}</td>
                                                            <td className="py-3">
                                                                <span className={`px-2 py-1 rounded text-xs ${winner.verification_status === 'verified' ? 'bg-green-500/20 text-green-400' :
                                                                    winner.verification_status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                                                        'bg-amber-500/20 text-amber-400'
                                                                    }`}>
                                                                    {winner.verification_status || 'pending'}
                                                                </span>
                                                            </td>
                                                            <td className="py-3">
                                                                {winner.verification_status === 'pending' && (
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            onClick={() => handleVerifyWinner(winner.id, 'verified')}
                                                                            className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/30"
                                                                        >
                                                                            ✓
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleVerifyWinner(winner.id, 'rejected')}
                                                                            className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30"
                                                                        >
                                                                            ✕
                                                                        </button>
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
                                    <div className="p-4 rounded-xl bg-zinc-800/50">
                                        <p className="text-sm text-zinc-400 mb-2">Monthly Revenue from Subscriptions</p>
                                        <p className="text-2xl font-bold text-green-400">{formatCurrency(subscriptionData.active * 5)}</p>
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
