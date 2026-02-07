import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartIcon, UsersIcon, LocationIcon, StarIcon } from './Icons';
import Button from './Button';
import { getCharitySupporters } from '../../lib/supabaseRest';

/**
 * CharityDetailsModal - A comprehensive charity details popup
 * Uses React Portal to render directly to document.body,
 * avoiding CSS transform conflicts with page transitions.
 */
export default function CharityDetailsModal({ isOpen, onClose, charity, onSelect }) {
    const [supportersList, setSupportersList] = useState([]);
    const [loadingSupporters, setLoadingSupporters] = useState(false);

    // Fetch real supporters when charity changes
    useEffect(() => {
        const fetchSupporters = async () => {
            if (charity && charity.id) {
                setLoadingSupporters(true);
                try {
                    const supporters = await getCharitySupporters(charity.id, 12);
                    setSupportersList(supporters);
                } catch (error) {
                    console.error('Error fetching supporters:', error);
                    setSupportersList([]);
                } finally {
                    setLoadingSupporters(false);
                }
            }
        };

        if (isOpen && charity) {
            fetchSupporters();
        }
    }, [isOpen, charity]);

    // Handle Escape key to close and lock background scroll
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEsc);
            // Lock body scroll
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!charity) return null;

    // Diverse gallery placeholders based on charity name/category
    const getGallery = () => {
        if (charity.gallery && charity.gallery.length > 0) return charity.gallery;

        const name = charity.name?.toLowerCase() || '';
        const category = charity.category?.toLowerCase() || '';

        // Mental Health
        if (name.includes('blue') || category.includes('mental')) {
            return [
                '/images/charities/beyond_blue_gallery_1.png',
                '/images/charities/beyond_blue_gallery_2.png',
                '/images/charities/beyond_blue_gallery_3.png'
            ];
        }
        // Medical / Research
        if (name.includes('cancer') || category.includes('medical') || category.includes('health')) {
            return [
                '/images/charities/cancer_council_gallery_1.png',
                '/images/charities/cancer_council_gallery_2.png',
                '/images/charities/cancer_council_gallery_3.png'
            ];
        }
        // Environment / Wildlife
        if (name.includes('wild') || category.includes('environ') || category.includes('nature')) {
            return [
                'https://images.unsplash.com/photo-1441974231531-c6227db76b6e', // Forest
                'https://images.unsplash.com/photo-1500485035515-3eeef1a4458e', // Mountain
                'https://images.unsplash.com/photo-1470770841072-f978cf4d019e'  // Scenic
            ];
        }

        // Default placeholders
        return [
            'https://images.unsplash.com/photo-1593113598332-cd288d649433', // Hands
            'https://images.unsplash.com/photo-1544027993-37dbfe43562a', // Support
            'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6'  // Community
        ];
    };

    const extendedCharity = {
        ...charity,
        website: charity.website_url || charity.website || `https://www.${charity.name?.toLowerCase().replace(/[^a-z0-9]/g, '')}.org.au`,
        supportersList: supportersList,
        gallery: getGallery()
    };

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm"
                    />

                    {/* Modal Container */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
                    >
                        {/* Backdrop area inside container for easier management */}
                        <div className="absolute inset-0 pointer-events-auto" onClick={onClose} />

                        <div
                            className="relative pointer-events-auto w-full max-w-6xl max-h-[90vh] rounded-[2.5rem] overflow-hidden shadow-2xl border border-[#c9a227]/20 flex flex-col md:flex-row"
                            style={{ background: 'linear-gradient(135deg, #0a1610 0%, #1a2e22 100%)' }}
                        >
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-6 right-6 z-20 p-2 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 text-white transition-all hover:scale-110"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            {/* Left - Hero Image & Basic Info */}
                            <div className="md:w-[45%] h-64 md:h-auto relative overflow-hidden shrink-0 flex flex-col">
                                <div className="absolute inset-0">
                                    <img
                                        src={extendedCharity.image}
                                        alt={extendedCharity.name}
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a1610] via-[#0a1610]/40 to-transparent" />
                                </div>

                                <div className="relative mt-auto p-8 md:p-10 w-full">
                                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                                        <span className="inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-[#c9a227] text-[#0a2818] mb-4">
                                            {extendedCharity.category}
                                        </span>
                                        <h2 className="text-3xl md:text-5xl font-black text-white leading-[0.9] tracking-tighter uppercase mb-2">
                                            {extendedCharity.name}
                                        </h2>
                                        {extendedCharity.featured && (
                                            <div className="flex items-center gap-2 text-[#c9a227] opacity-80">
                                                <StarIcon size={14} fill="currentColor" strokeWidth={0} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Featured Charity</span>
                                            </div>
                                        )}
                                    </motion.div>
                                </div>
                            </div>

                            {/* Right - Content Section */}
                            <div
                                className="modal-scroll-content md:w-[55%] overflow-y-auto custom-scrollbar overscroll-contain"
                                style={{ maxHeight: '90vh' }}
                            >
                                <div className="p-8 md:p-12 space-y-8">
                                    {/* Stats Grid - Premium Layout */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col items-center">
                                            <HeartIcon size={20} className="text-[#c9a227] mb-2" strokeWidth={1.5} />
                                            <div className="text-xl font-black text-white leading-none mb-1">${extendedCharity.totalRaised?.toLocaleString() || '0'}</div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Raised</div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col items-center">
                                            <UsersIcon size={20} className="text-[#4ade80] mb-2" strokeWidth={1.5} />
                                            <div className="text-xl font-black text-white leading-none mb-1">{extendedCharity.supporters || 0}</div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Supporters</div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col items-center">
                                            <LocationIcon size={20} className="text-[#38bdf8] mb-2" strokeWidth={1.5} />
                                            <div className="text-xl font-black text-white leading-none mb-1 truncate w-full text-center">{extendedCharity.location || 'National'}</div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Location</div>
                                        </div>
                                    </div>

                                    {/* About Section */}
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#c9a227] mb-3">Mission & Impact</h3>
                                        <p className="text-zinc-400 text-base leading-relaxed font-medium">
                                            {extendedCharity.description}
                                        </p>
                                    </div>

                                    {/* Actions & Recent Supporters - Combined row for space efficiency */}
                                    <div className="grid lg:grid-cols-2 gap-8 items-start">
                                        {/* Left Side: Buttons */}
                                        <div className="space-y-4">
                                            <div className="flex flex-col gap-3">
                                                {onSelect && (
                                                    <Button
                                                        variant="accent"
                                                        onClick={() => onSelect(charity)}
                                                        className="w-full py-4 text-xs font-black uppercase tracking-widest"
                                                    >
                                                        Select this Charity
                                                    </Button>
                                                )}
                                                <a
                                                    href={extendedCharity.website}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white/5 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all border border-white/10"
                                                >
                                                    View Website
                                                </a>
                                            </div>
                                        </div>

                                        {/* Right Side: Small list of supporters */}
                                        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.1em] text-emerald-500 mb-4 flex items-center gap-2">
                                                <UsersIcon size={12} strokeWidth={2.5} /> Active Community
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {loadingSupporters ? (
                                                    <span className="text-[10px] text-zinc-600 font-bold uppercase animate-pulse">Scanning blockchain...</span>
                                                ) : extendedCharity.supportersList.length > 0 ? (
                                                    extendedCharity.supportersList.slice(0, 4).map((name, i) => (
                                                        <span key={i} className="text-[10px] text-zinc-300 font-bold uppercase tracking-tight opacity-80">{name}{i < extendedCharity.supportersList.length - 1 ? ',' : ''}</span>
                                                    ))
                                                ) : (
                                                    <span className="text-[10px] text-zinc-600 font-bold italic uppercase">Be the first!</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Gallery - Now more of a footer detail */}
                                    <div className="pt-4">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-4">Field Work Gallery</h3>
                                        <div className="grid grid-cols-3 gap-4">
                                            {extendedCharity.gallery.map((img, i) => (
                                                <div key={i} className="aspect-[4/3] rounded-2xl overflow-hidden grayscale hover:grayscale-0 transition-all duration-700 hover:scale-[1.05] ring-1 ring-white/10">
                                                    <img
                                                        src={img.includes('unsplash') ? img.split('?')[0] + '?ixlib=rb-1.2.1&auto=format&fit=crop&q=80&w=400' : img}
                                                        alt={`${extendedCharity.name} ${i + 1}`}
                                                        className="w-full h-full object-cover"
                                                        referrerPolicy="no-referrer"
                                                        loading="lazy"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );

    // Use Portal to render directly to body
    return createPortal(modalContent, document.body);
}
