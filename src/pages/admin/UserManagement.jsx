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

                    {/* Filters */}
                    <Card variant="glass" className="mb-6">
                        <CardContent>
                            <div className="flex flex-wrap gap-3 items-center">
                                <div className="flex-1 min-w-[200px]">
                                    <Input
                                        placeholder="Search by name or email..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="px-3 py-2 rounded-lg text-sm"
                                    style={{
                                        background: 'rgba(26, 77, 46, 0.3)',
                                        border: '1px solid rgba(201, 162, 39, 0.2)',
                                        color: '#f9f5e3',
                                        minWidth: '100px'
                                    }}
                                >
                                    <option value="all" style={{ background: '#0f3621' }}>All Status</option>
                                    <option value="active" style={{ background: '#0f3621' }}>Active</option>
                                    <option value="suspended" style={{ background: '#0f3621' }}>Suspended</option>
                                </select>
                                <select
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value)}
                                    className="px-3 py-2 rounded-lg text-sm"
                                    style={{
                                        background: 'rgba(26, 77, 46, 0.3)',
                                        border: '1px solid rgba(201, 162, 39, 0.2)',
                                        color: '#f9f5e3',
                                        minWidth: '120px'
                                    }}
                                >
                                    <option value="name-asc" style={{ background: '#0f3621' }}>A-Z</option>
                                    <option value="name-desc" style={{ background: '#0f3621' }}>Z-A</option>
                                    <option value="date-newest" style={{ background: '#0f3621' }}>Newest</option>
                                    <option value="date-oldest" style={{ background: '#0f3621' }}>Oldest</option>
                                </select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Users Table */}
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                            <p style={{ color: 'var(--color-neutral-400)' }}>Loading users...</p>
                        </div>
                    ) : sortedUsers.length === 0 ? (
                        <div className="text-center py-12">
                            <p style={{ color: 'var(--color-neutral-400)' }}>No users found.</p>
                        </div>
                    ) : (
                        <Card variant="glass" className="overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(201, 162, 39, 0.1)' }}>
                                            <th className="text-left py-4 px-4 text-zinc-400">User</th>
                                            <th className="text-left py-4 px-4 text-zinc-400">Role</th>
                                            <th className="text-left py-4 px-4 text-zinc-400">Status</th>
                                            <th className="text-left py-4 px-4 text-zinc-400">Subscription</th>
                                            <th className="text-left py-4 px-4 text-zinc-400">Joined</th>
                                            <th className="text-right py-4 px-4 text-zinc-400">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedUsers.map((user) => (
                                            <tr
                                                key={user.id}
                                                className="hover:bg-white/5 transition-colors"
                                                style={{ borderBottom: '1px solid rgba(201, 162, 39, 0.05)' }}
                                            >
                                                <td className="py-4 px-4">
                                                    <div>
                                                        <p className="font-medium" style={{ color: 'var(--color-cream-100)' }}>
                                                            {user.fullName}
                                                        </p>
                                                        <p className="text-sm" style={{ color: 'var(--color-neutral-500)' }}>
                                                            {user.email}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-xs font-medium ${user.role === 'admin'
                                                            ? 'bg-amber-500/20 text-amber-400'
                                                            : 'bg-slate-500/20 text-slate-300'
                                                            }`}
                                                    >
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-xs font-medium ${user.status === 'active'
                                                            ? 'bg-emerald-500/20 text-emerald-400'
                                                            : 'bg-red-500/20 text-red-400'
                                                            }`}
                                                    >
                                                        {user.status}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.subscription === 'annual'
                                                            ? 'bg-violet-500/20 text-violet-400'
                                                            : user.subscription === 'monthly'
                                                                ? 'bg-emerald-500/20 text-emerald-400'
                                                                : 'bg-red-500/20 text-red-400'
                                                            }`}>
                                                            {user.subscription === 'none' ? 'Not Subscribed' : user.subscription}
                                                        </span>
                                                        <button
                                                            onClick={() => handleSyncUser(user)}
                                                            className="p-1 hover:bg-white/10 rounded-full transition-colors text-zinc-500 hover:text-emerald-400"
                                                            title="Sync with Stripe"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 text-zinc-400">
                                                    {user.joinDate}
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="ghost" size="sm" onClick={() => handleEdit(user)}>
                                                            Edit
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openStatusConfirmation(user)}
                                                        >
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
