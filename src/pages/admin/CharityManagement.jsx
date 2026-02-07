import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import PageTransition from '../../components/layout/PageTransition';
import Card, { CardContent, CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import BackButton from '../../components/ui/BackButton';
import { fadeUp, staggerContainer, staggerItem } from '../../utils/animations';
import { getCharities, updateRow, deleteRow, uploadCharityImage, logActivity } from '../../lib/supabaseRest';
import { useToast } from '../../components/ui/Toast';

const categories = ['Health Research', 'Mental Health', 'Community Support', 'Children', 'Animal Welfare', 'Humanitarian', 'Education', 'Environment', 'Disability Support'];

export default function CharityManagement() {
    const navigate = useNavigate();
    const [charities, setCharities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCharity, setEditingCharity] = useState(null);
    const { addToast } = useToast();
    const [imagePreview, setImagePreview] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const imageInputRef = useRef(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [charityToDelete, setCharityToDelete] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        category: 'Health Research',
        description: '',
        long_description: '',
        image_url: '',
        logo_url: '',
        website_url: '',
        location: 'National',
        featured: false,
        goal_amount: 10000
    });

    // Fetch charities using direct REST API
    useEffect(() => {
        fetchCharities();
    }, []);

    const fetchCharities = async () => {
        try {
            setLoading(true);
            console.log('🏥 Fetching charities via REST API...');
            const data = await getCharities();
            console.log('🏥 Charities received:', data.length);

            // Transform data to match component expectations
            const transformedCharities = (data || []).map(charity => ({
                id: charity.id,
                name: charity.name || 'Unnamed Charity',
                category: charity.category || 'Uncategorized',
                totalRaised: charity.total_raised || 0,
                supporters: charity.supporters || 0,
                featured: charity.featured || false,
                status: charity.status || 'active',
                image: charity.image_url || 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400&h=300&fit=crop',
                description: charity.description || ''
            }));

            setCharities(transformedCharities);
        } catch (error) {
            console.error('Error fetching charities:', error);
            setCharities([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredCharities = charities.filter(charity =>
        charity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        charity.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Show action message with auto-dismiss


    // Navigate to add charity page
    const handleAddNew = () => {
        navigate('/admin/charities/add');
    };

    const handleEdit = (charity) => {
        // Navigate to full-page editor
        navigate(`/admin/charities/edit/${charity.id}`);
    };

    // Handle image file selection
    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 15 * 1024 * 1024) {
                addToast('error', 'Image must be less than 15MB');
                return;
            }
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        // Validate required fields
        if (!formData.name.trim()) {
            addToast('error', 'Please enter a charity name.');
            return;
        }

        setSaving(true);
        try {
            let imageUrl = formData.image_url;

            // Upload new image if selected
            if (imageFile) {
                const tempId = editingCharity?.id || `new_${Date.now()}`;
                imageUrl = await uploadCharityImage(imageFile, tempId, 'image');
            }

            const charityData = {
                name: formData.name,
                category: formData.category,
                description: formData.description,
                long_description: formData.long_description,
                image_url: imageUrl || 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400&h=300&fit=crop',
                logo_url: formData.logo_url,
                website_url: formData.website_url,
                location: formData.location,
                featured: formData.featured,
                goal_amount: parseFloat(formData.goal_amount) || 10000
            };

            if (editingCharity) {
                await updateRow('charities', editingCharity.id, charityData);

                // Log activity
                await logActivity('admin_action', `Updated charity: ${formData.name}`, {
                    charityId: editingCharity.id
                });

                setCharities(prev => prev.map(c =>
                    c.id === editingCharity.id
                        ? { ...c, ...formData, image: charityData.image_url }
                        : c
                ));
                addToast('success', `"${formData.name}" updated successfully!`);
            } else {
                console.log('📝 Creating new charity:', formData.name);
                const result = await insertRow('charities', {
                    ...charityData,
                    status: 'active',
                    total_raised: 0,
                    supporters: 0
                });

                const newData = Array.isArray(result) ? result[0] : result;

                // Log activity
                await logActivity('admin_action', `Created charity: ${formData.name}`, {
                    charityId: newData.id
                });

                const newCharity = {
                    id: newData.id,
                    name: formData.name,
                    category: formData.category,
                    description: formData.description,
                    long_description: formData.long_description,
                    image: charityData.image_url,
                    logo_url: formData.logo_url,
                    website_url: formData.website_url,
                    location: formData.location,
                    featured: formData.featured,
                    totalRaised: 0,
                    supporters: 0,
                    status: 'active'
                };
                setCharities(prev => [newCharity, ...prev]);
                addToast('success', `"${formData.name}" added successfully!`);
            }

            setIsModalOpen(false);
            setImageFile(null);
            setImagePreview(null);
        } catch (error) {
            console.error('Error saving charity:', error);
            const errorMsg = error.message || '';

            if (errorMsg.includes('42501') || errorMsg.includes('permission denied') || errorMsg.includes('401')) {
                addToast('error', 'Permission denied. Please make sure you are logged in as an admin.');
                return;
            }

            let displayError = errorMsg;
            if (errorMsg.startsWith('{')) {
                try {
                    const parsed = JSON.parse(errorMsg);
                    displayError = parsed.message || parsed.hint || errorMsg;
                } catch (e) {
                    // Stay with original message
                }
            }

            addToast('error', 'Failed to save charity: ' + displayError);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleFeatured = async (charityId) => {
        const charity = charities.find(c => c.id === charityId);
        const newFeatured = !charity.featured;

        try {
            await updateRow('charities', charityId, { featured: newFeatured });
            setCharities(prev => prev.map(c =>
                c.id === charityId ? { ...c, featured: newFeatured } : c
            ));
        } catch (error) {
            console.error('Error toggling featured:', error);
        }
    };

    const handleToggleStatus = async (charityId) => {
        const charity = charities.find(c => c.id === charityId);
        const newStatus = charity.status === 'active' ? 'inactive' : 'active';

        try {
            await updateRow('charities', charityId, { status: newStatus });
            setCharities(prev => prev.map(c =>
                c.id === charityId
                    ? { ...c, status: newStatus }
                    : c
            ));
        } catch (error) {
            console.error('Error toggling status:', error);
        }
    };

    // Open delete confirmation modal
    const handleDelete = (charityId) => {
        const charity = charities.find(c => c.id === charityId);
        setCharityToDelete(charity);
        setDeleteModalOpen(true);
    };

    // Confirm delete action
    const confirmDelete = async () => {
        if (!charityToDelete) return;

        try {
            await deleteRow('charities', charityToDelete.id);

            // Log activity
            await logActivity('admin_action', `Deleted charity: ${charityToDelete.name}`, {
                charityId: charityToDelete.id
            });

            setCharities(prev => prev.filter(c => c.id !== charityToDelete.id));
            addToast('success', `"${charityToDelete.name}" deleted successfully!`);
        } catch (error) {
            console.error('Error deleting charity:', error);
            addToast('error', `Failed to delete: ${error.message || 'Unknown error'}`);
        } finally {
            setDeleteModalOpen(false);
            setCharityToDelete(null);
        }
    };

    const totalRaised = charities.reduce((sum, c) => sum + c.totalRaised, 0);

    return (
        <PageTransition>
            <div className="py-8 lg:py-12">
                <div className="container-app">
                    {/* Header */}
                    <BackButton to="/admin" label="Admin Dashboard" className="mb-6" />
                    <motion.div
                        variants={fadeUp}
                        initial="initial"
                        animate="animate"
                        className="flex items-center justify-between mb-8"
                    >
                        <div>
                            <h1 className="text-3xl lg:text-4xl font-bold mb-2 text-white">
                                Charity Management
                            </h1>
                            <p className="text-zinc-400">
                                Add, edit, and manage partner charities
                            </p>
                        </div>
                        <Button onClick={handleAddNew}>
                            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Charity
                        </Button>
                    </motion.div>



                    {/* Stats Cards */}
                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        animate="animate"
                        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
                    >
                        {[
                            { label: 'Total Charities', value: loading ? '...' : charities.length, color: 'text-rose-400' },
                            { label: 'Featured', value: loading ? '...' : charities.filter(c => c.featured).length, color: 'text-amber-400' },
                            { label: 'Total Raised', value: loading ? '...' : `$${(totalRaised / 1000).toFixed(1)}K`, color: 'text-green-400' },
                            { label: 'Active Charities', value: loading ? '...' : charities.filter(c => c.status === 'active').length, color: 'text-violet-400' }
                        ].map((stat) => (
                            <motion.div key={stat.label} variants={staggerItem}>
                                <Card variant="glass" padding="p-4">
                                    <p className="text-sm" style={{ color: 'var(--color-neutral-500)' }}>{stat.label}</p>
                                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Search */}
                    <Card variant="glass" className="mb-6">
                        <CardContent>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <Input
                                        placeholder="Search charities by name or category..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <Button variant="ghost" onClick={fetchCharities}>
                                    Refresh
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Charity Grid */}
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                            <p style={{ color: 'var(--color-neutral-400)' }}>Loading charities...</p>
                        </div>
                    ) : filteredCharities.length === 0 ? (
                        <div className="text-center py-12">
                            <p style={{ color: 'var(--color-neutral-400)' }}>No charities found. Add one to get started!</p>
                        </div>
                    ) : (
                        <motion.div
                            variants={staggerContainer}
                            initial="initial"
                            animate="animate"
                            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                        >
                            {filteredCharities.map((charity) => (
                                <motion.div key={charity.id} variants={staggerItem}>
                                    <Card variant="glass" className="overflow-hidden">
                                        <div className="relative">
                                            <img
                                                src={charity.image}
                                                alt={charity.name}
                                                className="w-full h-40 object-cover"
                                                onError={(e) => {
                                                    e.target.src = 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400&h=300&fit=crop';
                                                }}
                                            />
                                            {charity.featured && (
                                                <span
                                                    className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium"
                                                    style={{ background: '#c9a227', color: '#0f3621' }}
                                                >
                                                    ★ Featured
                                                </span>
                                            )}
                                            <span
                                                className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium ${charity.status === 'active'
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : 'bg-red-500/20 text-red-400'
                                                    }`}
                                            >
                                                {charity.status}
                                            </span>
                                        </div>
                                        <CardContent>
                                            <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--color-cream-100)' }}>
                                                {charity.name}
                                            </h3>
                                            <span
                                                className="inline-block px-2 py-1 rounded-full text-xs mb-3"
                                                style={{ background: 'rgba(201, 162, 39, 0.2)', color: '#c9a227' }}
                                            >
                                                {charity.category}
                                            </span>
                                            <div className="flex items-center justify-between text-sm mb-2">
                                                <span style={{ color: 'var(--color-neutral-400)' }}>
                                                    ${charity.totalRaised.toLocaleString()} raised
                                                </span>
                                                <span style={{ color: 'var(--color-neutral-500)' }}>
                                                    {charity.supporters} supporters
                                                </span>
                                            </div>
                                            <div className="mb-4">
                                                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider mb-1 text-zinc-500 font-bold">
                                                    <span>Impact Share</span>
                                                    <span>{totalRaised > 0 ? Math.round((charity.totalRaised / totalRaised) * 100) : 0}%</span>
                                                </div>
                                                <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${totalRaised > 0 ? (charity.totalRaised / totalRaised) * 100 : 0}%` }}
                                                        className="h-full bg-emerald-500"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => handleEdit(charity)}>
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleToggleFeatured(charity.id)}
                                                >
                                                    {charity.featured ? 'Unfeature' : 'Feature'}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleToggleStatus(charity.id)}
                                                >
                                                    {charity.status === 'active' ? 'Disable' : 'Enable'}
                                                </Button>
                                                <button
                                                    onClick={() => handleDelete(charity.id)}
                                                    className="p-2 rounded-lg hover:bg-red-500/10 transition-colors ml-auto"
                                                >
                                                    <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}

                    {/* Add/Edit Modal */}
                    <AnimatePresence>
                        {isModalOpen && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-black/60"
                                    onClick={() => setIsModalOpen(false)}
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="relative w-full max-w-2xl p-6 rounded-2xl max-h-[85vh] overflow-y-auto"
                                    style={{
                                        background: 'rgba(24, 24, 27, 0.98)',
                                        border: '1px solid rgba(63, 63, 70, 0.5)'
                                    }}
                                >

                                    <h3 className="text-xl font-bold mb-6 text-white">
                                        Edit Charity
                                    </h3>
                                    <div className="space-y-4">
                                        <Input
                                            label="Charity Name *"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="e.g., Cancer Council Australia"
                                        />

                                        {/* Category and Location Row */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-2 text-zinc-300">
                                                    Category
                                                </label>
                                                <select
                                                    value={formData.category}
                                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                    className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white"
                                                >
                                                    {categories.map(cat => (
                                                        <option key={cat} value={cat} className="bg-zinc-800">{cat}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-2 text-zinc-300">
                                                    Location
                                                </label>
                                                <select
                                                    value={formData.location}
                                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                                    className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white"
                                                >
                                                    <option value="National" className="bg-zinc-800">National</option>
                                                    <option value="State" className="bg-zinc-800">State</option>
                                                    <option value="Regional" className="bg-zinc-800">Regional</option>
                                                    <option value="International" className="bg-zinc-800">International</option>
                                                </select>
                                            </div>
                                        </div>

                                        <Input
                                            label="Short Description"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Brief one-line description..."
                                        />

                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-zinc-300">
                                                Full Description
                                            </label>
                                            <textarea
                                                value={formData.long_description}
                                                onChange={(e) => setFormData({ ...formData, long_description: e.target.value })}
                                                placeholder="Detailed description of the charity's mission and impact..."
                                                rows={3}
                                                className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white resize-none"
                                            />
                                        </div>

                                        <Input
                                            label="Website URL"
                                            value={formData.website_url}
                                            onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                                            placeholder="https://charitywebsite.com"
                                        />

                                        <Input
                                            label="Goal Amount ($)"
                                            type="number"
                                            value={formData.goal_amount}
                                            onChange={(e) => setFormData({ ...formData, goal_amount: e.target.value })}
                                            placeholder="10000"
                                        />

                                        {/* Image Upload Section */}
                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-zinc-300">
                                                Charity Image
                                            </label>
                                            <div
                                                onClick={() => imageInputRef.current?.click()}
                                                className="border-2 border-dashed border-zinc-600 rounded-xl p-4 text-center cursor-pointer hover:border-emerald-500 transition-colors"
                                            >
                                                {imagePreview ? (
                                                    <div className="relative">
                                                        <img
                                                            src={imagePreview}
                                                            alt="Preview"
                                                            className="w-full h-32 object-cover rounded-lg"
                                                        />
                                                        <p className="text-xs text-zinc-400 mt-2">Click to change image</p>
                                                    </div>
                                                ) : (
                                                    <div className="py-4">
                                                        <svg className="w-10 h-10 mx-auto text-zinc-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        <p className="text-zinc-400 text-sm">Click to upload image</p>
                                                        <p className="text-zinc-500 text-xs mt-1">PNG, JPG up to 15MB</p>
                                                    </div>
                                                )}
                                                <input
                                                    ref={imageInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImageSelect}
                                                    className="hidden"
                                                />
                                            </div>
                                        </div>

                                        {/* Featured Toggle */}
                                        <div className="flex items-center gap-3 pt-2 pb-4">
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, featured: !formData.featured })}
                                                className={`w-12 h-6 rounded-full transition-colors relative ${formData.featured ? 'bg-emerald-500' : 'bg-zinc-600'}`}
                                            >
                                                <div
                                                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-[left] duration-200 ${formData.featured ? 'left-7' : 'left-1'}`}
                                                />
                                            </button>
                                            <span className="text-zinc-300">Featured Charity</span>
                                        </div>
                                    </div>

                                    {/* Sticky Footer with Buttons */}
                                    <div className="sticky bottom-0 left-0 right-0 bg-zinc-900 pt-4 pb-2 -mx-6 px-6 mt-4 border-t border-zinc-700">
                                        <div className="flex gap-3">
                                            <Button variant="ghost" fullWidth onClick={() => setIsModalOpen(false)} disabled={saving}>
                                                Cancel
                                            </Button>
                                            <Button variant="primary" fullWidth onClick={handleSave} disabled={saving}>
                                                {saving ? (
                                                    <span className="flex items-center justify-center gap-2">
                                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        Saving...
                                                    </span>
                                                ) : (
                                                    editingCharity ? 'Save Changes' : 'Add Charity'
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>

                    {/* Delete Confirmation Modal */}
                    <AnimatePresence>
                        {deleteModalOpen && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-black/70"
                                    onClick={() => setDeleteModalOpen(false)}
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="relative bg-zinc-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-red-500/20"
                                >
                                    {/* Warning Icon */}
                                    <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                                        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-xl font-bold text-white text-center mb-2">
                                        Delete Charity
                                    </h3>

                                    {/* Message */}
                                    <p className="text-zinc-400 text-center mb-6">
                                        Are you sure you want to delete <span className="text-white font-medium">"{charityToDelete?.name}"</span>?
                                        This action cannot be undone.
                                    </p>

                                    {/* Buttons */}
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setDeleteModalOpen(false)}
                                            className="flex-1 px-4 py-3 rounded-xl bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={confirmDelete}
                                            className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </PageTransition>
    );
}
