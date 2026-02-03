import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PageTransition from '../../components/layout/PageTransition';
import Card, { CardContent, CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import BackButton from '../../components/ui/BackButton';
import Input from '../../components/ui/Input';
import { fadeUp, staggerContainer, staggerItem } from '../../utils/animations';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import {
    getAggregatedPayableWinners,
    getCharityPayoutSummary,
    getCharityPayouts,
    markBatchWinnersAsPaid,
    createCharityPayout,
    markCharityPayoutAsPaid,
    getUnpaidWinners,
    getPayableWinnersForDraw,
    getSettledPlayerPayouts,
    markWinnerAsPaid,
    createPayoutSession,
    createCharityPayoutSession,
    rollbackCharityPayout,
    getWinnerProfileWithBanking,
    exportToCSV
} from '../../lib/supabaseRest';
import { formatCurrency } from '../../utils/formatters';
import Modal from '../../components/ui/Modal';

const TABS = [
    { id: 'players', label: 'Player Payouts', icon: '👤' },
    { id: 'charities', label: 'Charity Payouts', icon: '🏢' },
    { id: 'history', label: 'Payout History', icon: '📜' },
];

export default function FinancePayouts() {
    const { user } = useAuth() || {};
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState('players');
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    // Data states
    const [unpaidWinners, setUnpaidWinners] = useState([]);
    const [charitySummary, setCharitySummary] = useState([]);
    const [payoutHistory, setPayoutHistory] = useState([]);
    const [playerHistory, setPlayerHistory] = useState([]);

    // UI states
    const [selectedItem, setSelectedItem] = useState(null);
    const hasProcessedPayout = useRef(false);
    const [payoutRef, setPayoutRef] = useState('');
    const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);

    // Individual Winner Logic
    const [expandedDrawId, setExpandedDrawId] = useState(null);
    const [drawWinnersList, setDrawWinnersList] = useState({});
    const [isLoadingWinners, setIsLoadingWinners] = useState(false);
    const [isWinnerModalOpen, setIsWinnerModalOpen] = useState(false);
    const [selectedWinner, setSelectedWinner] = useState(null);
    const [payoutDetails, setPayoutDetails] = useState(null);
    const [isFetchingPayout, setIsFetchingPayout] = useState(false);

    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();

    // Handle return from Stripe
    useEffect(() => {
        const status = searchParams.get('payout');
        if (status && !hasProcessedPayout.current) {
            hasProcessedPayout.current = true;
            if (status === 'success') {
                addToast('success', 'Stripe payment completed! The payout has been recorded.');
            } else if (status === 'canceled') {
                addToast('info', 'Payment canceled. No funds were captured.');
            }
            // Clear params without full page reload
            setSearchParams({}, { replace: true });
            fetchData();
        }
    }, [searchParams]);

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'players') {
                const drawBatches = await getAggregatedPayableWinners();
                setUnpaidWinners(drawBatches);
            } else if (activeTab === 'charities') {
                const summary = await getCharityPayoutSummary();
                setCharitySummary(summary);
            } else if (activeTab === 'history') {
                const [charityHist, playerHist] = await Promise.all([
                    getCharityPayouts(),
                    getSettledPlayerPayouts()
                ]);
                setPayoutHistory(charityHist);
                setPlayerHistory(playerHist);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            addToast('error', 'Failed to refresh financial data');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleExpand = async (drawId) => {
        if (expandedDrawId === drawId) {
            setExpandedDrawId(null);
            return;
        }

        setExpandedDrawId(drawId);
        if (!drawWinnersList[drawId]) {
            setIsLoadingWinners(true);
            try {
                const winners = await getPayableWinnersForDraw(drawId);
                setDrawWinnersList(prev => ({ ...prev, [drawId]: winners }));
            } catch (error) {
                addToast('error', 'Failed to fetch winners for this draw');
            } finally {
                setIsLoadingWinners(false);
            }
        }
    };

    const handleOpenWinnerModal = async (winner) => {
        setSelectedWinner(winner);
        setIsWinnerModalOpen(true);
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

    const handleOpenStripe = async () => {
        if (!selectedWinner) return;
        setProcessing(true);
        try {
            const result = await createPayoutSession(
                selectedWinner.id,
                selectedWinner['Net Payout'],
                selectedWinner['Name'],
                selectedWinner.month_year || 'Monthly Draw'
            );

            if (result.success && result.url) {
                addToast('success', 'Redirecting to Stripe payout page...');
                setTimeout(() => { window.location.href = result.url; }, 1000);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            addToast('error', 'Stripe redirect failed: ' + error.message);
            setProcessing(false);
        }
    };

    const handleMarkWinnerAsPaid = async (winnerId) => {
        if (!payoutRef.trim()) {
            addToast('error', 'A valid payout reference is required for manual settlements.');
            return;
        }

        setProcessing(true);
        try {
            const result = await markWinnerAsPaid(winnerId, payoutRef, user?.id);
            if (result.success) {
                addToast('success', 'Winner marked as paid');
                // Remove from local list
                setDrawWinnersList(prev => ({
                    ...prev,
                    [expandedDrawId]: prev[expandedDrawId].filter(w => w.id !== winnerId)
                }));
                // Update aggregated batch total
                setUnpaidWinners(prev => prev.map(batch => {
                    if (batch.draw_id === expandedDrawId) {
                        return {
                            ...batch,
                            winner_count: batch.winner_count - 1,
                            total_amount: batch.total_amount - selectedWinner['Net Payout']
                        };
                    }
                    return batch;
                }).filter(b => b.winner_count > 0));

                setIsWinnerModalOpen(false);
                setPayoutRef(''); // Clear for next use
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            addToast('error', error.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleDownloadWinnerReceipt = async (winner) => {
        if (!winner) return;
        try {
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
                'Payment Reference': winner.payment_reference || winner.payout_ref || 'N/A',
                'Payment Date': winner.paid_at ? new Date(winner.paid_at).toLocaleString() : 'N/A',
                'Bank Name': details?.bank_name || 'N/A',
                'Account Holder': details?.full_name || 'N/A'
            }];
            exportToCSV(receiptData, `Receipt_Winner_${winner.profiles?.full_name.replace(' ', '_')}`);
            addToast('success', 'Digital receipt downloaded');
        } catch (error) {
            addToast('error', 'Failed to generate receipt');
        }
    };

    const handleDownloadCharityReceipt = (payout) => {
        if (!payout) return;
        const receiptData = [{
            'Transaction Type': 'Charity Distribution',
            'Charity Name': payout.charities?.name || 'Unknown Charity',
            'Distribution Amount (AUD)': parseFloat(payout.amount || 0).toFixed(2),
            'Status': 'PAID',
            'Settlement Reference': payout.payout_ref || 'N/A',
            'Payment Date': payout.updated_at ? new Date(payout.updated_at).toLocaleString() : 'N/A',
            'Source Detail': payout.detail_label || (payout.donations?.[0]?.source === 'direct' ? 'Direct Gift' : 'Winner Contributions'),
            'Transaction ID': payout.id.slice(0, 8).toUpperCase()
        }];
        exportToCSV(receiptData, `Receipt_Charity_${payout.charities?.name.replace(' ', '_')}`);
        addToast('success', 'Charity receipt downloaded');
    };

    const handleMarkBatchPaid = async () => {
        if (!selectedItem) return;
        setProcessing(true);
        try {
            if (activeTab === 'players') {
                // Bulk settle winners
                const result = await markBatchWinnersAsPaid(
                    selectedItem.entry_ids,
                    payoutRef,
                    user?.id
                );
                if (result.success) {
                    addToast('success', `Settled ${selectedItem.winner_count} payouts for ${selectedItem.month_year}`);
                    setUnpaidWinners(prev => prev.filter(w => w.draw_id !== selectedItem.draw_id));
                    setIsPayoutModalOpen(false);
                } else {
                    throw new Error(result.error);
                }
            } else if (activeTab === 'charities' || activeTab === 'history') {
                // Settle charity funds (Winner fund or Direct Gift or Existing History record)
                if (selectedItem.stripe_account_id) {
                    let payoutId = selectedItem.id; // Use existing ID if from history

                    if (!payoutId) {
                        // 1. Create a PENDING payout record if it doesn't exist yet
                        const initResult = await createCharityPayout(
                            selectedItem.charity_id,
                            selectedItem.amount,
                            null, // No reference yet -> pending
                            selectedItem.donation_ids || []
                        );
                        if (!initResult.success) throw new Error(initResult.error);
                        payoutId = initResult.payoutId;
                    }

                    addToast('info', 'Redirecting to Stripe for payment...', { duration: 3000 });

                    // 2. Create the Payout Session
                    try {
                        const session = await createCharityPayoutSession(
                            payoutId,
                            selectedItem.amount,
                            selectedItem.name || selectedItem.charities?.name,
                            selectedItem.type || 'donations'
                        );

                        if (session.success) {
                            setTimeout(() => {
                                window.location.href = session.url;
                            }, 1000);
                            return; // Keep processing=true for visual feedback until redirect
                        } else {
                            // ROLLBACK: Delete the PENDING record if Stripe fails
                            console.error('Stripe Session Error:', session.error);
                            if (activeTab === 'charities') {
                                await rollbackCharityPayout(payoutId);
                                fetchData(); // Restore donations to the list
                            }
                            throw new Error(session.error);
                        }
                    } catch (stripeErr) {
                        // Ensure we re-throw to hitting the outer catch
                        throw stripeErr;
                    }
                } else {
                    // Manual Payout (Standard flow)
                    let result;
                    if (selectedItem.id) {
                        // Update existing record
                        result = await markCharityPayoutAsPaid(selectedItem.id, payoutRef);
                    } else {
                        // Create new record
                        result = await createCharityPayout(
                            selectedItem.charity_id,
                            selectedItem.amount,
                            payoutRef,
                            selectedItem.donation_ids || []
                        );
                    }

                    if (result.success) {
                        addToast('success', `Payout of ${formatCurrency(selectedItem.amount)} recorded`);
                        fetchData(); // Refresh all tabs
                        setIsPayoutModalOpen(false);
                    } else {
                        throw new Error(result.error);
                    }
                }
            }
        } catch (error) {
            addToast('error', error.message);
        } finally {
            setProcessing(false);
            setPayoutRef('');
        }
    };

    const handleExport = async () => {
        setLoading(true);
        try {
            if (activeTab === 'players') {
                // Fetch ALL individual winners for the export
                const individualWinners = await getUnpaidWinners();
                const data = individualWinners.map(w => ({
                    'Batch': w.draws?.month_year,
                    'Name': w.profiles?.full_name,
                    'BSB': w.profiles?.bsb_number,
                    'Account': w.profiles?.account_number,
                    'Amount': w.net_payout,
                    'Tier': w.tier
                }));
                exportToCSV(data, 'Bank_Batch_Player_Payouts');
            } else if (activeTab === 'charities') {
                const data = charitySummary.map(c => ({
                    'Charity': c.name,
                    'Active Supporters': c.supporter_count,
                    'Winner Contribution': c.winner_donations,
                    'Direct Gift Total': c.direct_donations,
                    'Total Pending': c.total_amount,
                    'Record Count': c.donation_ids.length
                }));
                exportToCSV(data, 'Pending_Charity_Payouts');
            } else {
                // History Export - Multi-sheet isn't supported by basic CSV, so we combine or export primary history
                // Let's export charity history as it's the main payout table
                const data = payoutHistory.map(h => ({
                    'Date': new Date(h.created_at).toLocaleDateString(),
                    'Type': 'Charity Payout',
                    'Payee': h.charities?.name,
                    'Amount': h.amount,
                    'Reference': h.payout_ref,
                    'Status': h.status
                }));

                // Append player history
                const playerRows = playerHistory.map(h => ({
                    'Date': h.paid_at ? new Date(h.paid_at).toLocaleDateString() : 'N/A',
                    'Type': 'Player Payout',
                    'Payee': h.profiles?.full_name,
                    'Amount': h.net_payout,
                    'Reference': h.payment_reference || h.payout_ref,
                    'Status': 'settled'
                }));

                exportToCSV([...data, ...playerRows], 'Financial_Settlement_History');
            }
        } catch (error) {
            console.error('Export error:', error);
            addToast('error', 'Failed to export CSV');
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageTransition>
            <div className="py-8 lg:py-12">
                <div className="container-app">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
                        <div>
                            <BackButton to="/admin" label="Admin Dashboard" className="mb-6" />
                            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">Finance & Payouts</h1>
                            <p className="text-zinc-400">Manage winnings and charity distributions</p>
                        </div>
                        <div className="flex items-center gap-3 mt-4 md:mt-0">
                            <Button variant="outline" size="sm" onClick={handleExport} disabled={loading || (activeTab === 'players' ? unpaidWinners.length === 0 : activeTab === 'charities' ? charitySummary.length === 0 : payoutHistory.length === 0)}>
                                Export CSV
                            </Button>
                            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-8">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === tab.id
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                    : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 border border-zinc-700/50'
                                    }`}
                            >
                                <span>{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center min-h-[400px]">
                            <div className="text-center">
                                <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                                <p className="text-zinc-500 text-xs font-black uppercase tracking-widest">Loading Records...</p>
                            </div>
                        </div>
                    ) : (
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            {/* TAB: PLAYER PAYOUTS */}
                            {activeTab === 'players' && (
                                <Card variant="glass">
                                    <CardHeader>
                                        <h2 className="text-lg font-bold text-white">Pending Player Winnings</h2>
                                    </CardHeader>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-zinc-700/50 text-[10px] uppercase tracking-widest text-zinc-500">
                                                    <th className="px-6 py-4">Draw Cycle</th>
                                                    <th className="px-6 py-4">Verified Winners</th>
                                                    <th className="px-6 py-4">Total Amount Payable</th>
                                                    <th className="px-6 py-4 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-800/50">
                                                {unpaidWinners.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="4" className="px-6 py-12 text-center text-zinc-500">No pending draw batches found.</td>
                                                    </tr>
                                                ) : unpaidWinners.map(batch => {
                                                    const isExpanded = expandedDrawId === batch.draw_id;
                                                    const winners = drawWinnersList[batch.draw_id] || [];

                                                    return (
                                                        <React.Fragment key={batch.draw_id}>
                                                            <tr className={`hover:bg-white/5 transition-colors cursor-pointer ${isExpanded ? 'bg-emerald-500/5' : ''}`} onClick={() => handleToggleExpand(batch.draw_id)}>
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 text-emerald-500' : 'text-zinc-600'}`}>
                                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                                                                            </svg>
                                                                        </div>
                                                                        <div>
                                                                            <div className="font-bold text-white text-lg">{batch.month_year}</div>
                                                                            <div className="text-[10px] text-emerald-500 font-black uppercase tracking-tighter">Ready for Settlement</div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="text-sm text-zinc-300 font-medium">{batch.winner_count} Players Verified</div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="text-xl font-black text-emerald-400">{formatCurrency(batch.total_amount)}</div>
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <div className="flex justify-end gap-2">
                                                                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleOpenPayoutModal(batch); }}>
                                                                            Batch Mark Paid
                                                                        </Button>
                                                                        <Button size="sm" onClick={(e) => { e.stopPropagation(); handleToggleExpand(batch.draw_id); }}>
                                                                            {isExpanded ? 'Hide Winners' : 'Manage Winners'}
                                                                        </Button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                            {isExpanded && (
                                                                <tr>
                                                                    <td colSpan="4" className="px-6 pb-6 pt-2 bg-black/20">
                                                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-4">
                                                                                {isLoadingWinners && winners.length === 0 ? (
                                                                                    <div className="col-span-full py-4 text-center text-[10px] text-zinc-500 uppercase font-black tracking-widest animate-pulse">Syncing Winner Records...</div>
                                                                                ) : winners.length === 0 ? (
                                                                                    <div className="col-span-full py-4 text-center text-zinc-600 italic">No individual winners left in this batch.</div>
                                                                                ) : (
                                                                                    winners.map(winner => (
                                                                                        <div
                                                                                            key={winner.id}
                                                                                            onClick={() => handleOpenWinnerModal(winner)}
                                                                                            className="group flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 hover:bg-black/30 transition-all cursor-pointer shadow-lg"
                                                                                        >
                                                                                            <div className="flex items-center gap-3">
                                                                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${winner['Match Tier'] === '5-Match' ? 'bg-amber-500/10 text-amber-500' : winner['Match Tier'] === '4-Match' ? 'bg-violet-500/10 text-violet-400' : 'bg-teal-500/10 text-teal-400'}`}>{winner['Match Tier']?.split('-')[0]}M</div>
                                                                                                <div>
                                                                                                    <p className="text-xs font-bold text-white leading-none mb-1 group-hover:text-emerald-400 transition-colors">{winner['Name']}</p>
                                                                                                    <p className="text-[9px] text-zinc-500">{winner['Email']}</p>
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="text-right">
                                                                                                <p className="text-sm font-black text-white leading-none mb-1">{formatCurrency(winner['Gross Prize'])}</p>
                                                                                                <p className="text-[10px] font-bold text-rose-500 mb-1">-{formatCurrency(winner['Charity Donation'])}</p>
                                                                                                <div className="h-px bg-zinc-800 my-1" />
                                                                                                <p className="text-sm font-black text-emerald-400 leading-none mb-1">{formatCurrency(winner['Net Payout'])}</p>
                                                                                                <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-tighter">Settled Net</p>
                                                                                            </div>
                                                                                        </div>
                                                                                    ))
                                                                                )}
                                                                            </div>
                                                                        </motion.div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            )}

                            {/* TAB: CHARITY PAYOUTS */}
                            {activeTab === 'charities' && (
                                <div className="space-y-8">
                                    {/* Section 1: Winner Charity Donations (Aggregated by Charity) */}
                                    <Card variant="glass">
                                        <CardHeader className="flex flex-row items-center justify-between">
                                            <h2 className="text-lg font-bold text-white uppercase tracking-wider">1. Winner-Led Charity Funds</h2>
                                            <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Post-Draw Commitments</span>
                                        </CardHeader>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="border-b border-zinc-700/50 text-[10px] uppercase tracking-widest text-zinc-500">
                                                        <th className="px-6 py-4">Beneficiary Charity</th>
                                                        <th className="px-6 py-4">Contribution Source</th>
                                                        <th className="px-6 py-4">Total Fund Amount</th>
                                                        <th className="px-6 py-4 text-right">Settlement</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-zinc-800/50">
                                                    {charitySummary.filter(c => c.winner_donations > 0).length === 0 ? (
                                                        <tr>
                                                            <td colSpan="4" className="px-6 py-12 text-center text-zinc-500">No winner-led funds awaiting distribution.</td>
                                                        </tr>
                                                    ) : charitySummary.filter(c => c.winner_donations > 0).map(item => (
                                                        <tr key={item.charity_id} className="hover:bg-white/5 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-lg bg-zinc-800 overflow-hidden border border-zinc-700">
                                                                        <img
                                                                            src={item.logo_url || 'https://images.unsplash.com/photo-1599305090748-39322251147d?auto=format&fit=crop&q=80&w=200'}
                                                                            alt={item.name}
                                                                            className="w-full h-full object-cover"
                                                                            referrerPolicy="no-referrer"
                                                                            onError={(e) => {
                                                                                e.target.onerror = null;
                                                                                e.target.src = 'https://images.unsplash.com/photo-1599305090748-39322251147d?auto=format&fit=crop&q=80&w=200';
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <div className="font-bold text-white">{item.name}</div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="space-y-1">
                                                                    {(item.winner_records || []).map((rec, nIdx) => (
                                                                        <div key={nIdx} className="flex items-center gap-2">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></span>
                                                                            <span className="text-[10px] text-zinc-300 font-bold uppercase tracking-tight">
                                                                                Prize Contribution by {rec.user_name} ({rec.pool_info}) - {formatCurrency(rec.amount)}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="text-lg font-black text-emerald-400">{formatCurrency(item.winner_donations)}</div>
                                                                <div className="flex flex-wrap gap-x-2 gap-y-1 mt-2">
                                                                    {(item.winner_records || []).map((rec, rIdx) => (
                                                                        <div key={rIdx} className="group/donor relative">
                                                                            <div className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-500 font-bold uppercase tracking-tighter cursor-help hover:border-emerald-500/30 hover:text-emerald-400 transition-colors">
                                                                                {rec.draw_name}
                                                                            </div>
                                                                            {/* Tooltip on hover */}
                                                                            <div className="absolute bottom-full left-0 mb-2 invisible group-hover/donor:visible bg-zinc-900 border border-zinc-700 p-2 rounded shadow-2xl z-50 w-40 pointer-events-none transition-all">
                                                                                <p className="text-[8px] font-black text-emerald-400 uppercase mb-1 tracking-widest">Draw Winner</p>
                                                                                <p className="text-[10px] font-bold text-white mb-0.5">{rec.user_name}</p>
                                                                                <p className="text-[8px] text-zinc-500">Contribution: {formatCurrency(rec.amount)}</p>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <Button
                                                                    size="sm"
                                                                    className="font-black h-8 text-[10px]"
                                                                    onClick={() => {
                                                                        setSelectedItem({
                                                                            ...item,
                                                                            amount: item.winner_donations,
                                                                            total_amount: item.winner_donations,
                                                                            type: 'winner_fund',
                                                                            donation_ids: item.winner_donation_ids
                                                                        });
                                                                        setIsPayoutModalOpen(true);
                                                                    }}
                                                                    disabled={item.winner_donations <= 0}
                                                                >
                                                                    Pay via Stripe
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </Card>

                                    {/* Section 2: Direct Donation Detail */}
                                    <Card variant="glass">
                                        <CardHeader className="flex flex-row items-center justify-between">
                                            <h2 className="text-lg font-bold text-white uppercase tracking-wider">2. Direct Gift Ledger</h2>
                                            <span className="text-[10px] text-pink-500 font-black uppercase tracking-widest">Individual Donations</span>
                                        </CardHeader>
                                        <div className="p-6">
                                            <div className="space-y-4">
                                                {charitySummary.filter(c => c.direct_donations > 0).length === 0 ? (
                                                    <div className="py-12 text-center text-zinc-500 border border-dashed border-zinc-700 rounded-2xl">
                                                        No direct gifts recorded in this cycle.
                                                    </div>
                                                ) : charitySummary.filter(c => c.direct_donations > 0).map(charity => (
                                                    <div key={charity.charity_id} className="space-y-3">
                                                        <div className="flex items-center justify-between px-4 py-3 bg-zinc-800/20 rounded-xl border border-zinc-100/5">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-sm">🏢</div>
                                                                <div>
                                                                    <h3 className="font-black text-white text-sm uppercase tracking-tight">{charity.name}</h3>
                                                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-none mt-1">Beneficiary Institution</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-[10px] text-zinc-500 uppercase font-black block mb-0.5">PENDING GIFTS</span>
                                                                <span className="text-lg font-black text-pink-400 leading-none">{formatCurrency(charity.direct_donations)}</span>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                            {charity.direct_donors.map((donor, idx) => (
                                                                <div key={idx} className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-pink-500/30 transition-all">
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <div>
                                                                            <p className="text-xs font-black text-white leading-none">{donor.donor}</p>
                                                                            <p className="text-[10px] text-zinc-500 mt-1">{donor.email}</p>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <p className="text-sm font-black text-white">{formatCurrency(donor.amount)}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-zinc-800">
                                                                        <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter">
                                                                            {new Date(donor.date).toLocaleDateString()}
                                                                        </span>
                                                                        <button
                                                                            onClick={() => {
                                                                                setSelectedItem({
                                                                                    ...charity,
                                                                                    amount: donor.amount,
                                                                                    total_amount: donor.amount,
                                                                                    type: 'direct_gift',
                                                                                    donation_ids: [donor.id],
                                                                                    donor_name: donor.donor,
                                                                                    donor_email: donor.email
                                                                                });
                                                                                setIsPayoutModalOpen(true);
                                                                            }}
                                                                            className="text-[9px] font-black text-pink-500 uppercase hover:underline"
                                                                        >
                                                                            Settle Individual
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="pt-4 flex justify-end">
                                                            <Button
                                                                size="sm"
                                                                className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-black tracking-widest h-9 px-6 flex items-center gap-2"
                                                                onClick={() => {
                                                                    setSelectedItem({
                                                                        ...charity,
                                                                        amount: charity.direct_donations,
                                                                        total_amount: charity.direct_donations,
                                                                        type: 'direct_batch',
                                                                        donation_ids: charity.direct_donation_ids
                                                                    });
                                                                    setIsPayoutModalOpen(true);
                                                                }}
                                                            >
                                                                <span>📦</span>
                                                                BATCH SETTLE ALL PENDING GIFTS
                                                            </Button>
                                                        </div>
                                                        <div className="h-4" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            )}

                            {/* TAB: HISTORY */}
                            {activeTab === 'history' && (
                                <div className="space-y-8">
                                    {/* 1. Direct Donation History */}
                                    <Card variant="glass">
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <h2 className="text-lg font-bold text-white uppercase tracking-wider">Direct Donation History</h2>
                                                <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Distributed Ledger</span>
                                            </div>
                                        </CardHeader>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="border-b border-zinc-700/50 text-[10px] uppercase tracking-widest text-zinc-500">
                                                        <th className="px-6 py-4">Date</th>
                                                        <th className="px-6 py-4">Charity</th>
                                                        <th className="px-6 py-4">Amount</th>
                                                        <th className="px-6 py-4">Status</th>
                                                        <th className="px-6 py-4">Reference</th>
                                                        <th className="px-6 py-4 text-right">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-zinc-800/50">
                                                    {payoutHistory.filter(p => p.donations?.length > 0 && p.donations.every(d => d.source === 'direct')).length === 0 ? (
                                                        <tr>
                                                            <td colSpan="6" className="px-6 py-12 text-center text-zinc-500 italic">No direct donation records found.</td>
                                                        </tr>
                                                    ) : payoutHistory.filter(p => p.donations?.length > 0 && p.donations.every(d => d.source === 'direct')).map(payout => (
                                                        <tr key={payout.id} className="hover:bg-white/5 transition-colors text-sm">
                                                            <td className="px-6 py-4 text-zinc-400">
                                                                {new Date(payout.created_at).toLocaleDateString()}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-lg bg-zinc-800 overflow-hidden border border-zinc-700 shrink-0">
                                                                        <img
                                                                            src={payout.charities?.logo_url || 'https://images.unsplash.com/photo-1599305090748-39322251147d?auto=format&fit=crop&q=80&w=200'}
                                                                            alt={payout.charities?.name}
                                                                            className="w-full h-full object-cover"
                                                                            referrerPolicy="no-referrer"
                                                                            onError={(e) => {
                                                                                e.target.onerror = null;
                                                                                const fallback = payout.charities?.logo_url || 'https://images.unsplash.com/photo-1599305090748-39322251147d?auto=format&fit=crop&q=80&w=200';
                                                                                if (e.target.src !== fallback) e.target.src = fallback;
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-bold text-white">{payout.charities?.name}</div>
                                                                        <div className="text-[10px] text-zinc-500 uppercase tracking-tighter">
                                                                            Donor: {payout.donations?.[0]?.profiles?.full_name || 'Anonymous'}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 font-black text-white">
                                                                {formatCurrency(payout.amount)}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${payout.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                                                                    }`}>
                                                                    {payout.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-zinc-500 font-mono text-[10px]">
                                                                {payout.payout_ref || '--'}
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                {payout.status === 'pending' && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => {
                                                                            setSelectedItem({
                                                                                ...payout,
                                                                                charity_id: payout.charity_id,
                                                                                name: payout.charities?.name,
                                                                                stripe_account_id: payout.charities?.stripe_account_id,
                                                                                type: 'individual_settlement'
                                                                            });
                                                                            setIsPayoutModalOpen(true);
                                                                        }}
                                                                    >
                                                                        Settle
                                                                    </Button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </Card>

                                    {/* 2. Charity from Winning Amount */}
                                    <Card variant="glass">
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <h2 className="text-lg font-bold text-white uppercase tracking-wider">Charity from Winning Amount</h2>
                                                <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Winner Contributions</span>
                                            </div>
                                        </CardHeader>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="border-b border-zinc-700/50 text-[10px] uppercase tracking-widest text-zinc-500">
                                                        <th className="px-6 py-4">Beneficiary Charity</th>
                                                        <th className="px-6 py-4">Contribution Source</th>
                                                        <th className="px-6 py-4">Total Fund Amount</th>
                                                        <th className="px-6 py-4">Settlement Reference</th>
                                                        <th className="px-6 py-4 text-right">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-zinc-800/50">
                                                    {payoutHistory.filter(p => p.status === 'paid' && p.donations?.some(d => d.source === 'prize_split' || d.source === 'subscription' || d.source === 'winner_manual') && !p.donations.every(d => d.source === 'direct')).length === 0 ? (
                                                        <tr>
                                                            <td colSpan="4" className="px-6 py-12 text-center text-zinc-500 italic">No winner-led distributions recorded.</td>
                                                        </tr>
                                                    ) : payoutHistory.filter(p => p.status === 'paid' && p.donations?.some(d => d.source === 'prize_split' || d.source === 'subscription' || d.source === 'winner_manual') && !p.donations.every(d => d.source === 'direct')).map(payout => (
                                                        <tr key={payout.id} className="hover:bg-white/5 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-lg bg-zinc-800 overflow-hidden border border-zinc-700">
                                                                        <img
                                                                            src={payout.charities?.logo_url || 'https://images.unsplash.com/photo-1599305090748-39322251147d?auto=format&fit=crop&q=80&w=200'}
                                                                            alt={payout.charities?.name}
                                                                            className="w-full h-full object-cover"
                                                                            referrerPolicy="no-referrer"
                                                                            onError={(e) => {
                                                                                e.target.onerror = null;
                                                                                const fallback = payout.charities?.logo_url || 'https://images.unsplash.com/photo-1599305090748-39322251147d?auto=format&fit=crop&q=80&w=200';
                                                                                if (e.target.src !== fallback) e.target.src = fallback;
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <div className="font-bold text-white text-sm">{payout.charities?.name}</div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="space-y-1">
                                                                    {payout.donations_detail?.length > 0 ? (
                                                                        payout.donations_detail.map((rec, nIdx) => (
                                                                            <div key={nIdx} className="flex items-center gap-2">
                                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/30"></span>
                                                                                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">
                                                                                    Prize Contribution by {rec.profiles?.full_name || 'User'} ({rec.pool_info}) - {formatCurrency(rec.amount)}
                                                                                </span>
                                                                            </div>
                                                                        ))
                                                                    ) : (
                                                                        <div className="text-[10px] text-zinc-500 italic font-bold uppercase tracking-tight">
                                                                            {payout.detail_label || 'Winner Contributions Batch'}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="text-base font-black text-emerald-400">{formatCurrency(payout.amount)}</div>
                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                    {payout.donations_detail?.length > 0 ? (
                                                                        Array.from(new Set(payout.donations_detail.map(d => d.draws?.month_year).filter(Boolean))).map((drawName, dIdx) => (
                                                                            <div key={dIdx} className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-500 font-bold uppercase tracking-tighter">
                                                                                {drawName}
                                                                            </div>
                                                                        ))
                                                                    ) : (
                                                                        <div className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-500 font-bold uppercase tracking-tighter">
                                                                            Settled History
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="font-mono text-[10px] text-emerald-500 font-bold mb-0.5">{payout.payout_ref || '--'}</div>
                                                                <div className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">
                                                                    Paid: {new Date(payout.updated_at).toLocaleDateString()}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <button
                                                                    onClick={() => handleDownloadCharityReceipt(payout)}
                                                                    className="w-8 h-8 ml-auto rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/50 transition-all"
                                                                    title="Download Charity Receipt"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                                    </svg>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </Card>

                                    {/* 3. Player Settlement History */}
                                    <Card variant="glass">
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <h2 className="text-lg font-bold text-white uppercase tracking-wider">Player Settlement History</h2>
                                                <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Winner Prize Payouts</span>
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
                                                        <th className="px-6 py-4 text-center">Receipt</th>
                                                        <th className="px-6 py-4 font-black">Gross</th>
                                                        <th className="px-6 py-4 font-black">Charity</th>
                                                        <th className="px-6 py-4 font-black">Paid Amt</th>
                                                        <th className="px-6 py-4">Ref</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-zinc-800/50">
                                                    {playerHistory.filter(w => !w.isCharity).length === 0 ? (
                                                        <tr>
                                                            <td colSpan="6" className="px-6 py-12 text-center text-zinc-500 italic">No player settlement records found.</td>
                                                        </tr>
                                                    ) : playerHistory.filter(w => !w.isCharity).map(winner => (
                                                        <tr key={winner.id} className="hover:bg-white/5 transition-colors text-sm">
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
                                                            <td className="px-6 py-4 text-center">
                                                                <button
                                                                    onClick={() => handleDownloadWinnerReceipt(winner)}
                                                                    className="w-8 h-8 mx-auto rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/50 transition-all"
                                                                    title="Download Digital Receipt"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                                    </svg>
                                                                </button>
                                                            </td>
                                                            <td className="px-6 py-4 font-bold text-zinc-300">
                                                                {formatCurrency(winner.gross_prize)}
                                                            </td>
                                                            <td className="px-6 py-4 font-bold text-rose-500">
                                                                -{formatCurrency(winner.charity_amount)}
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
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Payout Modal */}
            {/* Payout Modal */}
            <Modal
                isOpen={isPayoutModalOpen}
                onClose={() => setIsPayoutModalOpen(false)}
                title={activeTab === 'players' ? "Confirm Winner Payout" : "Record Charity Distribution"}
                size="md"
            >
                <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between">
                        <div>
                            <p className="text-zinc-400 text-[9px] uppercase font-black tracking-widest mb-0.5 opacity-60">Payment Amount</p>
                            <p className="text-2xl font-black text-white">
                                {formatCurrency(activeTab === 'players' ? selectedItem?.net_payout : selectedItem?.total_amount || selectedItem?.amount)}
                            </p>
                        </div>
                        {selectedItem?.stripe_account_id ? (
                            <div className="text-right">
                                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 mb-1">
                                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[8px] font-black text-emerald-500 uppercase">Stripe Linked</span>
                                </div>
                                <p className="text-[9px] font-mono text-zinc-600">{selectedItem.stripe_account_id.slice(0, 12)}...</p>
                            </div>
                        ) : (
                            <div className="text-right">
                                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20">
                                    <span className="text-[8px] font-black text-amber-500 uppercase italic">Manual Bank Transfer</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col justify-center min-h-[60px]">
                            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">
                                {activeTab === 'players' ? 'Batch Cycle' : 'Beneficiary'}
                            </p>
                            <p className="text-white font-bold text-xs truncate">
                                {activeTab === 'players' ? selectedItem?.month_year : (selectedItem?.name || selectedItem?.charities?.name)}
                            </p>
                            {selectedItem?.type === 'direct_gift' && (
                                <p className="text-[8px] text-pink-500 font-bold leading-none mt-1 truncate">
                                    Donor: {selectedItem?.donor_name}
                                </p>
                            )}
                        </div>
                        <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col justify-center min-h-[60px]">
                            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Type</p>
                            <p className={`text-[9px] font-black uppercase tracking-tighter ${selectedItem?.type?.includes('direct') ? 'text-pink-400' : 'text-emerald-400'}`}>
                                {selectedItem?.type === 'winner_fund' && "🏆 Winner Fund"}
                                {selectedItem?.type === 'direct_gift' && "🎁 Direct Gift"}
                                {selectedItem?.type === 'direct_batch' && "📦 Batch Gift"}
                                {activeTab === 'players' && "👤 Winner Payout"}
                            </p>
                        </div>
                    </div>

                    {!selectedItem?.stripe_account_id && (
                        <div className="relative">
                            <Input
                                label="Transaction Reference"
                                placeholder="Bank Ref or Receipt #"
                                value={payoutRef}
                                onChange={(e) => setPayoutRef(e.target.value)}
                                className="!py-2"
                            />
                        </div>
                    )}

                    <div className="bg-zinc-900/40 p-3 rounded-lg border border-zinc-800/40">
                        <p className="text-[9px] text-zinc-500 leading-tight">
                            {selectedItem?.stripe_account_id
                                ? "Funds will be routed via Stripe Connect. A digital receipt will be automatically generated and logged."
                                : "No Stripe account linked. You MUST enter a bank reference above to mark this as paid."}
                        </p>
                    </div>

                    <div className="flex gap-3 pt-1">
                        <Button variant="ghost" fullWidth onClick={() => setIsPayoutModalOpen(false)} className="h-10 text-xs">
                            Cancel
                        </Button>
                        <Button
                            fullWidth
                            className="h-10 text-xs"
                            onClick={handleMarkBatchPaid}
                            disabled={processing || (!selectedItem?.stripe_account_id && !payoutRef)}
                        >
                            {processing ? "Processing..." : (
                                selectedItem?.type === 'direct_gift' ? "Settle Gift" : "Settle Distribution"
                            )}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Granular Individual Settlement Modal (Receipt Style) */}
            {selectedWinner && (
                <Modal
                    isOpen={isWinnerModalOpen}
                    onClose={() => { setIsWinnerModalOpen(false); setSelectedWinner(null); }}
                    title="Settlement Archive"
                    size="lg"
                >
                    <div className="flex flex-col lg:flex-row gap-8 pb-10">
                        {/* LEFT: Structural Receipt */}
                        <div className="flex-1 lg:max-w-[400px]">
                            <div className="bg-[#f8f9fa] dark:bg-white text-zinc-950 p-8 rounded-lg shadow-2xl relative overflow-hidden flex flex-col font-mono" style={{ boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5)' }}>
                                <div className="text-center space-y-2 mb-6 border-b border-dashed border-zinc-300 pb-6">
                                    <h3 className="text-2xl font-black tracking-tighter">GOLFCHARITY.</h3>
                                    <p className="text-[10px] uppercase font-bold tracking-widest opacity-60">Digital Settlement Receipt</p>
                                    <div className="flex justify-center gap-1 mt-2">
                                        {[...Array(30)].map((_, i) => <div key={i} className="w-1 h-0.5 bg-zinc-950/10" />)}
                                    </div>
                                </div>

                                <div className="space-y-4 text-xs">
                                    <div className="flex justify-between border-b border-zinc-100 pb-2">
                                        <span className="opacity-50 uppercase font-black text-[8px] tracking-widest">Settlement ID</span>
                                        <span className="font-bold font-mono">#{selectedWinner.id.slice(0, 8).toUpperCase()}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-zinc-100 pb-2">
                                        <span className="opacity-50 uppercase font-black text-[8px] tracking-widest">Draw Cycle</span>
                                        <span className="font-bold">{unpaidWinners.find(b => b.draw_id === expandedDrawId)?.month_year || 'Historical Cycle'}</span>
                                    </div>
                                    <div className="pt-4 pb-2">
                                        <p className="opacity-50 uppercase font-black text-[8px] tracking-widest mb-1">Beneficiary</p>
                                        <p className="font-black text-xl uppercase tracking-tighter">{selectedWinner['Name']}</p>
                                        <p className="text-[10px] opacity-60 font-medium italic">{selectedWinner['Email']}</p>
                                    </div>
                                    <div className="py-4 border-y border-dashed border-zinc-300 space-y-3">
                                        <div className="flex justify-between">
                                            <span className="opacity-60 text-[10px] uppercase font-bold">Gross Prize Pool</span>
                                            <span className="font-bold">{formatCurrency(selectedWinner['Gross Prize'])}</span>
                                        </div>
                                        <div className="flex justify-between text-rose-600">
                                            <span className="opacity-60 text-[10px] uppercase font-bold">Charity Donation</span>
                                            <span className="font-bold">-{formatCurrency(selectedWinner['Charity Donation'])}</span>
                                        </div>
                                        <div className="flex justify-between font-black text-xl pt-2 border-t border-zinc-100 mt-2">
                                            <span className="uppercase tracking-tighter">NET TOTAL</span>
                                            <span className="text-emerald-700">{formatCurrency(selectedWinner['Net Payout'])}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 flex flex-col items-center gap-2 opacity-30">
                                    <div className="h-10 w-full flex items-end gap-0.5 px-2">
                                        {[...Array(40)].map((_, i) => (
                                            <div key={i} className="bg-zinc-950 flex-1" style={{ height: `${Math.random() * 100}%`, minWidth: '1px' }} />
                                        ))}
                                    </div>
                                    <p className="text-[8px] uppercase tracking-[0.5em] font-black">Settled via golf platform</p>
                                </div>

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
                                <div className="p-5 rounded-2xl border border-white/5 bg-zinc-800/50 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-zinc-900 text-zinc-500 flex items-center justify-center">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{selectedWinner['Match Tier']} Fulfillment</p>
                                            <p className="text-xl font-black uppercase tracking-tight text-zinc-300">Awaiting Payment</p>
                                        </div>
                                    </div>
                                    <span className="px-3 py-1 rounded bg-black/40 text-[10px] font-black text-zinc-500 uppercase tracking-widest border border-white/5 italic">AUD</span>
                                </div>
                            </div>

                            <div className="flex-1 space-y-6">
                                <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-4">
                                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] px-2 mb-2">Remittance Target</h4>
                                    {isFetchingPayout ? (
                                        <div className="py-4 text-center text-zinc-600 text-[10px] uppercase font-black tracking-widest italic animate-pulse">Syncing Banking Data...</div>
                                    ) : (payoutDetails?.bank_name || payoutDetails?.account_number || payoutDetails?.stripe_account_id) ? (
                                        <div className="grid grid-cols-2 gap-y-4 px-2">
                                            <div>
                                                <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Institution</p>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-white uppercase">{payoutDetails.bank_name || 'STRIPE CONNECT'}</p>
                                                    {payoutDetails.stripe_account_id && (
                                                        <span className="px-1.5 py-0.5 rounded-sm bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase">Active</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">BSB/Swift</p>
                                                <p className="text-sm font-bold text-white font-mono">{payoutDetails.bsb_number || '---'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Account No.</p>
                                                <p className="text-sm font-bold text-white font-mono">
                                                    {payoutDetails.account_number || (payoutDetails.stripe_account_id ? `${payoutDetails.stripe_account_id.slice(0, 8)}...` : '---')}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Reference</p>
                                                <p className="text-sm font-bold text-emerald-400 font-mono tracking-tighter truncate">GOLF_SETTLE_{selectedWinner.id.slice(0, 4)}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-6 px-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-center">
                                            <p className="text-[10px] font-black uppercase text-amber-500 tracking-widest mb-2">⚠️ Missing Banking Profile</p>
                                            <p className="text-[9px] text-zinc-500 leading-relaxed">
                                                This user has not completed their payout profile. You must manually contact {selectedWinner['Name']} via {selectedWinner['Email']} before processing this settlement.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-10 border-t border-white/5">
                                <div className="col-span-2">
                                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-3 px-1">Execute Settlement</p>
                                    {!payoutDetails?.stripe_account_id && (
                                        <div className="mb-4">
                                            <Input
                                                placeholder="Enter Bank Reference or Receipt ID..."
                                                value={payoutRef}
                                                onChange={(e) => setPayoutRef(e.target.value)}
                                                className="!bg-black/40 border-white/5 !py-3 font-mono text-emerald-400 placeholder:text-zinc-700 h-14"
                                            />
                                        </div>
                                    )}
                                </div>
                                <Button
                                    onClick={handleOpenStripe}
                                    disabled={processing || !payoutDetails?.stripe_account_id}
                                    className="h-16 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-emerald-500/10"
                                    variant="primary"
                                >
                                    Stripe Process
                                </Button>
                                <Button
                                    onClick={() => handleMarkWinnerAsPaid(selectedWinner.id)}
                                    disabled={processing || (!payoutDetails?.stripe_account_id && !payoutRef.trim())}
                                    className="h-16 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl border border-white/10 hover:border-white/20"
                                    variant="outline"
                                >
                                    Manual Payout
                                </Button>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </PageTransition>
    );
}
