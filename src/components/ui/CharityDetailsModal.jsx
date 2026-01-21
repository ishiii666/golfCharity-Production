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

    // Charity data with real supporters
    const extendedCharity = {
        ...charity,
        website: charity.website_url || charity.website || `https://www.${charity.name?.toLowerCase().replace(/[^a-z0-9]/g, '')}.org.au`,
        supportersList: supportersList,
        gallery: charity.gallery || [
            'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=400&h=300&fit=crop',
            'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400&h=300&fit=crop',
            'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=400&h=300&fit=crop'
        ]
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
                                <div className="p-6 space-y-6">

                                    {/* Stats */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="p-3 rounded-xl bg-white/5 text-center">
                                            <HeartIcon size={20} className="mx-auto mb-1 text-[#c9a227]" strokeWidth={1.5} />
                                            <div className="text-lg font-bold text-[#f9f5e3]">${extendedCharity.totalRaised?.toLocaleString() || '0'}</div>
                                            <div className="text-xs text-neutral-400">Raised</div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-white/5 text-center">
                                            <UsersIcon size={20} className="mx-auto mb-1 text-[#4ade80]" strokeWidth={1.5} />
                                            <div className="text-lg font-bold text-[#f9f5e3]">{extendedCharity.supporters || 0}</div>
                                            <div className="text-xs text-neutral-400">Supporters</div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-white/5 text-center">
                                            <LocationIcon size={20} className="mx-auto mb-1 text-[#38bdf8]" strokeWidth={1.5} />
                                            <div className="text-lg font-bold text-[#f9f5e3]">{extendedCharity.location || 'National'}</div>
                                            <div className="text-xs text-neutral-400">Location</div>
                                        </div>
                                    </div>

                                    {/* About */}
                                    <div>
                                        <h3 className="text-lg font-bold text-[#f9f5e3] mb-2">About</h3>
                                        <p className="text-sm text-neutral-300 leading-relaxed">
                                            {extendedCharity.description}
                                        </p>
                                    </div>

                                    {/* Visit Website */}
                                    <div className="p-4 rounded-xl bg-white/5 ring-1 ring-inset ring-white/10">
                                        <p className="text-sm text-neutral-400 mb-3">Want to learn more about this charity?</p>
                                        <a
                                            href={extendedCharity.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#c9a227] text-[#0a2818] font-medium text-sm hover:bg-[#d4b342] transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                            Visit Official Website
                                        </a>
                                    </div>

                                    {/* Supporters */}
                                    <div>
                                        <h3 className="text-lg font-bold text-[#f9f5e3] mb-3 flex items-center gap-2">
                                            <UsersIcon size={18} className="text-[#4ade80]" /> Recent Supporters
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {loadingSupporters ? (
                                                <span className="px-2.5 py-1 rounded-lg bg-white/5 text-xs text-neutral-400">
                                                    Loading supporters...
                                                </span>
                                            ) : extendedCharity.supportersList.length > 0 ? (
                                                <>
                                                    {extendedCharity.supportersList.map((name, i) => (
                                                        <span key={i} className="px-2.5 py-1 rounded-lg bg-white/5 text-xs text-neutral-300">
                                                            {name}
                                                        </span>
                                                    ))}
                                                    {(extendedCharity.supporters || 0) > extendedCharity.supportersList.length && (
                                                        <span className="px-2.5 py-1 rounded-lg ring-1 ring-inset ring-dashed ring-white/10 text-xs text-neutral-500">
                                                            +{(extendedCharity.supporters || 0) - extendedCharity.supportersList.length} more
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="px-2.5 py-1 rounded-lg bg-white/5 text-xs text-neutral-400">
                                                    Be the first to support this charity!
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Gallery */}
                                    <div>
                                        <h3 className="text-lg font-bold text-[#f9f5e3] mb-3">Gallery</h3>
                                        <div className="grid grid-cols-3 gap-2">
                                            {extendedCharity.gallery.map((img, i) => (
                                                <div key={i} className="aspect-square rounded-lg overflow-hidden">
                                                    <img src={img} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover hover:scale-110 transition-transform duration-300" />
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
