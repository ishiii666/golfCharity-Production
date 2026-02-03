import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PageTransition from '../../components/layout/PageTransition';
import Card, { CardContent, CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import BackButton from '../../components/ui/BackButton';
import { useToast } from '../../components/ui/Toast';
import { getContactInquiries, updateContactInquiry } from '../../lib/supabaseRest';
import { fadeUp, staggerContainer, staggerItem } from '../../utils/animations';
import Modal from '../../components/ui/Modal';

export default function ContactInquiries() {
    const [inquiries, setInquiries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedInquiry, setSelectedInquiry] = useState(null);
    const [adminNotes, setAdminNotes] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        fetchInquiries();
    }, []);

    const fetchInquiries = async () => {
        try {
            setLoading(true);
            const data = await getContactInquiries();
            setInquiries(data);
        } catch (error) {
            console.error('Error fetching inquiries:', error);
            addToast('error', 'Failed to load inquiries');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id, status) => {
        try {
            setIsUpdating(true);
            await updateContactInquiry(id, { status, admin_notes: adminNotes });
            setInquiries(inquiries.map(iq => iq.id === id ? { ...iq, status, admin_notes: adminNotes } : iq));
            addToast('success', `Inquiry marked as ${status}`);
            setSelectedInquiry(null);
        } catch (error) {
            addToast('error', 'Failed to update inquiry');
        } finally {
            setIsUpdating(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-AU', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'pending': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'read': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'responded': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            default: return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
        }
    };

    return (
        <PageTransition>
            <div className="py-8 lg:py-12">
                <div className="container-app">
                    <BackButton to="/admin" label="Admin Dashboard" className="mb-6" />

                    <motion.div
                        variants={fadeUp}
                        initial="initial"
                        animate="animate"
                        className="flex items-center justify-between mb-8"
                    >
                        <div>
                            <h1 className="text-3xl lg:text-4xl font-bold mb-2 text-white">
                                Contact Inquiries
                            </h1>
                            <p className="text-zinc-400">
                                Manage and respond to messages from users
                            </p>
                        </div>
                    </motion.div>

                    <Card variant="glass">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/[0.05] text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black">
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Sender</th>
                                        <th className="px-6 py-4">Subject</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.02]">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-20 text-center">
                                                <div className="w-8 h-8 mx-auto border-2 border-emerald-500 border-t-transparent animate-spin rounded-full mb-4" />
                                                <p className="text-zinc-500">Loading inquiries...</p>
                                            </td>
                                        </tr>
                                    ) : inquiries.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-20 text-center text-zinc-500 font-medium">
                                                No inquiries received yet.
                                            </td>
                                        </tr>
                                    ) : inquiries.map((iq) => (
                                        <tr
                                            key={iq.id}
                                            className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                                            onClick={() => {
                                                setSelectedInquiry(iq);
                                                setAdminNotes(iq.admin_notes || '');
                                            }}
                                        >
                                            <td className="px-6 py-4 text-sm text-zinc-400 font-mono">
                                                {formatDate(iq.created_at)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-white font-bold text-sm uppercase tracking-tight">{iq.name}</span>
                                                    <span className="text-xs text-zinc-500 font-mono">{iq.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-zinc-300 text-sm">{iq.subject}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] px-2 py-0.5 rounded border font-black uppercase tracking-widest ${getStatusStyle(iq.status)}`}>
                                                    {iq.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button size="sm" variant="outline" className="text-[10px]">
                                                    View Details
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </div>

            <Modal
                isOpen={!!selectedInquiry}
                onClose={() => setSelectedInquiry(null)}
                title="Inquiry Details"
            >
                {selectedInquiry && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">From</p>
                                <p className="text-white font-bold">{selectedInquiry.name}</p>
                                <p className="text-xs text-zinc-400 font-mono">{selectedInquiry.email}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Date</p>
                                <p className="text-white font-bold">{formatDate(selectedInquiry.created_at)}</p>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Subject</p>
                            <p className="text-emerald-400 font-bold">{selectedInquiry.subject}</p>
                        </div>

                        <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
                            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-3">Message</p>
                            <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap text-sm italic">
                                "{selectedInquiry.message}"
                            </p>
                        </div>

                        <div>
                            <label className="block text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-2">Admin Notes (Internal)</label>
                            <textarea
                                className="w-full bg-black/40 border border-zinc-700 rounded-xl p-4 text-white focus:border-emerald-500 focus:outline-none resize-none h-24 text-sm"
                                placeholder="Add internal notes about this inquiry..."
                                value={adminNotes}
                                onChange={(e) => setAdminNotes(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-wrap gap-2 pt-4 border-t border-white/[0.05]">
                            <Button
                                size="sm"
                                className="bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500 hover:text-white"
                                onClick={() => handleUpdateStatus(selectedInquiry.id, 'read')}
                                disabled={isUpdating}
                            >
                                Mark as Read
                            </Button>
                            <Button
                                size="sm"
                                className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500 hover:text-white"
                                onClick={() => handleUpdateStatus(selectedInquiry.id, 'responded')}
                                disabled={isUpdating}
                            >
                                Mark as Responded
                            </Button>
                            <div className="flex-grow" />
                            <Button variant="outline" size="sm" onClick={() => setSelectedInquiry(null)}>
                                Close
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </PageTransition>
    );
}
