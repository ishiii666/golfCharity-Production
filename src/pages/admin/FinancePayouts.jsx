import { useState, useEffect } from 'react';
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
    getUnpaidWinners,
    getCharityPayoutSummary,
    getCharityPayouts,
    markWinnerAsPaid,
    createCharityPayout,
    markCharityPayoutAsPaid,
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

    // UI states
    const [selectedItem, setSelectedItem] = useState(null);
    const [payoutRef, setPayoutRef] = useState('');
    const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'players') {
                const winners = await getUnpaidWinners();
                setUnpaidWinners(winners);
            } else if (activeTab === 'charities') {
                const summary = await getCharityPayoutSummary();
                setCharitySummary(summary);
            } else if (activeTab === 'history') {
                const history = await getCharityPayouts();
                setPayoutHistory(history);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            addToast('error', 'Failed to refresh financial data');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenPayoutModal = (item) => {
        setSelectedItem(item);
        setPayoutRef('');
        setIsPayoutModalOpen(true);
    };

    const handleMarkAsPaid = async () => {
        if (!selectedItem) return;
        setProcessing(true);
        try {
            if (activeTab === 'players') {
                const result = await markWinnerAsPaid(selectedItem.id, payoutRef, user?.id);
                if (result.success) {
                    addToast('success', `Payout recorded for ${selectedItem.profiles?.full_name}`);
                    setUnpaidWinners(prev => prev.filter(w => w.id !== selectedItem.id));
                } else {
                    throw new Error(result.error);
                }
            } else if (activeTab === 'charities') {
                // If it's the summary view, we first create a payout record
                if (!selectedItem.id) {
                    const createResult = await createCharityPayout(
                        selectedItem.charity_id,
                        selectedItem.total_amount,
                        selectedItem.donation_ids
                    );
                    if (createResult.success) {
                        // Then mark it as paid
                        await markCharityPayoutAsPaid(createResult.payoutId, payoutRef);
                    } else {
                        throw new Error(createResult.error);
                    }
                } else {
                    // History view - just mark as paid
                    await markCharityPayoutAsPaid(selectedItem.id, payoutRef);
                }
                addToast('success', 'Charity payout recorded successfully');
                fetchData();
            }
            setIsPayoutModalOpen(false);
        } catch (error) {
            addToast('error', error.message || 'Payment processing failed');
        } finally {
            setProcessing(false);
        }
    };

    const handleExport = () => {
        if (activeTab === 'players') {
            const data = unpaidWinners.map(w => ({
                'Name': w.profiles?.full_name,
                'BSB': w.profiles?.bsb_number,
                'Account': w.profiles?.account_number,
                'Amount': w.net_payout,
                'Draw': w.draws?.month_year,
                'Tier': w.tier
            }));
            exportToCSV(data, 'Pending_Player_Payouts');
        } else if (activeTab === 'charities') {
            const data = charitySummary.map(c => ({
                'Charity': c.name,
                'Amount': c.total_amount,
                'Transactions': c.donation_ids.length
            }));
            exportToCSV(data, 'Pending_Charity_Payouts');
        } else {
            const data = payoutHistory.map(h => ({
                'Date': new Date(h.created_at).toLocaleDateString(),
                'Charity': h.charities?.name,
                'Amount': h.amount,
                'Status': h.status,
                'Reference': h.payout_ref
            }));
            exportToCSV(data, 'Payout_History');
        }
        addToast('success', 'Exporting CSV data...');
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
                                                    <th className="px-6 py-4">Winner</th>
                                                    <th className="px-6 py-4">Draw</th>
                                                    <th className="px-6 py-4">Prize Tier</th>
                                                    <th className="px-6 py-4">Amount</th>
                                                    <th className="px-6 py-4">Banking Info</th>
                                                    <th className="px-6 py-4 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-800/50">
                                                {unpaidWinners.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="6" className="px-6 py-12 text-center text-zinc-500">No pending winner payouts found.</td>
                                                    </tr>
                                                ) : unpaidWinners.map(winner => (
                                                    <tr key={winner.id} className="hover:bg-white/5 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-white">{winner.profiles?.full_name}</div>
                                                            <div className="text-xs text-zinc-500">{winner.user_id.slice(0, 8)}...</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-sm text-zinc-300 font-medium">{winner.draws?.month_year}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${winner.tier === 1 ? 'bg-amber-500/10 text-amber-500' :
                                                                winner.tier === 2 ? 'bg-violet-500/10 text-violet-500' :
                                                                    'bg-teal-500/10 text-teal-500'
                                                                }`}>
                                                                Tier {winner.tier}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-lg font-black text-emerald-400">{formatCurrency(winner.net_payout)}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-xs text-zinc-400 space-y-1">
                                                                <p><span className="text-zinc-600 font-bold uppercase">BSB:</span> {winner.profiles?.bsb_number || 'N/A'}</p>
                                                                <p><span className="text-zinc-600 font-bold uppercase">ACC:</span> {winner.profiles?.account_number || 'N/A'}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <Button size="sm" onClick={() => handleOpenPayoutModal(winner)}>
                                                                Mark as Paid
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            )}

                            {/* TAB: CHARITY PAYOUTS */}
                            {activeTab === 'charities' && (
                                <Card variant="glass">
                                    <CardHeader>
                                        <h2 className="text-lg font-bold text-white">Pending Charity Distributions</h2>
                                    </CardHeader>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-zinc-700/50 text-[10px] uppercase tracking-widest text-zinc-500">
                                                    <th className="px-6 py-4">Charity</th>
                                                    <th className="px-6 py-4">Supporters</th>
                                                    <th className="px-6 py-4">Total Pending</th>
                                                    <th className="px-6 py-4">Source</th>
                                                    <th className="px-6 py-4 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-800/50">
                                                {charitySummary.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="5" className="px-6 py-12 text-center text-zinc-500">No active charities found.</td>
                                                    </tr>
                                                ) : charitySummary.map(item => (
                                                    <tr key={item.charity_id} className="hover:bg-white/5 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-lg bg-zinc-800 overflow-hidden border border-zinc-700">
                                                                    <img
                                                                        src={item.logo_url || 'https://images.unsplash.com/photo-1599305090748-39322251147d?auto=format&fit=crop&q=80&w=200'}
                                                                        alt={item.name}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                </div>
                                                                <div className="font-bold text-white">{item.name}</div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-sm text-zinc-300 font-medium">{item.supporter_count || 0} active</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-lg font-black text-emerald-400">{formatCurrency(item.total_amount)}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${item.donation_ids.length > 0 ? 'bg-blue-500/10 text-blue-400' : 'bg-zinc-800 text-zinc-500'}`}>
                                                                {item.donation_ids.length > 0 ? `${item.donation_ids.length} Records` : 'Projected'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleOpenPayoutModal(item)}
                                                                disabled={item.total_amount <= 0 && item.donation_ids.length === 0}
                                                            >
                                                                Process Payout
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            )}

                            {/* TAB: HISTORY */}
                            {activeTab === 'history' && (
                                <Card variant="glass">
                                    <CardHeader>
                                        <h2 className="text-lg font-bold text-white">Charity Payout History</h2>
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
                                                {payoutHistory.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="6" className="px-6 py-12 text-center text-zinc-500">No payout history found.</td>
                                                    </tr>
                                                ) : payoutHistory.map(payout => (
                                                    <tr key={payout.id} className="hover:bg-white/5 transition-colors text-sm">
                                                        <td className="px-6 py-4 text-zinc-400">
                                                            {new Date(payout.created_at).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-white">{payout.charities?.name}</div>
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
                                                        <td className="px-6 py-4 text-zinc-500 font-mono text-xs">
                                                            {payout.status === 'paid' ? (payout.payout_ref || 'No ref') : '--'}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            {payout.status === 'pending' && (
                                                                <Button size="sm" variant="outline" onClick={() => handleMarkAsPaid(payout)}>
                                                                    Mark Paid
                                                                </Button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            )}
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Payout Modal */}
            <Modal
                isOpen={isPayoutModalOpen}
                onClose={() => setIsPayoutModalOpen(false)}
                title={activeTab === 'players' ? "Confirm Winner Payout" : "Record Charity Distribution"}
                size="md"
            >
                <div className="space-y-6">
                    <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                        <p className="text-zinc-400 text-sm mb-1 uppercase tracking-widest font-black text-[10px]">Payment Amount</p>
                        <p className="text-3xl font-black text-white">
                            {formatCurrency(activeTab === 'players' ? selectedItem?.net_payout : selectedItem?.total_amount || selectedItem?.amount)}
                        </p>
                    </div>

                    <div className="space-y-4">
                        {activeTab === 'players' && (
                            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Recipient Details</p>
                                <p className="text-white font-bold">{selectedItem?.profiles?.full_name}</p>
                                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-800">
                                    <div>
                                        <p className="text-[10px] text-zinc-600 font-black uppercase">BSB</p>
                                        <p className="text-zinc-300 font-mono tracking-wider">{selectedItem?.profiles?.bsb_number || '---'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-zinc-600 font-black uppercase">Account</p>
                                        <p className="text-zinc-300 font-mono tracking-wider">{selectedItem?.profiles?.account_number || '---'}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'charities' && (
                            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Charity</p>
                                <p className="text-white font-bold">{selectedItem?.name || selectedItem?.charities?.name}</p>
                            </div>
                        )}

                        <Input
                            label="Transaction Reference"
                            placeholder="e.g. EBAY-12345 or Bank Ref"
                            value={payoutRef}
                            onChange={(e) => setPayoutRef(e.target.value)}
                        />

                        <p className="text-[10px] text-zinc-500 leading-relaxed">
                            Warning: This action will mark the transaction as settled in the database.
                            Ensure you have actually initiated the transfer via your bank portal before confirming.
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <Button variant="ghost" fullWidth onClick={() => setIsPayoutModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            fullWidth
                            onClick={handleMarkAsPaid}
                            disabled={processing}
                        >
                            {processing ? "Recording..." : "Confirm Settlement"}
                        </Button>
                    </div>
                </div>
            </Modal>
        </PageTransition>
    );
}
