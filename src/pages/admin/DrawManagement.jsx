import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import PageTransition from '../../components/layout/PageTransition';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import BackButton from '../../components/ui/BackButton';
import { fadeUp, staggerContainer, staggerItem } from '../../utils/animations';
import {
    getDraws,
    getCurrentDraw,
    getJackpot,
    getActiveSubscribersCount,
    getDrawWinnersExport,
    exportToCSV,
    getDrawSettings,
    getWinnerProfileWithBanking,
    getCharities
} from '../../lib/supabaseRest';
import { supabase } from '../../lib/supabase';
import UserEditModal from '../../components/admin/UserEditModal';
import { getTimeUntilDraw, getDrawMonthYear, getTimeUntilDate, getDrawDateFromMonthYear } from '../../utils/drawSchedule';

export default function DrawManagement() {
    // State
    const [draws, setDraws] = useState([]);
    const [currentDraw, setCurrentDrawState] = useState(null);
    const [jackpot, setJackpot] = useState(0);
    const [loading, setLoading] = useState(true);
    const [liveSubCount, setLiveSubCount] = useState(0);
    const [exportingId, setExportingId] = useState(null);
    const [charities, setCharities] = useState([]);
    const [isUserEditModalOpen, setIsUserEditModalOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [settings, setSettings] = useState({
        base_amount_per_sub: 10,
        tier1_percent: 40,
        tier2_percent: 35,
        tier3_percent: 25,
        jackpot_cap: 250000
    });

    // History expansion state
    const [expandedDrawId, setExpandedDrawId] = useState(null);
    const [drawWinnersList, setDrawWinnersList] = useState({});
    const [isLoadingWinners, setIsLoadingWinners] = useState(false);

    const [selectedWinner, setSelectedWinner] = useState(null);
    const [payoutDetails, setPayoutDetails] = useState(null);
    const [isFetchingPayout, setIsFetchingPayout] = useState(false);
    const [isWinnerModalOpen, setIsWinnerModalOpen] = useState(false);

    const { addToast } = useToast();
    const { user } = useAuth();

    // Format currency helper
    const formatVal = (val) => new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
        minimumFractionDigits: 2
    }).format(val || 0);

    // Fetch all data on mount
    useEffect(() => {
        fetchAllData();

        // 🟢 REAL-TIME: Subscribe to jackpot_tracker changes
        const jackpotChannel = supabase
            .channel('draw-mgmt:jackpot')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'jackpot_tracker'
            }, (payload) => {
                setJackpot(parseFloat(payload.new.amount) || 0);
            })
            .subscribe();

        // 🔄 POLLING: Refresh live sub count and draws every 30 seconds
        const pollInterval = setInterval(() => {
            fetchStatsUpdate();
        }, 30000);

        return () => {
            supabase.removeChannel(jackpotChannel);
            clearInterval(pollInterval);
        };
    }, []);

    const fetchStatsUpdate = async () => {
        try {
            const [subCount, currentJackpot] = await Promise.all([
                getActiveSubscribersCount(null, true),
                getJackpot()
            ]);
            setLiveSubCount(subCount || 0);
            setJackpot(currentJackpot || 0);
        } catch (error) {
            console.warn('Silent stats refresh failed:', error);
        }
    };

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [allDraws, activeDraw, currentJackpot, charityList] = await Promise.all([
                getDraws(),
                getCurrentDraw(),
                getJackpot(),
                getCharities()
            ]);

            setDraws(allDraws || []);
            setCurrentDrawState(activeDraw);
            setJackpot(currentJackpot || 0);
            setCharities(charityList || []);

            const currentSettings = await getDrawSettings();
            if (currentSettings) setSettings(currentSettings);

            const subCount = await getActiveSubscribersCount(null, true);
            setLiveSubCount(subCount || 0);
        } catch (error) {
            console.error('Error fetching draw data:', error);
            addToast('error', 'Failed to load draw data');
        } finally {
            setLoading(false);
        }
    };

    const fetchPayoutDetails = async (winner) => {
        if (!winner?.userId) return;
        setIsFetchingPayout(true);
        try {
            const details = await getWinnerProfileWithBanking(winner.userId);
            setPayoutDetails(details);
        } catch (error) {
            console.warn('Failed to fetch banking details:', error);
        } finally {
            setIsFetchingPayout(false);
        }
    };

    const handleExportWinners = async (drawId, monthYear) => {
        try {
            setExportingId(drawId);
            const winnersData = await getDrawWinnersExport(drawId);
            if (winnersData && winnersData.length > 0) {
                exportToCSV(winnersData, `Winners_${monthYear.replace(' ', '_')}`);
                addToast('success', `Exported winners for ${monthYear}`);
            } else {
                addToast('info', 'No winners found for this draw');
            }
        } catch (error) {
            console.error('Export failed:', error);
            addToast('error', 'Failed to export winners');
        } finally {
            setExportingId(null);
        }
    };

    const toggleExpandDraw = async (drawId, forceRefresh = false) => {
        if (expandedDrawId === drawId && !forceRefresh) {
            setExpandedDrawId(null);
            return;
        }

        setExpandedDrawId(drawId);

        if (!drawWinnersList[drawId] || drawWinnersList[drawId].length === 0 || forceRefresh) {
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

    const handleDownloadStatement = () => {
        if (!selectedWinner) return;
        const drawMonth = draws.find(d => d.id === expandedDrawId)?.month_year || 'Monthly Draw';

        const receiptData = [{
            'Transaction Type': 'Prize Settlement',
            'Winner Name': selectedWinner['Name'],
            'Winner Email': selectedWinner['Email'],
            'Draw Cycle': drawMonth,
            'Match Tier': selectedWinner['Match Tier'],
            'Gross Prize (AUD)': selectedWinner['Gross Prize'].toFixed(2),
            'Charity Donation (AUD)': selectedWinner['Charity Donation'].toFixed(2),
            'Net Payout Amount (AUD)': selectedWinner['Net Payout'].toFixed(2),
            'Settlement Status': selectedWinner.isPaid ? 'PAID' : 'PENDING',
            'Payment Reference': selectedWinner.paymentReference || 'N/A',
            'Bank Name': payoutDetails?.bank_name || 'N/A',
            'Account Holder': payoutDetails?.full_name || 'N/A'
        }];

        exportToCSV(receiptData, `Receipt_${selectedWinner['Name'].replace(/\s+/g, '_')}_${selectedWinner.id.slice(0, 8)}`);
        addToast('success', 'Transaction statement downloaded.');
    };

    const getTargetMonth = () => {
        return currentDraw && currentDraw.status !== 'published' ? currentDraw.month_year : getDrawMonthYear();
    };

    const completedDraws = Array.isArray(draws) ? draws.filter(d => d.status === 'completed' || d.status === 'published') : [];

    if (loading) {
        return (
            <PageTransition>
                <div className="py-8 lg:py-12">
                    <div className="container-app">
                        <div className="flex items-center justify-center min-h-[400px]">
                            <div className="text-center">
                                <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                                <p className="text-zinc-400">Loading draw data...</p>
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
                    <BackButton to="/admin" label="Admin Dashboard" className="mb-6" />

                    <motion.div variants={fadeUp} initial="initial" animate="animate" className="mb-10">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div>
                                <h1 className="text-3xl lg:text-4xl font-bold mb-2 text-white" style={{ fontFamily: 'var(--font-display)' }}>
                                    Draw Management
                                </h1>
                                <p className="text-zinc-500 text-sm font-medium max-w-lg">
                                    Comprehensive history of monthly draws, winner pools, and verification statuses.
                                    Audit historical cycles and manage claim verification.
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Current Draw Detail & Live Phase Analysis */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
                        <Card variant="glass" className="lg:col-span-2 border-emerald-500/20 bg-emerald-500/5">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mb-1">Current Draw Cycle</p>
                                        <CardTitle className="text-2xl">{currentDraw?.month_year || getDrawMonthYear()}</CardTitle>
                                    </div>
                                    <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold border border-emerald-500/20 uppercase tracking-widest italic">
                                        Live Phase Analysis
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div>
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Players</p>
                                        <p className="text-xl font-bold text-white uppercase">{liveSubCount}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Pool Estimate</p>
                                        <p className="text-xl font-bold text-emerald-400 uppercase">{formatVal(liveSubCount * settings.base_amount_per_sub)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Draw Date</p>
                                        <p className="text-xl font-bold text-white uppercase">
                                            {(() => {
                                                const targetMonthYear = currentDraw?.month_year || getDrawMonthYear();
                                                const drawTargetDate = getDrawDateFromMonthYear(targetMonthYear);
                                                const { days, isPast } = getTimeUntilDate(drawTargetDate);

                                                if (isPast && currentDraw?.status !== 'published') {
                                                    return "DRAW DUE";
                                                }
                                                return `${days} Days Left`;
                                            })()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Status</p>
                                        <p className={`text-xl font-bold uppercase ${currentDraw?.status === 'published' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                            {currentDraw?.status || 'Collection'}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card variant="glass" className="flex flex-col justify-center">
                            <div className="space-y-4">
                                <Link to="/admin/draw" className="block">
                                    <Button variant="outline" fullWidth className="h-12 text-[10px] font-bold uppercase tracking-widest border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/5">
                                        Open Control Center
                                    </Button>
                                </Link>
                                <Link to="/admin/finance" className="block">
                                    <Button variant="primary" fullWidth className="h-12 text-[10px] font-bold uppercase tracking-widest">
                                        Fulfillment Hub
                                    </Button>
                                </Link>
                            </div>
                        </Card>
                    </div>

                    {/* Quick Stats Grid - Restored to Previous Style */}
                    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                        {[
                            { label: 'Total Historical Participants', val: draws.reduce((sum, d) => sum + (d.participants_count || 0), 0), color: 'text-emerald-400' },
                            { label: 'Total Prizes Distributed', val: formatVal(draws.reduce((sum, d) => sum + (d.prize_pool || 0), 0)), color: 'text-emerald-400' },
                            { label: 'Active Jackpot Pool', val: formatVal(jackpot), color: 'text-amber-400' },
                            { label: 'Next Draw Sequence', val: currentDraw?.month_year || getDrawMonthYear(), color: 'text-violet-400' }
                        ].map((stat, i) => (
                            <motion.div key={i} variants={staggerItem}>
                                <Card variant="glass" padding="p-6" className="h-full">
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2">{stat.label}</p>
                                    <p className={`text-2xl font-bold ${stat.color} tracking-tight`}>{stat.val}</p>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Past Draws Section */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 mb-2">
                            <h2 className="text-lg font-black text-white uppercase tracking-widest">Draw History</h2>
                            <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                        </div>

                        {completedDraws.length === 0 ? (
                            <div className="p-20 text-center rounded-[2rem] bg-white/[0.02] border border-white/5 border-dashed">
                                <p className="text-zinc-600 font-bold uppercase tracking-widest text-xs">No historical cycles recorded yet</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {completedDraws.map(draw => {
                                    const isExpanded = expandedDrawId === draw.id;
                                    const winners = drawWinnersList[draw.id] || [];
                                    return (
                                        <motion.div key={draw.id} layout className={`rounded-[2rem] border transition-all duration-500 ${isExpanded ? 'bg-white/[0.03] border-white/10 p-2' : 'bg-black/20 border-white/5 hover:border-white/10'}`}>
                                            <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 cursor-pointer" onClick={() => toggleExpandDraw(draw.id)}>
                                                <div className="flex items-center gap-6">
                                                    <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/5 flex flex-col items-center justify-center">
                                                        <span className="text-[10px] font-black text-zinc-600 uppercase leading-none mb-1">{draw.month_year.split(' ')[1]}</span>
                                                        <span className="text-lg font-black text-white leading-none uppercase">{draw.month_year.split(' ')[0].slice(0, 3)}</span>
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <h4 className="text-xl font-black text-white tracking-tight uppercase">{draw.month_year}</h4>
                                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border border-current italic ${draw.status === 'published' ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-500 bg-amber-500/10'}`}>
                                                                {draw.status}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-500 uppercase tracking-tight">
                                                            <span>Range: {draw.score_range_min}-{draw.score_range_max}</span>
                                                            <span className="w-1 h-1 rounded-full bg-zinc-800" />
                                                            <span>{draw.participants_count} Players</span>
                                                            <span className="w-1 h-1 rounded-full bg-zinc-800" />
                                                            <span className="text-zinc-400">{draw.tier1_winners + draw.tier2_winners + draw.tier3_winners} Winners</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-8">
                                                    <div className="flex gap-1.5 bg-black/40 p-2 rounded-xl border border-white/5">
                                                        {draw.winning_numbers?.map((num, i) => (
                                                            <span key={i} className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-black border ${i < 3 ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                                                                {num}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <div className="text-right flex flex-col justify-center">
                                                        <p className="text-2xl font-black text-emerald-400 leading-none mb-1 tracking-tighter">{formatVal(draw.prize_pool)}</p>
                                                        <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Total Prize Pool</p>
                                                    </div>
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${isExpanded ? 'bg-white/10 border-white/20 text-white' : 'bg-zinc-900 border-white/5 text-zinc-600 group-hover:text-zinc-400'}`}>
                                                        <svg className={`w-5 h-5 transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>

                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-white/5 bg-black/20 rounded-b-[2rem]">
                                                        <div className="p-6">
                                                            <div className="flex items-center justify-between mb-6">
                                                                <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 underline decoration-zinc-800 underline-offset-8">Verified Claimants Ledger</h5>
                                                                <button onClick={() => handleExportWinners(draw.id, draw.month_year)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase hover:bg-emerald-500/10 transition-all">
                                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                                    Download Audit CSV
                                                                </button>
                                                            </div>

                                                            {isLoadingWinners && winners.length === 0 ? (
                                                                <div className="py-12 text-center text-[10px] font-black uppercase text-zinc-600 tracking-widest animate-pulse">Syncing Winner Data...</div>
                                                            ) : (
                                                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                                                    {winners.map((winner, idx) => (
                                                                        <motion.div
                                                                            key={idx}
                                                                            initial={{ opacity: 0, scale: 0.95 }}
                                                                            animate={{ opacity: 1, scale: 1 }}
                                                                            transition={{ delay: idx * 0.05 }}
                                                                            onClick={() => {
                                                                                setSelectedWinner(winner);
                                                                                setIsWinnerModalOpen(true);
                                                                                fetchPayoutDetails(winner);
                                                                            }}
                                                                            className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 cursor-pointer hover:border-emerald-500/40 hover:bg-white/[0.04] transition-all group relative overflow-hidden"
                                                                        >
                                                                            <div className="flex items-center gap-4">
                                                                                <div>
                                                                                    <p className={`text-[9px] font-black uppercase tracking-widest border-b pb-1 mb-1 ${winner['Match Tier']?.includes('5') ? 'text-amber-500 border-amber-500/20' :
                                                                                        winner['Match Tier']?.includes('4') ? 'text-violet-500 border-violet-500/20' :
                                                                                            'text-teal-500 border-teal-500/20'
                                                                                        }`}>
                                                                                        {winner['Match Tier']?.includes('5') ? '5 Draw Pool' : winner['Match Tier']?.includes('4') ? '4 Draw Pool' : '3 Draw Pool'}
                                                                                    </p>
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-sm font-black text-white leading-none mb-1 group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{winner['Name']}</p>
                                                                                    <p className="text-[10px] text-zinc-600 font-mono">{winner['Email']}</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-4">
                                                                                <div className="text-right">
                                                                                    <p className="text-sm font-black text-emerald-400 leading-none mb-1">{formatVal(winner['Net Payout'])}</p>
                                                                                    <span className={`text-[8px] font-black uppercase italic ${winner.isPaid ? 'text-emerald-500' : 'text-zinc-600'}`}>
                                                                                        {winner.isPaid ? 'SETTLED' : (winner['Verification Status'] || 'PENDING')}
                                                                                    </span>
                                                                                </div>
                                                                                <div className={`w-2 h-10 rounded-full ${winner.isPaid ? 'bg-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-zinc-800'}`} />
                                                                            </div>
                                                                        </motion.div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

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
                                        <span className="font-bold">#WIN_{selectedWinner.id.slice(0, 8).toUpperCase()}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-zinc-100 pb-2">
                                        <span className="opacity-50 uppercase font-bold text-[9px]">Cycle Period</span>
                                        <span className="font-bold">{draws.find(d => d.id === expandedDrawId)?.month_year || 'Historical'}</span>
                                    </div>

                                    <div className="pt-4 pb-2">
                                        <p className="opacity-50 uppercase font-bold text-[9px] mb-1">Beneficiary Account</p>
                                        <p className="font-black text-lg uppercase tracking-tight">{selectedWinner['Name']}</p>
                                        <p className="text-[10px] opacity-60 font-bold tracking-tight">{selectedWinner['Email']}</p>
                                    </div>

                                    <div className="py-4 border-y border-dashed border-zinc-300 space-y-3">
                                        <div className="flex justify-between">
                                            <span className="opacity-60">Gross Prize Pool ({selectedWinner['Match Tier']})</span>
                                            <span className="font-bold">{formatVal(selectedWinner['Gross Prize'])}</span>
                                        </div>
                                        <div className="flex justify-between text-rose-600">
                                            <span className="opacity-60">Charity Contribution (10%)</span>
                                            <span className="font-bold">-{formatVal(selectedWinner['Charity Donation'])}</span>
                                        </div>
                                        <div className="flex justify-between font-black text-xl pt-2 border-t border-zinc-100 mt-2">
                                            <span className="uppercase">Net Payable</span>
                                            <span className="text-emerald-700">{formatVal(selectedWinner['Net Payout'])}</span>
                                        </div>
                                    </div>

                                    {selectedWinner.paymentReference && (
                                        <div className="bg-zinc-100 p-4 rounded text-[10px] space-y-1">
                                            <p className="opacity-50 uppercase font-black tracking-widest text-[8px]">External Reference</p>
                                            <p className="break-all font-bold font-mono">{selectedWinner.paymentReference}</p>
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
                                        <div key={i} className="w-4 h-4 bg-zinc-950 dark:bg-[#020617] rotate-45 translate-y-2 shrink-0 shadow-inner" />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Admin Actions */}
                        <div className="flex-1 flex flex-col justify-between">
                            <div className="space-y-6">
                                <div className="space-y-1">
                                    <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Operational Status</h4>
                                    <div className={`p-6 rounded-3xl border transition-all duration-500 flex items-center justify-between ${selectedWinner.isPaid ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${selectedWinner.isPaid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-500'}`}>
                                                {selectedWinner.isPaid ? (
                                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                ) : (
                                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{selectedWinner['Match Tier']} Fulfillment</p>
                                                <p className={`text-2xl font-black uppercase tracking-tighter ${selectedWinner.isPaid ? 'text-emerald-400' : 'text-amber-500'}`}>
                                                    {selectedWinner.isPaid ? 'Paid & Settled' : 'Verified Claim'}
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
                                                <p className="text-sm font-black text-emerald-400 font-mono tracking-tighter truncate uppercase italic">GOLF_{selectedWinner.id.slice(0, 8)}</p>
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
                                {!selectedWinner.isPaid ? (
                                    <div className="p-8 rounded-3xl bg-amber-500/5 border border-amber-500/10 text-center">
                                        <p className="text-[11px] font-black uppercase text-amber-500 tracking-[0.2em] mb-3">⚠️ Payment Gateway Required</p>
                                        <p className="text-[11px] text-zinc-500 leading-relaxed mb-6 font-medium">
                                            This prize has been verified but remains in the collection pool. Financial settlement and ledger entry must be processed in the Finance Hub.
                                        </p>
                                        <Link to="/admin/finance">
                                            <Button variant="outline" className="h-12 w-full text-[10px] uppercase font-black tracking-widest border border-amber-500/20 text-amber-500 hover:bg-amber-500/10">
                                                Redirect to Finance Hub
                                            </Button>
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        <Button
                                            variant="secondary"
                                            className="h-16 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl border border-white/5 bg-white/5"
                                            onClick={() => { setSelectedUserId(selectedWinner.userId); setIsUserEditModalOpen(true); }}
                                        >
                                            Audit Profile
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            className="h-16 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl border border-white/5 bg-white/5 text-emerald-400"
                                            onClick={handleDownloadStatement}
                                        >
                                            Digital Receipt
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            <UserEditModal
                isOpen={isUserEditModalOpen}
                onClose={() => { setIsUserEditModalOpen(false); setSelectedUserId(null); }}
                userId={selectedUserId}
                charities={charities}
                onUpdate={fetchAllData}
                onDelete={fetchAllData}
            />
        </PageTransition>
    );
}
