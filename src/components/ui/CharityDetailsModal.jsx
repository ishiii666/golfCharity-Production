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

        // Prevent scroll on background when modal is open
        const preventScroll = (e) => {
            // Allow scroll inside modal content
            const modalContent = document.querySelector('.modal-scroll-content');
            if (modalContent && modalContent.contains(e.target)) {
                return;
            }
            e.preventDefault();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEsc);
            // Simple overflow hidden - doesn't break styling
            document.body.style.overflow = 'hidden';
            document.body.style.paddingRight = '15px'; // Prevent layout shift from scrollbar
            // Block wheel scroll on backdrop
            document.addEventListener('wheel', preventScroll, { passive: false });
            document.addEventListener('touchmove', preventScroll, { passive: false });
        }

        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
            document.removeEventListener('wheel', preventScroll);
            document.removeEventListener('touchmove', preventScroll);
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
                        className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div
                            className="pointer-events-auto w-full max-w-5xl max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl border border-[#c9a227]/20 flex flex-col md:flex-row"
                            style={{ background: 'linear-gradient(135deg, #0a1610 0%, #1a2e22 100%)' }}
                        >
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white/80 hover:text-white transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            {/* Left - Hero Image */}
                            <div className="md:w-2/5 h-56 md:h-auto relative overflow-hidden shrink-0">
                                <img
                                    src={extendedCharity.image}
                                    alt={extendedCharity.name}
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                    loading="lazy"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0a1610] via-transparent to-transparent" />

                                <div className="absolute bottom-0 left-0 p-6 w-full">
                                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#c9a227] text-[#0a2818] mb-2">
                                        {extendedCharity.category}
                                    </span>
                                    <h2 className="text-2xl md:text-3xl font-bold text-[#f9f5e3] leading-tight">
                                        {extendedCharity.name}
                                    </h2>
                                    {extendedCharity.featured && (
                                        <div className="flex items-center gap-2 text-[#c9a227] mt-2">
                                            <StarIcon size={14} fill="currentColor" strokeWidth={0} />
                                            <span className="text-xs font-medium">Featured</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right - Scrollable Content */}
                            <div className="modal-scroll-content md:w-3/5 overflow-y-auto" style={{ maxHeight: '85vh' }}>
                                <div className="p-5 space-y-4">

                                    {/* Stats */}
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="p-2 rounded-xl bg-white/5 text-center">
                                            <HeartIcon size={20} className="mx-auto mb-1 text-[#c9a227]" strokeWidth={1.5} />
                                            <div className="text-lg font-bold text-[#f9f5e3]">${extendedCharity.totalRaised?.toLocaleString() || '0'}</div>
                                            <div className="text-xs text-neutral-400">Raised</div>
                                        </div>
                                        <div className="p-2 rounded-xl bg-white/5 text-center">
                                            <UsersIcon size={20} className="mx-auto mb-1 text-[#4ade80]" strokeWidth={1.5} />
                                            <div className="text-lg font-bold text-[#f9f5e3]">{extendedCharity.supporters || 0}</div>
                                            <div className="text-xs text-neutral-400">Supporters</div>
                                        </div>
                                        <div className="p-2 rounded-xl bg-white/5 text-center">
                                            <LocationIcon size={20} className="mx-auto mb-1 text-[#38bdf8]" strokeWidth={1.5} />
                                            <div className="text-lg font-bold text-[#f9f5e3]">{extendedCharity.location || 'National'}</div>
                                            <div className="text-xs text-neutral-400">Location</div>
                                        </div>
                                    </div>

                                    {/* About */}
                                    <div>
                                        <h3 className="text-base font-bold text-[#f9f5e3] mb-1">About</h3>
                                        <p className="text-sm text-neutral-300 leading-relaxed">
                                            {extendedCharity.description}
                                        </p>
                                    </div>

                                    {/* Golf Charity Day - New Section */}
                                    {(charity.charity_day_date || charity.charity_day_location) && (
                                        <div className="p-3 rounded-xl bg-gradient-to-br from-[#c9a227]/10 to-transparent border border-[#c9a227]/20">
                                            <h3 className="text-xs font-bold text-[#c9a227] uppercase tracking-wider mb-2 flex items-center gap-2">
                                                <StarIcon size={14} fill="currentColor" /> Upcoming Golf Charity Day
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {charity.charity_day_date && (
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                                                            <svg className="w-4 h-4 text-[#c9a227]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] text-neutral-500 uppercase font-bold tracking-tight">Event Date</div>
                                                            <div className="text-sm font-semibold text-[#f9f5e3]">
                                                                {new Date(charity.charity_day_date).toLocaleDateString('en-AU', {
                                                                    weekday: 'long',
                                                                    year: 'numeric',
                                                                    month: 'long',
                                                                    day: 'numeric'
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                {charity.charity_day_location && (
                                                    <div className="flex items-start gap-2">
                                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                                                            <LocationIcon size={16} className="text-[#38bdf8]" strokeWidth={2} />
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] text-neutral-500 uppercase font-bold tracking-tight">Event Location</div>
                                                            <div className="text-sm font-semibold text-[#f9f5e3]">{charity.charity_day_location}</div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Visit Website */}
                                    <div className="p-3 rounded-xl bg-white/5 ring-1 ring-inset ring-white/10">
                                        <p className="text-xs text-neutral-400 mb-2 font-medium">Want to support this charity?</p>
                                        <div className="flex flex-wrap gap-3">
                                            <a
                                                href={extendedCharity.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 text-white font-bold text-sm hover:bg-white/20 transition-colors shadow-lg border border-white/10"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                                Visit Official Website
                                            </a>
                                            {onSelect && (
                                                <Button
                                                    variant="primary"
                                                    onClick={() => onSelect(charity)}
                                                    className="shadow-xl"
                                                >
                                                    Select this Charity
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Supporters */}
                                    <div className="pt-0">
                                        <h3 className="text-base font-bold text-[#f9f5e3] mb-2 flex items-center gap-2">
                                            <UsersIcon size={16} className="text-[#4ade80]" strokeWidth={2} /> Recent Supporters
                                        </h3>
                                        <div className="flex flex-wrap gap-2 min-h-[32px]">
                                            {loadingSupporters ? (
                                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 animate-pulse">
                                                    <div className="w-2 h-2 rounded-full bg-[#4ade80]/50" />
                                                    <span className="text-xs text-neutral-400 font-medium">Fetching active community...</span>
                                                </div>
                                            ) : extendedCharity.supportersList.length > 0 ? (
                                                <>
                                                    {extendedCharity.supportersList.map((name, i) => (
                                                        <span key={i} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-xs text-neutral-300 font-medium hover:bg-white/10 transition-colors">
                                                            {name}
                                                        </span>
                                                    ))}
                                                    {(extendedCharity.supporters || 0) > extendedCharity.supportersList.length && (
                                                        <span className="px-3 py-1.5 rounded-lg border border-dashed border-white/10 text-xs text-neutral-500 font-medium">
                                                            +{(extendedCharity.supporters || 0) - extendedCharity.supportersList.length} more
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-xs text-neutral-400 italic">
                                                    Become the very first supporter to see your name here!
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Gallery */}
                                    <div className="pb-6 pt-0">
                                        <h3 className="text-base font-bold text-[#f9f5e3] mb-2">Gallery</h3>
                                        <div className="grid grid-cols-3 gap-2">
                                            {extendedCharity.gallery.map((img, i) => (
                                                <div key={i} className="aspect-square rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-lg">
                                                    <img
                                                        src={img.includes('unsplash') ? img.split('?')[0] + '?ixlib=rb-1.2.1&auto=format&fit=crop&q=80&w=400' : img}
                                                        alt={`${extendedCharity.name} ${i + 1}`}
                                                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-700 ease-in-out"
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
