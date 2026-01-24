import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import PageTransition from '../components/layout/PageTransition';
import { getSiteContent } from '../lib/supabaseRest';

export default function Privacy() {
    const [content, setContent] = useState({
        title: 'Privacy Policy',
        lastUpdated: '',
        body: ''
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchContent();
    }, []);

    const fetchContent = async () => {
        try {
            const data = await getSiteContent();
            const privacyTitle = data.find(c => c.section_id === 'legal' && c.field_name === 'privacyTitle');
            const privacyDate = data.find(c => c.section_id === 'legal' && c.field_name === 'privacyLastUpdated');
            const privacyBody = data.find(c => c.section_id === 'legal' && c.field_name === 'privacyContent');

            setContent({
                title: privacyTitle?.field_value || 'Privacy Policy',
                lastUpdated: privacyDate?.field_value || '',
                body: privacyBody?.field_value || ''
            });
        } catch (error) {
            console.error('Error fetching privacy policy:', error);
        } finally {
            setLoading(false);
        }
    };

    // Simple markdown to HTML converter
    const renderMarkdown = (text) => {
        if (!text) return '';
        return text
            .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold mt-8 mb-4 text-white">$1</h1>')
            .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-semibold mt-6 mb-3 text-emerald-400">$1</h2>')
            .replace(/^### (.*$)/gm, '<h3 class="text-xl font-medium mt-5 mb-2 text-zinc-200">$1</h3>')
            .replace(/^- (.*$)/gm, '<li class="ml-6 mb-1 text-zinc-300 list-disc">$1</li>')
            .replace(/\n\n/g, '</p><p class="mb-4 text-zinc-400 leading-relaxed">');
    };

    if (loading) {
        return (
            <PageTransition>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                </div>
            </PageTransition>
        );
    }

    return (
        <PageTransition>
            <div className="min-h-screen py-16 lg:py-24">
                <div className="container-app max-w-4xl">
                    {/* Breadcrumb */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <Link to="/" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                            ← Back to Home
                        </Link>
                    </motion.div>

                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mb-12"
                    >
                        <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
                            {content.title}
                        </h1>
                        {content.lastUpdated && (
                            <p className="text-zinc-500">
                                Last updated: {new Date(content.lastUpdated).toLocaleDateString('en-AU', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                        )}
                    </motion.div>

                    {/* Content */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-zinc-900/50 rounded-2xl p-8 lg:p-12 border border-zinc-800"
                    >
                        <div
                            className="prose prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(content.body) }}
                        />
                    </motion.div>

                </div>
            </div>
        </PageTransition>
    );
}
