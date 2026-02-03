import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PageTransition from '../../components/layout/PageTransition';
import Card, { CardContent, CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import BackButton from '../../components/ui/BackButton';
import { useToast } from '../../components/ui/Toast';
import { fadeUp, staggerContainer, staggerItem } from '../../utils/animations';
import { getSiteContent, saveSiteContentBulk, getFaqs, saveFaq, deleteFaq } from '../../lib/supabaseRest';

// Content structure - organized by category
const contentCategories = [
    {
        id: 'homepage',
        label: 'Homepage',
        icon: '🏠',
        sections: [
            {
                id: 'hero',
                title: 'Hero Section',
                description: 'Main landing page content',
                fields: [
                    { name: 'title', label: 'Main Title', type: 'text', value: '' },
                    { name: 'subtitle', label: 'Subtitle/Description', type: 'textarea', value: '' },
                    { name: 'ctaText', label: 'Primary CTA Button', type: 'text', value: '' }
                ]
            },
            {
                id: 'concept',
                title: 'Draw Mechanics (The Concept)',
                description: 'Section explaining how your scores become lucky numbers',
                fields: [
                    { name: 'title', label: 'Section Title', type: 'text', value: '' },
                    { name: 'subtitle', label: 'Section Subtitle', type: 'textarea', value: '' },
                    { name: 'drawHeadline', label: 'Box Title', type: 'text', value: '' },
                    { name: 'drawPoint1', label: 'Point 1', type: 'text', value: '' },
                    { name: 'drawPoint2', label: 'Point 2', type: 'text', value: '' },
                    { name: 'drawPoint3', label: 'Point 3', type: 'text', value: '' },
                    { name: 'drawPoint4', label: 'Point 4', type: 'text', value: '' },
                    { name: 'exampleNumbers', label: 'Example Numbers (comma separated)', type: 'text', value: '' },
                    { name: 'exampleLabel', label: 'Example Label', type: 'text', value: '' }
                ]
            },
            {
                id: 'reveal',
                title: 'Impact Reveal (Cards)',
                description: 'The automated card reveal and winner announcement',
                fields: [
                    { name: 'title', label: 'Section Title', type: 'text', value: '' },
                    { name: 'subtitle', label: 'Section Subtitle', type: 'text', value: '' },
                    { name: 'badgeText', label: 'Section Badge (The Ultimate Payoff)', type: 'text', value: '' },
                    { name: 'luckyNumbers', label: 'Winning Numbers (comma separated)', type: 'text', value: '' },
                    { name: 'impactLabel', label: 'Announcement Badge', type: 'text', value: '' },
                    { name: 'impactTitle', label: 'Announcement Title', type: 'text', value: '' },
                    { name: 'impactPrefix', label: 'Impact Prefix (e.g. Your round just unlocked)', type: 'text', value: '' },
                    { name: 'impactDays', label: 'Impact Value (e.g. 14)', type: 'text', value: '' },
                    { name: 'impactInfix', label: 'Impact Infix (e.g. of)', type: 'text', value: '' },
                    { name: 'impactDesc', label: 'Impact Description (e.g. medical support...)', type: 'textarea', value: '' }
                ]
            }
        ]
    },
    {
        id: 'footer',
        label: 'Footer & Global',
        icon: '📝',
        sections: [
            {
                id: 'footer',
                title: 'Footer Content',
                description: 'Global footer details',
                fields: [
                    { name: 'tagline', label: 'Footer Tagline', type: 'textarea', value: '' },
                    { name: 'copyright', label: 'Copyright Text', type: 'text', value: '' },
                    { name: 'contact_email', label: 'Contact Email', type: 'text', value: '' },
                    { name: 'contact_phone', label: 'Contact Phone', type: 'text', value: '' },
                    { name: 'address', label: 'Address/Location', type: 'text', value: '' },
                    { name: 'social_instagram', label: 'Instagram URL', type: 'text', value: '' },
                    { name: 'social_facebook', label: 'Facebook URL', type: 'text', value: '' },
                    { name: 'social_linkedin', label: 'LinkedIn URL', type: 'text', value: '' },
                    { name: 'social_twitter', label: 'Twitter/X URL', type: 'text', value: '' },
                    { name: 'social_youtube', label: 'YouTube URL', type: 'text', value: '' }
                ]
            }
        ]
    },
    {
        id: 'contact',
        label: 'Contact Page',
        icon: '📞',
        sections: [
            {
                id: 'contact_info',
                title: 'Contact Details',
                description: 'Public contact information and business hours',
                fields: [
                    { name: 'email', label: 'Support Email', type: 'text', value: '', section: 'contact' },
                    { name: 'phone', label: 'Contact Phone', type: 'text', value: '', section: 'contact' },
                    { name: 'address', label: 'Office Address', type: 'textarea', value: '', section: 'contact' },
                    { name: 'hours_mon_fri', label: 'Mon-Fri Hours', type: 'text', value: '', section: 'contact' },
                    { name: 'hours_sat', label: 'Saturday Hours', type: 'text', value: '', section: 'contact' },
                    { name: 'hours_sun', label: 'Sunday Hours', type: 'text', value: '', section: 'contact' },
                    { name: 'instagram_url', label: 'Instagram URL', type: 'text', value: '', section: 'contact' },
                    { name: 'facebook_url', label: 'Facebook URL', type: 'text', value: '', section: 'contact' },
                    { name: 'linkedin_url', label: 'LinkedIn URL', type: 'text', value: '', section: 'contact' },
                    { name: 'twitter_url', label: 'Twitter/X URL', type: 'text', value: '', section: 'contact' }
                ]
            }
        ]
    },
    {
        id: 'faqs',
        label: 'FAQs',
        icon: '❓',
        sections: [
            {
                id: 'faq_manager',
                title: 'FAQ Manager',
                description: 'Manage frequently asked questions',
                isSpecial: true,
                fields: []
            }
        ]
    },
    {
        id: 'legal',
        label: 'Legal',
        icon: '⚖️',
        sections: [
            {
                id: 'terms',
                title: 'Terms & Conditions',
                description: 'Legal terms for using the platform',
                isLegal: true,
                fields: [
                    { name: 'termsTitle', label: 'Page Title', type: 'text', value: '', section: 'legal' },
                    { name: 'termsLastUpdated', label: 'Last Updated', type: 'date', value: '', section: 'legal' },
                    { name: 'termsContent', label: 'Content (Markdown)', type: 'richtext', value: '', section: 'legal' }
                ]
            },
            {
                id: 'privacy',
                title: 'Privacy Policy',
                description: 'How we handle user data',
                isLegal: true,
                fields: [
                    { name: 'privacyTitle', label: 'Page Title', type: 'text', value: '', section: 'legal' },
                    { name: 'privacyLastUpdated', label: 'Last Updated', type: 'date', value: '', section: 'legal' },
                    { name: 'privacyContent', label: 'Content (Markdown)', type: 'richtext', value: '', section: 'legal' }
                ]
            }
        ]
    }
];

export default function ContentManagement() {
    const [categories, setCategories] = useState(contentCategories);
    const [activeCategory, setActiveCategory] = useState('homepage');
    const [activeSection, setActiveSection] = useState('hero');
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { addToast } = useToast();
    const [previewMode, setPreviewMode] = useState(false);
    const [originalValues, setOriginalValues] = useState({});
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // FAQ specific state
    const [faqs, setFaqs] = useState([]);
    const [editingFaq, setEditingFaq] = useState(null);
    const [faqForm, setFaqForm] = useState({ category: 'General', question: '', answer: '', display_order: 0 });

    // Track changes by comparing current state with original database values
    useEffect(() => {
        const currentValues = {};
        categories.forEach(cat => {
            cat.sections.forEach(sec => {
                sec.fields.forEach(field => {
                    const key = `${field.section || sec.id}_${field.name}`;
                    currentValues[key] = field.value;
                });
            });
        });

        // Check if any value differs
        let changed = false;
        for (const key in currentValues) {
            if (String(currentValues[key] || '') !== String(originalValues[key] || '')) {
                changed = true;
                break;
            }
        }
        setHasUnsavedChanges(changed);
    }, [categories, originalValues]);

    // Fetch content from database on mount
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [dbContent, dbFaqs] = await Promise.all([
                getSiteContent(),
                getFaqs()
            ]);

            if (dbContent.length > 0) {
                setCategories(prev => prev.map(category => ({
                    ...category,
                    sections: category.sections.map(section => ({
                        ...section,
                        fields: section.fields.map(field => {
                            const sectionId = field.section || section.id;
                            const dbField = dbContent.find(
                                c => c.section_id === sectionId && c.field_name === field.name
                            );
                            return dbField ? { ...field, value: dbField.field_value || '' } : field;
                        })
                    }))
                })));

                const values = {};
                dbContent.forEach(item => {
                    values[`${item.section_id}_${item.field_name}`] = item.field_value || '';
                });
                setOriginalValues(values);
            }

            setFaqs(dbFaqs);
        } catch (error) {
            console.error('Error fetching data:', error);
            addToast('error', 'Failed to load content');
        } finally {
            setLoading(false);
        }
    };

    const currentCategory = categories.find(c => c.id === activeCategory);
    const currentSection = currentCategory?.sections.find(s => s.id === activeSection);

    const handleFieldChange = (sectionId, fieldName, value) => {
        setCategories(prev => prev.map(category => ({
            ...category,
            sections: category.sections.map(section => {
                if (section.id === sectionId) {
                    return {
                        ...section,
                        fields: section.fields.map(field =>
                            field.name === fieldName ? { ...field, value } : field
                        )
                    };
                }
                return section;
            })
        })));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const items = [];
            categories.forEach(category => {
                category.sections.forEach(section => {
                    section.fields.forEach(field => {
                        items.push({
                            section_id: field.section || section.id,
                            field_name: field.name,
                            field_value: field.value,
                            field_type: field.type
                        });
                    });
                });
            });

            await saveSiteContentBulk(items);

            const newOriginals = {};
            items.forEach(item => {
                newOriginals[`${item.section_id}_${item.field_name}`] = item.field_value;
            });
            setOriginalValues(newOriginals);

            addToast('success', 'Changes published successfully!');
        } catch (error) {
            console.error('Error saving content:', error);
            addToast('error', 'Failed to save content');
        } finally {
            setIsSaving(false);
        }
    };

    const handleFaqSave = async () => {
        try {
            const result = await saveFaq({
                ...faqForm,
                id: editingFaq?.id
            });

            if (editingFaq) {
                setFaqs(faqs.map(f => f.id === result.id ? result : f));
            } else {
                setFaqs([...faqs, result]);
            }

            setEditingFaq(null);
            setFaqForm({ category: 'General', question: '', answer: '', display_order: 0 });
            setPreviewMode(false); // Close the form after saving
            addToast('success', 'FAQ saved successfully');
        } catch (error) {
            addToast('error', 'Failed to save FAQ');
        }
    };

    const handleFaqDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this FAQ?')) return;
        try {
            await deleteFaq(id);
            setFaqs(faqs.filter(f => f.id !== id));
            addToast('success', 'FAQ deleted');
        } catch (error) {
            addToast('error', 'Failed to delete FAQ');
        }
    };

    if (loading) {
        return (
            <PageTransition>
                <div className="py-8 lg:py-12">
                    <div className="container-app">
                        <div className="flex items-center justify-center min-h-[400px]">
                            <div className="text-center">
                                <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                                <p className="text-zinc-400">Loading content...</p>
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
                                Content Management
                            </h1>
                            <p className="text-zinc-400">
                                Edit website content, FAQs, and legal pages
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <AnimatePresence>
                                {hasUnsavedChanges && (
                                    <motion.span
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        className="text-xs font-bold text-amber-500 uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20"
                                    >
                                        Unsaved Changes
                                    </motion.span>
                                )}
                            </AnimatePresence>
                            {activeCategory !== 'faqs' && (
                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving || !hasUnsavedChanges}
                                    className={`relative group overflow-hidden transition-all duration-500 ${hasUnsavedChanges
                                        ? 'shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]'
                                        : ''}`}
                                    style={{
                                        background: hasUnsavedChanges
                                            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                            : 'rgba(39, 39, 42, 0.5)',
                                        border: hasUnsavedChanges
                                            ? '1px solid rgba(255,255,255,0.2)'
                                            : '1px solid rgba(255,255,255,0.05)',
                                        color: hasUnsavedChanges ? '#ffffff' : '#71717a',
                                        minWidth: '180px',
                                        height: '48px',
                                        borderRadius: '14px'
                                    }}
                                >
                                    <div className="flex items-center justify-center gap-2 relative z-10">
                                        {isSaving ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span className="font-bold">Saving...</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg className={`w-5 h-5 transition-transform duration-300 ${hasUnsavedChanges ? 'scale-110' : 'opacity-50'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span className="font-bold tracking-tight">Publish Changes</span>
                                            </>
                                        )}
                                    </div>
                                </Button>
                            )}
                        </div>
                    </motion.div>

                    {/* Category Tabs */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        {categories.map(category => (
                            <button
                                key={category.id}
                                onClick={() => {
                                    setActiveCategory(category.id);
                                    setActiveSection(category.sections[0].id);
                                }}
                                className={`px-6 py-3 rounded-xl font-medium transition-all ${activeCategory === category.id
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50'
                                    }`}
                            >
                                <span className="mr-2">{category.icon}</span>
                                {category.label}
                            </button>
                        ))}
                    </div>

                    <div className="grid lg:grid-cols-4 gap-6">
                        {/* Sidebar - Sections */}
                        <motion.div
                            key={activeCategory}
                            variants={staggerContainer}
                            initial="initial"
                            animate="animate"
                            className="space-y-2"
                        >
                            {currentCategory?.sections.map((section) => (
                                <motion.button
                                    key={section.id}
                                    variants={staggerItem}
                                    onClick={() => setActiveSection(section.id)}
                                    className={`w-full text-left p-4 rounded-xl transition-all ${activeSection === section.id
                                        ? 'ring-2 ring-emerald-500 bg-emerald-500/10'
                                        : 'bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/50'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">
                                            {section.id.includes('home') ? '🏠' :
                                                section.id.includes('faq') ? '❓' :
                                                    section.id.includes('footer') ? '📝' : '📄'}
                                        </span>
                                        <div>
                                            <p className="font-medium text-white">{section.title}</p>
                                            <p className="text-xs text-zinc-500">
                                                {section.isSpecial ? 'Manager' : `${section.fields.length} fields`}
                                            </p>
                                        </div>
                                    </div>
                                </motion.button>
                            ))}
                        </motion.div>

                        {/* Content Editor / Managers */}
                        <div className="lg:col-span-3">
                            {activeCategory === 'faqs' ? (
                                <div className="space-y-6">
                                    <Card variant="glass">
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <h2 className="text-xl font-bold text-white">FAQ Manager</h2>
                                                <Button size="sm" onClick={() => {
                                                    setEditingFaq(null);
                                                    setFaqForm({ category: 'General', question: '', answer: '', display_order: faqs.length });
                                                    setPreviewMode(true); // Reuse previewMode as 'showForm'
                                                }}>Add New FAQ</Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            {previewMode && (
                                                <div className="mb-8 p-6 bg-zinc-800/50 border border-emerald-500/30 rounded-2xl space-y-4">
                                                    <h3 className="font-bold text-white">{editingFaq ? 'Edit FAQ' : 'New FAQ'}</h3>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">Category</label>
                                                            <input
                                                                className="w-full bg-black/40 border border-zinc-700 rounded-lg p-2 text-white"
                                                                value={faqForm.category}
                                                                onChange={e => setFaqForm({ ...faqForm, category: e.target.value })}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">Order</label>
                                                            <input
                                                                type="number"
                                                                className="w-full bg-black/40 border border-zinc-700 rounded-lg p-2 text-white"
                                                                value={faqForm.display_order}
                                                                onChange={e => setFaqForm({ ...faqForm, display_order: parseInt(e.target.value) })}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">Question</label>
                                                        <input
                                                            className="w-full bg-black/40 border border-zinc-700 rounded-lg p-2 text-white"
                                                            value={faqForm.question}
                                                            onChange={e => setFaqForm({ ...faqForm, question: e.target.value })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">Answer</label>
                                                        <textarea
                                                            className="w-full bg-black/40 border border-zinc-700 rounded-lg p-2 text-white h-24"
                                                            value={faqForm.answer}
                                                            onChange={e => setFaqForm({ ...faqForm, answer: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="outline" size="sm" onClick={() => setPreviewMode(false)}>Cancel</Button>
                                                        <Button size="sm" onClick={handleFaqSave}>Save FAQ</Button>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                {faqs.map(faq => (
                                                    <div key={faq.id} className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all">
                                                        <div>
                                                            <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full uppercase font-bold mr-3">{faq.category}</span>
                                                            <span className="text-white font-medium">{faq.question}</span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingFaq(faq);
                                                                    setFaqForm(faq);
                                                                    setPreviewMode(true);
                                                                }}
                                                                className="p-2 text-zinc-400 hover:text-white transition-colors"
                                                            >
                                                                ✏️
                                                            </button>
                                                            <button
                                                                onClick={() => handleFaqDelete(faq.id)}
                                                                className="p-2 text-zinc-400 hover:text-red-400 transition-colors"
                                                            >
                                                                🗑️
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            ) : currentSection && (
                                <Card variant="glass">
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h2 className="text-xl font-bold text-white">
                                                    {currentSection.title}
                                                </h2>
                                                <p className="text-sm text-zinc-500">
                                                    {currentSection.description}
                                                </p>
                                            </div>
                                            {currentSection.isLegal && (
                                                <button
                                                    onClick={() => setPreviewMode(!previewMode)}
                                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${previewMode
                                                        ? 'bg-emerald-500 text-white'
                                                        : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                                                        }`}
                                                >
                                                    {previewMode ? '📝 Edit' : '👁️ Preview'}
                                                </button>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-6">
                                            {currentSection.fields.map((field) => (
                                                <div key={field.name}>
                                                    <label className="block text-sm font-medium mb-2 text-zinc-300">
                                                        {field.label}
                                                    </label>

                                                    {field.type === 'richtext' ? (
                                                        previewMode ? (
                                                            <div
                                                                className="prose prose-invert max-w-none p-6 rounded-xl bg-zinc-800/50"
                                                                dangerouslySetInnerHTML={{
                                                                    __html: field.value
                                                                        .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-6 mb-4 text-white">$1</h1>')
                                                                        .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mt-5 mb-3 text-emerald-400">$1</h2>')
                                                                        .replace(/^### (.*$)/gm, '<h3 class="text-lg font-medium mt-4 mb-2 text-zinc-200">$1</h3>')
                                                                        .replace(/^- (.*$)/gm, '<li class="ml-4 text-zinc-300">$1</li>')
                                                                        .replace(/\n\n/g, '</p><p class="mb-4 text-zinc-400">')
                                                                }}
                                                            />
                                                        ) : (
                                                            <textarea
                                                                value={field.value}
                                                                onChange={(e) => handleFieldChange(currentSection.id, field.name, e.target.value)}
                                                                className="w-full px-4 py-3 rounded-xl font-mono text-sm bg-zinc-800/50 border border-zinc-700 text-zinc-200 focus:border-emerald-500 focus:outline-none resize-none min-h-[200px]"
                                                                placeholder="Enter content in Markdown format..."
                                                            />
                                                        )
                                                    ) : field.type === 'textarea' ? (
                                                        <textarea
                                                            value={field.value}
                                                            onChange={(e) => handleFieldChange(currentSection.id, field.name, e.target.value)}
                                                            className="w-full px-4 py-3 rounded-xl resize-none bg-zinc-800/50 border border-zinc-700 text-white focus:border-emerald-500 focus:outline-none min-h-[80px]"
                                                        />
                                                    ) : (
                                                        <input
                                                            type={field.type}
                                                            value={field.value}
                                                            onChange={(e) => handleFieldChange(currentSection.id, field.name, e.target.value)}
                                                            className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white focus:border-emerald-500 focus:outline-none"
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </PageTransition>
    );
}
