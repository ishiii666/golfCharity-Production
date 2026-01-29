import { useState, useEffect } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { getLeaderboardData } from '../../lib/supabaseRest';

/**
 * AnimatedLeaderboard - Premium animated leaderboard with 3D tilt
 * 
 * Features:
 * - Rows animate in sequentially
 * - Rank changes animate smoothly (layout animations)
 * - Hover expands card with player details
 * - 3D tilt effect on hover
 * - Glassmorphism styling
 */



function PlayerRow({ player, index, isExpanded, onToggle }) {
    // 3D tilt state
    const [rotateX, setRotateX] = useState(0);
    const [rotateY, setRotateY] = useState(0);

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Subtle tilt - max 5 degrees
        setRotateY((x - centerX) / centerX * 5);
        setRotateX(-(y - centerY) / centerY * 5);
    };

    const handleMouseLeave = () => {
        setRotateX(0);
        setRotateY(0);
    };

    const getRankStyle = (rank) => {
        if (rank === 1) return { bg: 'linear-gradient(135deg, #c9a227 0%, #a68520 100%)', color: '#0a2818' };
        if (rank === 2) return { bg: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)', color: '#0f172a' };
        if (rank === 3) return { bg: 'linear-gradient(135deg, #b45309 0%, #92400e 100%)', color: '#fef3c7' };
        return { bg: 'rgba(255,255,255,0.1)', color: '#f3ecd0' };
    };

    const rankStyle = getRankStyle(player.rank);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={() => onToggle(player.id)}
            className="cursor-pointer perspective-1000"
            style={{
                perspective: '1000px',
                transformStyle: 'preserve-3d'
            }}
        >
            <motion.div
                animate={{
                    rotateX: rotateX,
                    rotateY: rotateY
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="glass-card rounded-2xl overflow-hidden"
                style={{ transformStyle: 'preserve-3d' }}
            >
                {/* Main row */}
                <div className="p-5 flex items-center gap-4">
                    {/* Rank badge */}
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shrink-0"
                        style={{ background: rankStyle.bg, color: rankStyle.color }}
                    >
                        {player.rank}
                    </div>

                    {/* Avatar */}
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center font-semibold shrink-0"
                        style={{
                            background: 'linear-gradient(135deg, rgba(26, 77, 46, 0.5), rgba(15, 54, 33, 0.5))',
                            color: '#c9a227',
                            border: '1px solid rgba(201, 162, 39, 0.2)'
                        }}
                    >
                        {player.avatar}
                    </div>

                    {/* Name & Scores */}
                    <div className="flex-1 min-w-0">
                        <h4
                            className="font-semibold truncate"
                            style={{ color: '#f9f5e3', fontFamily: 'var(--font-display)' }}
                        >
                            {player.name}
                        </h4>
                        <div className="flex gap-1.5 mt-1">
                            {player.scores.map((score, i) => (
                                <span
                                    key={i}
                                    className="text-xs px-2 py-0.5 rounded"
                                    style={{
                                        background: 'rgba(201, 162, 39, 0.1)',
                                        color: '#c9a227'
                                    }}
                                >
                                    {score}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Total Raised */}
                    <div className="text-right shrink-0">
                        <div
                            className="font-bold text-lg"
                            style={{ color: '#c9a227', fontFamily: 'var(--font-display)' }}
                        >
                            ${player.totalRaised.toLocaleString()}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--color-neutral-500)' }}>
                            raised
                        </div>
                    </div>

                    {/* Expand indicator */}
                    <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                        style={{ color: 'var(--color-neutral-400)' }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </motion.div>
                </div>

                {/* Expanded details */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden"
                        >
                            <div
                                className="px-5 pb-5 pt-2 border-t"
                                style={{ borderColor: 'rgba(255,255,255,0.05)' }}
                            >
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(26, 77, 46, 0.2)' }}>
                                        <div className="text-sm" style={{ color: 'var(--color-neutral-500)' }}>Charity</div>
                                        <div className="font-medium mt-1" style={{ color: '#f9f5e3' }}>{player.charity}</div>
                                    </div>
                                    <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(201, 162, 39, 0.1)' }}>
                                        <div className="text-sm" style={{ color: 'var(--color-neutral-500)' }}>Donation %</div>
                                        <div className="font-bold mt-1" style={{ color: '#c9a227' }}>{player.donationPct}%</div>
                                    </div>
                                    <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                        <div className="text-sm" style={{ color: 'var(--color-neutral-500)' }}>Avg Score</div>
                                        <div className="font-medium mt-1" style={{ color: '#f9f5e3' }}>
                                            {Math.round(player.scores.reduce((a, b) => a + b, 0) / player.scores.length)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
}

export default function AnimatedLeaderboard({ title = 'Top Players This Month' }) {
    const [expandedId, setExpandedId] = useState(null);
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchLiveLeaderboard() {
            try {
                setLoading(true);
                // Fetch top 10 players (includes 'Test User' via the special recovery logic we added)
                const liveData = await getLeaderboardData(10);

                // Map the shared data structure to the props this component expects
                const mappedPlayers = liveData.map(p => ({
                    id: p.id || Math.random(),
                    rank: p.rank,
                    name: p.name,
                    scores: p.scores || [0, 0, 0, 0, 0],
                    totalRaised: p.raisedValue || 0,
                    charity: p.charity,
                    donationPct: parseInt(p.percentage) || 10,
                    avatar: p.initials || '??'
                }));

                setPlayers(mappedPlayers);
            } catch (error) {
                console.error('Failed to load leaderboard:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchLiveLeaderboard();
    }, []);

    const handleToggle = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="flex items-center justify-between mb-8">
                    <div className="h-8 bg-white/5 rounded-lg w-1/2" />
                </div>
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-20 bg-white/5 rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3
                    className="text-2xl font-bold"
                    style={{ fontFamily: 'var(--font-display)', color: '#f9f5e3' }}
                >
                    {title}
                </h3>
                <span
                    className="text-sm px-3 py-1 rounded-full"
                    style={{
                        background: 'rgba(201, 162, 39, 0.1)',
                        color: '#c9a227'
                    }}
                >
                    Updated live
                </span>
            </div>

            {/* Leaderboard rows */}
            <LayoutGroup>
                <div className="space-y-3">
                    {players.map((player, index) => (
                        <PlayerRow
                            key={player.id}
                            player={player}
                            index={index}
                            isExpanded={expandedId === player.id}
                            onToggle={handleToggle}
                        />
                    ))}
                </div>
            </LayoutGroup>
        </div>
    );
}
