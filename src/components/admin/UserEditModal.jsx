import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../ui/Button';
import Input from '../ui/Input';
import {
    getUserById,
    getUserStats,
    updateRow,
    adminUpdatePassword,
    assignSubscription,
    logActivity,
    recordPayout
} from '../../lib/supabaseRest';

export default function UserEditModal({
    isOpen,
    onClose,
    userId,
    initialUser = null,
    charities = [],
    onUpdate = () => { }
}) {
    const [editData, setEditData] = useState(initialUser || {});
    const [userStats, setUserStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [payoutSaving, setPayoutSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [payoutData, setPayoutData] = useState({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        reference: ''
    });
    const [actionMessage, setActionMessage] = useState({ type: '', text: '' });

    // Fetch latest data on open
    useEffect(() => {
        if (isOpen && userId) {
            fetchLatestData();
        }
    }, [isOpen, userId]);

    const fetchLatestData = async () => {
        setLoading(true);
        setActiveTab('overview');
        try {
            const [latestProfile, latestStats] = await Promise.all([
                getUserById(userId),
                getUserStats(userId)
            ]);

            if (latestProfile) {
                setEditData({
                    id: latestProfile.id,
                    email: latestProfile.email,
                    fullName: latestProfile.full_name,
                    role: latestProfile.role,
                    status: latestProfile.status,
                    bankName: latestProfile.bank_name || '',
                    bsbNumber: latestProfile.bsb_number || '',
                    accountNumber: latestProfile.account_number || '',
                    accountBalance: latestProfile.account_balance || 0,
                    selectedCharityId: latestProfile.selected_charity_id || '',
                    subscription: latestProfile.subscriptions?.[0]?.plan || 'none',
                    password: ''
                });
            }
            setUserStats(latestStats);
        } catch (error) {
            console.error('Error fetching real-time data:', error);
        } finally {
            setLoading(false);
        }
    };

    const showMessage = (type, text) => {
        setActionMessage({ type, text });
        setTimeout(() => setActionMessage({ type: '', text: '' }), 4000);
    };

    const handleSaveUser = async () => {
        setSaving(true);
        try {
            await updateRow('profiles', editData.id, {
                full_name: editData.fullName,
                email: editData.email,
                role: editData.role,
                status: editData.status,
                bank_name: editData.bankName,
                bsb_number: editData.bsbNumber,
                account_number: editData.accountNumber,
                selected_charity_id: editData.selectedCharityId || null
            });

            if (editData.password && editData.password.trim().length >= 6) {
                await adminUpdatePassword(editData.id, editData.password);
            }

            // Sync subscription if changed
            // This is simplified for the component
            await assignSubscription(editData.id, editData.subscription || 'none');

            await logActivity('admin_action', `Updated user: ${editData.fullName}`, {
                userId: editData.id
            });

            showMessage('success', 'User settings updated successfully');
            onUpdate();
        } catch (error) {
            console.error('Error saving user:', error);
            showMessage('error', 'Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const handleRecordPayout = async () => {
        setPayoutSaving(true);
        try {
            await recordPayout(editData.id, payoutData.amount, payoutData.date, payoutData.reference);

            // Local update
            const newBalance = (editData.accountBalance || 0) - Number(payoutData.amount);
            setEditData({ ...editData, accountBalance: newBalance });

            // Refresh stats
            const newStats = await getUserStats(editData.id);
            setUserStats(newStats);

            setPayoutData({ amount: '', date: new Date().toISOString().split('T')[0], reference: '' });
            showMessage('success', 'Payout recorded successfully');
            onUpdate();
        } catch (error) {
            console.error('Payout failed:', error);
            showMessage('error', 'Failed to record payout');
        } finally {
            setPayoutSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/98 backdrop-blur-xl"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 50, scale: 0.98 }}
                    className="relative w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)]"
                    style={{
                        background: 'linear-gradient(165deg, #0a2518 0%, #040d08 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                >
                    {/* Modal Header */}
                    <div className="flex items-center justify-between p-5 lg:px-8 border-b border-white/[0.05] bg-white/[0.02] relative z-20">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center border border-white/10 shadow-inner group overflow-hidden shrink-0">
                                <div className="absolute inset-0 bg-emerald-500/10 blur-xl group-hover:bg-emerald-500/30 transition-all duration-700" />
                                <svg className="w-6 h-6 text-emerald-400 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <div>
                                <div className="flex items-center gap-2.5">
                                    <h3 className="text-xl font-bold text-white tracking-tight">{editData.fullName || 'Player Profile'}</h3>
                                    <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${editData.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                                        {editData.status || '...'}
                                    </span>
                                </div>
                                <p className="text-zinc-500 text-[10px] font-semibold tracking-wide flex items-center gap-1.5 mt-0.5">
                                    <svg className="w-3 h-3 opacity-40 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    {editData.email}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="group p-2.5 rounded-full hover:bg-white/10 text-zinc-500 hover:text-white transition-all border border-transparent hover:border-white/10">
                            <svg className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Tab Navigation */}
                    <div className="px-6 lg:px-8 bg-white/[0.01] relative z-10 border-b border-white/[0.05]">
                        <div className="flex items-center gap-2">
                            {[
                                { id: 'overview', label: 'User Overview', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
                                { id: 'financials', label: 'Financials & Payouts', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
                                { id: 'security', label: 'Settings & Security', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`group px-4 py-4 text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2.5 relative transition-all duration-300 ${activeTab === tab.id ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    <svg className={`w-3.5 h-3.5 transition-transform duration-500 ${activeTab === tab.id ? 'scale-110' : 'group-hover:scale-110'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                                    </svg>
                                    {tab.label}
                                    {activeTab === tab.id && (
                                        <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500 to-emerald-500/0" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Modal Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 relative z-10 overscroll-contain" data-lenis-prevent="true">
                        {loading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md z-50">
                                <div className="w-16 h-16 relative">
                                    <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full" />
                                    <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                                <p className="mt-6 text-zinc-400 font-black text-[10px] uppercase tracking-[0.3em] animate-pulse">Syncing Secure Data...</p>
                            </div>
                        )}

                        <AnimatePresence>
                            {actionMessage.text && (
                                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`mb-8 p-4 rounded-[1.25rem] border backdrop-blur-xl ${actionMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-400/20 text-emerald-400 shadow-emerald-500/10 shadow-2xl' : 'bg-red-500/10 border-red-400/20 text-red-400 shadow-red-500/10 shadow-2xl'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${actionMessage.type === 'success' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                                                {actionMessage.type === 'success' ? '✓' : '✕'}
                                            </div>
                                            <span className="text-sm font-bold tracking-tight">{actionMessage.text}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* TABS CONTENT */}
                        {activeTab === 'overview' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Total Prize Winnings', value: `$${userStats?.totalWinnings?.toLocaleString() || '0.00'}`, icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'emerald' },
                                        { label: 'Withdrawable Balance', value: `$${(editData.accountBalance || 0).toLocaleString()}`, icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', color: 'amber' },
                                        { label: 'Platform Tenure', value: userStats?.membershipMonths ? `${userStats.membershipMonths} Months` : 'New Member', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', color: 'violet' },
                                        { label: 'Total Paid Out', value: `$${userStats?.totalPaidOut?.toLocaleString() || '0.00'}`, icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6', color: 'blue' }
                                    ].map((stat, i) => (
                                        <div key={i} className="group p-5 rounded-[1.5rem] bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-500 relative overflow-hidden">
                                            <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.15em] mb-0.5">{stat.label}</p>
                                            <p className="text-lg font-bold text-white tracking-tight">{stat.value}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid lg:grid-cols-2 gap-12">
                                    <div className="space-y-8">
                                        <div className="flex items-center gap-4 mb-2">
                                            <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Basic Information</h4>
                                            <div className="flex-1 h-[1px] bg-white/[0.03]"></div>
                                        </div>
                                        <div className="space-y-5">
                                            <Input label="Profile Display Name" value={editData.fullName || ''} onChange={(e) => setEditData({ ...editData, fullName: e.target.value })} className="bg-black/60 border-white/[0.08]" />
                                            <Input label="System Email Address" value={editData.email || ''} onChange={(e) => setEditData({ ...editData, email: e.target.value })} className="bg-black/60 border-white/[0.08]" />
                                            <div className="px-5 py-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                                                <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mb-1.5">Official Join Date</p>
                                                <p className="text-zinc-300 font-bold text-sm">{userStats?.joinDate ? new Date(userStats.joinDate).toLocaleDateString() : '...'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-8">
                                        <div className="flex items-center gap-4 mb-2">
                                            <h4 className="text-[10px] font-black text-violet-500 uppercase tracking-[0.3em]">Beneficiary & Support</h4>
                                            <div className="flex-1 h-[1px] bg-white/[0.03]"></div>
                                        </div>
                                        <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/[0.06] space-y-5">
                                            <label className="block text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-3 px-1">Selected Charity Partner</label>
                                            <select
                                                value={editData.selectedCharityId || ''}
                                                onChange={(e) => setEditData({ ...editData, selectedCharityId: e.target.value })}
                                                className="w-full px-5 py-4 rounded-xl bg-black/60 border border-white/[0.1] text-white outline-none focus:border-violet-500 transition-all text-sm appearance-none cursor-pointer"
                                            >
                                                <option value="">No Charity Selected</option>
                                                {charities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'financials' && (
                            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="grid lg:grid-cols-2 gap-12">
                                <div className="space-y-10">
                                    <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-emerald-500/[0.06] to-transparent border border-emerald-500/20 space-y-6 relative overflow-hidden group/payout">
                                        <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-4">Payout Processing</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Input label="Release Amount ($)" type="number" value={payoutData.amount} onChange={(e) => setPayoutData({ ...payoutData, amount: e.target.value })} className="bg-black/60 border-white/[0.08] py-4" />
                                            <Input label="Settlement Date" type="date" value={payoutData.date} onChange={(e) => setPayoutData({ ...payoutData, date: e.target.value })} className="bg-black/60 border-white/[0.08] py-4" />
                                        </div>
                                        <Input label="External Reference" value={payoutData.reference} onChange={(e) => setPayoutData({ ...payoutData, reference: e.target.value })} placeholder="TXN-XXXX" className="bg-black/60 border-white/[0.08] py-4" />
                                        <Button fullWidth onClick={handleRecordPayout} isLoading={payoutSaving} disabled={!payoutData.amount} className="h-14 rounded-2xl">Authorize Settlement</Button>
                                    </div>

                                    <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/[0.08] relative overflow-hidden">
                                        <h5 className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mb-6 px-1 flex items-center gap-3">Banking Credentials</h5>
                                        <div className="space-y-6 relative z-10 p-2">
                                            <Input label="Bank Name" value={editData.bankName || ''} onChange={(e) => setEditData({ ...editData, bankName: e.target.value })} className="bg-black/60 border-white/[0.08]" />
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input label="BSB" value={editData.bsbNumber || ''} onChange={(e) => setEditData({ ...editData, bsbNumber: e.target.value })} className="bg-black/60 border-white/[0.08] font-mono" />
                                                <Input label="Account" value={editData.accountNumber || ''} onChange={(e) => setEditData({ ...editData, accountNumber: e.target.value })} className="bg-black/60 border-white/[0.08] font-mono" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <h4 className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em]">Settlement History</h4>
                                    <div className="space-y-4 pr-1">
                                        {userStats?.payouts?.length > 0 ? (
                                            userStats.payouts.map(payout => (
                                                <div key={payout.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between group hover:bg-white/[0.05] transition-all">
                                                    <div>
                                                        <p className="text-white text-lg font-black tracking-tight">-${Number(payout.amount).toLocaleString()}</p>
                                                        <p className="text-zinc-500 text-[10px] uppercase font-black">{new Date(payout.transfer_date).toLocaleDateString()}</p>
                                                    </div>
                                                    <span className="text-zinc-600 text-[9px] font-black uppercase tracking-[0.1em] bg-black/40 border border-white/5 py-1 px-3 rounded-full">REF: {payout.reference || 'SYSTEM'}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-center py-24 text-zinc-600 font-bold uppercase tracking-widest text-[10px]">No transaction history</p>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'security' && (
                            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-12 py-6">
                                <div className="space-y-8">
                                    <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/[0.06] grid md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Access Status</label>
                                            <select value={editData.status || ''} onChange={(e) => setEditData({ ...editData, status: e.target.value })} className="w-full bg-black/60 border-white/[0.1] text-white p-4 rounded-xl">
                                                <option value="active">Active Access</option>
                                                <option value="suspended">Restricted Access</option>
                                            </select>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Pricing Plan</label>
                                            <select value={editData.subscription || 'none'} onChange={(e) => setEditData({ ...editData, subscription: e.target.value })} className="w-full bg-black/60 border-white/[0.1] text-white p-4 rounded-xl">
                                                <option value="none">No Plan</option>
                                                <option value="monthly">Monthly ($11)</option>
                                                <option value="annual">Annual ($108)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-8">
                                    <div className="p-10 rounded-[2.5rem] bg-amber-500/[0.03] border border-amber-500/20 space-y-6">
                                        <p className="text-amber-200 text-sm font-bold">Credential Override</p>
                                        <p className="text-amber-500/60 text-[10px] italic">Setting a new password will overwrite the current encrypted one.</p>
                                        <Input label="New System Password" type="password" value={editData.password || ''} onChange={(e) => setEditData({ ...editData, password: e.target.value })} placeholder="••••••••" className="bg-black/60 border-amber-500/20" />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Modal Footer */}
                    <div className="p-8 border-t border-white/[0.05] bg-black/60 flex items-center justify-between">
                        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Verified Session: {new Date().toLocaleDateString()}</p>
                        <div className="flex gap-4">
                            <button onClick={onClose} className="text-zinc-500 hover:text-white text-[10px] font-black uppercase tracking-widest">Discard</button>
                            <Button onClick={handleSaveUser} isLoading={saving} className="px-10 h-12 text-[10px] font-black uppercase tracking-widest">Save Settings</Button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
