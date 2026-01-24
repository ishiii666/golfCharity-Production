import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useToast } from '../ui/Toast';
import {
    getUserById,
    getUserStats,
    updateRow,
    adminUpdatePassword,
    assignSubscription,
    logActivity
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
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState('overview');
    const [originalValues, setOriginalValues] = useState({});
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Track changes by comparing current state with original values
    useEffect(() => {
        if (!editData || !originalValues) return;

        let changed = false;
        // Compare keys that are editable in the profile form
        const keysToCompare = [
            'fullName', 'email', 'role', 'status',
            'bankName', 'bsbNumber', 'accountNumber',
            'selectedCharityId', 'subscription'
        ];

        for (const key of keysToCompare) {
            if (String(editData[key] || '') !== String(originalValues[key] || '')) {
                changed = true;
                break;
            }
        }

        // Special check for password - if anything is typed, it's a change
        if (editData.password && editData.password.length > 0) {
            changed = true;
        }

        setHasUnsavedChanges(changed);
    }, [editData, originalValues]);

    // Fetch latest data on open
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setActiveTab('overview');
            try {
                const [latestProfile, latestStats] = await Promise.all([
                    getUserById(userId),
                    getUserStats(userId)
                ]);

                if (latestProfile) {
                    const userData = {
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
                        stripeCustomerId: latestProfile.stripe_customer_id || '',
                        currentPeriodEnd: latestProfile.subscriptions?.[0]?.current_period_end || null,
                        assignedDrawMonth: latestProfile.subscriptions?.[0]?.assigned_draw_month || null,
                        password: ''
                    };
                    setEditData(userData);
                    setOriginalValues(userData);
                }
                setUserStats(latestStats);
            } catch (error) {
                console.error('Error fetching real-time data:', error);
            } finally {
                setLoading(false);
            }
        };

        if (isOpen && userId) {
            fetchData();
        }
    }, [isOpen, userId]);

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

            addToast('success', 'User settings updated successfully');

            // Update original values to match new state
            setOriginalValues({ ...editData, password: '' });
            setEditData(prev => ({ ...prev, password: '' }));

            onUpdate();
        } catch (error) {
            console.error('Error saving user:', error);
            addToast('error', 'Failed to save changes');
        } finally {
            setSaving(false);
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
                    className="relative w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.8)]"
                    style={{
                        background: 'linear-gradient(165deg, #0f172a 0%, #020617 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                >
                    {/* Glowing Accents */}
                    <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
                    {/* Modal Header */}
                    <div className="flex items-center justify-between p-6 lg:px-10 border-b border-white/[0.05] bg-white/[0.01] relative z-20">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-blue-500/5 flex items-center justify-center border border-white/10 shadow-2xl relative group overflow-hidden shrink-0">
                                <div className="absolute inset-0 bg-emerald-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <svg className="w-7 h-7 text-emerald-400 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h3 className="text-2xl font-bold text-white tracking-tight leading-none">{editData.fullName || 'Player Profile'}</h3>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-colors ${editData.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                        {editData.status || '...'}
                                    </span>
                                </div>
                                <p className="text-slate-400 text-[11px] font-medium tracking-wide flex items-center gap-2 mt-1.5 opacity-80">
                                    <svg className="w-3.5 h-3.5 text-emerald-500/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    {editData.email}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="group p-2.5 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-all border border-transparent hover:border-white/10">
                            <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Tab Navigation */}
                    <div className="px-10 bg-white/[0.01] relative z-10 border-b border-white/[0.03]">
                        <div className="flex items-center gap-6">
                            {[
                                { id: 'overview', label: 'User Overview', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
                                { id: 'financials', label: 'Financials & Payouts', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
                                { id: 'security', label: 'Settings & Security', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`group px-2 py-5 text-[10px] font-black uppercase tracking-[0.25em] flex items-center gap-3 relative transition-all duration-300 ${activeTab === tab.id ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    <svg className={`w-4 h-4 transition-all duration-500 ${activeTab === tab.id ? 'text-emerald-400' : 'group-hover:translate-y-[-2px]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                                    </svg>
                                    {tab.label}
                                    {activeTab === tab.id && (
                                        <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
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

                        {/* TABS CONTENT */}
                        {activeTab === 'overview' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                                    {[
                                        { label: 'Total Prize Winnings', value: `$${userStats?.totalWinnings?.toLocaleString() || '0.00'}`, icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', gradient: 'from-emerald-500/10 to-transparent' },
                                        { label: 'Withdrawable Balance', value: `$${Math.max(0, userStats?.currentBalance || 0).toLocaleString()}`, icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', gradient: 'from-blue-500/10 to-transparent' },
                                        { label: 'Platform Tenure', value: userStats?.membershipMonths ? `${userStats.membershipMonths} Months` : 'New Member', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', gradient: 'from-violet-500/10 to-transparent' },
                                        { label: 'Total Paid Out', value: `$${userStats?.totalPaidOut?.toLocaleString() || '0.00'}`, icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6', gradient: 'from-amber-500/10 to-transparent' }
                                    ].map((stat, i) => (
                                        <div key={i} className={`group p-6 rounded-[2rem] bg-gradient-to-br ${stat.gradient} border border-white/5 hover:border-white/10 transition-all duration-500 relative overflow-hidden`}>
                                            <div className="relative z-10">
                                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                                                <p className="text-2xl font-black text-white tracking-tighter">{stat.value}</p>
                                            </div>
                                            <div className="absolute top-[-20%] right-[-10%] opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700">
                                                <svg className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                                                </svg>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid lg:grid-cols-2 gap-10">
                                    <div className="space-y-8">
                                        <div className="flex items-center gap-4">
                                            <h4 className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.3em]">Basic Information</h4>
                                            <div className="flex-1 h-[1px] bg-white/5"></div>
                                        </div>
                                        <div className="space-y-6">
                                            <Input label="Profile Display Name" value={editData.fullName || ''} onChange={(e) => setEditData({ ...editData, fullName: e.target.value })} className="bg-slate-900/40" />
                                            <Input label="System Email Address" value={editData.email || ''} onChange={(e) => setEditData({ ...editData, email: e.target.value })} className="bg-slate-900/40" />
                                            <div className="px-6 py-5 rounded-2xl bg-white/[0.02] border border-white/5">
                                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1.5">Official Join Date</p>
                                                <p className="text-slate-300 font-bold text-base">{userStats?.joinDate ? new Date(userStats.joinDate).toLocaleDateString() : '...'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-8">
                                        <div className="flex items-center gap-4">
                                            <h4 className="text-[11px] font-black text-blue-400 uppercase tracking-[0.3em]">Beneficiary & Support</h4>
                                            <div className="flex-1 h-[1px] bg-white/5"></div>
                                        </div>
                                        <div className="p-8 rounded-[2.5rem] bg-gradient-to-b from-white/[0.03] to-transparent border border-white/5 space-y-6">
                                            <div className="space-y-2">
                                                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">Selected Charity Partner</label>
                                                <div className="relative">
                                                    <select
                                                        value={editData.selectedCharityId || ''}
                                                        onChange={(e) => setEditData({ ...editData, selectedCharityId: e.target.value })}
                                                        className="w-full px-5 py-4 rounded-xl bg-slate-900/60 border border-white/10 text-white outline-none focus:border-emerald-500/50 transition-all text-sm appearance-none cursor-pointer pr-12 font-medium"
                                                    >
                                                        <option value="">No Charity Selected</option>
                                                        {charities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                    </select>
                                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'financials' && (
                            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-12">
                                <div className="max-w-4xl mx-auto space-y-8">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[11px] font-black text-blue-400 uppercase tracking-[0.3em]">Settlement Archive</h4>
                                        <span className="px-3 py-1 rounded bg-blue-500/10 text-[9px] font-black text-blue-400 uppercase tracking-widest border border-blue-500/20">Verified Payments</span>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        {userStats?.payouts?.length > 0 ? (
                                            userStats.payouts.map(payout => (
                                                <div key={payout.id} className="p-6 rounded-[1.5rem] bg-white/[0.02] border border-white/5 flex items-center justify-between group hover:bg-white/[0.04] transition-all duration-300">
                                                    <div>
                                                        <p className="text-white text-xl font-black tracking-tighter">-${Number(payout.amount).toLocaleString()}</p>
                                                        <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest mt-0.5">{new Date(payout.transfer_date).toLocaleDateString()}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.1em] bg-white/5 border border-white/5 py-1.5 px-4 rounded-full block mb-1">REF: {payout.reference?.slice(0, 12) || 'SYSTEM'}</span>
                                                        <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest mr-2 flex items-center justify-end gap-1">
                                                            <div className="w-1 h-1 rounded-full bg-emerald-500" /> Confirmed
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="md:col-span-2 p-20 rounded-[3rem] border border-dashed border-white/5 flex flex-col items-center justify-center text-center">
                                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
                                                    <svg className="w-8 h-8 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <h5 className="text-white font-bold mb-1">No Transaction History</h5>
                                                <p className="text-slate-500 text-xs max-w-xs">This user has not received any settlements or withdrawals yet.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'security' && (
                            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-10 py-6">
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="p-10 rounded-[3rem] bg-white/[0.02] border border-white/5 shadow-2xl relative overflow-hidden flex flex-col">
                                        <div className="absolute top-0 right-0 p-10 opacity-[0.02] pointer-events-none">
                                            <svg className="w-32 h-32 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                            </svg>
                                        </div>
                                        <h4 className="text-[11px] font-black text-blue-400 uppercase tracking-[0.3em] mb-8">Access Control</h4>
                                        <div className="space-y-6 relative z-10 flex-1">
                                            <div className="space-y-3">
                                                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">Platform Status</label>
                                                <select value={editData.status || ''} onChange={(e) => setEditData({ ...editData, status: e.target.value })} className="w-full bg-slate-900/60 border border-white/10 text-white p-4 rounded-xl outline-none focus:border-emerald-500/50 transition-all font-medium appearance-none cursor-pointer">
                                                    <option value="active">Active Access</option>
                                                    <option value="suspended">Restricted Access</option>
                                                </select>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">Subscription Override</label>
                                                <select value={editData.subscription || 'none'} onChange={(e) => setEditData({ ...editData, subscription: e.target.value })} className="w-full bg-slate-900/60 border border-white/10 text-white p-4 rounded-xl outline-none focus:border-emerald-500/50 transition-all font-medium appearance-none cursor-pointer">
                                                    <option value="none">No Active Plan</option>
                                                    <option value="monthly">Monthly Recurring ($11)</option>
                                                    <option value="annual">Annual Commitment ($108)</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-10 rounded-[3rem] bg-gradient-to-br from-amber-500/[0.04] to-transparent border border-amber-500/10 space-y-6 relative overflow-hidden shadow-2xl">
                                        <div className="flex items-center gap-3 text-amber-200">
                                            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                            </svg>
                                            <p className="text-sm font-bold tracking-tight uppercase">Credential Override</p>
                                        </div>
                                        <p className="text-slate-500 text-[10px] font-medium leading-relaxed">System-level reset of user credentials. The user will be required to re-authenticate using the new password on their next session.</p>
                                        <div className="pt-2">
                                            <Input label="New System Password" type="password" value={editData.password || ''} onChange={(e) => setEditData({ ...editData, password: e.target.value })} placeholder="••••••••" className="bg-slate-900/60 border-white/5 focus:border-amber-500/30 font-mono" />
                                        </div>
                                        <div className="mt-4 p-4 rounded-2xl bg-black/40 border border-white/5">
                                            <div className="flex justify-between items-center text-[10px] text-zinc-500 font-black uppercase tracking-widest">
                                                <span>Security Level</span>
                                                <span className="text-emerald-500">Encrypted</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-3 gap-8">
                                    <div className="md:col-span-2 p-10 rounded-[3rem] bg-white/[0.01] border border-white/5 relative overflow-hidden">
                                        <div className="flex items-center justify-between mb-8">
                                            <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Billing & Engine Context</h4>
                                            <span className="px-3 py-1 rounded bg-white/5 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Metadata</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-8">
                                            <div>
                                                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1.5">Stripe Customer</p>
                                                <p className="text-xs font-mono text-zinc-400 truncate">{originalValues.stripeCustomerId || 'Not Linked'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1.5">Subscription status</p>
                                                <p className={`text-xs font-bold uppercase ${originalValues.subscription !== 'none' ? 'text-emerald-500' : 'text-zinc-500'}`}>{originalValues.subscription !== 'none' ? 'Active' : 'Inactive'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1.5">Period End</p>
                                                <p className="text-xs font-bold text-zinc-400">{originalValues.currentPeriodEnd ? new Date(originalValues.currentPeriodEnd).toLocaleDateString() : 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1.5">Engine Context</p>
                                                <p className="text-xs font-bold text-zinc-400 uppercase">{originalValues.assignedDrawMonth || 'Unassigned'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-10 rounded-[3rem] bg-white/[0.01] border border-white/5">
                                        <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-8">Remittance</h4>
                                        <div className="space-y-6">
                                            <Input label="Bank Institution" value={editData.bankName || ''} onChange={(e) => setEditData({ ...editData, bankName: e.target.value })} className="bg-slate-900/60" />
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input label="BSB" value={editData.bsbNumber || ''} onChange={(e) => setEditData({ ...editData, bsbNumber: e.target.value })} className="bg-slate-900/60 font-mono text-xs" />
                                                <Input label="Account" value={editData.accountNumber || ''} onChange={(e) => setEditData({ ...editData, accountNumber: e.target.value })} className="bg-slate-900/60 font-mono text-xs" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Modal Footer */}
                    <div className="p-8 lg:px-10 border-t border-white/[0.05] bg-slate-950/80 flex items-center justify-between relative z-20">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.02] border border-white/5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Verified Session: {new Date().toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-8">
                            <button onClick={onClose} className="text-slate-500 hover:text-white text-[11px] font-black uppercase tracking-[0.2em] transition-colors">Discard</button>
                            <Button
                                onClick={handleSaveUser}
                                isLoading={saving}
                                disabled={!hasUnsavedChanges || saving}
                                className={`px-12 h-14 text-[11px] font-black uppercase tracking-[0.25em] rounded-2xl transition-all ${hasUnsavedChanges ? 'shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:shadow-[0_0_40px_rgba(16,185,129,0.3)]' : 'opacity-40 grayscale pointer-events-none'}`}
                                style={{
                                    background: hasUnsavedChanges ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'rgba(255,255,255,0.05)',
                                    border: hasUnsavedChanges ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.02)'
                                }}
                            >
                                {hasUnsavedChanges ? 'Save Settings' : 'No Changes Detected'}
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
