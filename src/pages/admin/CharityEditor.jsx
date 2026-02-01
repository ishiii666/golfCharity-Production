import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import PageTransition from '../../components/layout/PageTransition';
import Card, { CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import BackButton from '../../components/ui/BackButton';
import { useToast } from '../../components/ui/Toast';
import { fadeUp } from '../../utils/animations';
import { getCharityById, insertRow, updateRow, uploadCharityImage, logActivity } from '../../lib/supabaseRest';
import { useAuth } from '../../context/AuthContext';

const categories = [
    'Health Research',
    'Mental Health',
    'Community Support',
    'Children',
    'Animal Welfare',
    'Humanitarian',
    'Education',
    'Environment',
    'Disability Support'
];

const locations = ['National', 'State', 'Regional', 'International'];

export default function CharityEditor() {
    const navigate = useNavigate();
    const { id } = useParams(); // If editing, id will be present
    const { isAdmin } = useAuth();
    const isEditing = !!id;

    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);
    const { addToast } = useToast();
    const [imagePreview, setImagePreview] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const imageInputRef = useRef(null);

    const [formData, setFormData] = useState({
        name: '',
        category: 'Health Research',
        description: '',
        long_description: '',
        website_url: '',
        location: 'National',
        goal_amount: 10000,
        featured: false,
        charity_day_date: '',
        charity_day_location: '',
        stripe_account_id: ''
    });

    // Redirect if not admin
    useEffect(() => {
        if (!isAdmin) {
            navigate('/admin');
        }
    }, [isAdmin, navigate]);

    // Fetch charity data if editing
    useEffect(() => {
        if (isEditing && id) {
            fetchCharity();
        }
    }, [id, isEditing]);

    const fetchCharity = async () => {
        try {
            setLoading(true);
            const charity = await getCharityById(id);
            if (charity) {
                setFormData({
                    name: charity.name || '',
                    category: charity.category || 'Health Research',
                    description: charity.description || '',
                    long_description: charity.long_description || '',
                    website_url: charity.website_url || '',
                    location: charity.location || 'National',
                    goal_amount: charity.goal_amount || 10000,
                    featured: charity.featured || false,
                    charity_day_date: charity.charity_day_date || '',
                    charity_day_location: charity.charity_day_location || '',
                    stripe_account_id: charity.stripe_account_id || ''
                });
                setImagePreview(charity.image_url);
            } else {
                addToast('error', 'Charity not found');
                setTimeout(() => navigate('/admin/charities'), 2000);
            }
        } catch (error) {
            console.error('Error fetching charity:', error);
            addToast('error', 'Failed to load charity');
        } finally {
            setLoading(false);
        }
    };

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                addToast('error', 'Image must be less than 5MB');
                return;
            }
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            addToast('error', 'Please enter a charity name');
            return;
        }

        setSaving(true);
        try {
            let imageUrl = imagePreview;

            // Upload new image if selected
            if (imageFile) {
                const tempId = id || `new_${Date.now()}`;
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
                website_url: formData.website_url,
                location: formData.location,
                goal_amount: parseFloat(formData.goal_amount) || 10000,
                featured: formData.featured,
                charity_day_date: formData.charity_day_date || null,
                charity_day_location: formData.charity_day_location || '',
                status: 'active',
                stripe_account_id: formData.stripe_account_id || null
            };

            if (isEditing) {
                await updateRow('charities', id, charityData);
                await logActivity('admin_action', `Updated charity: ${formData.name}`, { charityId: id });
                addToast('success', 'Charity updated successfully!');
            } else {
                charityData.total_raised = 0;
                charityData.supporter_count = 0;
                const result = await insertRow('charities', charityData);
                const newData = Array.isArray(result) ? result[0] : result;
                await logActivity('admin_action', `Created charity: ${formData.name}`, { charityId: newData?.id });
                addToast('success', 'Charity created successfully!');
            }

            // Navigate back after short delay
            setTimeout(() => navigate('/admin/charities'), 1500);

        } catch (error) {
            console.error('Error saving charity:', error);

            let displayError = 'Unknown error';

            // Handle JSON error strings from Supabase REST API
            if (error.message && error.message.startsWith('{')) {
                try {
                    const parsed = JSON.parse(error.message);
                    displayError = parsed.message || parsed.hint || displayError;
                } catch (e) {
                    displayError = error.message;
                }
            } else {
                displayError = error.message;
            }

            addToast('error', `Failed to save: ${displayError}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <PageTransition>
                <div className="py-8 lg:py-12">
                    <div className="container-app max-w-4xl">
                        <div className="flex items-center justify-center min-h-[400px]">
                            <div className="text-center">
                                <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                                <p className="text-zinc-400">Loading charity...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </PageTransition>
        );
    }

    return (
        <PageTransition>
            <div className="py-8 lg:py-12">
                <div className="container-app max-w-4xl">
                    {/* Header */}
                    <BackButton to="/admin/charities" label="Back to Charities" className="mb-6" />
                    <motion.div
                        variants={fadeUp}
                        initial="initial"
                        animate="animate"
                        className="flex items-center gap-4 mb-8"
                    >
                        <div>
                            <h1 className="text-3xl lg:text-4xl font-bold text-white">
                                {isEditing ? 'Edit Charity' : 'Add New Charity'}
                            </h1>
                            <p className="text-zinc-400">
                                {isEditing ? 'Update charity details' : 'Create a new charity partner'}
                            </p>
                        </div>
                    </motion.div>

                    {/* Form */}
                    <motion.div
                        variants={fadeUp}
                        initial="initial"
                        animate="animate"
                    >
                        <form onSubmit={handleSubmit}>
                            <Card>
                                <CardContent className="p-6 lg:p-8 space-y-6">
                                    {/* Basic Info Section */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                            <span className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm">1</span>
                                            Basic Information
                                        </h3>
                                        <div className="space-y-4 pl-10">
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
                                                        className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white focus:border-emerald-500 focus:outline-none"
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
                                                        className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white focus:border-emerald-500 focus:outline-none"
                                                    >
                                                        {locations.map(loc => (
                                                            <option key={loc} value={loc} className="bg-zinc-800">{loc}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Description Section */}
                                    <div className="pt-6 border-t border-zinc-700/50">
                                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                            <span className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm">2</span>
                                            Description
                                        </h3>
                                        <div className="space-y-4 pl-10">
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
                                                    className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white resize-none focus:border-emerald-500 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Fundraising Section */}
                                    <div className="pt-6 border-t border-zinc-700/50">
                                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                            <span className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm">3</span>
                                            Fundraising Goal
                                        </h3>
                                        <div className="space-y-4 pl-10">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium mb-2 text-zinc-300">
                                                        Goal Amount ($)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={formData.goal_amount}
                                                        onChange={(e) => setFormData({ ...formData, goal_amount: e.target.value })}
                                                        placeholder="10000"
                                                        className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white focus:border-emerald-500 focus:outline-none"
                                                    />
                                                    <p className="text-xs text-zinc-500 mt-1">The fundraising target for this charity</p>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium mb-2 text-zinc-300">
                                                        Website URL
                                                    </label>
                                                    <input
                                                        type="url"
                                                        value={formData.website_url}
                                                        onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                                                        placeholder="https://charitywebsite.com"
                                                        className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white focus:border-emerald-500 focus:outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium mb-2 text-zinc-300">
                                                        Stripe Connected Account ID
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={formData.stripe_account_id}
                                                        onChange={(e) => setFormData({ ...formData, stripe_account_id: e.target.value })}
                                                        placeholder="acct_1..."
                                                        className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white focus:border-emerald-500 focus:outline-none"
                                                    />
                                                    <p className="text-[10px] text-zinc-500 mt-1">Found in your Stripe Connect dashboard</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Golf Charity Day Details Section */}
                                    <div className="pt-6 border-t border-zinc-700/50">
                                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                            <span className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm">4</span>
                                            Golf Charity Day Details
                                        </h3>
                                        <div className="space-y-4 pl-10">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium mb-2 text-zinc-300">
                                                        Charity Day Date
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={formData.charity_day_date}
                                                        onChange={(e) => setFormData({ ...formData, charity_day_date: e.target.value })}
                                                        className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white focus:border-emerald-500 focus:outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium mb-2 text-zinc-300">
                                                        Charity Day Location
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={formData.charity_day_location}
                                                        onChange={(e) => setFormData({ ...formData, charity_day_location: e.target.value })}
                                                        placeholder="e.g., Royal Melbourne Golf Club"
                                                        className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white focus:border-emerald-500 focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-xs text-zinc-500">Optional: Provide details for upcoming golf charity events hosted by this charity.</p>
                                        </div>
                                    </div>

                                    {/* Image Section */}
                                    <div className="pt-6 border-t border-zinc-700/50">
                                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                            <span className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm">5</span>
                                            Charity Image
                                        </h3>
                                        <div className="pl-10">
                                            <div
                                                onClick={() => imageInputRef.current?.click()}
                                                className="border-2 border-dashed border-zinc-600 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-500 transition-colors"
                                            >
                                                {imagePreview ? (
                                                    <div className="relative">
                                                        <img
                                                            src={imagePreview}
                                                            alt="Preview"
                                                            className="w-full max-w-md mx-auto h-48 object-cover rounded-lg"
                                                        />
                                                        <p className="text-sm text-zinc-400 mt-3">Click to change image</p>
                                                    </div>
                                                ) : (
                                                    <div className="py-8">
                                                        <svg className="w-12 h-12 mx-auto text-zinc-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        <p className="text-zinc-400">Click to upload image</p>
                                                        <p className="text-zinc-500 text-sm mt-1">PNG, JPG up to 5MB</p>
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

                                    {/* Featured Toggle */}
                                    <div className="pt-6 border-t border-zinc-700/50">
                                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                            <span className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm">6</span>
                                            Settings
                                        </h3>
                                        <div className="pl-10">
                                            <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/50">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, featured: !formData.featured })}
                                                    className={`w-14 h-7 rounded-full transition-colors relative ${formData.featured ? 'bg-emerald-500' : 'bg-zinc-600'
                                                        }`}
                                                >
                                                    <div
                                                        className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-[left] duration-200 ${formData.featured ? 'left-8' : 'left-1'
                                                            }`}
                                                    />
                                                </button>
                                                <div>
                                                    <span className="text-white font-medium">Featured Charity</span>
                                                    <p className="text-sm text-zinc-400">Display prominently on the charities page</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="pt-8 border-t border-zinc-700/50 flex gap-4">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => navigate('/admin/charities')}
                                            disabled={saving}
                                            className="flex-1"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            disabled={saving}
                                            className="flex-1"
                                        >
                                            {saving ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Saving...
                                                </span>
                                            ) : (
                                                isEditing ? 'Save Changes' : 'Create Charity'
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </form>
                    </motion.div>
                </div>
            </div>
        </PageTransition>
    );
}
