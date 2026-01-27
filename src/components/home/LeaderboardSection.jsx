"use client";

import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Trophy, Zap, Info, Calendar, Target, Heart, Crown, Star, ArrowUpRight, X, ExternalLink } from "lucide-react";
import { cn } from "../../utils/cn";
import { getLeaderboardData, getJackpot } from "../../lib/supabaseRest";
import { getTimeUntilDraw } from "../../utils/drawSchedule";

export default function LeaderboardSection() {
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState(null);
    const [jackpot, setJackpotValue] = useState(0);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                const [leaderboardData, jackpotData] = await Promise.all([
                    getLeaderboardData(5),
                    getJackpot()
                ]);
                console.log("🏆 Leaderboard data fetched:", leaderboardData);
                setPlayers(leaderboardData);
                setJackpotValue(jackpotData);
                if (leaderboardData.length > 0) {
                    setSelectedId(leaderboardData[0].rank);
                }
            } catch (error) {
                console.error("Error fetching leaderboard data:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) {
        return (
            <section className="relative py-32 bg-zinc-950 overflow-hidden flex items-center justify-center min-h-[600px]">
                <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                    <p className="text-zinc-400">Loading champions...</p>
                </div>
            </section>
        );
    }

    // If for some reason we still have no players after loading, handle gracefully
    if (!players || players.length === 0) {
        return null;
    }

    const selectedPlayer = players.find(p => p.rank === selectedId) || players[0];

    return (
        <section className="relative py-32 bg-zinc-950 overflow-hidden">
            {/* --- THE FAIRWAY GRID BACKGROUND --- */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-500/5 blur-[150px] rounded-full animate-pulse" />
                <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-teal-500/5 blur-[150px] rounded-full" />

                {/* Grass-like texture mesh */}
                <svg className="absolute inset-0 w-full h-full opacity-[0.03]" viewBox="0 0 100 100">
                    <pattern id="fairway-mesh" width="10" height="10" patternUnits="userSpaceOnUse">
                        <circle cx="1" cy="1" r="0.5" fill="white" />
                        <path d="M 10 0 L 0 10" stroke="white" strokeWidth="0.05" fill="none" />
                    </pattern>
                    <rect width="100%" height="100%" fill="url(#fairway-mesh)" />
                </svg>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
                {/* Header with Emerald Focus */}
                <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-8 text-left">
                    <div className="space-y-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full"
                        >
                            <Trophy className="w-4 h-4 text-emerald-400" />
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">CHAMPIONS OF THE CLUB</span>
                        </motion.div>
                        <h2
                            className="text-5xl md:text-7xl font-bold tracking-tighter text-white leading-[0.9] uppercase"
                            style={{ fontFamily: 'var(--font-display)' }}
                        >
                            The Leaderboard <br /> <span className="text-emerald-500">Of Impact</span>
                        </h2>
                    </div>
                    <div>
                        <p className="text-zinc-500 text-lg max-w-sm font-medium leading-relaxed">
                            Tracking the precision of every swing and the weight of every donation. Real golfers, real change.
                        </p>
                    </div>
                </div>

                {/* --- GRID (LEADERBOARD + STAT HUB) --- */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mb-20">
                    {/* Left: 3D Perspective Player List */}
                    <div className="lg:col-span-7 space-y-4 perspective-[2000px]">
                        {players.map((player) => (
                            <PlayerCard
                                key={player.rank}
                                player={player}
                                isSelected={selectedId === player.rank}
                                onClick={() => setSelectedId(player.rank)}
                            />
                        ))}
                    </div>

                    {/* Right: The Emerald Stat Hub */}
                    <div className="lg:col-span-5 space-y-8 sticky top-32">
                        {/* Selected Player Profile */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={selectedId}
                                initial={{ opacity: 0, x: 20, rotateY: -10 }}
                                animate={{ opacity: 1, x: 0, rotateY: 0 }}
                                exit={{ opacity: 0, x: -20, rotateY: 10 }}
                                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                                className="relative p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] bg-zinc-900/60 border border-emerald-500/10 backdrop-blur-3xl overflow-hidden shadow-2xl"
                            >
                                <div className="absolute inset-0 opacity-10" style={{ backgroundColor: selectedPlayer.glow }} />

                                <div className="relative z-10 space-y-8">
                                    <div className="flex items-center gap-6">
                                        <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white bg-gradient-to-br shadow-[0_0_30px_rgba(16,185,129,0.2)]", selectedPlayer.accent)}>
                                            {selectedPlayer.initials}
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-white tracking-tighter">{selectedPlayer.name}</h3>
                                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-widest rounded border border-emerald-500/20">Rank #{selectedPlayer.rank}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-center">
                                        <div className="p-4 rounded-2xl bg-black/40 border border-white/5 group hover:border-emerald-500/40 transition-colors text-left overflow-hidden">
                                            <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Supporting</span>
                                            <span className="text-white font-bold block truncate text-xs">{selectedPlayer.charity}</span>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-black/40 border border-white/5 group hover:border-emerald-500/40 transition-colors text-left">
                                            <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Impact Generated</span>
                                            <span className="text-emerald-400 font-black text-lg leading-none">{selectedPlayer.raised}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                            <span>Consistency Chart</span>
                                            <span className="text-white font-mono">Avg Score: {selectedPlayer.avg}</span>
                                        </div>
                                        <div className="flex items-end gap-1.5 h-16">
                                            {selectedPlayer.scores.map((s, i) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ height: 0 }}
                                                    animate={{ height: s > 0 ? `${(s / 45) * 100}%` : '5%' }}
                                                    transition={{ delay: i * 0.05, duration: 0.8 }}
                                                    className="flex-1 rounded-sm bg-emerald-500/20 hover:bg-emerald-500/60 transition-colors border-t border-emerald-500/50"
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setShowProfileModal(true)}
                                        className="w-full py-4 rounded-xl bg-emerald-500 text-zinc-950 font-black uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-2 hover:bg-emerald-400 active:scale-95 transition-all shadow-[0_10px_30px_-10px_rgba(16,185,129,0.5)]"
                                    >
                                        Member Profile <ArrowUpRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* --- THE 3D DRAW PORTAL (CENTERED BELOW GRID) --- */}
                <div className="flex justify-center">
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        className="relative w-full max-w-2xl aspect-auto rounded-[2rem] sm:rounded-[3rem] bg-zinc-900/40 border border-emerald-500/20 overflow-hidden flex flex-col items-center justify-center p-6 sm:p-12 text-center shadow-2xl group backdrop-blur-xl"
                    >
                        {/* Kinetic Emerald Rings */}
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                            className="absolute w-[180%] h-[180%] border border-emerald-500/5 rounded-full border-dashed"
                        />

                        <div className="relative z-10 space-y-6 w-full">
                            <span className="text-emerald-500 font-black text-sm uppercase tracking-[0.4em] mb-2 block">The Jackpot Pool</span>
                            <motion.h4
                                animate={{ scale: [1, 1.05, 1] }}
                                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                                className="text-6xl md:text-8xl font-black tracking-tighter text-white tabular-nums drop-shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                            >
                                ${Number(jackpot).toLocaleString()}
                            </motion.h4>

                            <div className="flex items-center justify-center gap-8">
                                <div className="flex flex-col items-center">
                                    <span className="text-white font-bold text-3xl leading-none">
                                        {getTimeUntilDraw().days}
                                    </span>
                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Days Left</span>
                                </div>
                                <div className="w-px h-12 bg-emerald-500/20" />
                                <div className="flex flex-col items-center">
                                    <Zap className="w-7 h-7 text-emerald-400 mb-1" />
                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Live Draw</span>
                                </div>
                            </div>

                            <button
                                onClick={() => navigate('/signup')}
                                className="w-full max-w-sm mx-auto py-5 rounded-2xl bg-emerald-500 text-zinc-950 font-black uppercase text-xs tracking-[0.4em] flex items-center justify-center gap-3 hover:bg-emerald-400 active:scale-[0.98] transition-all relative overflow-hidden group shadow-[0_20px_40px_-10px_rgba(16,185,129,0.5)]"
                            >
                                <span className="relative z-10">Secure Your Entry</span>
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-white/20 to-emerald-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            </button>
                        </div>

                        {/* Corner Frame Accents */}
                        <div className="absolute top-10 left-10 w-8 h-8 border-t border-l border-emerald-500/30" />
                        <div className="absolute top-10 right-10 w-8 h-8 border-t border-r border-emerald-500/30" />
                        <div className="absolute bottom-10 left-10 w-8 h-8 border-b border-l border-emerald-500/30" />
                        <div className="absolute bottom-10 right-10 w-8 h-8 border-b border-r border-emerald-500/30" />
                    </motion.div>
                </div>
            </div>

            {/* --- PLAYER PROFILE MODAL --- */}
            <AnimatePresence>
                {showProfileModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowProfileModal(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />

                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-lg bg-zinc-900 border border-emerald-500/20 rounded-[2.5rem] overflow-hidden shadow-2xl"
                        >
                            {/* Modal Header/Profile Bio */}
                            <div className="relative p-8 pb-32 overflow-hidden">
                                <div className={cn("absolute inset-0 opacity-10 bg-gradient-to-br", selectedPlayer.accent)} />
                                <button
                                    onClick={() => setShowProfileModal(false)}
                                    className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all z-20"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                                    <div className={cn("w-24 h-24 rounded-3xl flex items-center justify-center text-4xl font-black text-white shadow-2xl", selectedPlayer.accent)}>
                                        {selectedPlayer.initials}
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-black text-white tracking-tighter">{selectedPlayer.name}</h3>
                                        <p className="text-emerald-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Elite Club Member</p>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Content */}
                            <div className="relative z-10 bg-zinc-900 px-8 pb-10 -mt-24">
                                <div className="grid grid-cols-3 gap-3 mb-8">
                                    <div className="bg-zinc-800/50 p-4 rounded-2xl border border-white/5 text-center">
                                        <span className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Rank</span>
                                        <span className="text-white font-black text-xl">#{selectedPlayer.rank}</span>
                                    </div>
                                    <div className="bg-zinc-800/50 p-4 rounded-2xl border border-white/5 text-center">
                                        <span className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Avg Score</span>
                                        <span className="text-white font-black text-xl">{selectedPlayer.avg}</span>
                                    </div>
                                    <div className="bg-zinc-800/50 p-4 rounded-2xl border border-white/5 text-center">
                                        <span className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Impact</span>
                                        <span className="text-emerald-400 font-black text-xl">{selectedPlayer.raised}</span>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <h4 className="flex items-center gap-2 text-[10px] font-black text-white uppercase tracking-[0.2em]">
                                            <Heart className="w-3 h-3 text-emerald-500" /> Primary Charity
                                        </h4>
                                        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between group cursor-pointer hover:bg-emerald-500/10 transition-all">
                                            <div className="flex flex-col">
                                                <span className="text-white font-bold">{selectedPlayer.charity}</span>
                                                <span className="text-xs text-zinc-500 font-medium">{selectedPlayer.percentage} donation share</span>
                                            </div>
                                            <ExternalLink className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setShowProfileModal(false)}
                                    className="w-full mt-10 py-5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-widest transition-all"
                                >
                                    Close Member Card
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </section>
    );
}

function PlayerCard({ player, isSelected, onClick }) {
    const cardRef = useRef(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const rotateX = useTransform(y, [-100, 100], [10, -10]);
    const rotateY = useTransform(x, [-100, 100], [-10, 10]);

    const springRotateX = useSpring(rotateX, { damping: 20, stiffness: 150 });
    const springRotateY = useSpring(rotateY, { damping: 20, stiffness: 150 });

    function handleMouseMove(event) {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        x.set(event.clientX - rect.left - rect.width / 2);
        y.set(event.clientY - rect.top - rect.height / 2);
    }

    return (
        <motion.div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => { x.set(0); y.set(0); }}
            onClick={onClick}
            style={{
                rotateX: springRotateX,
                rotateY: springRotateY,
                transformStyle: "preserve-3d"
            }}
            className={cn(
                "group relative p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border transition-all duration-500 cursor-pointer overflow-hidden",
                isSelected
                    ? "bg-zinc-900 border-emerald-500/40 shadow-[0_20px_80px_rgba(0,0,0,0.4)]"
                    : "bg-zinc-900/40 border-white/5 hover:border-emerald-500/20"
            )}
        >
            {/* Hover Glow Effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-tr from-emerald-500/5 to-transparent transition-opacity duration-700 pointer-events-none" />

            <div className="relative z-10 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-8">
                    <span className={cn(
                        "text-3xl font-black tracking-tighter",
                        isSelected ? "text-emerald-500" : "text-zinc-800"
                    )}>
                        {player.rank.toString().padStart(2, '0')}
                    </span>

                    <div className="flex flex-col">
                        <span className={cn(
                            "text-2xl font-black tracking-tight transition-colors duration-500",
                            isSelected ? "text-white" : "text-zinc-500"
                        )}>
                            {player.name}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                            <Star className={cn("w-3 h-3 transition-colors", isSelected ? "text-emerald-500 fill-emerald-500" : "text-zinc-600")} />
                            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">{player.charity}</span>
                        </div>
                    </div>
                </div>

                <div className="text-right">
                    <span className={cn(
                        "text-2xl font-mono font-black transition-colors",
                        isSelected ? "text-emerald-400" : "text-zinc-700"
                    )}>
                        {player.raised}
                    </span>
                    <span className="block text-[8px] font-bold text-zinc-600 uppercase tracking-widest mt-1">Donations Raised</span>
                </div>
            </div>

            {/* Elite Accent for Rank 1 */}
            {player.rank === 1 && (
                <div className="absolute top-0 right-10">
                    <div className="bg-emerald-500/10 px-3 py-1 border-x border-b border-emerald-500/30 rounded-b-lg">
                        <Crown className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                    </div>
                </div>
            )}
        </motion.div>
    );
}
