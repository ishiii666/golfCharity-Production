import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useCharities } from '../../hooks/useData';
import { supabase } from '../../lib/supabase';

/**
 * Premium Alert Box for users who haven't selected a charity.
 * Appears as a high-modal on the dashboard.
 */
export default function CharitySelectionAlert({ user, refreshProfile }) {
    const [isOpen, setIsOpen] = useState(false);
    const { charities, isLoading } = useCharities();
    const [donationPercentage, setDonationPercentage] = useState(100);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        // Only show if user is logged in and missing charity selection
        const hasMissingCharity = user && (user.selectedCharityId === null || user.selectedCharityId === undefined || user.selectedCharityId === '');

        console.log('🛡️ CharityAlert Check:', {
            userId: user?.id,
            charityId: user?.selectedCharityId,
            willShow: hasMissingCharity
        });

        if (hasMissingCharity) {
            // Add a small delay to ensure page transitions don't conflict
            const timer = setTimeout(() => {
                console.log('🎯 CharityAlert: Opening modal...');
                setIsOpen(true);
            }, 1500);
            return () => clearTimeout(timer);
        } else {
            setIsOpen(false);
        }
    }, [user?.id, user?.selectedCharityId]);

    const handleSelectCharity = async (charityId) => {
        if (!user?.id) return;

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    selected_charity_id: charityId,
                    donation_percentage: donationPercentage,
                    setup_completed: true,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) throw error;

            // Refresh profile to update global state
            if (refreshProfile) {
                await refreshProfile();
            }

            // Close modal after success
            setIsOpen(false);
        } catch (err) {
            console.error('Error selecting charity:', err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            title="Action Required"
            size="lg"
            showClose={false} // Force selection or manual close via button
        >
            <div className="py-2">
                <div className="flex items-center gap-4 mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-amber-500 mb-1">Select Your Charity</h3>
                        <p className="text-zinc-400 text-sm">
                            Choose a charity to support and set your donation percentage to be eligible for the next draw.
                        </p>
                    </div>
                </div>

                {/* Donation Percentage Slider */}
                <div className="mb-8 p-5 rounded-2xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                        <label className="text-sm font-bold text-white uppercase tracking-wider">
                            Donation Percentage
                        </label>
                        <span className="text-2xl font-bold text-emerald-400 font-display">
                            {donationPercentage}%
                        </span>
                    </div>
                    <input
                        type="range"
                        min="5"
                        max="100"
                        step="5"
                        value={donationPercentage}
                        onChange={(e) => setDonationPercentage(parseInt(e.target.value))}
                        className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <div className="flex justify-between mt-2 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                        <span>Min 5%</span>
                        <span>Max 100%</span>
                    </div>
                    <p className="mt-3 text-xs text-zinc-400 italic">
                        * This percentage of your winnings will go directly to your chosen charity.
                    </p>
                </div>

                <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 ml-1">
                    Choose Charity
                </div>

                <div
                    className="grid gap-3 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar-premium overscroll-contain"
                    data-lenis-prevent="true"
                    style={{ touchAction: 'pan-y' }}
                >
                    {isLoading ? (
                        <div className="py-8 text-center">
                            <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 animate-spin rounded-full mx-auto" />
                        </div>
                    ) : (
                        charities?.map((charity) => (
                            <button
                                key={charity.id}
                                onClick={() => handleSelectCharity(charity.id)}
                                disabled={isSaving}
                                className="w-full p-4 rounded-xl text-left transition-all duration-300 bg-white/5 border border-white/10 hover:border-emerald-500/40 hover:bg-emerald-500/5 group"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {charity.image_url && (
                                            <img
                                                src={charity.image_url}
                                                alt={charity.name}
                                                className="w-10 h-10 rounded-lg object-cover border border-white/10"
                                            />
                                        )}
                                        <div>
                                            <div className="font-bold text-white group-hover:text-emerald-400 transition-colors">
                                                {charity.name}
                                            </div>
                                            <div className="text-xs text-zinc-500">{charity.category}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-zinc-500 uppercase opacity-0 group-hover:opacity-100 transition-opacity">Select</span>
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-zinc-800 group-hover:bg-emerald-500 transition-colors text-zinc-400 group-hover:text-white">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/5">
                    <p className="text-xs text-zinc-500 italic">
                        * You can change these settings anytime in your profile.
                    </p>
                    <Link to="/charities" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors">
                        View More Details &rarr;
                    </Link>
                </div>
            </div>
        </Modal>
    );
}
