import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PageTransition from '../../components/layout/PageTransition';
import Card, { CardContent, CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import BackButton from '../../components/ui/BackButton';
import { useToast } from '../../components/ui/Toast';
import { fadeUp, staggerContainer, staggerItem } from '../../utils/animations';
import { getSiteContent, saveSiteContentBulk } from '../../lib/supabaseRest';

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
                description: 'Main hero with rotating headlines',
                fields: [
                    { name: 'badgeText', label: 'Badge Text (top indicator)', type: 'text', value: '' },
                    { name: 'headline1Top', label: 'Headline 1 - Line 1', type: 'text', value: '' },
                    { name: 'headline1Middle', label: 'Headline 1 - Line 2', type: 'text', value: '' },
                    { name: 'headline1Accent', label: 'Headline 1 - Accent (green)', type: 'text', value: '' },
                    { name: 'headline2Top', label: 'Headline 2 - Line 1', type: 'text', value: '' },
                    { name: 'headline2Middle', label: 'Headline 2 - Line 2', type: 'text', value: '' },
                    { name: 'headline2Accent', label: 'Headline 2 - Accent (green)', type: 'text', value: '' },
                    { name: 'headline3Top', label: 'Headline 3 - Line 1', type: 'text', value: '' },
                    { name: 'headline3Middle', label: 'Headline 3 - Line 2', type: 'text', value: '' },
                    { name: 'headline3Accent', label: 'Headline 3 - Accent (green)', type: 'text', value: '' },
                    { name: 'headline4Top', label: 'Headline 4 - Line 1', type: 'text', value: '' },
                    { name: 'headline4Middle', label: 'Headline 4 - Line 2', type: 'text', value: '' },
                    { name: 'headline4Accent', label: 'Headline 4 - Accent (green)', type: 'text', value: '' },
                    { name: 'subtext', label: 'Subtext (below headlines)', type: 'textarea', value: '' }
                ]
            },
            {
                id: 'stats',
                title: 'Impact Statistics',
                description: 'Numbers displayed on homepage',
                fields: [
                    { name: 'totalRaised', label: 'Total Raised ($)', type: 'number', value: '' },
                    { name: 'activeGolfers', label: 'Active Golfers', type: 'number', value: '' },
                    { name: 'charities', label: 'Partner Charities', type: 'number', value: '' }
                ]
            },
            {
                id: 'howItWorks',
                title: 'How It Works',
                description: 'Step-by-step process',
                fields: [
                    { name: 'step1Title', label: 'Step 1 Title', type: 'text', value: '' },
                    { name: 'step1Desc', label: 'Step 1 Description', type: 'textarea', value: '' },
                    { name: 'step2Title', label: 'Step 2 Title', type: 'text', value: '' },
                    { name: 'step2Desc', label: 'Step 2 Description', type: 'textarea', value: '' },
                    { name: 'step3Title', label: 'Step 3 Title', type: 'text', value: '' },
                    { name: 'step3Desc', label: 'Step 3 Description', type: 'textarea', value: '' }
                ]
            },
            {
                id: 'footer',
                title: 'Footer Content',
                description: 'Footer text and tagline',
                fields: [
                    { name: 'copyright', label: 'Copyright Text', type: 'text', value: '' },
                    { name: 'tagline', label: 'Tagline', type: 'text', value: '' }
                ]
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
            // Compare as strings to avoid type issues (number vs string from input)
            if (String(currentValues[key] || '') !== String(originalValues[key] || '')) {
                changed = true;
                break;
            }
        }
        setHasUnsavedChanges(changed);
    }, [categories, originalValues]);

    // Fetch content from database on mount
    useEffect(() => {
        fetchContent();
    }, []);

    const fetchContent = async () => {
        try {
            setLoading(true);
            const dbContent = await getSiteContent();

            if (dbContent.length > 0) {
                // Merge database values into structure
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

                // Store flat values for comparison
                const values = {};
                dbContent.forEach(item => {
                    values[`${item.section_id}_${item.field_name}`] = item.field_value || '';
                });
                setOriginalValues(values);
            }
            console.log('📝 Content loaded from database');
        } catch (error) {
            console.error('Error fetching content:', error);
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

            // Update original values to current state after successful save
            const newOriginals = {};
            items.forEach(item => {
                newOriginals[`${item.section_id}_${item.field_name}`] = item.field_value;
            });
            setOriginalValues(newOriginals);

            addToast('success', 'All content saved successfully!');
        } catch (error) {
            console.error('Error saving content:', error);
            addToast('error', 'Failed to save content');
        } finally {
            setIsSaving(false);
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
                                Edit website content, legal pages, and more
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
                                            <span className="font-bold tracking-tight">Save All Changes</span>
                                        </>
                                    )}
                                </div>
                                {hasUnsavedChanges && (
                                    <motion.div
                                        layoutId="glow"
                                        className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                    />
                                )}
                            </Button>
                        </div>
                    </motion.div>

                    {/* Category Tabs */}
                    <div className="flex gap-2 mb-6">
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
                            {currentCategory?.sections.map((section, index) => (
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
                                            {section.id === 'terms' ? '📜' :
                                                section.id === 'privacy' ? '🔒' :
                                                    section.id === 'hero' ? '🏠' :
                                                        section.id === 'stats' ? '📊' :
                                                            section.id === 'howItWorks' ? '📖' :
                                                                section.id === 'footer' ? '📝' : '📄'}
                                        </span>
                                        <div>
                                            <p className="font-medium text-white">{section.title}</p>
                                            <p className="text-xs text-zinc-500">{section.fields.length} fields</p>
                                        </div>
                                    </div>
                                </motion.button>
                            ))}
                        </motion.div>

                        {/* Content Editor */}
                        <div className="lg:col-span-3">
                            {currentSection && (
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

                                                    {/* Rich text / Legal content */}
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
                                                                onInput={(e) => {
                                                                    e.target.style.height = 'auto';
                                                                    e.target.style.height = e.target.scrollHeight + 'px';
                                                                }}
                                                                ref={(el) => {
                                                                    if (el) {
                                                                        el.style.height = 'auto';
                                                                        el.style.height = el.scrollHeight + 'px';
                                                                    }
                                                                }}
                                                                className="w-full px-4 py-3 rounded-xl font-mono text-sm bg-zinc-800/50 border border-zinc-700 text-zinc-200 focus:border-emerald-500 focus:outline-none resize-none"
                                                                style={{ minHeight: '200px' }}
                                                                placeholder="Enter content in Markdown format..."
                                                            />
                                                        )
                                                    ) : field.type === 'textarea' ? (
                                                        <textarea
                                                            value={field.value}
                                                            onChange={(e) => handleFieldChange(currentSection.id, field.name, e.target.value)}
                                                            onInput={(e) => {
                                                                e.target.style.height = 'auto';
                                                                e.target.style.height = e.target.scrollHeight + 'px';
                                                            }}
                                                            ref={(el) => {
                                                                if (el) {
                                                                    el.style.height = 'auto';
                                                                    el.style.height = el.scrollHeight + 'px';
                                                                }
                                                            }}
                                                            className="w-full px-4 py-3 rounded-xl resize-none bg-zinc-800/50 border border-zinc-700 text-white focus:border-emerald-500 focus:outline-none"
                                                            style={{ minHeight: '80px' }}
                                                        />
                                                    ) : field.type === 'date' ? (
                                                        <input
                                                            type="date"
                                                            value={field.value}
                                                            onChange={(e) => handleFieldChange(currentSection.id, field.name, e.target.value)}
                                                            className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white focus:border-emerald-500 focus:outline-none"
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
