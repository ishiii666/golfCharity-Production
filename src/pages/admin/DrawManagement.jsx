import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import PageTransition from '../../components/layout/PageTransition';
import Card, { CardContent, CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import BackButton from '../../components/ui/BackButton';
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
    logActivity,
    getActiveSubscribersCount,
    getDrawWinnersExport,
    exportToCSV,
    getDrawSettings,
    updateWinnerVerification,
    markWinnerAsPaid,
    getCharities
} from '../../lib/supabaseRest';
import UserEditModal from '../../components/admin/UserEditModal';
import { getTimeUntilDraw, getDrawMonthYear } from '../../utils/drawSchedule';

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
    const [liveSubCount, setLiveSubCount] = useState(0);
    const [exportingId, setExportingId] = useState(null);
    const [charities, setCharities] = useState([]);
    const [isUserEditModalOpen, setIsUserEditModalOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [isInitializing, setIsInitializing] = useState(false);
    const [settings, setSettings] = useState({
        base_amount_per_sub: 10,
        tier1_percent: 40,
        tier2_percent: 35,
        tier3_percent: 25,
        jackpot_cap: 250000
    });

    // History expansion state
    const [expandedDrawId, setExpandedDrawId] = useState(null);
    const [drawWinnersList, setDrawWinnersList] = useState({}); // cache for winner lists
    const [isLoadingWinners, setIsLoadingWinners] = useState(false);

    const [scoreRange, setScoreRange] = useState({ min: 1, max: 45 });
    const [customRange, setCustomRange] = useState(false);
    const [selectedWinner, setSelectedWinner] = useState(null);
    const [isWinnerModalOpen, setIsWinnerModalOpen] = useState(false);
    const [isUpdatingWinner, setIsUpdatingWinner] = useState(false);
    const { addToast } = useToast();
    const { user } = useAuth();

    // Format currency helper
    const formatVal = (val) => new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
        minimumFractionDigits: 2
    }).format(val || 0);

    // Fetch all data on mount
    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [allDraws, activeDraw, currentJackpot, charityList] = await Promise.all([
                getDraws(),
                getCurrentDraw(),
                getJackpot(),
                getCharities()
            ]);

            setDraws(allDraws);
            setCurrentDrawState(activeDraw);
            setJackpot(currentJackpot);
            setCharities(charityList);

            // Fetch settings for pricing accuracy
            const currentSettings = await getDrawSettings();
            setSettings(currentSettings);

            // ALWAYS fetch live data for real-time dashboard accuracy
            const subCount = await getActiveSubscribersCount();
            setLiveSubCount(subCount);
        } catch (error) {
            console.error('Error fetching draw data:', error);
            showMessage('error', 'Failed to load draw data');
        } finally {
            setLoading(false);
        }
    };

    const handleExportWinners = async (drawId, monthYear) => {
        try {
            setExportingId(drawId);
            const winnersData = await getDrawWinnersExport(drawId);
            if (winnersData.length > 0) {
                exportToCSV(winnersData, `Winners_${monthYear.replace(' ', '_')}`);
                showMessage('success', `Exported winners for ${monthYear}`);
            } else {
                showMessage('info', 'No winners found for this draw');
            }
        } catch (error) {
            console.error('Export failed:', error);
            showMessage('error', 'Failed to export winners');
        } finally {
            setExportingId(null);
        }
    };

    const showMessage = (type, text) => {
        addToast(type, text);
    };

    const toggleExpandDraw = async (drawId) => {
        if (expandedDrawId === drawId) {
            setExpandedDrawId(null);
            return;
        }

        setExpandedDrawId(drawId);

        // Fetch winners if not already cached
        if (!drawWinnersList[drawId]) {
            setIsLoadingWinners(true);
            try {
                const winners = await getDrawWinnersExport(drawId);
                setDrawWinnersList(prev => ({ ...prev, [drawId]: winners }));
            } catch (error) {
                console.error('Error fetching winners:', error);
            } finally {
                setIsLoadingWinners(false);
            }
        }
    };

    const handleVerifyWinner = async (entryId) => {
        setIsUpdatingWinner(true);
        try {
            const result = await updateWinnerVerification(entryId, 'Verified', user?.id);
            if (result.success) {
                addToast('success', 'Winner verified successfully');
                // Update local state
                const currentWinners = drawWinnersList[expandedDrawId];
                const updatedWinners = currentWinners.map(w =>
                    w.id === entryId ? { ...w, 'Verification Status': 'Verified' } : w
                );
                setDrawWinnersList(prev => ({ ...prev, [expandedDrawId]: updatedWinners }));
                setSelectedWinner(updatedWinners.find(w => w.id === entryId));
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            addToast('error', 'Verification failed: ' + error.message);
        } finally {
            setIsUpdatingWinner(false);
        }
    };

    const handleMarkAsPaid = async (entryId) => {
        setIsUpdatingWinner(true);
        try {
            const reference = prompt("Enter payment reference (optional):") || 'Manual Payment';
            const result = await markWinnerAsPaid(entryId, reference, user?.id);
            if (result.success) {
                addToast('success', 'Winner marked as paid');
                // Update local state
                const currentWinners = drawWinnersList[expandedDrawId];
                const updatedWinners = currentWinners.map(w =>
                    w.id === entryId ? {
                        ...w,
                        'Verification Status': 'Paid',
                        'isPaid': true,
                        'paymentReference': reference
                    } : w
                );
                setDrawWinnersList(prev => ({ ...prev, [expandedDrawId]: updatedWinners }));
                setSelectedWinner(updatedWinners.find(w => w.id === entryId));
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            addToast('error', 'Payment marking failed: ' + error.message);
        } finally {
            setIsUpdatingWinner(false);
        }
    };

    // Calculate days remaining in current month
    const getDaysRemaining = () => {
        return getTimeUntilDraw().days;
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
        setIsRunningDraw(true);
        try {
            let activeDrawId = currentDraw?.id;

            // AUTO-SETUP: If no record exists, create it
            if (!activeDrawId) {
                const monthYear = getDrawMonthYear();
                const newDraw = await createNewDraw(monthYear);
                if (!newDraw) throw new Error('Failed to create monthly record');
                activeDrawId = newDraw.id;
            }

            const result = await runDraw(activeDrawId, scoreRange.min, scoreRange.max);

            if (result.success) {
                setDrawResults(result.simulation);
                showMessage('success', 'Draw completed! Review results and publish when ready.');
                await fetchAllData();
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
        setIsPublishing(true);
        try {
            let activeDrawId = currentDraw?.id;

            // AUTO-SETUP: If no record exists for this month, create it now
            if (!activeDrawId) {
                const monthYear = getDrawMonthYear();
                const newDraw = await createNewDraw(monthYear);
                if (!newDraw) throw new Error('Failed to create monthly record');
                activeDrawId = newDraw.id;
            }

            const result = await publishDraw(activeDrawId);

            if (result.success) {
                showMessage('success', 'Results published successfully!');
                setDrawResults(null);
                setSimulationResults(null);

                // AUTOMATICALLY BEGIN NEXT DRAW CYCLE
                const nextMonthYear = getDrawMonthYear();
                await createNewDraw(nextMonthYear);

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
                    <BackButton to="/admin" label="Admin Dashboard" className="mb-6" />
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
                                        Current Draw: {currentDraw && currentDraw.status !== 'published' ? currentDraw.month_year : getDrawMonthYear()}
                                    </h2>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${currentDraw?.status === 'open' || !currentDraw || currentDraw?.status === 'published'
                                        ? 'bg-emerald-500/20 text-emerald-400'
                                        : currentDraw?.status === 'completed'
                                            ? 'bg-blue-500/20 text-blue-400'
                                            : 'bg-zinc-500/20 text-zinc-400'
                                        }`}>
                                        {currentDraw?.status === 'published' || !currentDraw ? 'Next Cycle Ready' :
                                            currentDraw?.status === 'open' ? 'Live Phase (Collecting)' :
                                                currentDraw?.status === 'completed' ? 'Draw Completed' : 'No Active Draw'}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {/* Stats Grid */}
                                <div className="grid md:grid-cols-5 gap-4 mb-6">
                                    <div className="text-center p-4 rounded-xl" style={{ background: 'rgba(26, 77, 46, 0.3)' }}>
                                        <p className="text-2xl font-bold" style={{ color: '#c9a227' }}>
                                            {(currentDraw?.status === 'open' || !currentDraw || currentDraw?.status === 'published') ? liveSubCount : (currentDraw?.participants_count || 0)}
                                        </p>
                                        <p className="text-xs" style={{ color: 'var(--color-neutral-500)' }}>
                                            {(currentDraw?.status === 'open' || !currentDraw || currentDraw?.status === 'published') ? 'Active Subs' : 'Participants'}
                                        </p>
                                    </div>
                                    <div className="text-center p-4 rounded-xl" style={{ background: 'rgba(26, 77, 46, 0.3)' }}>
                                        <p className="text-2xl font-bold" style={{ color: '#22c55e' }}>
                                            ${((currentDraw?.status === 'open' || !currentDraw || currentDraw?.status === 'published') ? (liveSubCount * settings.base_amount_per_sub) : (currentDraw?.prize_pool || 0)).toLocaleString()}
                                        </p>
                                        <p className="text-xs" style={{ color: 'var(--color-neutral-500)' }}>
                                            {(currentDraw?.status === 'open' || !currentDraw || currentDraw?.status === 'published') ? 'Projected Prize Pool' : 'Prize Pool'}
                                        </p>
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
                                        {completedDraws.map((draw) => {
                                            const isExpanded = expandedDrawId === draw.id;
                                            const winners = drawWinnersList[draw.id] || [];
                                            const tier1Winners = winners.filter(w => w['Match Tier'] === '1-Match');
                                            const tier2Winners = winners.filter(w => w['Match Tier'] === '2-Match'); // Note: labels in getDrawWinnersExport use Match Tier string

                                            return (
                                                <motion.div
                                                    key={draw.id}
                                                    variants={staggerItem}
                                                    className={`rounded-xl border transition-all duration-300 ${isExpanded ? 'bg-zinc-800/40 border-emerald-500/30' : 'bg-emerald-950/10 border-transparent hover:bg-emerald-900/10'}`}
                                                >
                                                    {/* Row Header */}
                                                    <div
                                                        className="flex items-center justify-between p-5 cursor-pointer"
                                                        onClick={() => toggleExpandDraw(draw.id)}
                                                    >
                                                        <div className="flex items-center gap-6">
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <p className="font-bold text-lg" style={{ color: 'var(--color-cream-100)' }}>
                                                                        {draw.month_year}
                                                                    </p>
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${draw.status === 'published'
                                                                        ? 'bg-emerald-500/20 text-emerald-400'
                                                                        : 'bg-blue-500/20 text-blue-400'
                                                                        }`}>
                                                                        {draw.status}
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs font-medium" style={{ color: 'var(--color-neutral-500)' }}>
                                                                    Range: {draw.score_range_min}-{draw.score_range_max} • {draw.participants_count} Players
                                                                </p>
                                                            </div>

                                                            <div className="flex items-center gap-1.5">
                                                                {draw.winning_numbers?.map((num, i) => (
                                                                    <span
                                                                        key={i}
                                                                        className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-black"
                                                                        style={{
                                                                            background: 'linear-gradient(135deg, rgba(201, 162, 39, 0.15), rgba(201, 162, 39, 0.05))',
                                                                            border: '1px solid rgba(201, 162, 39, 0.2)',
                                                                            color: '#c9a227'
                                                                        }}
                                                                    >
                                                                        {num}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-6">
                                                            <div className="text-right">
                                                                <p className="text-lg font-black text-emerald-400 leading-none mb-1">
                                                                    {formatVal(draw.prize_pool)}
                                                                </p>
                                                                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                                                    Total Pool
                                                                </p>
                                                            </div>
                                                            <div className={`p-2 rounded-full transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-zinc-700/50' : 'bg-transparent'}`}>
                                                                <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Expanded Content */}
                                                    {isExpanded && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            className="px-5 pb-5 pt-2 border-t border-white/5"
                                                        >
                                                            {/* Tier Breakdown */}
                                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 pt-4">
                                                                <div className="p-4 rounded-xl bg-black/20 border border-amber-500/10">
                                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 mb-2">5-Match Pool</p>
                                                                    <p className="text-xl font-black text-white">{formatVal(draw.tier1_pool)}</p>
                                                                    <p className="text-[10px] text-zinc-500 mt-1 font-bold">{draw.tier1_winners} Winners • {formatVal(draw.tier1_pool / (draw.tier1_winners || 1))} ea</p>
                                                                </div>
                                                                <div className="p-4 rounded-xl bg-black/20 border border-violet-500/10">
                                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400 mb-2">4-Match Pool</p>
                                                                    <p className="text-xl font-black text-white">{formatVal(draw.tier2_pool)}</p>
                                                                    <p className="text-[10px] text-zinc-500 mt-1 font-bold">{draw.tier2_winners} Winners • {formatVal(draw.tier2_pool / (draw.tier2_winners || 1))} ea</p>
                                                                </div>
                                                                <div className="p-4 rounded-xl bg-black/20 border border-teal-500/10">
                                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-400 mb-2">3-Match Pool</p>
                                                                    <p className="text-xl font-black text-white">{formatVal(draw.tier3_pool)}</p>
                                                                    <p className="text-[10px] text-zinc-500 mt-1 font-bold">{draw.tier3_winners} Winners • {formatVal(draw.tier3_pool / (draw.tier3_winners || 1))} ea</p>
                                                                </div>
                                                                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400 mb-2">Jackpot Rollover</p>
                                                                    <p className="text-xl font-black text-amber-400">{formatVal(draw.tier1_rollover_amount)}</p>
                                                                    <p className="text-[10px] text-zinc-500 mt-1 font-bold">Rolled to next cycle</p>
                                                                </div>
                                                            </div>

                                                            {/* Winners Subsection */}
                                                            <div className="space-y-4">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <h4 className="text-sm font-black uppercase tracking-widest text-white">Draw Winners</h4>
                                                                    <button
                                                                        onClick={() => handleExportWinners(draw.id, draw.month_year)}
                                                                        className="text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors"
                                                                    >
                                                                        Download CSV Report
                                                                    </button>
                                                                </div>

                                                                {isLoadingWinners && winners.length === 0 ? (
                                                                    <div className="flex items-center gap-3 p-4 rounded-xl bg-black/10">
                                                                        <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent animate-spin rounded-full" />
                                                                        <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Loading winners dataset...</p>
                                                                    </div>
                                                                ) : winners.length === 0 ? (
                                                                    <div className="p-8 text-center rounded-xl bg-black/10 border border-white/5">
                                                                        <p className="text-sm text-zinc-500 font-medium">No winners recorded for this draw cycle</p>
                                                                    </div>
                                                                ) : (
                                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                                                        {winners.map((winner, idx) => (
                                                                            <div
                                                                                key={idx}
                                                                                onClick={() => { setSelectedWinner(winner); setIsWinnerModalOpen(true); }}
                                                                                className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 cursor-pointer hover:border-emerald-500/40 hover:bg-black/30 transition-all group"
                                                                            >
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${winner['Match Tier'] === '5-Match' ? 'bg-amber-500/20 text-amber-400' :
                                                                                        winner['Match Tier'] === '4-Match' ? 'bg-violet-500/20 text-violet-400' :
                                                                                            'bg-teal-500/20 text-teal-400'
                                                                                        }`}>
                                                                                        {winner['Match Tier'].split('-')[0]}M
                                                                                    </div>
                                                                                    <div>
                                                                                        <p className="text-sm font-bold text-white leading-none mb-1 group-hover:text-emerald-400 transition-colors">{winner['Name']}</p>
                                                                                        <p className="text-[10px] text-zinc-500 font-medium">{winner['Email']}</p>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex items-center gap-4">
                                                                                    <div className="text-right">
                                                                                        <p className="text-sm font-black text-emerald-400 leading-none mb-1">{formatVal(winner['Net Payout'])}</p>
                                                                                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter">Net Payout</p>
                                                                                    </div>
                                                                                    <div className={`w-2 h-2 rounded-full ${winner.isPaid ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : (winner['Verification Status'] === 'Verified' ? 'bg-blue-500' : 'bg-zinc-600')}`} />
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </div>

            {/* Winner Verification Modal */}
            {selectedWinner && (
                <Modal
                    isOpen={isWinnerModalOpen}
                    onClose={() => setIsWinnerModalOpen(false)}
                    title="Winner Verification & Payout"
                    size="md"
                >
                    <div className="space-y-6">
                        {/* Status Banner */}
                        <div className={`p-4 rounded-xl flex items-center justify-between ${selectedWinner.isPaid ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedWinner.isPaid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                    {selectedWinner.isPaid ? (
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    ) : (
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    )}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 leading-none mb-1">Status</p>
                                    <p className={`text-lg font-black uppercase tracking-tight ${selectedWinner.isPaid ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        {selectedWinner['Verification Status']}
                                    </p>
                                </div>
                            </div>
                            {selectedWinner.isPaid && (
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 leading-none mb-1">Paid On</p>
                                    <p className="text-xs font-bold text-white">{new Date(selectedWinner.paidAt).toLocaleDateString()}</p>
                                </div>
                            )}
                        </div>

                        {/* Winner Details */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-zinc-900 border border-white/5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Winner</p>
                                <p className="text-lg font-bold text-white leading-none mb-1">{selectedWinner['Name']}</p>
                                <p className="text-xs text-zinc-400">{selectedWinner['Email']}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-zinc-900 border border-white/5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Charity</p>
                                <p className="text-lg font-bold text-emerald-400 leading-none mb-1">{selectedWinner['Charity Name']}</p>
                            </div>
                        </div>

                        {/* Financial Breakdown */}
                        <div className="p-6 rounded-2xl bg-black/40 border border-white/5 space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-zinc-400">Gross Prize Pool ({selectedWinner['Match Tier']})</span>
                                <span className="text-lg font-bold text-white">{formatVal(selectedWinner['Gross Prize'])}</span>
                            </div>
                            <div className="flex justify-between items-center text-rose-400">
                                <span className="text-sm font-medium">Auto-Donation to Charity (10%)</span>
                                <span className="text-lg font-bold">-{formatVal(selectedWinner['Charity Donation'])}</span>
                            </div>
                            <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                                <span className="text-lg font-black uppercase tracking-widest text-white">Net Payout</span>
                                <span className="text-3xl font-black text-emerald-400">{formatVal(selectedWinner['Net Payout'])}</span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        {!selectedWinner.isPaid && (
                            <div className="flex gap-3">
                                {selectedWinner['Verification Status'] === 'Pending' && (
                                    <Button
                                        onClick={() => handleVerifyWinner(selectedWinner.id)}
                                        disabled={isUpdatingWinner}
                                        className="flex-1 h-14 text-sm font-black uppercase tracking-widest"
                                        variant="outline"
                                    >
                                        Verify Winner
                                    </Button>
                                )}
                                <Button
                                    onClick={() => handleMarkAsPaid(selectedWinner.id)}
                                    disabled={isUpdatingWinner}
                                    className="flex-1 h-14 text-sm font-black uppercase tracking-widest"
                                    variant="primary"
                                >
                                    {isUpdatingWinner ? 'Processing...' : 'Mark as Paid'}
                                </Button>
                            </div>
                        )}

                        <Button
                            variant="ghost"
                            fullWidth
                            className="h-12 text-[10px] font-black uppercase tracking-[0.2em] border border-white/5 hover:border-white/10"
                            onClick={() => {
                                setSelectedUserId(selectedWinner.userId);
                                setIsUserEditModalOpen(true);
                            }}
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            View & Edit Full Profile
                        </Button>

                        {selectedWinner.paymentReference && (
                            <div className="p-3 rounded-lg bg-zinc-900/50 text-center">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Reference</p>
                                <p className="text-xs font-mono text-zinc-300">{selectedWinner.paymentReference}</p>
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            {/* User Edit Modal */}
            <UserEditModal
                isOpen={isUserEditModalOpen}
                onClose={() => {
                    setIsUserEditModalOpen(false);
                    setSelectedUserId(null);
                }}
                userId={selectedUserId}
                charities={charities}
                onUpdate={fetchAllData} // Refresh draw data if user changed (e.g. balance)
            />
        </PageTransition>
    );
}
