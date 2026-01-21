import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';

/**
 * Premium Header with glassmorphism and refined navigation
 */
export default function Header() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const { isAuthenticated, user, logout, isAdmin, isSubscribed } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    // Handle logout with redirect
    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const navLinks = [
        { to: '/', label: 'Home' },
        { to: '/how-it-works', label: 'How It Works' },
        { to: '/charities', label: 'Charities' },
        { to: '/results', label: 'Results' }
    ];

    // Different nav links for admins vs regular users
    const authLinks = isAuthenticated
        ? isAdmin
            ? [{ to: '/admin', label: 'Admin Panel' }]  // Admin sees only Admin Panel
            : [
                { to: '/dashboard', label: 'Dashboard' },
                { to: '/scores', label: 'My Scores' },
                // My Charity only visible for subscribed users
                ...(isSubscribed ? [{ to: '/profile/charity', label: 'My Charity' }] : [])
            ]  // Regular users see player links
        : [];

    const isActive = (path) => location.pathname === path;
    const isHomePage = location.pathname === '/';

    return (
        <header className="fixed top-0 left-0 right-0 z-40">
            {/* Translucent Background with glassmorphism */}
            <div
                className="absolute inset-0"
                style={{
                    background: 'linear-gradient(to bottom, rgba(9, 9, 11, 0.6) 0%, rgba(9, 9, 11, 0.4) 70%, rgba(9, 9, 11, 0) 100%)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)'
                }}
            />

            <nav className="relative container-app">
                <div className="flex items-center justify-between h-16 lg:h-20">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3 group magnetic">
                        <motion.div
                            whileHover={{ rotate: 5, scale: 1.05 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                            className="w-10 h-10 rounded-full overflow-hidden"
                        >
                            <img
                                src="/logo.png"
                                alt="GolfCharity Logo"
                                className="w-full h-full object-cover"
                            />
                        </motion.div>
                        <span
                            className="text-xl font-semibold tracking-tight"
                            style={{ fontFamily: 'var(--font-display)' }}
                        >
                            <span style={{ color: '#ffffff' }}>GOLF</span>
                            <span style={{ color: '#10b981' }}>CHARITY</span>
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden lg:flex items-center gap-1">
                        {[...navLinks, ...authLinks].map((link) => (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-300 magnetic
                  ${isActive(link.to)
                                        ? ''
                                        : 'hover:bg-[rgba(255,255,255,0.05)]'
                                    }
                `}
                                style={{
                                    color: isActive(link.to) ? '#10b981' : '#ffffff',
                                    background: isActive(link.to) ? 'rgba(16, 185, 129, 0.1)' : 'transparent'
                                }}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    {/* Desktop CTA */}
                    <div className="hidden lg:flex items-center gap-3">
                        {isAuthenticated ? (
                            <div className="relative">
                                {/* Profile Button */}
                                <button
                                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl transition-colors hover:bg-white/5"
                                >
                                    {/* Avatar */}
                                    <div
                                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                                        style={{
                                            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                                            border: '2px solid rgba(16, 185, 129, 0.4)',
                                            color: '#10b981'
                                        }}
                                    >
                                        {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                                    </div>
                                    <span className="text-sm font-medium text-white">
                                        {user?.fullName?.split(' ')[0]}
                                    </span>
                                    <svg
                                        className={`w-4 h-4 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        style={{ color: 'var(--color-neutral-400)' }}
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* Profile Dropdown */}
                                <AnimatePresence>
                                    {profileDropdownOpen && (
                                        <>
                                            {/* Backdrop */}
                                            <div
                                                className="fixed inset-0 z-40"
                                                onClick={() => setProfileDropdownOpen(false)}
                                            />
                                            <motion.div
                                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                transition={{ duration: 0.15 }}
                                                className="absolute top-full mt-2 right-0 z-50 w-64 rounded-xl overflow-hidden"
                                                style={{
                                                    background: 'rgba(9, 9, 11, 0.98)',
                                                    backdropFilter: 'blur(20px)',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                                                }}
                                            >
                                                {/* User Info Header */}
                                                <div className="p-4 border-b border-white/10">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="flex items-center justify-center text-lg font-bold flex-shrink-0"
                                                            style={{
                                                                width: '48px',
                                                                height: '48px',
                                                                minWidth: '48px',
                                                                minHeight: '48px',
                                                                borderRadius: '50%',
                                                                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                                                                border: '2px solid rgba(16, 185, 129, 0.4)',
                                                                color: '#10b981'
                                                            }}
                                                        >
                                                            {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-white">
                                                                {user?.fullName || 'User'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Menu Items */}
                                                <div className="py-2">
                                                    {/* Admin Panel - shown first for admins */}
                                                    {isAdmin && (
                                                        <Link
                                                            to="/admin"
                                                            onClick={() => setProfileDropdownOpen(false)}
                                                            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5"
                                                            style={{ color: '#c9a227' }}
                                                        >
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                            </svg>
                                                            Admin Panel
                                                        </Link>
                                                    )}

                                                    {/* Player-only items - hidden for admins */}
                                                    {!isAdmin && (
                                                        <Link
                                                            to="/pricing"
                                                            onClick={() => setProfileDropdownOpen(false)}
                                                            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5"
                                                            style={{ color: 'var(--color-neutral-300)' }}
                                                        >
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                                            </svg>
                                                            Subscription
                                                        </Link>
                                                    )}

                                                    {/* Profile Settings - available for everyone */}
                                                    <Link
                                                        to="/profile/settings"
                                                        onClick={() => setProfileDropdownOpen(false)}
                                                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5"
                                                        style={{ color: 'var(--color-neutral-300)' }}
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                        Profile Settings
                                                    </Link>
                                                </div>

                                                {/* Logout - At Bottom */}
                                                <div className="border-t p-2" style={{ borderColor: 'rgba(201, 162, 39, 0.15)' }}>
                                                    <button
                                                        onClick={() => {
                                                            setProfileDropdownOpen(false);
                                                            handleLogout();
                                                        }}
                                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-red-500/10"
                                                        style={{ color: '#ef4444' }}
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                        </svg>
                                                        Sign Out
                                                    </button>
                                                </div>
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <>
                                <Link to="/login">
                                    <Button variant="ghost" size="sm">Log In</Button>
                                </Link>
                                <Link to="/signup">
                                    <Button variant="primary" size="sm">Get Started</Button>
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="lg:hidden p-2 transition-colors"
                        style={{ color: '#f3ecd0' }}
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {isMobileMenuOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                </div>

                {/* Mobile Menu */}
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="lg:hidden overflow-hidden"
                            style={{ zIndex: 50 }}
                        >
                            <div className="py-4 space-y-2">
                                {[...navLinks, ...authLinks].map((link) => (
                                    <Link
                                        key={link.to}
                                        to={link.to}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={`block px-4 py-3 rounded-xl text-base font-medium transition-colors`}
                                        style={{
                                            color: isActive(link.to) ? '#c9a227' : '#f3ecd0',
                                            background: isActive(link.to) ? 'rgba(201, 162, 39, 0.1)' : 'transparent'
                                        }}
                                    >
                                        {link.label}
                                    </Link>
                                ))}

                                <div
                                    className="pt-4 mt-4 border-t space-y-2"
                                    style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                                >
                                    {isAuthenticated ? (
                                        <Button variant="ghost" fullWidth onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}>
                                            Logout
                                        </Button>
                                    ) : (
                                        <>
                                            <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                                                <Button variant="ghost" fullWidth>Log In</Button>
                                            </Link>
                                            <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                                                <Button variant="primary" fullWidth>Get Started</Button>
                                            </Link>
                                        </>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>
        </header>
    );
}
