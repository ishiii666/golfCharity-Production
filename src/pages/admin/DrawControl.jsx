import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import PageTransition from '../../components/layout/PageTransition';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input, { Select } from '../../components/ui/Input';
import { formatCurrency } from '../../utils/formatters';
import { fadeUp } from '../../utils/animations';
import { DRAW_SCHEDULE_TEXT, getNextDrawDateFormatted, DRAW_CONFIG } from '../../utils/drawSchedule';
import {
    getScoreFrequencies,
    generateWinningNumbers,
    getEligibleUsers,
    countMatches,
    getJackpot,
    getCurrentDraw,
    runDraw,
    publishDraw,
    createNewDraw,
    logActivity
} from '../../lib/supabaseRest';

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
    const [actionMessage, setActionMessage] = useState({ type: '', text: '' });

    // Fetch real data on mount
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [users, jackpot, draw] = await Promise.all([
                getEligibleUsers(),
                getJackpot(),
                getCurrentDraw()
            ]);

            setEligibleUsers(users);
            setActiveSubscribers(users.length);
            setTotalScores(users.reduce((sum, u) => sum + (u.scores?.length || 0), 0));
            setJackpotCarryover(jackpot);
            setCurrentDrawState(draw);

            console.log('📊 Draw Control data loaded:', {
                users: users.length,
                jackpot,
                draw: draw?.month_year
            });
        } catch (error) {
            console.error('Error fetching data:', error);
            showMessage('error', 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const showMessage = (type, text) => {
        setActionMessage({ type, text });
        setTimeout(() => setActionMessage({ type: '', text: '' }), 5000);
    };

    const handlePresetChange = (preset) => {
        setSelectedPreset(preset);
        const found = SCORE_RANGE_PRESETS.find(p => p.label === preset);
        if (found) {
            setRangeMin(found.min);
            setRangeMax(found.max);
        }
    };

    const runAnalysis = async () => {
        setIsAnalyzing(true);
        try {
            // Get score frequencies from database
            const frequencies = await getScoreFrequencies(rangeMin, rangeMax);

            if (frequencies.length < 5) {
                showMessage('error', 'Not enough score data in this range. Need at least 5 different scores.');
                setIsAnalyzing(false);
                return;
            }

            // Generate winning numbers
            const winningNumbers = generateWinningNumbers(frequencies);

            if (winningNumbers.length < 5) {
                showMessage('error', 'Could not generate winning numbers. Not enough data.');
                setIsAnalyzing(false);
                return;
            }

            // Get least and most popular from frequencies
            const leastPopular = frequencies.slice(0, 3).map(f => f.score);
            const mostPopular = frequencies.slice(-2).map(f => f.score);

            // Calculate matches for each eligible user
            let fiveMatch = 0, fourMatch = 0, threeMatch = 0;

            for (const user of eligibleUsers) {
                const matches = countMatches(user.scores, winningNumbers);
                if (matches === 5) fiveMatch++;
                else if (matches === 4) fourMatch++;
                else if (matches === 3) threeMatch++;
            }

            // Calculate prize pools
            const basePrizePool = activeSubscribers * 5;
            const total = basePrizePool + jackpotCarryover;
            const fiveMatchPool = total * 0.40;
            const fourMatchPool = total * 0.35;
            const threeMatchPool = total * 0.25;

            // Calculate payouts
            const fiveMatchPayout = fiveMatch > 0 ? fiveMatchPool / fiveMatch : 0;
            const fourMatchPayout = fourMatch > 0 ? fourMatchPool / fourMatch : 0;
            const threeMatchPayout = threeMatch > 0 ? threeMatchPool / threeMatch : 0;

            // Jackpot rollover if no 5-match winners
            const jackpotRollover = fiveMatch === 0 ? basePrizePool * 0.40 + jackpotCarryover : 0;

            setAnalysisResults({
                winningNumbers,
                leastPopular,
                mostPopular,
                scoreRange: { min: rangeMin, max: rangeMax },
                prizePool: {
                    base: basePrizePool,
                    total,
                    fiveMatch: fiveMatchPool,
                    fourMatch: fourMatchPool,
                    threeMatch: threeMatchPool
                },
                simulation: {
                    winners: { fiveMatch, fourMatch, threeMatch },
                    totalWinners: fiveMatch + fourMatch + threeMatch,
                    payouts: {
                        fiveMatch: fiveMatchPayout,
                        fourMatch: fourMatchPayout,
                        threeMatch: threeMatchPayout
                    },
                    jackpotRollover
                }
            });

            showMessage('success', 'Analysis complete! Review results before publishing.');
        } catch (error) {
            console.error('Error running analysis:', error);
            showMessage('error', 'Analysis failed: ' + error.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handlePublish = async () => {
        if (!analysisResults || !currentDraw) {
            showMessage('error', 'No analysis results or active draw to publish');
            return;
        }

        setIsPublishing(true);
        try {
            // Run the draw with the selected range
            const result = await runDraw(currentDraw.id, rangeMin, rangeMax);

            if (!result.success) {
                throw new Error(result.error || 'Draw failed');
            }

            // Publish the draw
            const publishResult = await publishDraw(currentDraw.id);

            if (!publishResult.success) {
                throw new Error(publishResult.error || 'Publish failed');
            }

            // Create next month's draw
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            const monthYear = nextMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            await createNewDraw(monthYear);

            setIsPublished(true);
            showMessage('success', 'Results published successfully! Next month\'s draw created.');

            // Refresh data
            await fetchData();
        } catch (error) {
            console.error('Error publishing:', error);
            showMessage('error', 'Publish failed: ' + error.message);
        } finally {
            setIsPublishing(false);
        }
    };

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
                    {/* Header */}
                    <motion.div
                        variants={fadeUp}
                        initial="initial"
                        animate="animate"
                        className="mb-8"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-sm font-medium">
                                Admin Only
                            </span>
                        </div>
                        <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                            Draw Control Center
                        </h1>
                        <p className="text-slate-400 mb-2">
                            Analyze score ranges and publish draw results
                        </p>
                        <p className="text-amber-400 font-medium text-sm">
                            📅 {DRAW_SCHEDULE_TEXT}
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

                    {/* Stats Bar */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
                    >
                        <Card variant="glass" padding="p-4">
                            <div className="text-slate-400 text-sm mb-1">Eligible Participants</div>
                            <div className="text-2xl font-bold text-white">{activeSubscribers}</div>
                        </Card>
                        <Card variant="glass" padding="p-4">
                            <div className="text-slate-400 text-sm mb-1">Total Scores</div>
                            <div className="text-2xl font-bold text-white">{totalScores}</div>
                        </Card>
                        <Card variant="glass" padding="p-4">
                            <div className="text-slate-400 text-sm mb-1">Base Prize Pool</div>
                            <div className="text-2xl font-bold text-teal-400">{formatCurrency(activeSubscribers * 5)}</div>
                        </Card>
                        <Card variant="glass" padding="p-4">
                            <div className="text-slate-400 text-sm mb-1">Jackpot Carryover</div>
                            <div className="text-2xl font-bold text-amber-400">{formatCurrency(jackpotCarryover)}</div>
                        </Card>
                    </motion.div>

                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Analysis Controls */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="lg:col-span-1"
                        >
                            <Card variant="solid">
                                <CardHeader>
                                    <CardTitle>Range Analysis</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Preset Selector */}
                                    <Select
                                        label="Preset Range"
                                        value={selectedPreset}
                                        onChange={(e) => handlePresetChange(e.target.value)}
                                        options={[
                                            { value: '', label: 'Select a preset...' },
                                            ...SCORE_RANGE_PRESETS.map(p => ({ value: p.label, label: p.label }))
                                        ]}
                                    />

                                    {/* Custom Range */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="Min Score"
                                            type="number"
                                            min="1"
                                            max="44"
                                            value={rangeMin}
                                            onChange={(e) => setRangeMin(parseInt(e.target.value) || 1)}
                                        />
                                        <Input
                                            label="Max Score"
                                            type="number"
                                            min="2"
                                            max="45"
                                            value={rangeMax}
                                            onChange={(e) => setRangeMax(parseInt(e.target.value) || 45)}
                                        />
                                    </div>

                                    {/* Run Analysis Button */}
                                    <Button onClick={runAnalysis} fullWidth disabled={isAnalyzing}>
                                        {isAnalyzing ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                                Analyzing...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                </svg>
                                                Run Analysis
                                            </>
                                        )}
                                    </Button>

                                    {/* Info */}
                                    <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/50">
                                        <h4 className="text-sm font-semibold text-white mb-2">How It Works</h4>
                                        <ul className="text-sm text-slate-400 space-y-1">
                                            <li>• 3 least popular scores</li>
                                            <li>• 2 most popular scores</li>
                                            <li>• = 5 winning numbers</li>
                                        </ul>
                                    </div>

                                    {/* Current Draw Info */}
                                    {currentDraw && (
                                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                            <h4 className="text-sm font-semibold text-emerald-400 mb-1">Current Draw</h4>
                                            <p className="text-white font-medium">{currentDraw.month_year}</p>
                                            <p className="text-sm text-slate-400">Status: {currentDraw.status}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Results Panel */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="lg:col-span-2"
                        >
                            {analysisResults ? (
                                <Card variant="glow">
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle>Analysis Results</CardTitle>
                                            {isPublished && (
                                                <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-sm font-medium">
                                                    Published
                                                </span>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {/* Winning Numbers */}
                                        <div>
                                            <h4 className="text-sm font-medium text-slate-400 mb-3">Generated Winning Numbers</h4>
                                            <div className="flex flex-wrap gap-3">
                                                {analysisResults.winningNumbers.map((num, i) => (
                                                    <motion.div
                                                        key={num}
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        transition={{ delay: i * 0.1, type: 'spring' }}
                                                        className={`w-14 h-14 rounded-xl flex items-center justify-center ${i < 3
                                                            ? 'bg-gradient-to-br from-violet-500 to-purple-600'
                                                            : 'bg-gradient-to-br from-teal-500 to-emerald-500'
                                                            }`}
                                                    >
                                                        <span className="text-xl font-bold text-white">{num}</span>
                                                    </motion.div>
                                                ))}
                                            </div>
                                            <div className="mt-3 flex gap-4 text-sm">
                                                <span className="text-slate-400">
                                                    Least popular: <span className="text-violet-400">{analysisResults.leastPopular.join(', ')}</span>
                                                </span>
                                                <span className="text-slate-400">
                                                    Most popular: <span className="text-teal-400">{analysisResults.mostPopular.join(', ')}</span>
                                                </span>
                                            </div>
                                        </div>

                                        {/* Winner Breakdown */}
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                                                <div className="text-3xl font-bold text-amber-400">
                                                    {analysisResults.simulation.winners.fiveMatch}
                                                </div>
                                                <div className="text-white font-medium">5-Match</div>
                                                <div className="text-slate-400 text-sm">
                                                    {analysisResults.simulation.payouts.fiveMatch > 0
                                                        ? formatCurrency(analysisResults.simulation.payouts.fiveMatch) + ' each'
                                                        : 'Jackpot rolls over'}
                                                </div>
                                            </div>
                                            <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 text-center">
                                                <div className="text-3xl font-bold text-violet-400">
                                                    {analysisResults.simulation.winners.fourMatch}
                                                </div>
                                                <div className="text-white font-medium">4-Match</div>
                                                <div className="text-slate-400 text-sm">
                                                    {formatCurrency(analysisResults.simulation.payouts.fourMatch)} each
                                                </div>
                                            </div>
                                            <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-center">
                                                <div className="text-3xl font-bold text-teal-400">
                                                    {analysisResults.simulation.winners.threeMatch}
                                                </div>
                                                <div className="text-white font-medium">3-Match</div>
                                                <div className="text-slate-400 text-sm">
                                                    {formatCurrency(analysisResults.simulation.payouts.threeMatch)} each
                                                </div>
                                            </div>
                                        </div>

                                        {/* Prize Pool Summary */}
                                        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/50">
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">Total Prize Pool:</span>
                                                    <span className="text-white font-semibold">{formatCurrency(analysisResults.prizePool.total)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">Total Winners:</span>
                                                    <span className="text-white font-semibold">{analysisResults.simulation.totalWinners}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">5-Match Pool (40%):</span>
                                                    <span className="text-amber-400">{formatCurrency(analysisResults.prizePool.fiveMatch)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">4-Match Pool (35%):</span>
                                                    <span className="text-violet-400">{formatCurrency(analysisResults.prizePool.fourMatch)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">3-Match Pool (25%):</span>
                                                    <span className="text-teal-400">{formatCurrency(analysisResults.prizePool.threeMatch)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">New Jackpot:</span>
                                                    <span className="text-amber-400 font-semibold">{formatCurrency(analysisResults.simulation.jackpotRollover)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Publish Button */}
                                        {!isPublished && (
                                            <Button
                                                variant="accent"
                                                fullWidth
                                                onClick={handlePublish}
                                                disabled={isPublishing}
                                                className="mt-4"
                                            >
                                                {isPublishing ? (
                                                    <>
                                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                                        Publishing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        Publish These Results
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            ) : (
                                <Card variant="glass" className="h-full flex items-center justify-center min-h-[400px]">
                                    <div className="text-center">
                                        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-800 flex items-center justify-center">
                                            <svg className="w-10 h-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-xl font-semibold text-white mb-2">No Analysis Yet</h3>
                                        <p className="text-slate-400 max-w-sm">
                                            Select a score range and run analysis to see potential winning numbers and prize distribution
                                        </p>
                                    </div>
                                </Card>
                            )}
                        </motion.div>
                    </div>
                </div>
            </div>
        </PageTransition>
    );
}
