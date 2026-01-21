import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import PageTransition from '../../components/layout/PageTransition';
import Card, { CardContent, CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { fadeUp, staggerContainer, staggerItem } from '../../utils/animations';
import { CelebrationIcon } from '../../components/ui/Icons';
import {
    getDraws,
    getCurrentDraw,
    getJackpot,
    simulateDraw,
    runDraw,
    publishDraw,
    createNewDraw,
    logActivity
} from '../../lib/supabaseRest';

// Preset score ranges for simulation
const PRESET_RANGES = [
    { label: 'Full Range (1-45)', min: 1, max: 45 },
    { label: '5-45', min: 5, max: 45 },
    { label: '10-45', min: 10, max: 45 },
    { label: '15-45', min: 15, max: 45 },
    { label: '18-45', min: 18, max: 45 },
];

export default function DrawManagement() {
    // State
    const [draws, setDraws] = useState([]);
    const [currentDraw, setCurrentDrawState] = useState(null);
    const [jackpot, setJackpot] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isRunningDraw, setIsRunningDraw] = useState(false);
    const [isSimulating, setIsSimulating] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [simulationResults, setSimulationResults] = useState(null);
    const [drawResults, setDrawResults] = useState(null);
    const [actionMessage, setActionMessage] = useState({ type: '', text: '' });

    // Score range for simulation
    const [scoreRange, setScoreRange] = useState({ min: 1, max: 45 });
    const [customRange, setCustomRange] = useState(false);

    // Fetch all data on mount
    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [allDraws, activeDraw, currentJackpot] = await Promise.all([
                getDraws(),
                getCurrentDraw(),
                getJackpot()
            ]);

            setDraws(allDraws);
            setCurrentDrawState(activeDraw);
            setJackpot(currentJackpot);
        } catch (error) {
            console.error('Error fetching draw data:', error);
            showMessage('error', 'Failed to load draw data');
        } finally {
            setLoading(false);
        }
    };

    const showMessage = (type, text) => {
        setActionMessage({ type, text });
        setTimeout(() => setActionMessage({ type: '', text: '' }), 5000);
    };

    // Calculate days remaining in current month
    const getDaysRemaining = () => {
        const now = new Date();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return Math.ceil((endOfMonth - now) / (1000 * 60 * 60 * 24));
    };

    // Run simulation with current score range
    const handleSimulate = async () => {
        setIsSimulating(true);
        try {
            const result = await simulateDraw(scoreRange.min, scoreRange.max);

            if (result.error) {
                showMessage('error', result.error);
                setSimulationResults(null);
            } else {
                setSimulationResults(result);
                showMessage('success', 'Simulation complete - review results before running draw');
            }
        } catch (error) {
            showMessage('error', 'Simulation failed: ' + error.message);
        } finally {
            setIsSimulating(false);
        }
    };

    // Run the actual draw
    const handleRunDraw = async () => {
        if (!currentDraw) {
            showMessage('error', 'No active draw to run');
            return;
        }

        setIsRunningDraw(true);
        try {
            const result = await runDraw(currentDraw.id, scoreRange.min, scoreRange.max);

            if (result.success) {
                setDrawResults(result.simulation);
                showMessage('success', 'Draw completed! Review results and publish when ready.');
                await fetchAllData(); // Refresh data
            } else {
                showMessage('error', result.error || 'Draw failed');
            }
        } catch (error) {
            showMessage('error', 'Draw failed: ' + error.message);
        } finally {
            setIsRunningDraw(false);
        }
    };

    // Publish draw results
    const handlePublishResults = async () => {
        if (!currentDraw) return;

        setIsPublishing(true);
        try {
            const result = await publishDraw(currentDraw.id);

            if (result.success) {
                showMessage('success', 'Results published! Creating next month\'s draw...');

                // Create next month's draw
                const nextMonth = new Date();
                nextMonth.setMonth(nextMonth.getMonth() + 1);
                const monthYear = nextMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                await createNewDraw(monthYear);

                setDrawResults(null);
                setSimulationResults(null);
                await fetchAllData();
            } else {
                showMessage('error', result.error || 'Failed to publish');
            }
        } catch (error) {
            showMessage('error', 'Publish failed: ' + error.message);
        } finally {
            setIsPublishing(false);
        }
    };

    // Filter draws by status
    const completedDraws = draws.filter(d => d.status === 'completed' || d.status === 'published');

    if (loading) {
        return (
            <PageTransition>
                <div className="py-8 lg:py-12">
                    <div className="container-app">
                        <div className="flex items-center justify-center min-h-[400px]">
                            <div className="text-center">
                                <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                                <p className="text-zinc-400">Loading draw data...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </PageTransition>
        );
    }

    return (
        <PageTransition>
            <div className="py-8 lg:py-12">
                <div className="container-app">
                    {/* Header */}
                    <motion.div
                        variants={fadeUp}
                        initial="initial"
                        animate="animate"
                        className="mb-8"
                    >
                        <h1
                            className="text-3xl lg:text-4xl font-bold mb-2"
                            style={{ fontFamily: 'var(--font-display)', color: '#f9f5e3' }}
                        >
                            Draw Management
                        </h1>
                        <p style={{ color: 'var(--color-neutral-400)' }}>
                            Run monthly draws and manage results - Deterministic algorithm using score popularity
                        </p>
                    </motion.div>

                    {/* Action Message */}
                    {actionMessage.text && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`mb-6 p-4 rounded-xl ${actionMessage.type === 'success'
                                    ? 'bg-emerald-500/20 border border-emerald-500/30'
                                    : 'bg-red-500/20 border border-red-500/30'
                                }`}
                        >
                            <p className={actionMessage.type === 'success' ? 'text-emerald-400' : 'text-red-400'}>
                                {actionMessage.type === 'success' ? '✓' : '✕'} {actionMessage.text}
                            </p>
                        </motion.div>
                    )}

                    {/* Current Draw */}
                    <motion.div
                        variants={fadeUp}
                        initial="initial"
                        animate="animate"
                        className="mb-8"
                    >
                        <Card variant="glow">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-bold" style={{ color: 'var(--color-cream-100)' }}>
                                        Current Draw: {currentDraw?.month_year || 'No Active Draw'}
                                    </h2>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${currentDraw?.status === 'open'
                                            ? 'bg-amber-500/20 text-amber-400'
                                            : currentDraw?.status === 'completed'
                                                ? 'bg-blue-500/20 text-blue-400'
                                                : 'bg-zinc-500/20 text-zinc-400'
                                        }`}>
                                        {currentDraw?.status === 'open' ? 'In Progress' :
                                            currentDraw?.status === 'completed' ? 'Ready to Publish' : 'No Draw'}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {/* Stats Grid */}
                                <div className="grid md:grid-cols-5 gap-4 mb-6">
                                    <div className="text-center p-4 rounded-xl" style={{ background: 'rgba(26, 77, 46, 0.3)' }}>
                                        <p className="text-2xl font-bold" style={{ color: '#c9a227' }}>
                                            {currentDraw?.participants_count || 0}
                                        </p>
                                        <p className="text-xs" style={{ color: 'var(--color-neutral-500)' }}>Participants</p>
                                    </div>
                                    <div className="text-center p-4 rounded-xl" style={{ background: 'rgba(26, 77, 46, 0.3)' }}>
                                        <p className="text-2xl font-bold" style={{ color: '#22c55e' }}>
                                            ${(currentDraw?.prize_pool || 0).toLocaleString()}
                                        </p>
                                        <p className="text-xs" style={{ color: 'var(--color-neutral-500)' }}>Prize Pool</p>
                                    </div>
                                    <div className="text-center p-4 rounded-xl" style={{ background: 'rgba(201, 162, 39, 0.2)' }}>
                                        <p className="text-2xl font-bold" style={{ color: '#c9a227' }}>
                                            ${jackpot.toLocaleString()}
                                        </p>
                                        <p className="text-xs" style={{ color: 'var(--color-neutral-500)' }}>Jackpot</p>
                                    </div>
                                    <div className="text-center p-4 rounded-xl" style={{ background: 'rgba(26, 77, 46, 0.3)' }}>
                                        <p className="text-2xl font-bold" style={{ color: '#a855f7' }}>
                                            {getDaysRemaining()}
                                        </p>
                                        <p className="text-xs" style={{ color: 'var(--color-neutral-500)' }}>Days Left</p>
                                    </div>
                                    <div className="text-center p-4 rounded-xl" style={{ background: 'rgba(26, 77, 46, 0.3)' }}>
                                        <p className="text-lg font-bold" style={{ color: '#38bdf8' }}>
                                            {scoreRange.min}-{scoreRange.max}
                                        </p>
                                        <p className="text-xs" style={{ color: 'var(--color-neutral-500)' }}>Score Range</p>
                                    </div>
                                </div>

                                {/* Score Range Selector */}
                                {currentDraw?.status === 'open' && (
                                    <div className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-cream-200)' }}>
                                            Score Range Selection
                                        </h3>
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {PRESET_RANGES.map((preset) => (
                                                <button
                                                    key={preset.label}
                                                    onClick={() => {
                                                        setScoreRange({ min: preset.min, max: preset.max });
                                                        setCustomRange(false);
                                                    }}
                                                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${!customRange && scoreRange.min === preset.min && scoreRange.max === preset.max
                                                            ? 'bg-emerald-500 text-white'
                                                            : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                                                        }`}
                                                >
                                                    {preset.label}
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => setCustomRange(true)}
                                                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${customRange
                                                        ? 'bg-emerald-500 text-white'
                                                        : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                                                    }`}
                                            >
                                                Custom
                                            </button>
                                        </div>

                                        {customRange && (
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="44"
                                                    value={scoreRange.min}
                                                    onChange={(e) => setScoreRange(prev => ({ ...prev, min: parseInt(e.target.value) || 1 }))}
                                                    className="w-20 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-center"
                                                />
                                                <span className="text-zinc-400">to</span>
                                                <input
                                                    type="number"
                                                    min="2"
                                                    max="45"
                                                    value={scoreRange.max}
                                                    onChange={(e) => setScoreRange(prev => ({ ...prev, max: parseInt(e.target.value) || 45 }))}
                                                    className="w-20 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-center"
                                                />
                                            </div>
                                        )}

                                        <div className="flex gap-3 mt-4">
                                            <Button
                                                onClick={handleSimulate}
                                                disabled={isSimulating}
                                                variant="ghost"
                                            >
                                                {isSimulating ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                                        Simulating...
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                                        </svg>
                                                        Simulate
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                onClick={handleRunDraw}
                                                disabled={isRunningDraw || !currentDraw}
                                                variant="accent"
                                            >
                                                {isRunningDraw ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                                        Running Draw...
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        Run Draw
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Simulation Results */}
                                {simulationResults && !drawResults && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-6 rounded-xl mb-4"
                                        style={{
                                            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))',
                                            border: '1px solid rgba(59, 130, 246, 0.3)'
                                        }}
                                    >
                                        <h3 className="text-lg font-bold mb-4 text-blue-400 flex items-center gap-2">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                            </svg>
                                            Simulation Preview (Range: {simulationResults.scoreRange.min}-{simulationResults.scoreRange.max})
                                        </h3>

                                        {/* Winning Numbers */}
                                        <div className="mb-4">
                                            <p className="text-sm text-zinc-400 mb-2">Simulated Winning Numbers:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {simulationResults.winningNumbers.map((num, i) => (
                                                    <div
                                                        key={i}
                                                        className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold"
                                                        style={{
                                                            background: i < 3
                                                                ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
                                                                : 'linear-gradient(135deg, #c9a227, #a68520)',
                                                            color: i < 3 ? '#fff' : '#0f3621'
                                                        }}
                                                    >
                                                        {num}
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-xs text-zinc-500 mt-1">Blue = Least popular, Gold = Most popular</p>
                                        </div>

                                        {/* Tier Results */}
                                        <div className="grid md:grid-cols-3 gap-4 mb-4">
                                            <div className="p-3 rounded-lg bg-white/5">
                                                <p className="text-xs text-zinc-400">Tier 1 (5 Match)</p>
                                                <p className="text-xl font-bold text-amber-400">{simulationResults.tier1.count} winners</p>
                                                <p className="text-sm text-zinc-500">${simulationResults.tier1.payout.toFixed(2)} each</p>
                                            </div>
                                            <div className="p-3 rounded-lg bg-white/5">
                                                <p className="text-xs text-zinc-400">Tier 2 (4 Match)</p>
                                                <p className="text-xl font-bold text-emerald-400">{simulationResults.tier2.count} winners</p>
                                                <p className="text-sm text-zinc-500">${simulationResults.tier2.payout.toFixed(2)} each</p>
                                            </div>
                                            <div className="p-3 rounded-lg bg-white/5">
                                                <p className="text-xs text-zinc-400">Tier 3 (3 Match)</p>
                                                <p className="text-xl font-bold text-blue-400">{simulationResults.tier3.count} winners</p>
                                                <p className="text-sm text-zinc-500">${simulationResults.tier3.payout.toFixed(2)} each</p>
                                            </div>
                                        </div>

                                        {simulationResults.tier1.count === 0 && (
                                            <p className="text-sm text-amber-400">
                                                ⚠️ No 5-match winners - ${simulationResults.jackpotRollover.toFixed(2)} will roll to jackpot
                                            </p>
                                        )}
                                    </motion.div>
                                )}

                                {/* Draw Results (after running) */}
                                {drawResults && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-6 rounded-xl"
                                        style={{
                                            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(201, 162, 39, 0.1))',
                                            border: '1px solid rgba(34, 197, 94, 0.3)'
                                        }}
                                    >
                                        <h3 className="text-lg font-bold mb-4 text-green-400 flex items-center gap-2">
                                            <CelebrationIcon size={20} color="#4ade80" strokeWidth={1.5} />
                                            Draw Results - Ready to Publish
                                        </h3>

                                        {/* Winning Numbers */}
                                        <div className="flex flex-wrap gap-3 mb-4">
                                            {drawResults.winningNumbers.map((num, i) => (
                                                <div
                                                    key={i}
                                                    className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold"
                                                    style={{
                                                        background: 'linear-gradient(135deg, #c9a227, #a68520)',
                                                        color: '#0f3621'
                                                    }}
                                                >
                                                    {num}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Summary */}
                                        <div className="grid md:grid-cols-4 gap-4 mb-4">
                                            <div className="text-center p-3 rounded-lg bg-white/5">
                                                <p className="text-2xl font-bold text-amber-400">{drawResults.tier1.count}</p>
                                                <p className="text-xs text-zinc-400">5-Match Winners</p>
                                            </div>
                                            <div className="text-center p-3 rounded-lg bg-white/5">
                                                <p className="text-2xl font-bold text-emerald-400">{drawResults.tier2.count}</p>
                                                <p className="text-xs text-zinc-400">4-Match Winners</p>
                                            </div>
                                            <div className="text-center p-3 rounded-lg bg-white/5">
                                                <p className="text-2xl font-bold text-blue-400">{drawResults.tier3.count}</p>
                                                <p className="text-xs text-zinc-400">3-Match Winners</p>
                                            </div>
                                            <div className="text-center p-3 rounded-lg bg-white/5">
                                                <p className="text-2xl font-bold text-green-400">${drawResults.prizePool}</p>
                                                <p className="text-xs text-zinc-400">Total Prize Pool</p>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={handlePublishResults}
                                            disabled={isPublishing}
                                            variant="primary"
                                        >
                                            {isPublishing ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                                    Publishing...
                                                </>
                                            ) : (
                                                'Publish Results'
                                            )}
                                        </Button>
                                    </motion.div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Past Draws */}
                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        animate="animate"
                    >
                        <Card variant="glass">
                            <CardHeader>
                                <h2 className="text-xl font-bold" style={{ color: 'var(--color-cream-100)' }}>
                                    Past Draws
                                </h2>
                            </CardHeader>
                            <CardContent>
                                {completedDraws.length === 0 ? (
                                    <p className="text-zinc-400 text-center py-8">No completed draws yet</p>
                                ) : (
                                    <div className="space-y-4">
                                        {completedDraws.map((draw) => (
                                            <motion.div
                                                key={draw.id}
                                                variants={staggerItem}
                                                className="flex items-center justify-between p-4 rounded-xl"
                                                style={{ background: 'rgba(26, 77, 46, 0.2)' }}
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium" style={{ color: 'var(--color-cream-200)' }}>
                                                            {draw.month_year}
                                                        </p>
                                                        <span className={`px-2 py-0.5 rounded text-xs ${draw.status === 'published'
                                                                ? 'bg-green-500/20 text-green-400'
                                                                : 'bg-blue-500/20 text-blue-400'
                                                            }`}>
                                                            {draw.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm" style={{ color: 'var(--color-neutral-500)' }}>
                                                        {draw.participants_count} participants • Range: {draw.score_range_min}-{draw.score_range_max}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {draw.winning_numbers?.map((num, i) => (
                                                        <span
                                                            key={i}
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                                                            style={{
                                                                background: 'rgba(201, 162, 39, 0.2)',
                                                                color: '#c9a227'
                                                            }}
                                                        >
                                                            {num}
                                                        </span>
                                                    ))}
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-medium" style={{ color: '#22c55e' }}>
                                                        ${(draw.prize_pool || 0).toLocaleString()}
                                                    </p>
                                                    <p className="text-xs" style={{ color: 'var(--color-neutral-400)' }}>
                                                        T1:{draw.tier1_winners} T2:{draw.tier2_winners} T3:{draw.tier3_winners}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </PageTransition>
    );
}
