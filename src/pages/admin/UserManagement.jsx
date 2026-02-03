import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PageTransition from '../../components/layout/PageTransition';
import Card, { CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import BackButton from '../../components/ui/BackButton';
import { useToast } from '../../components/ui/Toast';
import { fadeUp, staggerContainer, staggerItem } from '../../utils/animations';
import { getUsers, getCharities, updateRow, logActivity, syncSubscription } from '../../lib/supabaseRest';
import UserEditModal from '../../components/admin/UserEditModal';

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortOrder, setSortOrder] = useState('name-asc');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [charities, setCharities] = useState([]);
    // Confirmation modal state
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, user: null, action: null });
    const { addToast } = useToast();

    // Fetch users and charities
    useEffect(() => {
        fetchUsers();
        fetchCharities();
    }, []);

    const fetchCharities = async () => {
        try {
            const data = await getCharities();
            setCharities(data || []);
        } catch (error) {
            console.error('Error fetching charities:', error);
        }
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            console.log('👥 Fetching users via REST API...');
            const data = await getUsers();
            console.log('👥 Users received:', data.length);

            // Fetch players only (exclude admin)
            const playerProfiles = (data || [])
                .filter(u => u.role !== 'admin')
                .map(profile => ({
                    id: profile.id,
                    email: profile.email || 'No email',
                    fullName: profile.full_name || 'Unnamed User',
                    role: profile.role || 'user',
                    status: profile.status || 'active',
                    subscription: profile.subscription_type || 'none',
                    joinDate: profile.created_at ? new Date(profile.created_at).toISOString().split('T')[0] : 'Unknown',
                    totalDonated: profile.total_donated || 0,
                    // New bank fields
                    bankName: profile.bank_name || '',
                    bsbNumber: profile.bsb_number || '',
                    accountNumber: profile.account_number || '',
                    accountBalance: profile.account_balance || 0,
                    selectedCharityId: profile.selected_charity_id || ''
                }));

            setUsers(playerProfiles);
        } catch (error) {
            console.error('Error fetching users:', error);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Sort users based on sortOrder
    const sortedUsers = [...filteredUsers].sort((a, b) => {
        switch (sortOrder) {
            case 'name-asc':
                return a.fullName.localeCompare(b.fullName);
            case 'name-desc':
                return b.fullName.localeCompare(a.fullName);
            case 'date-newest':
                return new Date(b.joinDate) - new Date(a.joinDate);
            case 'date-oldest':
                return new Date(a.joinDate) - new Date(b.joinDate);
            default:
                return 0;
        }
    });

    const stats = {
        totalPlayers: users.length,
        activeSubscribers: users.filter(u => u.status === 'active' && u.subscription !== 'none').length,
        suspended: users.filter(u => u.status === 'suspended').length
    };

    const handleEdit = (user) => {
        setSelectedUser(user);
        setIsEditModalOpen(true);
    };

    // Open confirmation modal for status change
    const openStatusConfirmation = (user) => {
        setConfirmModal({
            isOpen: true,
            user: user,
            action: user.status === 'active' ? 'suspend' : 'activate'
        });
    };

    // Close confirmation modal
    const closeConfirmModal = () => {
        setConfirmModal({ isOpen: false, user: null, action: null });
    };

    // Confirm and execute status change
    const confirmStatusChange = async () => {
        const { user } = confirmModal;
        if (!user) return;

        const newStatus = user.status === 'active' ? 'suspended' : 'active';

        try {
            await updateRow('profiles', user.id, { status: newStatus });

            // Log the activity
            await logActivity('admin_action', `${newStatus === 'suspended' ? 'Suspended' : 'Activated'} user: ${user.fullName}`, {
                userId: user.id,
                newStatus: newStatus
            });

            setUsers(prev => prev.map(u =>
                u.id === user.id ? { ...u, status: newStatus } : u
            ));
            addToast('success', `${user.fullName} has been ${newStatus === 'suspended' ? 'suspended' : 'activated'}`);
        } catch (error) {
            console.error('Error toggling status:', error);
            addToast('error', 'Failed to change status. Please try again.');
        } finally {
            closeConfirmModal();
        }
    };

    // Execute sync for a single user
    const handleSyncUser = async (user) => {
        try {
            // Optimistic loading state could be added here if needed
            const result = await syncSubscription(user.id, true); // Force deep sync with Stripe
            if (result.success) {
                // Align with real-time logic used in getUsers()
                const sub = result.subscription;
                const status = sub?.status?.toLowerCase();
                const isActive = status === 'active' || status === 'trialing';
                const newPlan = isActive ? (sub?.plan || 'active') : 'none';

                // Update local status
                setUsers(prev => prev.map(u =>
                    u.id === user.id ? { ...u, subscription: newPlan } : u
                ));

                if (isActive) {
                    addToast('success', `Subscription verified: ${newPlan} for ${user.fullName}`);
                } else {
                    addToast('info', `No active subscription found for ${user.fullName}`);
                }
            } else {
                addToast('error', `Sync failed for ${user.fullName}`);
            }
        } catch (error) {
            console.error('Sync error:', error);
            addToast('error', `Failed to sync: ${error.message}`);
        }
    };

    return (
        <PageTransition>
            <div className="py-8 lg:py-12">
                <div className="container-app">
                    {/* Header */}
                    <BackButton to="/admin" label="Admin Dashboard" className="mb-6" />
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl lg:text-4xl font-bold mb-2 text-white">
                                Player Management
                            </h1>
                            <p className="text-zinc-400">
                                View and manage platform players
                            </p>
                        </div>
                    </div>

                    {/* Stats */}
                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        animate="animate"
                        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
                    >
                        {[
                            { label: 'Total Players', value: loading ? '...' : stats.totalPlayers, color: 'text-teal-400' },
                            { label: 'Active Subscribers', value: loading ? '...' : stats.activeSubscribers, color: 'text-green-400' },
                            { label: 'Suspended', value: loading ? '...' : stats.suspended, color: 'text-red-400' }
                        ].map((stat) => (
                            <motion.div key={stat.label} variants={staggerItem}>
                                <Card variant="glass" padding="p-4">
                                    <p className="text-sm" style={{ color: 'var(--color-neutral-500)' }}>{stat.label}</p>
                                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Filters - Responsive Grid */}
                    <Card variant="glass" className="mb-6">
                        <CardContent padding="p-4 lg:p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                                <div className="sm:col-span-2">
                                    <Input
                                        placeholder="Search by name or email..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full"
                                    />
                                </div>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl text-sm font-medium"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        border: '1px solid rgba(255, 255, 255, 0.05)',
                                        color: '#fff'
                                    }}
                                >
                                    <option value="all" className="bg-slate-900">All Status</option>
                                    <option value="active" className="bg-slate-900">Active Only</option>
                                    <option value="suspended" className="bg-slate-900">Suspended Only</option>
                                </select>
                                <select
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl text-sm font-medium"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        border: '1px solid rgba(255, 255, 255, 0.05)',
                                        color: '#fff'
                                    }}
                                >
                                    <option value="name-asc" className="bg-slate-900">Sort: Name (A-Z)</option>
                                    <option value="name-desc" className="bg-slate-900">Sort: Name (Z-A)</option>
                                    <option value="date-newest" className="bg-slate-900">Sort: Newest First</option>
                                    <option value="date-oldest" className="bg-slate-900">Sort: Oldest First</option>
                                </select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* User List - Responsive Table/Cards */}
                    {loading ? (
                        <div className="text-center py-20 bg-white/[0.01] rounded-[2rem] border border-white/5">
                            <div className="animate-spin w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-6"></div>
                            <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500 animate-pulse">Syncing Player Database...</p>
                        </div>
                    ) : sortedUsers.length === 0 ? (
                        <div className="text-center py-20 bg-white/[0.01] rounded-[2rem] border border-white/5">
                            <p className="text-zinc-500 font-bold">No players found matching your filters.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 lg:hidden">
                            {/* Mobile User Cards */}
                            {sortedUsers.map((user) => (
                                <Card key={user.id} variant="glass" className="relative group overflow-hidden">
                                    <div className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 font-bold uppercase">
                                                    {user.fullName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white uppercase tracking-tight">{user.fullName}</p>
                                                    <p className="text-[10px] text-zinc-500">{user.email}</p>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${user.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                {user.status}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-6 pt-4 border-t border-white/5">
                                            <div>
                                                <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mb-1">Plan</p>
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${user.subscription === 'annual' ? 'bg-violet-500/10 text-violet-400' : user.subscription === 'monthly' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-zinc-500'}`}>
                                                    {user.subscription}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mb-1">Joined</p>
                                                <p className="text-[10px] text-zinc-400 font-bold">{user.joinDate}</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button variant="primary" fullWidth size="sm" onClick={() => handleEdit(user)} className="h-10 text-[10px] font-black uppercase tracking-widest">
                                                Edit Profile
                                            </Button>
                                            <Button variant="outline" fullWidth size="sm" onClick={() => openStatusConfirmation(user)} className="h-10 text-[10px] font-black uppercase tracking-widest border-white/10">
                                                {user.status === 'active' ? 'Suspend' : 'Activate'}
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Desktop Table View */}
                    {!loading && sortedUsers.length > 0 && (
                        <div className="hidden lg:block">
                            <Card variant="glass" className="overflow-hidden border-white/5 bg-white/[0.01]">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-white/[0.05]">
                                                <th className="text-left py-5 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Player Identity</th>
                                                <th className="text-left py-5 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Access Role</th>
                                                <th className="text-left py-5 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Platform Status</th>
                                                <th className="text-left py-5 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Subscription context</th>
                                                <th className="text-left py-5 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Origin Date</th>
                                                <th className="text-right py-5 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Control Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.03]">
                                            {sortedUsers.map((user) => (
                                                <tr key={user.id} className="group hover:bg-white/[0.02] transition-colors">
                                                    <td className="py-5 px-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs font-black text-white group-hover:border-emerald-500/30 group-hover:bg-emerald-500/5 transition-all">
                                                                {user.fullName.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-white uppercase tracking-tight group-hover:text-emerald-400 transition-colors">{user.fullName}</p>
                                                                <p className="text-[10px] text-zinc-500">{user.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-5 px-6">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{user.role}</span>
                                                    </td>
                                                    <td className="py-5 px-6">
                                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.1em] border ${user.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-400/10 text-red-400 border-red-400/20'}`}>
                                                            {user.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-5 px-6">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${user.subscription === 'annual' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' : user.subscription === 'monthly' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-zinc-500'}`}>
                                                                {user.subscription}
                                                            </span>
                                                            <button
                                                                onClick={() => handleSyncUser(user)}
                                                                className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-emerald-400 transition-all"
                                                            >
                                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="py-5 px-6 text-[10px] font-bold text-zinc-500">
                                                        {user.joinDate}
                                                    </td>
                                                    <td className="py-5 px-6 text-right">
                                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(user)} className="h-8 text-[9px] font-black uppercase tracking-widest">
                                                                Edit
                                                            </Button>
                                                            <Button variant="ghost" size="sm" onClick={() => openStatusConfirmation(user)} className="h-8 text-[9px] font-black uppercase tracking-widest">
                                                                {user.status === 'active' ? 'Suspend' : 'Activate'}
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* Edit Modal */}
                    <UserEditModal
                        isOpen={isEditModalOpen}
                        onClose={() => {
                            setIsEditModalOpen(false);
                            setSelectedUser(null);
                        }}
                        userId={selectedUser?.id}
                        charities={charities}
                        onUpdate={fetchUsers}
                        onDelete={fetchUsers}
                    />

                    {/* Confirmation Modal for Suspend/Activate */}
                    <AnimatePresence>
                        {confirmModal.isOpen && confirmModal.user && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-black/60"
                                    onClick={closeConfirmModal}
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="relative w-full max-w-md p-6 rounded-2xl"
                                    style={{
                                        background: confirmModal.action === 'suspend'
                                            ? 'rgba(127, 29, 29, 0.98)'
                                            : 'rgba(15, 54, 33, 0.98)',
                                        border: confirmModal.action === 'suspend'
                                            ? '1px solid rgba(239, 68, 68, 0.3)'
                                            : '1px solid rgba(16, 185, 129, 0.3)'
                                    }}
                                >
                                    {/* Warning Icon */}
                                    <div className="flex justify-center mb-4">
                                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${confirmModal.action === 'suspend'
                                            ? 'bg-red-500/20'
                                            : 'bg-emerald-500/20'
                                            }`}>
                                            {confirmModal.action === 'suspend' ? (
                                                <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                            ) : (
                                                <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            )}
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-bold mb-2 text-center text-white">
                                        {confirmModal.action === 'suspend' ? 'Suspend User?' : 'Activate User?'}
                                    </h3>

                                    <p className="text-center mb-6 text-zinc-300">
                                        {confirmModal.action === 'suspend'
                                            ? `Are you sure you want to suspend "${confirmModal.user.fullName}"? They will lose access to their account.`
                                            : `Are you sure you want to activate "${confirmModal.user.fullName}"? They will regain access to their account.`
                                        }
                                    </p>

                                    <div className="flex gap-3">
                                        <Button variant="ghost" fullWidth onClick={closeConfirmModal}>
                                            Cancel
                                        </Button>
                                        <Button
                                            variant={confirmModal.action === 'suspend' ? 'danger' : 'primary'}
                                            fullWidth
                                            onClick={confirmStatusChange}
                                        >
                                            {confirmModal.action === 'suspend' ? 'Yes, Suspend' : 'Yes, Activate'}
                                        </Button>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </PageTransition>
    );
}
