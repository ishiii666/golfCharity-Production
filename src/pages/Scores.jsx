import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import PageTransition from '../components/layout/PageTransition';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { useScores } from '../hooks/useScores';
import { fadeUp, staggerContainer, staggerItem } from '../utils/animations';

export default function Scores() {
    const { user, isAdmin } = useAuth();
    const {
        scores,
        scoreValues,
        isLoading,
        hasEnoughScores,
        averageScore,
        addScore,
        deleteScore
    } = useScores();

    // Admins cannot participate in games
    if (isAdmin) {
        return <Navigate to="/admin" replace />;
    }

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newScore, setNewScore] = useState('');
    const [playedDate, setPlayedDate] = useState(new Date().toISOString().split('T')[0]);
    const [courseName, setCourseName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleAddScore = async () => {
        const scoreNum = parseInt(newScore);

        // Validation
        if (!scoreNum || scoreNum < 1 || scoreNum > 45) {
            setError('Score must be between 1 and 45');
            return;
        }
        if (!playedDate) {
            setError('Please select a date');
            return;
        }

        setIsSubmitting(true);
        setError('');

        const result = await addScore({
            score: scoreNum,
            played_date: playedDate,
            course_name: courseName || null
        });

        setIsSubmitting(false);

        if (result.success) {
            setIsModalOpen(false);
            setNewScore('');
            setCourseName('');
            setPlayedDate(new Date().toISOString().split('T')[0]);
        } else {
            setError(result.error || 'Failed to add score');
        }
    };

    const handleDeleteScore = async (scoreId) => {
        if (window.confirm('Are you sure you want to delete this score?')) {
            await deleteScore(scoreId);
        }
    };

    if (isLoading) {
        return (
            <PageTransition>
                <div className="min-h-screen flex items-center justify-center">
                    <div
                        className="w-12 h-12 rounded-full border-2 animate-spin"
                        style={{ borderColor: 'rgba(201, 162, 39, 0.2)', borderTopColor: '#c9a227' }}
                    />
                </div>
            </PageTransition>
        );
    }

    return (
        <PageTransition>
            <div className="py-8 lg:py-12">
                <div className="container-app max-w-3xl">
                    {/* Header */}
                    <motion.div
                        variants={fadeUp}
                        initial="initial"
                        animate="animate"
                        className="text-center mb-10"
                    >
                        <h1
                            className="text-3xl lg:text-4xl font-bold mb-3"
                            style={{ fontFamily: 'var(--font-display)', color: '#f9f5e3' }}
                        >
                            Your Golf Scores
                        </h1>
                        <p style={{ color: 'var(--color-neutral-400)' }}>
                            Enter your last 5 official Stableford scores. These become your draw numbers.
                        </p>
                    </motion.div>

                    {/* Score Entry Progress */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mb-8"
                    >
                        <Card variant="gradient">
                            <div className="flex items-center justify-between mb-4">
                                <span style={{ color: 'var(--color-neutral-400)' }}>Entry Progress</span>
                                <span
                                    className="font-bold"
                                    style={{ color: hasEnoughScores ? '#22c55e' : '#c9a227' }}
                                >
                                    {scores.length}/5 scores
                                </span>
                            </div>
                            <div
                                className="h-2 rounded-full overflow-hidden"
                                style={{ background: 'rgba(255,255,255,0.1)' }}
                            >
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(scores.length / 5) * 100}%` }}
                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                    className="h-full rounded-full"
                                    style={{
                                        background: hasEnoughScores
                                            ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                                            : 'linear-gradient(90deg, #c9a227, #a68520)'
                                    }}
                                />
                            </div>
                            {hasEnoughScores && (
                                <p className="text-sm mt-3 text-center" style={{ color: user?.status === 'active' && user?.subscription?.status === 'active' ? '#22c55e' : '#f59e0b' }}>
                                    {user?.status === 'suspended'
                                        ? '⚠ Account suspended — scores saved but not entered'
                                        : (user?.subscription?.status === 'active' || user?.subscription?.status === 'trialing')
                                            ? '✓ You\'re entered in the next draw!'
                                            : '⚠ Subscribe to enter the draw with these scores'}
                                </p>
                            )}
                        </Card>
                    </motion.div>

                    {/* Current Draw Numbers */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mb-8"
                    >
                        <h2
                            className="text-lg font-semibold mb-4"
                            style={{ fontFamily: 'var(--font-display)', color: '#f9f5e3' }}
                        >
                            Your Draw Numbers
                        </h2>
                        <div className="flex gap-3 justify-center flex-wrap">
                            {[0, 1, 2, 3, 4].map((i) => {
                                const score = scoreValues[i];
                                return (
                                    <motion.div
                                        key={i}
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.4 + i * 0.1, type: 'spring' }}
                                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold"
                                        style={{
                                            background: score
                                                ? 'linear-gradient(135deg, #1a4d2e 0%, #0f3621 100%)'
                                                : 'rgba(255,255,255,0.05)',
                                            border: score
                                                ? '1px solid rgba(201, 162, 39, 0.3)'
                                                : '1px dashed rgba(255,255,255,0.2)',
                                            color: score ? '#f9f5e3' : 'var(--color-neutral-600)'
                                        }}
                                    >
                                        {score || '?'}
                                    </motion.div>
                                );
                            })}
                        </div>
                        {averageScore > 0 && (
                            <p className="text-center mt-4 text-sm" style={{ color: 'var(--color-neutral-500)' }}>
                                Average score: {averageScore}
                            </p>
                        )}
                    </motion.div>

                    {/* Score List */}
                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        animate="animate"
                        className="space-y-3 mb-8"
                    >
                        <AnimatePresence>
                            {scores.map((score) => (
                                <motion.div
                                    key={score.id}
                                    variants={staggerItem}
                                    exit={{ opacity: 0, x: -20 }}
                                    layout
                                >
                                    <Card variant="glass" padding="p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl"
                                                    style={{
                                                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.1) 100%)',
                                                        color: '#10b981'
                                                    }}
                                                >
                                                    {score.score}
                                                </div>
                                                <div>
                                                    <div className="font-medium" style={{ color: '#f9f5e3' }}>
                                                        {score.course_name || 'Unknown Course'}
                                                    </div>
                                                    <div className="text-sm" style={{ color: 'var(--color-neutral-500)' }}>
                                                        {new Date(score.played_date).toLocaleDateString('en-AU', {
                                                            day: 'numeric',
                                                            month: 'short',
                                                            year: 'numeric'
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteScore(score.id)}
                                                className="p-2 rounded-lg transition-colors"
                                                style={{ color: 'var(--color-neutral-500)' }}
                                                onMouseEnter={(e) => e.target.style.color = '#ef4444'}
                                                onMouseLeave={(e) => e.target.style.color = 'var(--color-neutral-500)'}
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>

                    {/* Add Score Button */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-center"
                    >
                        <Button
                            onClick={() => {
                                // Reset form state when opening modal
                                setNewScore('');
                                setCourseName('');
                                setPlayedDate(new Date().toISOString().split('T')[0]);
                                setError('');
                                setIsModalOpen(true);
                            }}
                            variant="primary"
                            size="lg"
                            className="magnetic inline-flex items-center"
                            style={{ border: '2px solid #c9a227' }}
                        >
                            <svg className="w-5 h-5 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Add New Score</span>
                        </Button>
                    </motion.div>

                    {/* Add Score Modal */}
                    <Modal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        title="Add Golf Score"
                    >
                        <div className="space-y-4">
                            <Input
                                label="Stableford Score"
                                type="number"
                                min="1"
                                max="45"
                                value={newScore}
                                onChange={(e) => setNewScore(e.target.value)}
                                placeholder="Enter score (1-45)"
                                error={error && error.includes('Score') ? error : undefined}
                            />
                            <Input
                                label="Date Played"
                                type="date"
                                value={playedDate}
                                onChange={(e) => setPlayedDate(e.target.value)}
                                max={new Date().toISOString().split('T')[0]}
                            />
                            <Input
                                label="Course Name (optional)"
                                type="text"
                                value={courseName}
                                onChange={(e) => setCourseName(e.target.value)}
                                placeholder="e.g., Royal Melbourne"
                            />
                            {error && !error.includes('Score') && (
                                <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
                            )}
                            <div className="flex gap-3 pt-4">
                                <Button
                                    variant="ghost"
                                    onClick={() => setIsModalOpen(false)}
                                    fullWidth
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="accent"
                                    onClick={handleAddScore}
                                    loading={isSubmitting}
                                    fullWidth
                                >
                                    Add Score
                                </Button>
                            </div>
                        </div>
                    </Modal>
                </div>
            </div>
        </PageTransition>
    );
}
