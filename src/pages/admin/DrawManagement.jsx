import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import PageTransition from '../../components/layout/PageTransition';
import Card, { CardContent, CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import BackButton from '../../components/ui/BackButton';
import { fadeUp, staggerContainer, staggerItem } from '../../utils/animations';
import { CelebrationIcon } from '../../components/ui/Icons';
import {
    getDraws,
    getCurrentDraw,
    getJackpot,
    logActivity,
    getActiveSubscribersCount,
    getDrawWinnersExport,
    exportToCSV,
    getDrawSettings,
    updateWinnerVerification,
    markWinnerAsPaid,
    getCharities,
    processStripePayout,
    getWinnerProfileWithBanking,
    createPayoutSession
} from '../../lib/supabaseRest';
import { supabase } from '../../lib/supabase';
import UserEditModal from '../../components/admin/UserEditModal';
import { getTimeUntilDraw, getDrawMonthYear } from '../../utils/drawSchedule';

// Preset score ranges (Reference only)
const PRESET_RANGES = [
    { label: 'Full Range (1-45)', min: 1, max: 45 },
    { label: '5-45', min: 5, max: 45 },
    { label: '10-45', min: 10, max: 45 },
];

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
    const [drawWinnersList, setDrawWinnersList] = useState({}); // cache for winner lists
    const [isLoadingWinners, setIsLoadingWinners] = useState(false);

    const [selectedWinner, setSelectedWinner] = useState(null);
    const [payoutDetails, setPayoutDetails] = useState(null);
    const [isFetchingPayout, setIsFetchingPayout] = useState(false);
    const [isWinnerModalOpen, setIsWinnerModalOpen] = useState(false);
    const [isUpdatingWinner, setIsUpdatingWinner] = useState(false);

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
            .channel('public:jackpot_tracker')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'jackpot_tracker'
            }, (payload) => {
                console.log('⚡ Real-time Jackpot Update:', payload.new.amount);
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

    // 🔄 Post-Checkout: Handle redirection from Stripe
    useEffect(() => {
        const handlePostCheckout = async () => {
            const params = new URLSearchParams(window.location.search);
            const status = params.get('payout');
            const entryId = params.get('entry');

            if (status === 'success' && entryId && !loading && draws.length > 0) {
                console.log('🔄 Payment success detected, auto-opening winner modal...');

                try {
                    // 1. Get the draw ID for this entry
                    const { data: entryData } = await supabase
                        .from('draw_entries')
                        .select('draw_id')
                        .eq('id', entryId)
                        .single();

                    if (entryData?.draw_id) {
                        // 2. Expand the correct draw
                        setExpandedDrawId(entryData.draw_id);

                        // 3. Fetch winners for this draw
                        const winners = await getDrawWinnersExport(entryData.draw_id);
                        setDrawWinnersList(prev => ({ ...prev, [entryData.draw_id]: winners }));

                        // 4. Find and open the winner modal
                        const winner = winners.find(w => w.id === entryId);
                        if (winner) {
                            setSelectedWinner(winner);
                            setIsWinnerModalOpen(true);
                            fetchPayoutDetails(winner);
                            addToast('success', 'Settlement completed and updated.');
                        }
                    }

                    // 5. Clean URL to prevent re-opening on manual refresh
                    window.history.replaceState({}, document.title, window.location.pathname);
                } catch (err) {
                    console.error('Error auto-opening winner modal:', err);
                }
            }
        };

        handlePostCheckout();
    }, [loading, draws.length]);

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

        // Only fetch if not already loaded, OR if it's an empty list (might be desync), OR if force refresh is true
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

    const handleVerifyWinner = async (entryId) => {
        setIsUpdatingWinner(true);
        try {
            const result = await updateWinnerVerification(entryId, 'Verified', user?.id);
            if (result.success) {
                addToast('success', 'Winner verified successfully');
                const currentWinners = drawWinnersList[expandedDrawId];
                const updatedWinners = currentWinners.map(w =>
                    w.id === entryId ? { ...w, 'Verification Status': 'Verified' } : w
                );
                setDrawWinnersList(prev => ({ ...prev, [expandedDrawId]: updatedWinners }));
                const winner = updatedWinners.find(w => w.id === entryId);
                if (winner) {
                    setSelectedWinner(winner);
                    fetchPayoutDetails(winner);
                }
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            addToast('error', 'Verification failed: ' + error.message);
        } finally {
            setIsUpdatingWinner(false);
        }
    };

    const handleOpenStripe = async () => {
        if (!selectedWinner) return;

        setIsUpdatingWinner(true);
        try {
            // Find the draw month name for the description
            const drawMonth = completedDraws.find(d => d.id === expandedDrawId)?.month_year || 'Monthly Draw';

            const result = await createPayoutSession(
                selectedWinner.id,
                selectedWinner['Net Payout'],
                selectedWinner['Name'],
                drawMonth
            );

            if (result.success && result.url) {
                addToast('success', 'Redirecting to Stripe payment page...');
                // Wait a moment for the toast to be seen
                setTimeout(() => {
                    window.location.href = result.url;
                }, 1000);
            } else {
                throw new Error(result.error || 'Failed to generate payment link');
            }
        } catch (error) {
            console.error('Stripe Payout Error:', error);
            addToast('error', 'Stripe redirect failed: ' + error.message);
        } finally {
            setIsUpdatingWinner(false);
        }
    };

    const handleMarkAsPaid = async (entryId) => {
        setIsUpdatingWinner(true);
        try {
            const reference = prompt("Enter payout reference ID (from Stripe or Bank):") || 'Manual Payment';
            if (reference === 'Manual Payment' && !window.confirm('No reference provided. Mark as paid anyway?')) {
                setIsUpdatingWinner(false);
                return;
            }
            const result = await markWinnerAsPaid(entryId, reference, user?.id);
            if (result.success) {
                addToast('success', 'Winner marked as paid in local database');
                const currentWinners = drawWinnersList[expandedDrawId];
                const updatedWinners = currentWinners.map(w =>
                    w.id === entryId ? {
                        ...w,
                        'Verification Status': 'Paid',
                        'isPaid': true,
                        'paymentReference': reference
                    } : w
                );
                setDrawWinnersList(prev => ({ ...prev, [expandedDrawId]: updatedWinners }));
                const winner = updatedWinners.find(w => w.id === entryId);
                if (winner) setSelectedWinner(winner);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            addToast('error', 'Payment marking failed: ' + error.message);
        } finally {
            setIsUpdatingWinner(false);
        }
    };

    const handleDownloadStatement = () => {
        if (!selectedWinner) return;

        const drawMonth = completedDraws.find(d => d.id === expandedDrawId)?.month_year || 'Monthly Draw';

        // Prepare specific receipt data for CSV
        const receiptData = [{
            'Transaction Type': 'Prize Settlement',
            'Winner Name': selectedWinner['Name'],
            'Winner Email': selectedWinner['Email'],
            'Draw Cycle': drawMonth,
            'Match Tier': selectedWinner['Match Tier'],
            'Gross Prize (AUD)': selectedWinner['Gross Prize'].toFixed(2),
            'Charity Donation (AUD)': selectedWinner['Charity Donation'].toFixed(2),
            'Net Payout Amount (AUD)': selectedWinner['Net Payout'].toFixed(2),
            'Settlement Status': 'PAID',
            'Payment Reference': selectedWinner.paymentReference || 'N/A',
            'Payment Date': selectedWinner.paidAt ? new Date(selectedWinner.paidAt).toLocaleString() : new Date().toLocaleString(),
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
                    <motion.div variants={fadeUp} initial="initial" animate="animate" className="mb-8">
                        <h1 className="text-3xl lg:text-4xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)', color: '#f9f5e3' }}>
                            Draw Management
                        </h1>
                        <p style={{ color: 'var(--color-neutral-400)' }}>
                            View past results and manage winner verification
                        </p>
                    </motion.div>

                    <motion.div variants={fadeUp} initial="initial" animate="animate" className="mb-8">
                        <Card variant="glow">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-bold" style={{ color: 'var(--color-cream-100)' }}>
                                        Current Draw: {getTargetMonth()}
                                    </h2>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${currentDraw?.status === 'published' || !currentDraw ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                        {currentDraw?.status === 'published' || !currentDraw ? 'Next Cycle Ready' :
                                            currentDraw?.status === 'open' ? 'Live Phase (Collecting)' :
                                                currentDraw?.status === 'completed' ? 'Draw Completed' : 'Active'}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid md:grid-cols-4 gap-4 mb-6">
                                    <div className="text-center p-4 rounded-xl" style={{ background: 'rgba(26, 77, 46, 0.3)' }}>
                                        <p className="text-2xl font-bold" style={{ color: '#c9a227' }}>
                                            {(currentDraw?.status === 'open' || !currentDraw || currentDraw?.status === 'published') ? liveSubCount : (currentDraw?.participants_count || 0)}
                                        </p>
                                        <p className="text-xs" style={{ color: 'var(--color-neutral-500)' }}>Participants</p>
                                    </div>
                                    <div className="text-center p-4 rounded-xl" style={{ background: 'rgba(26, 77, 46, 0.3)' }}>
                                        <p className="text-2xl font-bold" style={{ color: '#22c55e' }}>
                                            ${((currentDraw?.status === 'open' || !currentDraw || currentDraw?.status === 'published') ? (liveSubCount * settings.base_amount_per_sub) : (parseFloat(currentDraw?.prize_pool || 0))).toLocaleString()}
                                        </p>
                                        <p className="text-xs" style={{ color: 'var(--color-neutral-500)' }}>Prize Pool</p>
                                    </div>
                                    <div className="text-center p-4 rounded-xl" style={{ background: 'rgba(201, 162, 39, 0.2)' }}>
                                        <p className="text-2xl font-bold" style={{ color: '#c9a227' }}>
                                            ${parseFloat(jackpot || 0).toLocaleString()}
                                        </p>
                                        <p className="text-xs" style={{ color: 'var(--color-neutral-500)' }}>Jackpot</p>
                                    </div>
                                    <div className="text-center p-4 rounded-xl" style={{ background: 'rgba(26, 77, 46, 0.3)' }}>
                                        <p className="text-2xl font-bold" style={{ color: '#a855f7' }}>
                                            {getTimeUntilDraw().days}
                                        </p>
                                        <p className="text-xs" style={{ color: 'var(--color-neutral-500)' }}>Days Left</p>
                                    </div>
                                </div>
                                {currentDraw?.status === 'open' && (
                                    <div className="p-6 rounded-2xl bg-zinc-800/40 border border-zinc-700/50 text-center">
                                        <p className="text-zinc-400 mb-4 max-w-md mx-auto">
                                            Simulation and execution controls are managed in the specialized Draw Control Center.
                                        </p>
                                        <Link to="/admin/draw">
                                            <Button variant="primary">Go to Draw Control Center</Button>
                                        </Link>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-white mb-4">Past Draws</h3>
                        {completedDraws.length === 0 ? (
                            <div className="p-12 text-center rounded-2xl bg-zinc-900 border border-zinc-800">
                                <p className="text-zinc-500">No past draws found</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {completedDraws.map(draw => {
                                    const isExpanded = expandedDrawId === draw.id;
                                    const winners = drawWinnersList[draw.id] || [];
                                    return (
                                        <motion.div key={draw.id} layout className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
                                            <div className="p-5 flex items-center justify-between cursor-pointer hover:bg-zinc-800/50 transition-colors" onClick={() => toggleExpandDraw(draw.id)}>
                                                <div className="flex items-center gap-4">
                                                    <div>
                                                        <h4 className="text-lg font-bold text-white flex items-center gap-2">
                                                            {draw.month_year}
                                                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 uppercase font-black tracking-widest border border-emerald-500/20">
                                                                {draw.status}
                                                            </span>
                                                        </h4>
                                                        <p className="text-xs text-zinc-500 mt-0.5">
                                                            Range: {draw.score_range_min}-{draw.score_range_max} • {draw.participants_count} Players
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {draw.winning_numbers?.map((num, i) => (
                                                            <span key={i} className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-amber-400">
                                                                {num}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right">
                                                        <p className="text-lg font-black text-emerald-400 leading-none mb-1">{formatVal(draw.prize_pool)}</p>
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Total Pool</p>
                                                    </div>
                                                    <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                                        <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="px-5 pb-5 pt-2 border-t border-white/5">
                                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 pt-4">
                                                        <div className="p-4 rounded-xl bg-black/20 border border-amber-500/10">
                                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 mb-2">5-Match Pool</p>
                                                            <p className="text-xl font-black text-white">{formatVal(draw.tier1_pool)}</p>
                                                            <p className="text-[10px] text-zinc-500 mt-1 font-bold">{draw.tier1_winners} Winners</p>
                                                        </div>
                                                        <div className="p-4 rounded-xl bg-black/20 border border-violet-500/10">
                                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400 mb-2">4-Match Pool</p>
                                                            <p className="text-xl font-black text-white">{formatVal(draw.tier2_pool)}</p>
                                                            <p className="text-[10px] text-zinc-500 mt-1 font-bold">{draw.tier2_winners} Winners</p>
                                                        </div>
                                                        <div className="p-4 rounded-xl bg-black/20 border border-teal-500/10">
                                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-400 mb-2">3-Match Pool</p>
                                                            <p className="text-xl font-black text-white">{formatVal(draw.tier3_pool)}</p>
                                                            <p className="text-[10px] text-zinc-500 mt-1 font-bold">{draw.tier3_winners} Winners</p>
                                                        </div>
                                                        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400 mb-2">Jackpot Rollover</p>
                                                            <p className="text-xl font-black text-amber-400">{formatVal(draw.tier1_rollover_amount)}</p>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <h4 className="text-sm font-black uppercase tracking-widest text-white">Draw Winners</h4>
                                                            <div className="flex items-center gap-4">
                                                                <button
                                                                    onClick={() => toggleExpandDraw(draw.id, true)}
                                                                    disabled={isLoadingWinners}
                                                                    className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
                                                                >
                                                                    <svg className={`w-3 h-3 ${isLoadingWinners ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                                    </svg>
                                                                    Refresh Sync
                                                                </button>
                                                                <button onClick={() => handleExportWinners(draw.id, draw.month_year)} className="text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors">
                                                                    Download CSV Report
                                                                </button>
                                                            </div>
                                                        </div>
                                                        {isLoadingWinners && winners.length === 0 ? (
                                                            <div className="flex items-center gap-3 p-4 rounded-xl bg-black/10 text-xs text-zinc-500 font-bold uppercase">Loading winners...</div>
                                                        ) : winners.length === 0 ? (
                                                            <div className="p-8 text-center rounded-xl bg-black/10 text-sm text-zinc-500">No winners found</div>
                                                        ) : (
                                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                                                {winners.map((winner, idx) => (
                                                                    <div key={idx} onClick={() => { setSelectedWinner(winner); setIsWinnerModalOpen(true); if (winner['Verification Status'] === 'Verified' || winner['Verification Status'] === 'Paid') fetchPayoutDetails(winner); else setPayoutDetails(null); }} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 cursor-pointer hover:border-emerald-500/40 hover:bg-black/30 transition-all group">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${winner['Match Tier'] === '5-Match' ? 'bg-amber-500/20 text-amber-400' : winner['Match Tier'] === '4-Match' ? 'bg-violet-500/20 text-violet-400' : 'bg-teal-500/20 text-teal-400'}`}>{winner['Match Tier']?.split('-')[0] || '?'}M</div>
                                                                            <div>
                                                                                <p className="text-sm font-bold text-white leading-none mb-1 group-hover:text-emerald-400 transition-colors">{winner['Name']}</p>
                                                                                <p className="text-[10px] text-zinc-500">{winner['Email']}</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="text-right">
                                                                                <p className="text-sm font-black text-emerald-400 leading-none mb-1">{formatVal(winner['Net Payout'])}</p>
                                                                                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter">Net Payout</p>
                                                                            </div>
                                                                            <div className={`w-2 h-2 rounded-full ${winner.isPaid || winner['Verification Status'] === 'Paid' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : (winner['Verification Status'] === 'Verified' ? 'bg-blue-500 shadow-[0_0_8px_#3b82f6]' : 'bg-zinc-600')}`} />
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {selectedWinner && (
                <Modal isOpen={isWinnerModalOpen} onClose={() => { setIsWinnerModalOpen(false); setSelectedWinner(null); setPayoutDetails(null); }} title="Settlement Archive" size="lg">
                    <div className="flex flex-col lg:flex-row gap-8 pb-10" data-lenis-prevent="true">
                        {/* LEFT: Structural Receipt */}
                        <div className="flex-1 lg:max-w-[400px]">
                            <div className="bg-[#f8f9fa] dark:bg-white text-zinc-950 p-8 rounded-lg shadow-2xl relative overflow-hidden flex flex-col font-mono" style={{ boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5)' }}>
                                {/* Receipt Header */}
                                <div className="text-center space-y-2 mb-6 border-b border-dashed border-zinc-300 pb-6">
                                    <h3 className="text-2xl font-black tracking-tighter">GOLFCHARITY.</h3>
                                    <p className="text-[10px] uppercase font-bold tracking-widest opacity-60">Digital Settlement Receipt</p>
                                    <div className="flex justify-center gap-1 mt-2">
                                        {[...Array(30)].map((_, i) => <div key={i} className="w-1 h-0.5 bg-zinc-950/10" />)}
                                    </div>
                                </div>

                                {/* Main Data */}
                                <div className="space-y-4 text-xs">
                                    <div className="flex justify-between border-b border-zinc-100 pb-2">
                                        <span className="opacity-50">Transaction Mode</span>
                                        <span className="font-bold">STRIPE_ESCROW</span>
                                    </div>
                                    <div className="flex justify-between border-b border-zinc-100 pb-2">
                                        <span className="opacity-50">Settlement ID</span>
                                        <span className="font-bold">#{selectedWinner.id.slice(0, 8).toUpperCase()}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-zinc-100 pb-2">
                                        <span className="opacity-50">Draw Cycle</span>
                                        <span className="font-bold">{completedDraws.find(d => d.id === expandedDrawId)?.month_year || 'Current'}</span>
                                    </div>

                                    <div className="pt-4 pb-2">
                                        <p className="opacity-50 mb-1">Beneficiary</p>
                                        <p className="font-black text-lg">{selectedWinner['Name']}</p>
                                        <p className="text-[10px] opacity-60">{selectedWinner['Email']}</p>
                                    </div>

                                    <div className="py-4 border-y border-dashed border-zinc-300 space-y-3">
                                        <div className="flex justify-between">
                                            <span>Gross Prize Pool</span>
                                            <span>{formatVal(selectedWinner['Gross Prize'])}</span>
                                        </div>
                                        <div className="flex justify-between text-rose-600">
                                            <span>Charity Donation</span>
                                            <span>-{formatVal(selectedWinner['Charity Donation'])}</span>
                                        </div>
                                        <div className="flex justify-between font-black text-lg pt-2">
                                            <span>NET TOTAL</span>
                                            <span className="text-emerald-700">{formatVal(selectedWinner['Net Payout'])}</span>
                                        </div>
                                    </div>

                                    {selectedWinner.paymentReference && (
                                        <div className="bg-zinc-100 p-4 rounded text-[10px] space-y-1">
                                            <p className="opacity-50 uppercase font-black tracking-widest text-[8px]">Auth Signature</p>
                                            <p className="break-all font-bold">{selectedWinner.paymentReference}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Barcode Styling */}
                                <div className="mt-8 flex flex-col items-center gap-2 opacity-30">
                                    <div className="h-10 w-full flex items-end gap-0.5 px-2">
                                        {[...Array(40)].map((_, i) => (
                                            <div key={i} className="bg-zinc-950 flex-1" style={{ height: `${Math.random() * 100}%`, minWidth: '1px' }} />
                                        ))}
                                    </div>
                                    <p className="text-[8px] uppercase tracking-[0.5em] font-black">Settled via stripe api</p>
                                </div>

                                {/* Serrated Edge Effect */}
                                <div className="absolute bottom-0 left-0 right-0 flex justify-between px-0 overflow-hidden">
                                    {[...Array(20)].map((_, i) => (
                                        <div key={i} className="w-4 h-4 bg-zinc-950 dark:bg-[#020617] rotate-45 translate-y-2 shrink-0 shadow-inner" />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Admin Controls */}
                        <div className="flex-1 space-y-6 flex flex-col">
                            <div className="space-y-1">
                                <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Operational Status</h4>
                                <div className={`p-5 rounded-2xl border transition-all duration-500 flex items-center justify-between ${selectedWinner.isPaid || selectedWinner['Verification Status'] === 'Paid' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-zinc-800/50 border-white/5'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${selectedWinner.isPaid || selectedWinner['Verification Status'] === 'Paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-900 text-zinc-500'}`}>
                                            {selectedWinner.isPaid || selectedWinner['Verification Status'] === 'Paid' ? (
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                            ) : (
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{selectedWinner['Match Tier']} Fulfillment</p>
                                            <p className={`text-xl font-black uppercase tracking-tight ${selectedWinner.isPaid || selectedWinner['Verification Status'] === 'Paid' ? 'text-emerald-400' : 'text-zinc-300'}`}>
                                                {selectedWinner.isPaid || selectedWinner['Verification Status'] === 'Paid' ? 'Paid & Verified' : 'Awaiting Payment'}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="px-3 py-1 rounded bg-black/40 text-[10px] font-black text-zinc-500 uppercase tracking-widest border border-white/5 italic">AUD</span>
                                </div>
                            </div>

                            <div className="flex-1 space-y-6">
                                <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-4">
                                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] px-2">Remittance Target</h4>
                                    {payoutDetails ? (
                                        <div className="grid grid-cols-2 gap-y-4 px-2">
                                            <div>
                                                <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Institution</p>
                                                <p className="text-sm font-bold text-white uppercase">{payoutDetails.bank_name || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">BSB/Swift</p>
                                                <p className="text-sm font-bold text-white font-mono">{payoutDetails.bsb_number || '---'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Account No.</p>
                                                <p className="text-sm font-bold text-white font-mono">{payoutDetails.account_number || '---'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Reference</p>
                                                <p className="text-sm font-bold text-emerald-400 font-mono tracking-tighter truncate">GOLF_{selectedWinner.id.slice(0, 4)}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-4 text-center text-zinc-600 text-[10px] uppercase font-black tracking-widest italic">Fetching local credentials...</div>
                                    )}
                                </div>
                            </div>

                            {/* Actions Area */}
                            <div className="space-y-4 pt-4 border-t border-white/5">
                                {!(selectedWinner.isPaid || selectedWinner['Verification Status'] === 'Paid') ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        <Button
                                            onClick={handleOpenStripe}
                                            className="h-16 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl"
                                            variant="primary"
                                        >
                                            Stripe Process
                                        </Button>
                                        <Button
                                            onClick={() => handleMarkAsPaid(selectedWinner.id)}
                                            className="h-16 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl"
                                            variant="outline"
                                        >
                                            Manual Payout
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        <Button
                                            variant="secondary"
                                            className="h-16 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl border border-white/5"
                                            onClick={() => { setSelectedUserId(selectedWinner.userId); setIsUserEditModalOpen(true); }}
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                            User Profile
                                        </Button>
                                        <Button
                                            variant="accent"
                                            className="h-16 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl"
                                            onClick={handleDownloadStatement}
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                            Digital Receipt
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            <UserEditModal isOpen={isUserEditModalOpen} onClose={() => { setIsUserEditModalOpen(false); setSelectedUserId(null); }} userId={selectedUserId} charities={charities} onUpdate={fetchAllData} />
        </PageTransition>
    );
}
