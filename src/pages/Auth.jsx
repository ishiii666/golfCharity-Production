import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageTransition from '../components/layout/PageTransition';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { fadeUp } from '../utils/animations';

export default function Auth() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, signup, isAuthenticated, isLoading: authLoading, error: authError } = useAuth();

    const isSignup = location.pathname === '/signup';
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/dashboard');
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validation
        if (!email || !password) {
            setError('Please fill in all required fields');
            return;
        }

        if (isSignup) {
            if (password !== confirmPassword) {
                setError('Passwords do not match');
                return;
            }
            if (password.length < 6) {
                setError('Password must be at least 6 characters');
                return;
            }
        }

        setIsSubmitting(true);

        try {
            const result = isSignup
                ? await signup(email, password, fullName)
                : await login(email, password);

            if (result.success) {
                if (isSignup) {
                    // Check if email confirmation is required
                    if (result.data?.user && !result.data?.session) {
                        setSuccess('Check your email to confirm your account!');
                    } else {
                        navigate('/dashboard');
                    }
                } else {
                    navigate('/dashboard');
                }
            } else {
                setError(result.error || 'Authentication failed');
            }
        } catch (err) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authLoading) {
        return (
            <PageTransition>
                <div className="min-h-screen flex items-center justify-center">
                    <div
                        className="w-12 h-12 rounded-full border-2 animate-spin"
                        style={{ borderColor: 'rgba(16, 185, 129, 0.2)', borderTopColor: '#10b981' }}
                    />
                </div>
            </PageTransition>
        );
    }

    return (
        <PageTransition>
            <div className="min-h-screen flex items-center justify-center py-12 px-4">
                {/* Background */}
                <div className="absolute inset-0 overflow-hidden">
                    <div
                        className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full opacity-20 blur-[100px]"
                        style={{ background: 'radial-gradient(circle, #059669, transparent)' }}
                    />
                    <div
                        className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full opacity-15 blur-[80px]"
                        style={{ background: 'radial-gradient(circle, #10b981, transparent)' }}
                    />
                </div>

                <motion.div
                    variants={fadeUp}
                    initial="initial"
                    animate="animate"
                    className="relative w-full max-w-md"
                >
                    <Card variant="glass" padding="p-8">
                        {/* Logo */}
                        <div className="text-center mb-8">
                            <Link to="/" className="inline-flex items-center gap-2">
                                <div className="w-12 h-12 rounded-full overflow-hidden">
                                    <img
                                        src="/logo.png"
                                        alt="GolfCharity Logo"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </Link>
                            <h1
                                className="text-2xl font-bold mt-4 text-white"
                                style={{ fontFamily: 'var(--font-display)' }}
                            >
                                {isSignup ? 'Create Account' : 'Welcome Back'}
                            </h1>
                            <p className="text-sm mt-2 text-zinc-400">
                                {isSignup ? 'Join the noble game' : 'Sign in to continue'}
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {isSignup && (
                                <Input
                                    label="Full Name"
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="John Smith"
                                />
                            )}

                            <Input
                                label="Email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                            />

                            <Input
                                label="Password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />

                            {isSignup && (
                                <Input
                                    label="Confirm Password"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                />
                            )}

                            {/* Error/Success Messages */}
                            {(error || authError) && (
                                <div
                                    className="p-3 rounded-lg text-sm"
                                    style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e' }}
                                >
                                    {error || authError}
                                </div>
                            )}

                            {success && (
                                <div
                                    className="p-3 rounded-lg text-sm"
                                    style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}
                                >
                                    {success}
                                </div>
                            )}

                            <Button
                                type="submit"
                                variant="accent"
                                fullWidth
                                size="lg"
                                loading={isSubmitting}
                                className="mt-6"
                            >
                                {isSignup ? 'Create Account' : 'Sign In'}
                            </Button>
                        </form>

                        {/* Toggle */}
                        <div className="text-center mt-6">
                            <p className="text-sm text-zinc-400">
                                {isSignup ? 'Already have an account?' : "Don't have an account?"}
                                {' '}
                                <Link
                                    to={isSignup ? '/login' : '/signup'}
                                    className="font-medium transition-colors text-emerald-400 hover:text-emerald-300"
                                >
                                    {isSignup ? 'Sign In' : 'Sign Up'}
                                </Link>
                            </p>
                        </div>
                    </Card>
                </motion.div>
            </div>
        </PageTransition>
    );
}
