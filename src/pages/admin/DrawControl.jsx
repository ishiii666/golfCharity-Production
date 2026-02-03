import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import PageTransition from '../../components/layout/PageTransition';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input, { Select } from '../../components/ui/Input';
import BackButton from '../../components/ui/BackButton';
import { formatCurrency } from '../../utils/formatters';
import { fadeUp } from '../../utils/animations';
import { DRAW_SCHEDULE_TEXT, DRAW_CONFIG, getTimeUntilDraw, getDrawMonthYear } from '../../utils/drawSchedule';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import {
    getEligibleUsers,
    getJackpot,
    getCurrentDraw,
    runDraw,
    resetDraw,
    getWinnersForVerification,
    updateWinnerVerification,
    simulateDraw,
    getDrawSettings,
    getDraws,
    getActiveSubscribersCount,
    publishDraw,
    createNewDraw,
    getDrawWinnersExport,
    exportToCSV,
    updateDrawSettings
} from '../../lib/supabaseRest';
import { useAuth } from '../../context/AuthContext';

// Helper to get next month string
const getNextMonthName = (currentMonthYear) => {
    try {
        const [month, year] = currentMonthYear.split(' ');
        const date = new Date(`${month} 1, ${year}`);
        date.setMonth(date.getMonth() + 1);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch (e) {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
};

// Helper: check if a draw month name is in the future
const isFutureCycle = (monthYearStr) => {
    if (!monthYearStr) return false;
    try {
        const [month, year] = monthYearStr.split(' ');
        // Target: 1st of the draw month
        const cycleDate = new Date(`${month} 1, ${year}`);
        const now = new Date();
        // Compare against 1st of current month
        const currentMonthFirst = new Date(now.getFullYear(), now.getMonth(), 1);
        return cycleDate > currentMonthFirst;
    } catch (e) {
        return false;
    }
};

const PhaseStepper = ({ status }) => {
    const phases = [
        { id: 'open', label: 'Analysis', icon: '🔍', desc: 'Configure & Simulate' },
        { id: 'processing', label: 'Processing', icon: '⚙️', desc: 'Calculate Results' },
        { id: 'published', label: 'Reporting', icon: '�', desc: 'Audit & Analysis' }
    ];

    const currentPhaseIndex = phases.findIndex(p => p.id === status);
    const activeIndex = currentPhaseIndex === -1 ? 0 : currentPhaseIndex;

    return (
        <div className="flex items-center justify-between mb-8 max-w-2xl mx-auto px-4">
            {phases.map((phase, idx) => {
                const isActive = idx === activeIndex;
                const isPast = idx < activeIndex;
                return (
                    <div key={phase.id} className="flex flex-col items-center relative flex-1">
                        {/* Line connector */}
                        {idx < phases.length - 1 && (
                            <div className={`absolute top-5 left-[50%] w-full h-0.5 ${idx < activeIndex ? 'bg-emerald-500' : 'bg-slate-800'}`} />
                        )}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 border-2 mb-2 transition-all duration-500 ${isActive ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-110' :
                            isPast ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' :
                                'bg-slate-900 border-slate-800 text-slate-600'
                            }`}>
                            {isPast ? '✓' : phase.icon}
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {phase.label}
                        </span>
                        <span className="text-[9px] text-slate-600 hidden md:block">
                            {phase.desc}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

// Score range presets
const SCORE_RANGE_PRESETS = [
    { label: 'Full Range (1-45)', min: 1, max: 45 },
    { label: '5-45', min: 5, max: 45 },
    { label: '10-45', min: 10, max: 45 },
    { label: '15-45', min: 15, max: 45 },
    { label: '18-45', min: 18, max: 45 },
];

export default function DrawControl() {
    // State for data
    const [loading, setLoading] = useState(true);
    const [activeSubscribers, setActiveSubscribers] = useState(0);
    const [totalScores, setTotalScores] = useState(0);
    const [jackpotCarryover, setJackpotCarryover] = useState(0);
    const [currentDraw, setCurrentDrawState] = useState(null);
    const [eligibleUsers, setEligibleUsers] = useState([]);

    // State for analysis
    const [rangeMin, setRangeMin] = useState(1);
    const [rangeMax, setRangeMax] = useState(45);
    const [selectedPreset, setSelectedPreset] = useState('');
    const [analysisResults, setAnalysisResults] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isPublished, setIsPublished] = useState(false);
    const [draws, setDraws] = useState([]);
    const [exportingId, setExportingId] = useState(null);
    const { addToast } = useToast();

    // Settings state
    const [settings, setSettings] = useState({
        base_amount_per_sub: 10,
        tier1_percent: 40,
        tier2_percent: 35,
        tier3_percent: 25,
        jackpot_cap: 250000
    });
    const [isEditingSettings, setIsEditingSettings] = useState(false);
    const [isWinnersModalOpen, setIsWinnersModalOpen] = useState(false);
    const [selectedTierWinners, setSelectedTierWinners] = useState([]);
    const [viewingTier, setViewingTier] = useState(null);
    const [winners, setWinners] = useState([]);
    const [isVerifying, setIsVerifying] = useState(false);
    const { user } = useAuth();

    // Fetch real data on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData();
        }, 800);

        // 🟢 REAL-TIME: Subscribe to jackpot_tracker changes
        const jackpotChannel = supabase
            .channel('draw-control:jackpot')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'jackpot_tracker'
            }, (payload) => {
                console.log('⚡ Draw Control: Real-time Jackpot Update:', payload.new.amount);
                setJackpotCarryover(parseFloat(payload.new.amount) || 0);
            })
            .subscribe();

        // 🔄 POLLING: Refresh draw data every 30 seconds
        const pollInterval = setInterval(() => {
            fetchData(true); // Silent refresh
        }, 30000);

        return () => {
            clearTimeout(timer);
            supabase.removeChannel(jackpotChannel);
            clearInterval(pollInterval);
        };
    }, []);


    const fetchData = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            // First get the current draw to have the correct context
            const draw = await getCurrentDraw();
            const targetDrawId = draw?.id;

            const [users, jackpot, currentSettings, allDraws, subCount] = await Promise.all([
                getEligibleUsers(targetDrawId),
                getJackpot(),
                getDrawSettings(),
                getDraws(),
                getActiveSubscribersCount(targetDrawId, true)
            ]);

            setSettings(currentSettings || settings);

            const safeUsers = Array.isArray(users) ? users : [];
            setEligibleUsers(safeUsers);

            setActiveSubscribers(subCount || 0);
            setTotalScores(safeUsers.reduce((sum, u) => sum + (u.scores?.length || 0), 0));
            setJackpotCarryover(jackpot || 0);

            setCurrentDrawState(draw || null);
            setDraws(Array.isArray(allDraws) ? allDraws : []);

            // Fetch winners for verification if draw is completed or published
            if (draw?.status === 'completed' || draw?.status === 'published') {
                const verifWinners = await getWinnersForVerification();
                // Filter for winners of THIS draw specifically
                setWinners(verifWinners.filter(w => w.draw_id === targetDrawId));
            } else {
                setWinners([]);
            }

            // SYNC: Update publication state based on the actual draw status
            const status = draw?.status;
            setIsPublished(status === 'published');

        } catch (error) {
            console.error('Error fetching data:', error);
            if (!silent) addToast('error', 'Failed to load draw data');
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleVerifyWinner = async (entryId, status) => {
        try {
            const res = await updateWinnerVerification(entryId, status, user?.id);
            if (res.success) {
                addToast('success', `Winner ${status === 'verified' ? 'verified' : 'rejected'}`);
                fetchData(true);
            } else {
                addToast('error', res.error || 'Failed to update verification');
            }
        } catch (error) {
            addToast('error', 'Verification error');
        }
    };

    const handleVerifyAll = async () => {
        const pending = winners.filter(w => !w.verification_status || w.verification_status.toLowerCase() === 'pending');
        if (pending.length === 0) return;

        setIsVerifying(true);
        try {
            await Promise.all(pending.map(w => updateWinnerVerification(w.id, 'verified', user?.id)));
            addToast('success', `Verified ${pending.length} pending winners`);
            fetchData(true);
        } catch (error) {
            addToast('error', 'Failed to verify all winners');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleExportWinners = async (drawId, monthYear) => {
        try {
            setExportingId(drawId);
            const winnersData = await getDrawWinnersExport(drawId);
            if (winnersData.length > 0) {
                exportToCSV(winnersData, `Winners_${monthYear.replace(' ', '_')}`);
                addToast('success', `Exported winners for ${monthYear}`);
            } else {
                addToast('info', 'No winners found for this draw');
            }
        } catch (error) {
            console.error('Export failed:', error);
            addToast('error', 'Failed to export winners');
        } finally {
            setExportingId(null);
        }
    };

    const handleSaveSettings = async () => {
        try {
            await updateDrawSettings(settings);
            addToast('success', 'Draw settings updated successfully');
            setIsEditingSettings(false);
            if (analysisResults) runAnalysis();
        } catch (error) {
            addToast('error', 'Failed to save settings');
        }
    };

    const handlePresetChange = (preset) => {
        setSelectedPreset(preset);
        const found = SCORE_RANGE_PRESETS.find(p => p.label === preset);
        if (found) {
            setRangeMin(found.min);
            setRangeMax(found.max);
        }
    };

    const handleShowWinners = (tier) => {
        if (!analysisResults || !analysisResults.entries) return;
        const winners = analysisResults.entries.filter(e => e.tier === tier);
        if (winners.length === 0) return;

        setSelectedTierWinners(winners);
        setViewingTier(tier);
        setIsWinnersModalOpen(true);
    };

    const runAnalysis = async () => {
        setIsAnalyzing(true);
        try {
            const results = await simulateDraw(rangeMin, rangeMax, currentDraw?.id);

            if (results.error) {
                addToast('error', results.error);
                setIsAnalyzing(false);
                return;
            }

            setAnalysisResults(results);
            setIsPublished(false); // New analysis session is never published yet
            addToast('success', 'Analysis complete! Review results before publishing.');
        } catch (error) {
            console.error('Error running analysis:', error);
            addToast('error', 'Analysis failed: ' + error.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleRunDraw = async () => {
        if (!analysisResults) {
            addToast('error', 'Please run an analysis first');
            return;
        }

        setIsPublishing(true);
        try {
            const targetMonth = currentDraw && currentDraw.status === 'open'
                ? currentDraw.month_year
                : getDrawMonthYear();

            let activeDrawId = null;

            if (currentDraw && currentDraw.status === 'open') {
                activeDrawId = currentDraw.id;
            } else {
                const newDraw = await createNewDraw(targetMonth);
                if (!newDraw) throw new Error(`Failed to initialize record for ${targetMonth}.`);
                activeDrawId = newDraw.id;
            }

            // Execute draw logic - This moves status to 'completed' (DRAFT)
            const result = await runDraw(activeDrawId, rangeMin, rangeMax);
            if (!result.success) throw new Error(result.error || 'Draw execution failed');

            setAnalysisResults(null);
            addToast('success', 'Draw finalized in DRAFT mode. Please verify winners before publishing.');

            setTimeout(() => fetchData(false), 1000);
        } catch (error) {
            console.error('Error in run draw flow:', error);
            addToast('error', error.message);
        } finally {
            setIsPublishing(false);
        }
    };

    const handlePublish = async () => {
        if (!currentDraw || currentDraw.status !== 'completed') {
            addToast('error', 'No draft results available to publish');
            return;
        }

        // ENFORCEMENT: Check if all winners are verified
        const unverifiedCount = winners.filter(w => !w.verification_status || w.verification_status.toLowerCase() === 'pending').length;
        if (unverifiedCount > 0) {
            addToast('error', `Cannot publish. There are ${unverifiedCount} unverified winners.`);
            return;
        }

        setIsPublishing(true);
        try {
            const publishResult = await publishDraw(currentDraw.id);
            if (!publishResult.success) throw new Error(publishResult.error || 'Publish failed');

            // Automation: Proactively create the NEXT record
            try {
                const finishedMonth = currentDraw.month_year;
                const nextMonth = getNextMonthName(finishedMonth);
                await createNewDraw(nextMonth);
            } catch (nextMonthErr) {
                console.warn('Failed to auto-create next month record:', nextMonthErr);
            }

            setIsPublished(true);
            addToast('success', 'Draw results published successfully! Results are now visible to the public.');

            setTimeout(() => fetchData(false), 1500);
        } catch (error) {
            console.error('Error in publish flow:', error);
            addToast('error', error.message);
        } finally {
            setIsPublishing(false);
        }
    };

    const handleResetDraw = async (drawId, monthYear) => {
        if (!window.confirm(`Are you absolutely sure you want to RESET the draw for ${monthYear}? This will delete all winners for this month and reactivate expired subscriptions. This action cannot be undone.`)) {
            return;
        }

        setLoading(true);
        try {
            const result = await resetDraw(drawId);
            if (result.success) {
                addToast('success', `Draw for ${monthYear} has been reset successfully.`);
                setIsPublished(false);
                setAnalysisResults(null);
                setTimeout(() => fetchData(false), 500);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Reset failed:', error);
            addToast('error', `Failed to reset draw: ${error.message}`);
            setLoading(false);
        }
    };

    const activeCycleMonth = currentDraw && currentDraw.status === 'open'
        ? currentDraw.month_year
        : getDrawMonthYear();

    const isFutureDraw = isFutureCycle(activeCycleMonth);

    if (loading) {
        return (
            <PageTransition>
                <div className="py-8 lg:py-12">
                    <div className="container-app max-w-6xl">
                        <div className="flex items-center justify-center min-h-[400px]">
                            <div className="text-center">
                                <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                                <p className="text-slate-400">Loading draw data...</p>
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
                <div className="container-app max-w-6xl">
                    <BackButton to="/admin" label="Admin Dashboard" className="mb-6" />
                    <motion.div variants={fadeUp} initial="initial" animate="animate" className="mb-0 text-center">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-black uppercase tracking-widest">Admin Control</span>
                        </div>
                        <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>Draw Control Center</h1>
                        <p className="text-slate-400 mb-8 max-w-lg mx-auto">Analyze, simulate, and publish monthly results. Once results are published, audit individual winners in <strong>Reports</strong> and settle payouts in <strong>Finance</strong>.</p>
                    </motion.div>

                    <PhaseStepper status={currentDraw?.status || 'open'} />

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <Card variant="glass" padding="p-4">
                            <div className="text-slate-400 text-sm mb-1">Live Participants</div>
                            <div className="text-2xl font-bold text-white">{activeSubscribers}</div>
                        </Card>
                        <Card variant="glass" padding="p-4">
                            <div className="text-slate-400 text-sm mb-1">Total Scores</div>
                            <div className="text-2xl font-bold text-white">{totalScores}</div>
                        </Card>
                        <Card variant="glass" padding="p-4">
                            <div className="text-slate-400 text-sm mb-1">Current Prize Pool</div>
                            <div className="text-2xl font-bold text-teal-400">{formatCurrency(activeSubscribers * settings.base_amount_per_sub)}</div>
                        </Card>
                        <Card variant="glass" padding="p-4">
                            <div className="text-slate-400 text-sm mb-1">Jackpot Carryover</div>
                            <div className="text-2xl font-bold text-amber-400">{formatCurrency(jackpotCarryover)}</div>
                        </Card>
                    </motion.div>

                    <div className="grid lg:grid-cols-3 gap-8">
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-1">
                            <Card variant="solid">
                                <CardHeader><CardTitle>Range Analysis</CardTitle></CardHeader>
                                <CardContent className="space-y-6">
                                    <Select
                                        label="Preset Range"
                                        value={selectedPreset}
                                        onChange={(e) => handlePresetChange(e.target.value)}
                                        options={[
                                            { value: '', label: 'Select a preset...' },
                                            ...SCORE_RANGE_PRESETS.map(p => ({ value: p.label, label: p.label }))
                                        ]}
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="Min Score"
                                            type="number"
                                            value={rangeMin}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setRangeMin(val === '' ? '' : parseInt(val));
                                            }}
                                        />
                                        <Input
                                            label="Max Score"
                                            type="number"
                                            value={rangeMax}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setRangeMax(val === '' ? '' : parseInt(val));
                                            }}
                                        />
                                    </div>

                                    <Button onClick={runAnalysis} fullWidth disabled={isAnalyzing || isFutureDraw}>
                                        <div className="flex items-center justify-center gap-2">
                                            {isAnalyzing ? (
                                                <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Analyzing...</span></>
                                            ) : (
                                                <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg><span>{isFutureDraw ? 'Starts next month' : 'Run Analysis'}</span></>
                                            )}
                                        </div>
                                    </Button>
                                    <Button variant="outline" fullWidth onClick={() => setIsEditingSettings(true)}>
                                        <div className="flex items-center justify-center gap-2">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <span>Draw Settings</span>
                                        </div>
                                    </Button>
                                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-700/50">
                                        <h4 className="text-sm font-bold text-amber-400 mb-2 uppercase tracking-tight">Prize Logic</h4>
                                        <ul className="text-[11px] leading-relaxed text-slate-400 space-y-2">
                                            <li>• <strong className="text-white">5-Match ({settings.tier1_percent}%):</strong> Jackpot + Carryover. Capped at ${settings.jackpot_cap?.toLocaleString()}.</li>
                                            <li>• <strong className="text-white">Cap Excess:</strong> Funds over ${settings.jackpot_cap?.toLocaleString()} move to 4-Match.</li>
                                            <li>• <strong className="text-white">4-Match ({settings.tier2_percent}%):</strong> Standard pool + any cap excess.</li>
                                            <li>• <strong className="text-white">3-Match ({settings.tier3_percent}%):</strong> Fixed percentage of revenue.</li>
                                        </ul>
                                    </div>
                                    <div className="space-y-4">
                                        <div className={`p-4 rounded-xl border transition-all duration-500 ${currentDraw && currentDraw.status !== 'published'
                                            ? 'bg-emerald-500/10 border-emerald-500/20 shadow-sm'
                                            : 'bg-slate-800/40 border-slate-700/50 opacity-100'}`}>
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 text-slate-500">
                                                {currentDraw && currentDraw.status !== 'published' ? 'Active Cycle' : 'Upcoming Cycle'}
                                            </h4>
                                            <p className="text-xl font-black text-white tracking-tight">
                                                {currentDraw && currentDraw.status === 'open'
                                                    ? currentDraw.month_year
                                                    : getDrawMonthYear()}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className={`w-2 h-2 rounded-full ${currentDraw && currentDraw.status === 'open' && !isFutureDraw ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]' : 'bg-amber-500 shadow-[0_0_8px_#f59e0b]'}`} />
                                                <p className="text-[10px] text-zinc-400 uppercase tracking-[0.2em] font-black leading-none">
                                                    {currentDraw && currentDraw.status === 'open'
                                                        ? (isFutureDraw ? 'Cycle locked until next month' : 'Ready to Run')
                                                        : `Scheduled for ${getDrawMonthYear()}`}
                                                </p>
                                            </div>
                                            {isFutureDraw && (
                                                <div className="mt-3 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                                                    <p className="text-[9px] text-amber-500 font-bold leading-tight">
                                                        Note: You cannot run a draw for a future month. This cycle will unlock on the 1st.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2">
                            {analysisResults ? (
                                <Card variant="glow">
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle>Analysis Results</CardTitle>
                                            {isPublished && <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-sm font-medium">Published</span>}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div>
                                            <h4 className="text-sm font-medium text-slate-400 mb-3">Generated Winning Numbers</h4>
                                            <div className="flex flex-wrap gap-3">
                                                {analysisResults?.winningNumbers?.map((num, i) => (
                                                    <motion.div
                                                        key={`${num}-${i}`}
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        transition={{ delay: i * 0.1, type: 'spring' }}
                                                        className={`w-14 h-14 rounded-xl flex items-center justify-center ${i < 3 ? 'bg-gradient-to-br from-violet-500 to-purple-600' : 'bg-gradient-to-br from-teal-500 to-emerald-500'}`}
                                                    >
                                                        <span className="text-xl font-bold text-white">{num}</span>
                                                    </motion.div>
                                                )) || <div className="text-slate-500 text-xs italic font-bold uppercase tracking-widest">Generating...</div>}
                                            </div>
                                            <div className="mt-4 flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-widest">
                                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/50 border border-violet-500/20">
                                                    <span className="text-slate-500">Least popular:</span>
                                                    <span className="text-violet-400">{analysisResults?.leastPopular?.join(', ') || '---'}</span>
                                                </div>
                                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/50 border border-teal-500/20">
                                                    <span className="text-slate-500">Most popular:</span>
                                                    <span className="text-teal-400">{analysisResults?.mostPopular?.join(', ') || '---'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Winner Breakdown - 3 Big Windows */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {/* 5-Draw Pool Window */}
                                            <div className={`relative overflow-hidden p-6 rounded-3xl border-2 shadow-2xl transition-all duration-300 ${analysisResults?.tier1?.count > 0
                                                ? 'bg-gradient-to-br from-amber-500/20 to-orange-600/10 border-amber-500/40 ring-4 ring-amber-500/10'
                                                : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'}`}>

                                                <div className="relative z-10">
                                                    <div className="flex justify-between items-start mb-6">
                                                        <div>
                                                            <h4 className="text-amber-400 font-black tracking-tighter text-xl uppercase">5 DRAW POOL</h4>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Grand Jackpot</p>
                                                        </div>
                                                        <div className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-black border border-amber-500/30 uppercase">TIER 1</div>
                                                    </div>

                                                    <div className="mb-8">
                                                        <div className="text-3xl font-black text-white leading-none mb-2 tracking-tight">
                                                            {formatCurrency(analysisResults?.tier1?.pool || 0)}
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                                                                Base + {formatCurrency(analysisResults?.currentJackpot || 0)} carryover
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3 pt-6 border-t border-white/5">
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="text-slate-400 font-bold uppercase tracking-wider">Winners</span>
                                                            <span
                                                                className={`font-black text-lg transition-all duration-200 ${(analysisResults?.tier1?.count || 0) > 0 ? 'text-white cursor-pointer hover:text-amber-400 hover:scale-110' : 'text-slate-600'}`}
                                                                onClick={() => handleShowWinners(1)}
                                                            >
                                                                {analysisResults?.tier1?.count || 0}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center p-3 rounded-xl bg-black/20 border border-white/5">
                                                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Payout</span>
                                                            <span className="text-emerald-400 font-black text-xl">
                                                                {(analysisResults?.tier1?.count || 0) > 0
                                                                    ? formatCurrency(analysisResults?.tier1?.payout || 0)
                                                                    : 'ROLLOVER'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 4-Draw Pool Window */}
                                            <div className={`relative overflow-hidden p-6 rounded-3xl border-2 shadow-2xl transition-all duration-300 ${(analysisResults?.tier2?.count || 0) > 0
                                                ? 'bg-gradient-to-br from-violet-500/20 to-purple-600/10 border-violet-500/40'
                                                : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'}`}>

                                                <div className="relative z-10">
                                                    <div className="flex justify-between items-start mb-6">
                                                        <div>
                                                            <h4 className="text-violet-400 font-black tracking-tighter text-xl uppercase">4 DRAW POOL</h4>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Major Prize</p>
                                                        </div>
                                                        <div className="px-3 py-1 rounded-full bg-violet-500/20 text-violet-400 text-[10px] font-black border border-violet-500/30 uppercase">TIER 2</div>
                                                    </div>

                                                    <div className="mb-8">
                                                        <div className="text-3xl font-black text-white leading-none mb-2 tracking-tight">
                                                            {formatCurrency(analysisResults?.tier2?.pool || 0)}
                                                        </div>
                                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Fixed Allocation</span>
                                                    </div>

                                                    <div className="space-y-3 pt-6 border-t border-white/5">
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="text-slate-400 font-bold uppercase tracking-wider">Winners</span>
                                                            <span
                                                                className={`font-black text-lg transition-all duration-200 ${(analysisResults?.tier2?.count || 0) > 0 ? 'text-white cursor-pointer hover:text-violet-400 hover:scale-110' : 'text-slate-600'}`}
                                                                onClick={() => handleShowWinners(2)}
                                                            >
                                                                {analysisResults?.tier2?.count || 0}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center p-3 rounded-xl bg-black/20 border border-white/5">
                                                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Payout</span>
                                                            <span className="text-emerald-400 font-black text-xl">
                                                                {(analysisResults?.tier2?.count || 0) > 0
                                                                    ? formatCurrency(analysisResults?.tier2?.payout || 0)
                                                                    : formatCurrency(0)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 3-Draw Pool Window */}
                                            <div className={`relative overflow-hidden p-6 rounded-3xl border-2 shadow-2xl transition-all duration-300 ${(analysisResults?.tier3?.count || 0) > 0
                                                ? 'bg-gradient-to-br from-teal-500/20 to-cyan-600/10 border-teal-500/40'
                                                : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'}`}>

                                                <div className="relative z-10">
                                                    <div className="flex justify-between items-start mb-6">
                                                        <div>
                                                            <h4 className="text-teal-400 font-black tracking-tighter text-xl uppercase">3 DRAW POOL</h4>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Entry Tier</p>
                                                        </div>
                                                        <div className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-400 text-[10px] font-black border border-teal-500/30 uppercase">TIER 3</div>
                                                    </div>

                                                    <div className="mb-8">
                                                        <div className="text-3xl font-black text-white leading-none mb-2 tracking-tight">
                                                            {formatCurrency(analysisResults?.tier3?.pool || 0)}
                                                        </div>
                                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Fixed Allocation</span>
                                                    </div>

                                                    <div className="space-y-3 pt-6 border-t border-white/5">
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="text-slate-400 font-bold uppercase tracking-wider">Winners</span>
                                                            <span
                                                                className={`font-black text-lg transition-all duration-200 ${(analysisResults?.tier3?.count || 0) > 0 ? 'text-white cursor-pointer hover:text-teal-400 hover:scale-110' : 'text-slate-600'}`}
                                                                onClick={() => handleShowWinners(3)}
                                                            >
                                                                {analysisResults?.tier3?.count || 0}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center p-3 rounded-xl bg-black/20 border border-white/5">
                                                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Payout</span>
                                                            <span className="text-emerald-400 font-black text-xl">
                                                                {(analysisResults?.tier3?.count || 0) > 0
                                                                    ? formatCurrency(analysisResults?.tier3?.payout || 0)
                                                                    : formatCurrency(0)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Prize Pool Summary */}
                                        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/50">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Total Available Pool:</span>
                                                    <span className="text-white font-black">{formatCurrency((analysisResults?.prizePool || 0) + (analysisResults?.currentJackpot || 0))}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Next Month Rollover:</span>
                                                    <span className="text-amber-400 font-black">{formatCurrency(analysisResults?.jackpotRollover || 0)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {!isPublished && (
                                            <div className="space-y-4">
                                                {isFutureDraw && (
                                                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                                                            <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                                            </svg>
                                                        </div>
                                                        <p className="text-sm text-zinc-300">
                                                            <strong className="text-amber-400 block mb-1">Cycle Locked</strong>
                                                            The cycle is currently collecting data. You can only finalize results once the month has officially started.
                                                        </p>
                                                    </div>
                                                )}
                                                <Button
                                                    variant="accent"
                                                    fullWidth
                                                    onClick={handleRunDraw}
                                                    disabled={isPublishing || isFutureDraw}
                                                    className="h-16 text-lg font-bold"
                                                >
                                                    <div className="flex flex-col items-center">
                                                        <span>{isPublishing ? "Finalizing..." : "Finalize Results (DRAFT)"}</span>
                                                        <span className="text-[10px] font-normal uppercase tracking-widest opacity-60">Moves draw to Review phase</span>
                                                    </div>
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ) : currentDraw?.status === 'completed' ? (
                                <Card variant="glow" className="flex-1">
                                    <CardHeader>
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                                </div>
                                                <div>
                                                    <CardTitle className="text-xl tracking-tight uppercase">Winner Audit: {currentDraw.month_year}</CardTitle>
                                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-none mt-1">Status: Verification Phase</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black border border-amber-500/20 uppercase tracking-widest italic">Action Required</span>
                                                {winners.some(w => !w.verification_status || w.verification_status.toLowerCase() === 'pending') && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 px-4 font-black text-[9px] uppercase tracking-[0.1em] border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/5"
                                                        onClick={handleVerifyAll}
                                                        disabled={isVerifying}
                                                    >
                                                        {isVerifying ? 'Processing...' : 'Auto-Verify All'}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-8">
                                        <div className="bg-black/20 rounded-3xl border border-white/5 overflow-hidden">
                                            <table className="w-full text-xs text-left">
                                                <thead>
                                                    <tr className="bg-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 border-b border-white/5">
                                                        <th className="px-6 py-4">Claimant Profile</th>
                                                        <th className="px-6 py-4">Prize Tier</th>
                                                        <th className="px-6 py-4">Net Payout</th>
                                                        <th className="px-6 py-4">Verification</th>
                                                        <th className="px-6 py-4 text-right">Audit</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/[0.03]">
                                                    {winners.map(winner => (
                                                        <tr key={winner.id} className="hover:bg-white/[0.02] transition-colors group">
                                                            <td className="px-6 py-4">
                                                                <div className="flex flex-col">
                                                                    <span className="text-white font-bold text-sm tracking-tight">{winner.profiles?.full_name || 'Anonymous User'}</span>
                                                                    <span className="text-[9px] text-zinc-600 font-mono italic">{winner.profiles?.email || 'legacy-system-user'}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-3">
                                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border ${winner.tier === 1 ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                                                            winner.tier === 2 ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                                                                'bg-teal-500/10 text-teal-400 border-teal-500/20'
                                                                        }`}>
                                                                        {winner.tier === 1 ? '5M Jackpot' : winner.tier === 2 ? '4M Pool' : '3M Pool'}
                                                                    </span>
                                                                    <div className="flex gap-1">
                                                                        {Array.isArray(winner.scores) && winner.scores.map((num, idx) => {
                                                                            const isMatch = currentDraw?.winning_numbers?.includes(Number(num));
                                                                            return (
                                                                                <span key={idx} className={`w-4 h-4 rounded-md flex items-center justify-center text-[8px] font-black border transition-all ${isMatch ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-zinc-900 border-zinc-800 text-zinc-700'
                                                                                    }`}>
                                                                                    {num}
                                                                                </span>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="font-black text-emerald-400 font-mono tracking-tighter">
                                                                    {formatCurrency(winner.net_payout)}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] border transition-all ${winner.verification_status === 'verified' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]' :
                                                                        winner.verification_status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                                            'bg-zinc-800 text-zinc-600 border-zinc-700'
                                                                    }`}>
                                                                    {winner.verification_status || 'Pending'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                {(!winner.verification_status || winner.verification_status.toLowerCase() === 'pending') ? (
                                                                    <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <button
                                                                            onClick={() => handleVerifyWinner(winner.id, 'verified')}
                                                                            className="w-8 h-8 flex items-center justify-center bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/20"
                                                                            title="Verify Winner"
                                                                        >
                                                                            ✓
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleVerifyWinner(winner.id, 'rejected')}
                                                                            className="w-8 h-8 flex items-center justify-center bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all border border-rose-500/20"
                                                                            title="Reject Claim"
                                                                        >
                                                                            ✕
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-8 h-8 ml-auto flex items-center justify-center">
                                                                        <svg className="w-4 h-4 text-zinc-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {winners.length === 0 && (
                                                        <tr>
                                                            <td colSpan="5" className="py-16 text-center">
                                                                <p className="text-zinc-600 font-bold uppercase tracking-[0.2em] text-xs">No claimants discovered for this sequence</p>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="p-8 rounded-[2.5rem] bg-emerald-500/[0.03] border border-emerald-500/10 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform duration-700">
                                                <svg className="w-24 h-24 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                            </div>

                                            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                                                <div className="flex-1">
                                                    <h4 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Finalize and Secure Results</h4>
                                                    <p className="text-sm text-zinc-500 font-medium max-w-md">
                                                        Once all winners are verified, you can lock the results and publish them to the public leaderboard.
                                                        Settlements will then be accessible in the <span className="text-white font-bold">Finance Center</span>.
                                                    </p>
                                                </div>
                                                <div className="flex flex-col items-end gap-2 shrink-0">
                                                    <div className="flex items-center gap-3 mb-2 px-4 py-2 rounded-2xl bg-black/40 border border-white/5">
                                                        <div className="text-right">
                                                            <p className="text-2xl font-black text-white leading-none">{winners.filter(w => w.verification_status === 'verified').length}/{winners.length}</p>
                                                            <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mt-1">Verified Claims</p>
                                                        </div>
                                                        <div className="w-px h-8 bg-white/10" />
                                                        <div className="text-right">
                                                            <p className="text-2xl font-black text-emerald-400 leading-none">{formatCurrency(winners.reduce((sum, w) => sum + (w.verification_status === 'verified' ? w.net_payout : 0), 0))}</p>
                                                            <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mt-1">Total Payable</p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="primary"
                                                        onClick={handlePublish}
                                                        disabled={isPublishing || winners.length === 0 || winners.some(w => !w.verification_status || w.verification_status.toLowerCase() === 'pending')}
                                                        className="h-14 w-full md:w-64 font-black text-xs uppercase tracking-[0.3em] shadow-[0_10px_30px_rgba(16,185,129,0.2)]"
                                                    >
                                                        {isPublishing ? "Publishing..." : "Commit & Publish"}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                            ) : isPublished ? (
                                <Card variant="glass" className="h-full flex flex-col items-center justify-center min-h-[400px] border-emerald-500/30 bg-emerald-500/5">
                                    <div className="text-center">
                                        <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30">
                                            <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <h3 className="text-2xl font-bold text-white mb-2">Draw Published!</h3>
                                        <p className="text-emerald-400/80 mb-6 font-medium">Monthly results have been saved to the database.</p>
                                        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl inline-flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-xs text-slate-400 uppercase tracking-widest font-black">Syncing records...</span>
                                        </div>
                                    </div>
                                </Card>
                            ) : (
                                <Card variant="glass" className="h-full flex items-center justify-center min-h-[400px]">
                                    <div className="text-center">
                                        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-800 flex items-center justify-center">
                                            <svg className="w-10 h-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                        </div>
                                        <h3 className="text-xl font-semibold text-white mb-2">No Analysis Yet</h3>
                                        <p className="text-slate-400">Select a score range and run analysis to begin</p>
                                    </div>
                                </Card>
                            )}
                        </motion.div>
                    </div>

                    <Modal
                        isOpen={isEditingSettings}
                        onClose={() => setIsEditingSettings(false)}
                        title="Draw Settings"
                        size="md"
                    >
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-white font-bold text-[10px] uppercase tracking-[0.2em]">Configure Prize Pools</h4>
                                <div className={`px-2 py-0.5 rounded text-[10px] font-black ${(settings.tier1_percent + settings.tier2_percent + settings.tier3_percent) === 100
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : 'bg-rose-500/10 text-rose-400'
                                    } uppercase`}>
                                    Total: {settings.tier1_percent + settings.tier2_percent + settings.tier3_percent}%
                                </div>
                            </div>

                            <Input
                                label="Base $ per Subscriber"
                                type="number"
                                step="0.01"
                                value={settings.base_amount_per_sub}
                                onChange={(e) => setSettings({ ...settings, base_amount_per_sub: parseFloat(e.target.value) || 0 })}
                            />

                            <div className="grid grid-cols-3 gap-3">
                                <Input
                                    label="5-M %"
                                    type="number"
                                    value={settings.tier1_percent}
                                    onChange={(e) => setSettings({ ...settings, tier1_percent: parseInt(e.target.value) || 0 })}
                                />
                                <Input
                                    label="4-M %"
                                    type="number"
                                    value={settings.tier2_percent}
                                    onChange={(e) => setSettings({ ...settings, tier2_percent: parseInt(e.target.value) || 0 })}
                                />
                                <Input
                                    label="3-M %"
                                    type="number"
                                    value={settings.tier3_percent}
                                    onChange={(e) => setSettings({ ...settings, tier3_percent: parseInt(e.target.value) || 0 })}
                                />
                            </div>

                            {/* Live Payout Preview */}
                            <div className="p-4 rounded-xl bg-slate-900 border border-white/5 space-y-3">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Allocation Per Player</p>
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div className="space-y-1">
                                        <div className="text-[10px] text-amber-500 font-black uppercase">5-M</div>
                                        <div className="text-sm text-white font-black">{formatCurrency((settings.base_amount_per_sub * settings.tier1_percent) / 100)}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-[10px] text-violet-500 font-black uppercase">4-M</div>
                                        <div className="text-sm text-white font-black">{formatCurrency((settings.base_amount_per_sub * settings.tier2_percent) / 100)}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-[10px] text-teal-500 font-black uppercase">3-M</div>
                                        <div className="text-sm text-white font-black">{formatCurrency((settings.base_amount_per_sub * settings.tier3_percent) / 100)}</div>
                                    </div>
                                </div>
                            </div>

                            <Input
                                label="Jackpot Cap ($)"
                                type="number"
                                value={settings.jackpot_cap}
                                onChange={(e) => setSettings({ ...settings, jackpot_cap: parseInt(e.target.value) || 0 })}
                            />

                            <Button
                                onClick={handleSaveSettings}
                                fullWidth
                                className="h-12 text-xs font-black uppercase tracking-widest shadow-[0_8px_20px_rgba(255,255,255,0.05)]"
                                disabled={(settings.tier1_percent + settings.tier2_percent + settings.tier3_percent) !== 100}
                            >
                                Save Configuration
                            </Button>
                        </div>
                    </Modal>

                    {/* Winners Preview Modal */}
                    <Modal
                        isOpen={isWinnersModalOpen}
                        onClose={() => setIsWinnersModalOpen(false)}
                        title={`Tier ${viewingTier} Winners Preview`}
                        size="lg"
                    >
                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800">
                                <div className="space-y-3">
                                    {selectedTierWinners.map((winner, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10">
                                            <div className="flex flex-col">
                                                <span className="text-white font-bold">{winner.name}</span>
                                                <div className="flex gap-2 mt-1">
                                                    {winner.scores.map((score, sIdx) => {
                                                        const isMatch = analysisResults?.winningNumbers?.includes(score);
                                                        return (
                                                            <span
                                                                key={`${idx}-${sIdx}`}
                                                                className={`text-[10px] font-black w-6 h-6 rounded-md flex items-center justify-center ${isMatch
                                                                    ? viewingTier === 1 ? 'bg-amber-500 text-white' : viewingTier === 2 ? 'bg-violet-500 text-white' : 'bg-teal-500 text-white'
                                                                    : 'bg-slate-800 text-slate-500'
                                                                    }`}
                                                            >
                                                                {score}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Matches</span>
                                                <span className="text-white font-black">{winner.matches} / 5</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <Button
                                onClick={() => setIsWinnersModalOpen(false)}
                                fullWidth
                                variant="ghost"
                                className="h-12 text-xs font-black uppercase tracking-widest"
                            >
                                Close Preview
                            </Button>
                        </div>
                    </Modal>

                    <div className="mt-12">
                        <h2 className="text-xl font-bold text-white mb-6">Draw History</h2>
                        <div className="space-y-4">
                            {draws.filter(d => d.status === 'published' || d.status === 'completed').map(draw => (
                                <motion.div
                                    key={draw.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="group relative p-5 rounded-2xl bg-slate-900/40 border border-slate-800/50 hover:border-amber-500/30 transition-all duration-300"
                                >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="flex items-center gap-6">
                                            <div className="relative">
                                                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                                    <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                {draw.status === 'published' && (
                                                    <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center">
                                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <p className="font-black text-xl text-white tracking-tight">{draw.month_year}</p>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${draw.status === 'published' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                                        {draw.status}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                                    {draw.tier1_winners + draw.tier2_winners + draw.tier3_winners} Total Winners • {formatCurrency(draw.prize_pool)} Pool
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {draw.winning_numbers?.map((num, i) => (
                                                <span
                                                    key={i}
                                                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm border transition-colors ${i < 3 ? 'bg-violet-500/10 border-violet-500/20 text-violet-400' : 'bg-teal-500/10 border-teal-500/20 text-teal-400'}`}
                                                >
                                                    {num}
                                                </span>
                                            ))}
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-10 px-4 bg-slate-800/50 hover:bg-slate-800 text-slate-300 border border-slate-700/50"
                                                onClick={() => handleExportWinners(draw.id, draw.month_year)}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                    <span className="text-[10px] font-black uppercase tracking-widest">CSV</span>
                                                </div>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-10 px-4 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                                onClick={() => handleResetDraw(draw.id, draw.month_year)}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Reset</span>
                                                </div>
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </PageTransition>
    );
}
