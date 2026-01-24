import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Navigate } from 'react-router-dom';
import PageTransition from '../../components/layout/PageTransition';
import Card, { CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { fadeUp } from '../../utils/animations';
import { insertRow, uploadCharityImage, logActivity } from '../../lib/supabaseRest';
import { useAuth } from '../../context/AuthContext';

const categories = ['Health Research', 'Mental Health', 'Community Support', 'Children', 'Animal Welfare', 'Humanitarian', 'Education', 'Environment', 'Disability Support'];

export default function AddCharity() {
    const navigate = useNavigate();
    const { isAdmin } = useAuth();

    // Only admins can access this page
    if (!isAdmin) {
        return <Navigate to="/admin" replace />;
    }

    const [saving, setSaving] = useState(false);
    const [actionMessage, setActionMessage] = useState({ type: '', text: '' });
    const [imagePreview, setImagePreview] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const imageInputRef = useRef(null);

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
        goal_amount: 10000,
        charity_day_date: '',
        charity_day_location: ''
    });

    const showMessage = (type, text) => {
        setActionMessage({ type, text });
        setTimeout(() => setActionMessage({ type: '', text: '' }), 4000);
    };

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                showMessage('error', 'Image must be less than 5MB');
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
        if (!formData.name.trim()) {
            showMessage('error', 'Please enter a charity name.');
            return;
        }

        setSaving(true);
        try {
            let imageUrl = formData.image_url;

            // Upload new image if selected
            if (imageFile) {
                const tempId = `new_${Date.now()}`;
                imageUrl = await uploadCharityImage(imageFile, tempId, 'image');
            }

            // Generate slug from name
            const slug = formData.name.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');

            const charityData = {
                name: formData.name,
                slug: slug,
                category: formData.category,
                description: formData.description,
                long_description: formData.long_description,
                image_url: imageUrl || 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400&h=300&fit=crop',
                logo_url: formData.logo_url,
                website_url: formData.website_url,
                location: formData.location,
                featured: formData.featured,
                goal_amount: parseFloat(formData.goal_amount) || 10000,
                charity_day_date: formData.charity_day_date || null,
                charity_day_location: formData.charity_day_location || '',
                status: 'active',
                total_raised: 0,
                supporter_count: 0
            };

            const result = await insertRow('charities', charityData);
            const newData = Array.isArray(result) ? result[0] : result;

            await logActivity('admin_action', `Created charity: ${formData.name}`, {
                charityId: newData.id
            });

            showMessage('success', `"${formData.name}" added successfully!`);

            // Navigate back to charity management after short delay
            setTimeout(() => {
                navigate('/admin/charities');
            }, 1500);

        } catch (error) {
            console.error('Error saving charity:', error);
            const errorMsg = error.message || '';
            if (errorMsg.includes('42501') || errorMsg.includes('permission denied') || errorMsg.includes('401')) {
                showMessage('error', 'Permission denied. Please make sure you are logged in as an admin.');
            } else {
                showMessage('error', 'Failed to save charity: ' + errorMsg);
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <PageTransition>
            <div className="py-8 lg:py-12">
                <div className="container-app max-w-3xl">
                    {/* Header with Back Button */}
                    <motion.div
                        variants={fadeUp}
                        initial="initial"
                        animate="animate"
                        className="flex items-center gap-4 mb-8"
                    >
                        <button
                            onClick={() => navigate('/admin/charities')}
                            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
                        >
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div>
                            <h1 className="text-3xl lg:text-4xl font-bold text-white">
                                Add New Charity
                            </h1>
                            <p className="text-zinc-400">
                                Create a new charity partner
                            </p>
                        </div>
                    </motion.div>

                    {/* Action Message */}
                    {actionMessage.text && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${actionMessage.type === 'success'
                                ? 'bg-emerald-500/20 border border-emerald-500/30'
                                : 'bg-red-500/20 border border-red-500/30'
                                }`}
                        >
                            <span className={actionMessage.type === 'success' ? 'text-emerald-400' : 'text-red-400'}>
                                {actionMessage.type === 'success' ? '✓' : '✕'}
                            </span>
                            <span className={actionMessage.type === 'success' ? 'text-emerald-300' : 'text-red-300'}>
                                {actionMessage.text}
                            </span>
                        </motion.div>
                    )}

                    {/* Form Card */}
                    <Card>
                        <CardContent className="p-6 lg:p-8 space-y-8">
                            {/* 1. Basic Information */}
                            <div>
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm border border-emerald-500/30">1</span>
                                    Basic Information
                                </h3>
                                <div className="space-y-4 pl-11">
                                    <Input
                                        label="Charity Name *"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g., Cancer Council Australia"
                                    />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-zinc-300">
                                                Category
                                            </label>
                                            <select
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white focus:outline-none focus:border-emerald-500 transition-colors"
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
                                                className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                            >
                                                <option value="National" className="bg-zinc-800">National</option>
                                                <option value="State" className="bg-zinc-800">State</option>
                                                <option value="Regional" className="bg-zinc-800">Regional</option>
                                                <option value="International" className="bg-zinc-800">International</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Description */}
                            <div className="pt-8 border-t border-zinc-800">
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm border border-emerald-500/30">2</span>
                                    Description
                                </h3>
                                <div className="space-y-4 pl-11">
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
                                            rows={5}
                                            className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white resize-none focus:outline-none focus:border-emerald-500 transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 3. Fundraising & Links */}
                            <div className="pt-8 border-t border-zinc-800">
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm border border-emerald-500/30">3</span>
                                    Fundraising & Links
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-11">
                                    <Input
                                        label="Fundraising Goal ($)"
                                        type="number"
                                        value={formData.goal_amount}
                                        onChange={(e) => setFormData({ ...formData, goal_amount: e.target.value })}
                                        placeholder="10000"
                                    />
                                    <Input
                                        label="Website URL"
                                        value={formData.website_url}
                                        onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                                        placeholder="https://charitywebsite.com"
                                    />
                                </div>
                            </div>

                            {/* 4. Golf Charity Day Details */}
                            <div className="pt-8 border-t border-zinc-800">
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm border border-emerald-500/30">4</span>
                                    Golf Charity Day Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-11">
                                    <Input
                                        label="Charity Day Date"
                                        type="date"
                                        value={formData.charity_day_date}
                                        onChange={(e) => setFormData({ ...formData, charity_day_date: e.target.value })}
                                    />
                                    <Input
                                        label="Charity Day Location"
                                        value={formData.charity_day_location}
                                        onChange={(e) => setFormData({ ...formData, charity_day_location: e.target.value })}
                                        placeholder="e.g., Royal Melbourne Golf Club"
                                    />
                                </div>
                                <p className="text-xs text-zinc-500 mt-2 pl-11">Optional: Provide details for upcoming golf charity events hosted by this charity.</p>
                            </div>

                            {/* 5. Charity Image */}
                            <div className="pt-8 border-t border-zinc-800">
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm border border-emerald-500/30">5</span>
                                    Charity Image
                                </h3>
                                <div className="pl-11">
                                    <div
                                        onClick={() => imageInputRef.current?.click()}
                                        className="border-2 border-dashed border-zinc-700/50 rounded-2xl p-8 text-center cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all duration-300"
                                    >
                                        {imagePreview ? (
                                            <div className="relative group">
                                                <img
                                                    src={imagePreview}
                                                    alt="Preview"
                                                    className="w-full max-w-md mx-auto h-48 object-cover rounded-xl shadow-lg"
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-xl transition-opacity">
                                                    <p className="text-white text-sm font-medium">Click to change image</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="py-4">
                                                <div className="w-16 h-16 mx-auto bg-zinc-800 rounded-2xl flex items-center justify-center mb-4">
                                                    <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <p className="text-zinc-300 font-medium">Click to upload charity image</p>
                                                <p className="text-zinc-500 text-sm mt-1">PNG, JPG or WEBP up to 5MB</p>
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
                            </div>

                            {/* 6. Settings */}
                            <div className="pt-8 border-t border-zinc-800">
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm border border-emerald-500/30">6</span>
                                    Settings
                                </h3>
                                <div className="pl-11">
                                    <div
                                        onClick={() => setFormData({ ...formData, featured: !formData.featured })}
                                        className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-800/30 border border-zinc-700/50 cursor-pointer hover:bg-zinc-800/50 transition-colors"
                                    >
                                        <button
                                            type="button"
                                            className={`w-14 h-7 rounded-full transition-colors relative ${formData.featured ? 'bg-emerald-500' : 'bg-zinc-600'}`}
                                        >
                                            <div
                                                className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-[left] duration-200 ${formData.featured ? 'left-8' : 'left-1'}`}
                                            />
                                        </button>
                                        <div>
                                            <p className="text-white font-semibold">Featured Charity</p>
                                            <p className="text-sm text-zinc-500">Highlight this charity on the main discovery pages</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-4 pt-8 mt-4 border-t border-zinc-800">
                                <Button
                                    variant="ghost"
                                    fullWidth
                                    onClick={() => navigate('/admin/charities')}
                                    disabled={saving}
                                    className="h-12"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    fullWidth
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="h-12"
                                >
                                    {saving ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Saving...
                                        </span>
                                    ) : (
                                        'Add Charity'
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </PageTransition>
    );
}
