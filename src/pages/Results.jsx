import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import PageTransition from '../components/layout/PageTransition';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { staggerContainer, staggerItem, fadeUp } from '../utils/animations';
import { formatDate } from '../utils/formatters';
import { getDraws, getJackpot } from '../lib/supabaseRest';

export default function Results() {
    const [latestDraw, setLatestDraw] = useState(null);
    const [pastDraws, setPastDraws] = useState([]);
    const [jackpot, setJackpot] = useState(0);
    const [loading, setLoading] = useState(true);

    // Fetch draw data from database
    useEffect(() => {
        const fetchDraws = async () => {
            try {
                setLoading(true);

                // Fetch all draws
                const draws = await getDraws();

                // Filter to only published draws
                const publishedDraws = draws.filter(d =>
                    d.status === 'published'
                );

                if (publishedDraws.length > 0) {
                    // Sort by date (newest first)
                    publishedDraws.sort((a, b) =>
                        new Date(b.draw_date || b.created_at) - new Date(a.draw_date || a.created_at)
                    );

                    // Transform latest draw
                    const latest = publishedDraws[0];
                    setLatestDraw({
                        id: latest.id,
                        date: latest.draw_date || latest.created_at,
                        monthYear: latest.month_year,
                        status: latest.status,
                        winningNumbers: latest.winning_numbers || [],
                        prizePool: latest.prize_pool || 0,
                        winners: {
                            fiveMatch: latest.tier1_winners || 0,
                            fourMatch: latest.tier2_winners || 0,
                            threeMatch: latest.tier3_winners || 0
                        },
                        payouts: {
                            fiveMatch: latest.tier1_winners > 0 ? (latest.tier1_pool / latest.tier1_winners) : 0,
                            fourMatch: latest.tier2_winners > 0 ? (latest.tier2_pool / latest.tier2_winners) : 0,
                            threeMatch: latest.tier3_winners > 0 ? (latest.tier3_pool / latest.tier3_winners) : 0
                        },
                        jackpot: latest.tier1_rollover_amount || latest.tier1_pool || 0
                    });

                    // Transform past draws (skip the first one which is latest)
                    setPastDraws(publishedDraws.slice(1).map(draw => ({
                        id: draw.id,
                        date: draw.draw_date || draw.created_at,
                        monthYear: draw.month_year,
                        winningNumbers: draw.winning_numbers || [],
                        winners: {
                            five: draw.tier1_winners || 0,
                            four: draw.tier2_winners || 0,
                            three: draw.tier3_winners || 0
                        }
                    })));
                }

                // Fetch current jackpot
                const jackpotData = await getJackpot();
                setJackpot(jackpotData?.amount || 0);

            } catch (error) {
                console.error('Error fetching draws:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDraws();
    }, []);

    // Loading state
    if (loading) {
        return (
            <PageTransition>
                <div className="py-8 lg:py-12">
                    <div className="container-app max-w-5xl">
                        <div className="flex items-center justify-center min-h-[400px]">
                            <div className="text-center">
                                <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
                                <p className="text-slate-400">Loading draw results...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </PageTransition>
        );
    }

    // No draws available
    if (!latestDraw) {
        return (
            <PageTransition>
                <div className="py-8 lg:py-12">
                    <div className="container-app max-w-5xl">
                        <motion.div
                            variants={fadeUp}
                            initial="initial"
                            animate="animate"
                            className="text-center mb-12"
                        >
                            <span className="text-violet-400 font-semibold text-sm uppercase tracking-wider">
                                Monthly Draws
                            </span>
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mt-3 mb-4">
                                Draw Results
                            </h1>
                            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                                No draw results available yet. Check back after the first monthly draw!
                            </p>
                        </motion.div>

                        {jackpot > 0 && (
                            <Card variant="glow" className="text-center p-8">
                                <div className="text-amber-400 text-sm font-medium mb-2">Current Jackpot</div>
                                <div className="text-4xl font-bold text-white">${jackpot.toLocaleString()}</div>
                                <p className="text-slate-400 mt-2">Growing until the next draw!</p>
                            </Card>
                        )}
                    </div>
                </div>
            </PageTransition>
        );
    }

    return (
        <PageTransition>
            <div className="py-8 lg:py-12">
                <div className="container-app max-w-5xl">
                    {/* Header */}
                    <motion.div
                        variants={fadeUp}
                        initial="initial"
                        animate="animate"
                        className="text-center mb-12"
                    >
                        <span className="text-violet-400 font-semibold text-sm uppercase tracking-wider">
                            Monthly Draws
                        </span>
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mt-3 mb-4">
                            Draw Results
                        </h1>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                            See the winning numbers and prize breakdowns from each monthly draw
                        </p>
                    </motion.div>

                    {/* Latest Draw Feature */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mb-12"
                    >
                        <Card variant="glow" className="overflow-hidden">
                            <div className="p-6 lg:p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <span className="text-teal-400 text-sm font-medium">Latest Draw</span>
                                        <h2 className="text-2xl font-bold text-white">{latestDraw.monthYear || formatDate(latestDraw.date)}</h2>
                                    </div>
                                    <span className="px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 font-semibold">
                                        ${latestDraw.prizePool.toLocaleString()} Pool
                                    </span>
                                </div>

                                {/* Winning Numbers */}
                                <div className="mb-8">
                                    <h3 className="text-sm font-medium text-slate-400 mb-4">Winning Numbers</h3>
                                    <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                                        {latestDraw.winningNumbers.length > 0 ? (
                                            latestDraw.winningNumbers.map((num, i) => (
                                                <motion.div
                                                    key={num}
                                                    initial={{ scale: 0, rotate: -180 }}
                                                    animate={{ scale: 1, rotate: 0 }}
                                                    transition={{ delay: 0.3 + i * 0.1, type: 'spring', stiffness: 300 }}
                                                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-violet-500 flex items-center justify-center shadow-lg shadow-teal-500/20"
                                                >
                                                    <span className="text-2xl font-bold text-white">{num}</span>
                                                </motion.div>
                                            ))
                                        ) : (
                                            <p className="text-slate-400">Numbers not yet drawn</p>
                                        )}
                                    </div>
                                </div>

                                {/* Prize Breakdown */}
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 text-center">
                                        <div className="text-3xl font-bold text-amber-400 mb-1">
                                            {latestDraw.winners.fiveMatch}
                                        </div>
                                        <div className="text-white font-medium mb-1">5-Match Winners</div>
                                        <div className="text-slate-400 text-sm">
                                            {latestDraw.winners.fiveMatch > 0
                                                ? `$${latestDraw.payouts.fiveMatch.toLocaleString()} each`
                                                : `Jackpot: $${(latestDraw.jackpot || jackpot).toLocaleString()}`}
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 text-center">
                                        <div className="text-3xl font-bold text-violet-400 mb-1">
                                            {latestDraw.winners.fourMatch}
                                        </div>
                                        <div className="text-white font-medium mb-1">4-Match Winners</div>
                                        <div className="text-slate-400 text-sm">
                                            ${latestDraw.payouts.fourMatch.toLocaleString()} each
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 text-center">
                                        <div className="text-3xl font-bold text-teal-400 mb-1">
                                            {latestDraw.winners.threeMatch}
                                        </div>
                                        <div className="text-white font-medium mb-1">3-Match Winners</div>
                                        <div className="text-slate-400 text-sm">
                                            ${latestDraw.payouts.threeMatch.toLocaleString()} each
                                        </div>
                                    </div>
                                </div>

                                {/* Jackpot Notice */}
                                {(latestDraw.jackpot > 0 || jackpot > 0) && latestDraw.winners.fiveMatch === 0 && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.8 }}
                                        className="mt-6 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                                                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <span className="text-amber-400 font-semibold">Jackpot Alert!</span>
                                                <p className="text-slate-400 text-sm">
                                                    ${(latestDraw.jackpot || jackpot).toLocaleString()} rolls over to next month's draw
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </Card>
                    </motion.div>

                    {/* Past Draws */}
                    {pastDraws.length > 0 && (
                        <motion.div
                            variants={staggerContainer}
                            initial="initial"
                            animate="animate"
                        >
                            <h3 className="text-xl font-bold text-white mb-6">Past Draws</h3>
                            <div className="space-y-4">
                                {pastDraws.map((draw) => (
                                    <motion.div key={draw.id} variants={staggerItem}>
                                        <Card variant="glass" padding="p-5">
                                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                                <div>
                                                    <h4 className="text-lg font-semibold text-white mb-1">
                                                        {draw.monthYear || formatDate(draw.date)}
                                                    </h4>
                                                    <div className="flex gap-2">
                                                        {draw.winningNumbers.map((num) => (
                                                            <span
                                                                key={num}
                                                                className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-300"
                                                            >
                                                                {num}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="flex gap-6 text-sm">
                                                    <div className="text-center">
                                                        <span className="text-amber-400 font-bold">{draw.winners.five}</span>
                                                        <span className="text-slate-500 ml-1">5-match</span>
                                                    </div>
                                                    <div className="text-center">
                                                        <span className="text-violet-400 font-bold">{draw.winners.four}</span>
                                                        <span className="text-slate-500 ml-1">4-match</span>
                                                    </div>
                                                    <div className="text-center">
                                                        <span className="text-teal-400 font-bold">{draw.winners.three}</span>
                                                        <span className="text-slate-500 ml-1">3-match</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        </PageTransition>
    );
}
