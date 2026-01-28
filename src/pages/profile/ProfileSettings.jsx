import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import PageTransition from '../../components/layout/PageTransition';
import Card, { CardContent, CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { fadeUp, staggerContainer, staggerItem } from '../../utils/animations';

export default function ProfileSettings() {
    const { user, updateProfile, changePassword, deleteAccount, logout } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');

    // Password modal state
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordError, setPasswordError] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // Delete account modal state (only for non-admin users)
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        golfHandicap: '',
        homeClub: '',
        state: 'VIC',
        bankName: '',
        bsbNumber: '',
        accountNumber: '',
        notifications: {
            email: true,
            drawResults: true,
            newsletter: false,
            charityUpdates: true
        }
    });

    // Initialize form with user data
    useEffect(() => {
        if (user) {
            setFormData({
                fullName: user.fullName || '',
                email: user.email || '',
                phone: user.phone || '',
                golfHandicap: user.golfHandicap || '',
                homeClub: user.homeClub || '',
                state: user.state || 'VIC',
                bankName: user.bankName || '',
                bsbNumber: user.bsbNumber ? String(user.bsbNumber).replace(/\D/g, '') : '',
                accountNumber: user.accountNumber ? String(user.accountNumber).replace(/\D/g, '') : '',
                notifications: user.notificationSettings || {
                    email: true,
                    drawResults: true,
                    newsletter: false,
                    charityUpdates: true
                }
            });
        }
    }, [user]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNotificationChange = (key) => {
        setFormData(prev => ({
            ...prev,
            notifications: {
                ...prev.notifications,
                [key]: !prev.notifications[key]
            }
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError('');

        try {
            const result = await updateProfile({
                full_name: formData.fullName,
                phone: formData.phone || null,
                state: formData.state,
                golf_handicap: formData.golfHandicap ? parseFloat(formData.golfHandicap) : null,
                home_club: formData.homeClub || null,
                bank_name: formData.bankName || null,
                bsb_number: formData.bsbNumber || null,
                account_number: formData.accountNumber || null,
                notification_settings: formData.notifications
            });

            if (!result.success) {
                throw new Error(result.error || 'Failed to update profile');
            }

            setIsEditing(false);
            setSuccessMessage('Profile updated successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Handle password change
    const handlePasswordChange = async () => {
        setPasswordError('');

        if (passwordForm.newPassword.length < 6) {
            setPasswordError('Password must be at least 6 characters');
            return;
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordError('Passwords do not match');
            return;
        }

        setIsChangingPassword(true);

        try {
            const result = await changePassword(
                passwordForm.currentPassword,
                passwordForm.newPassword
            );

            if (!result.success) {
                throw new Error(result.error);
            }

            setShowPasswordModal(false);
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setSuccessMessage('Password changed successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            setPasswordError(err.message);
        } finally {
            setIsChangingPassword(false);
        }
    };

    // Handle delete account (only for non-admin users)
    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'DELETE' || isAdmin) {
            return;
        }

        setIsDeleting(true);
        setError('');

        try {
            console.log('🚮 Starting account deletion process...');
            const result = await deleteAccount();

            if (!result.success) {
                throw new Error(result.error || 'Failed to delete account');
            }

            console.log('✅ Account deleted from database, performing final logout...');

            // Logout and redirect to home page with a query param to show we're done
            try {
                await logout();
            } catch (logoutErr) {
                console.warn('Logout after deletion failed (expected if user is gone):', logoutErr);
            }

            // Critical: Use a clean redirect
            window.location.href = '/?account_deleted=true';
        } catch (err) {
            console.error('❌ Deletion failed:', err);
            setError(err.message || 'An unexpected error occurred during account deletion. Please try again or contact support.');
            setIsDeleting(false);
        }
    };

    const states = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT'];

    // Masking helpers for banking details
    const maskBSB = (bsb) => {
        if (!bsb) return 'xxx-xxx';
        return 'xxx-xxx';
    };

    const maskAccountNumber = (acc) => {
        if (!acc) return 'xxxxxx';
        const str = String(acc).replace(/\D/g, ''); // Only consider numeric digits
        if (str.length <= 2) return 'xxxx' + str;
        return 'xxxx' + str.slice(-2);
    };


    return (
        <PageTransition>
            <div className="py-8 lg:py-12">
                <div className="container-app max-w-4xl">
                    {/* Header */}
                    <motion.div
                        variants={fadeUp}
                        initial="initial"
                        animate="animate"
                        className="mb-8"
                    >
                        <h1 className="text-3xl lg:text-4xl font-bold mb-2" style={{ color: 'var(--color-cream-100)' }}>
                            Profile Settings
                        </h1>
                        <p style={{ color: 'var(--color-neutral-400)' }}>
                            Manage your account details and preferences
                        </p>
                    </motion.div>

                    {/* Success Message */}
                    {successMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 rounded-xl"
                            style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}
                        >
                            <p className="text-green-400 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {successMessage}
                            </p>
                        </motion.div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 rounded-xl"
                            style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                        >
                            <p className="text-red-400 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                {error}
                            </p>
                        </motion.div>
                    )}

                    {/* Action Buttons - Above Personal Information */}
                    <div className="flex items-center justify-end gap-3 mb-4">
                        {isEditing && (
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleSave}
                                disabled={isSaving}
                            >
                                {isSaving ? 'Saving...' : 'Save'}
                            </Button>
                        )}
                        <Button
                            variant={isEditing ? "ghost" : "outline"}
                            size="sm"
                            onClick={() => setIsEditing(!isEditing)}
                        >
                            {isEditing ? 'Cancel' : 'Edit Profile'}
                        </Button>
                    </div>

                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        animate="animate"
                        className="space-y-6"
                    >
                        {/* Profile Picture & Basic Info */}
                        <motion.div variants={staggerItem}>
                            <Card variant="glass">
                                <CardHeader>
                                    <h2 className="text-xl font-bold" style={{ color: 'var(--color-cream-100)' }}>
                                        Personal Information
                                    </h2>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-col md:flex-row gap-8">
                                        {/* Avatar */}
                                        <div className="flex flex-col items-center">
                                            <div
                                                className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold mb-4"
                                                style={{
                                                    background: 'linear-gradient(135deg, #1a4d2e 0%, #0f3621 100%)',
                                                    border: '3px solid rgba(201, 162, 39, 0.4)',
                                                    color: '#c9a227'
                                                }}
                                            >
                                                {formData.fullName?.charAt(0)?.toUpperCase() || 'U'}
                                            </div>
                                        </div>

                                        {/* Form Fields */}
                                        <div className="flex-1 space-y-4">
                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-neutral-300)' }}>
                                                        Full Name
                                                    </label>
                                                    <Input
                                                        name="fullName"
                                                        value={formData.fullName}
                                                        onChange={handleInputChange}
                                                        disabled={!isEditing}
                                                        placeholder="Your full name"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-neutral-300)' }}>
                                                        Email Address
                                                    </label>
                                                    <Input
                                                        name="email"
                                                        type="email"
                                                        value={formData.email}
                                                        onChange={handleInputChange}
                                                        disabled={true}
                                                        placeholder="your@email.com"
                                                    />
                                                    <p className="text-xs mt-1" style={{ color: 'var(--color-neutral-500)' }}>
                                                        Email cannot be changed from here
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-neutral-300)' }}>
                                                        State
                                                    </label>
                                                    <select
                                                        name="state"
                                                        value={formData.state}
                                                        onChange={handleInputChange}
                                                        disabled={!isEditing}
                                                        className="w-full px-4 py-3 rounded-xl text-sm transition-colors"
                                                        style={{
                                                            background: 'rgba(39, 39, 42, 0.5)',
                                                            border: '1px solid rgba(113, 113, 122, 0.3)',
                                                            color: '#f9f5e3',
                                                            outline: 'none'
                                                        }}
                                                    >
                                                        {states.map(s => (
                                                            <option key={s} value={s} style={{ background: '#27272a' }}>{s}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Golf Information */}
                        <motion.div variants={staggerItem}>
                            <Card variant="glass">
                                <CardHeader>
                                    <h2 className="text-xl font-bold" style={{ color: 'var(--color-cream-100)' }}>
                                        Golf Information
                                    </h2>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-neutral-300)' }}>
                                                Golf Handicap
                                            </label>
                                            <Input
                                                name="golfHandicap"
                                                value={formData.golfHandicap}
                                                onChange={handleInputChange}
                                                disabled={!isEditing}
                                                placeholder="e.g. 18"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-neutral-300)' }}>
                                                Home Golf Club
                                            </label>
                                            <Input
                                                name="homeClub"
                                                value={formData.homeClub}
                                                onChange={handleInputChange}
                                                disabled={!isEditing}
                                                placeholder="e.g. Royal Melbourne"
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Banking Information */}
                        <motion.div variants={staggerItem}>
                            <Card variant="glass">
                                <CardHeader>
                                    <h2 className="text-xl font-bold" style={{ color: 'var(--color-cream-100)' }}>
                                        Banking Details
                                    </h2>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-neutral-300)' }}>
                                                Bank Name
                                            </label>
                                            <Input
                                                name="bankName"
                                                value={formData.bankName}
                                                onChange={handleInputChange}
                                                disabled={!isEditing}
                                                placeholder="e.g. Westpac"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-neutral-300)' }}>
                                                BSB Code
                                            </label>
                                            <Input
                                                name="bsbNumber"
                                                type={isEditing ? "number" : "text"}
                                                value={isEditing ? formData.bsbNumber : maskBSB(formData.bsbNumber)}
                                                onChange={handleInputChange}
                                                disabled={!isEditing}
                                                placeholder="000-000"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-neutral-300)' }}>
                                                Account Number
                                            </label>
                                            <Input
                                                name="accountNumber"
                                                type={isEditing ? "number" : "text"}
                                                value={isEditing ? formData.accountNumber : maskAccountNumber(formData.accountNumber)}
                                                onChange={handleInputChange}
                                                disabled={!isEditing}
                                                placeholder="12345678"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs mt-3 italic" style={{ color: 'var(--color-neutral-500)' }}>
                                        These details are used for prize disbursements.
                                    </p>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Notification Preferences */}
                        <motion.div variants={staggerItem}>
                            <Card variant="glass">
                                <CardHeader>
                                    <h2 className="text-xl font-bold" style={{ color: 'var(--color-cream-100)' }}>
                                        Notification Preferences
                                    </h2>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {[
                                            { key: 'email', label: 'Email Notifications', desc: 'Receive important updates via email' },
                                            { key: 'drawResults', label: 'Draw Results', desc: 'Get notified when monthly draw results are published' },
                                            { key: 'newsletter', label: 'Newsletter', desc: 'Receive our monthly newsletter with golf tips' },
                                            { key: 'charityUpdates', label: 'Charity Updates', desc: 'Updates from your chosen charity' }
                                        ].map(item => (
                                            <div key={item.key} className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(26, 77, 46, 0.2)' }}>
                                                <div className="flex-1 pr-4">
                                                    <p className="font-medium" style={{ color: 'var(--color-cream-200)' }}>{item.label}</p>
                                                    <p className="text-sm" style={{ color: 'var(--color-neutral-500)' }}>{item.desc}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleNotificationChange(item.key)}
                                                    className={`relative inline-flex h-6 w-11 no-touch-target flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${formData.notifications[item.key] ? 'bg-emerald-500' : 'bg-zinc-600'}`}
                                                    aria-label={`Toggle ${item.label}`}
                                                >
                                                    <span
                                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${formData.notifications[item.key] ? 'translate-x-5' : 'translate-x-0'}`}
                                                    />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Security */}
                        <motion.div variants={staggerItem}>
                            <Card variant="glass">
                                <CardHeader>
                                    <h2 className="text-xl font-bold" style={{ color: 'var(--color-cream-100)' }}>
                                        Security
                                    </h2>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(26, 77, 46, 0.2)' }}>
                                            <div>
                                                <p className="font-medium" style={{ color: 'var(--color-cream-200)' }}>Password</p>
                                                <p className="text-sm" style={{ color: 'var(--color-neutral-500)' }}>Manage your account password</p>
                                            </div>
                                            <Button variant="outline" size="sm" onClick={() => setShowPasswordModal(true)}>Change Password</Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Save Button */}
                        {isEditing && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex justify-end gap-4"
                            >
                                <Button variant="ghost" onClick={() => setIsEditing(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleSave} disabled={isSaving}>
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </motion.div>
                        )}

                        {/* Danger Zone - Only for non-admin users */}
                        {!isAdmin && (
                            <motion.div variants={staggerItem}>
                                <Card variant="glass" className="border-red-500/20">
                                    <CardHeader>
                                        <h2 className="text-xl font-bold text-red-400">
                                            Danger Zone
                                        </h2>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium" style={{ color: 'var(--color-cream-200)' }}>Delete Account</p>
                                                <p className="text-sm" style={{ color: 'var(--color-neutral-500)' }}>
                                                    Permanently delete your account and all data
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-400 hover:bg-red-500/10"
                                                onClick={() => setShowDeleteModal(true)}
                                            >
                                                Delete Account
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}


                    </motion.div>
                </div>
            </div>
            {/* Password Change Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-md p-6 rounded-2xl"
                        style={{ background: '#1a4d2e', border: '1px solid rgba(201, 162, 39, 0.3)' }}
                    >
                        <h3 className="text-xl font-bold mb-4" style={{ color: '#c9a227' }}>
                            Change Password
                        </h3>

                        {passwordError && (
                            <div className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                <p className="text-red-400 text-sm">{passwordError}</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-neutral-300)' }}>
                                    Current Password
                                </label>
                                <Input
                                    type="password"
                                    value={passwordForm.currentPassword}
                                    onChange={(e) => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
                                    placeholder="Enter current password"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-neutral-300)' }}>
                                    New Password
                                </label>
                                <Input
                                    type="password"
                                    value={passwordForm.newPassword}
                                    onChange={(e) => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                                    placeholder="Enter new password (min 6 chars)"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-neutral-300)' }}>
                                    Confirm New Password
                                </label>
                                <Input
                                    type="password"
                                    value={passwordForm.confirmPassword}
                                    onChange={(e) => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                                    placeholder="Confirm new password"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <Button variant="ghost" fullWidth onClick={() => {
                                setShowPasswordModal(false);
                                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                                setPasswordError('');
                            }}>
                                Cancel
                            </Button>
                            <Button fullWidth onClick={handlePasswordChange} disabled={isChangingPassword}>
                                {isChangingPassword ? 'Changing...' : 'Change Password'}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Delete Account Modal - Only for non-admin users */}
            {showDeleteModal && !isAdmin && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-md p-6 rounded-2xl"
                        style={{ background: '#1a4d2e', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                    >
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                                <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-center text-red-400">
                            Delete Account
                        </h3>
                        <p className="text-sm mb-4 text-center" style={{ color: 'var(--color-neutral-400)' }}>
                            This action cannot be undone. All your data including scores, subscription, and charity selections will be permanently deleted.
                        </p>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-neutral-300)' }}>
                                Type DELETE to confirm
                            </label>
                            <Input
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder="DELETE"
                            />
                        </div>

                        <div className="flex gap-3">
                            <Button variant="ghost" fullWidth onClick={() => {
                                setShowDeleteModal(false);
                                setDeleteConfirmText('');
                            }}>
                                Cancel
                            </Button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                                className="flex-1 py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{
                                    background: deleteConfirmText === 'DELETE' ? '#ef4444' : 'rgba(239, 68, 68, 0.3)',
                                    color: 'white'
                                }}
                            >
                                {isDeleting ? 'Deleting...' : 'Delete Account'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </PageTransition>
    );
}
