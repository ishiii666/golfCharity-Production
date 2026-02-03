import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import PageTransition from '../components/layout/PageTransition';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { submitContactInquiry, getSiteContent } from '../lib/supabaseRest';
import { useToast } from '../components/ui/Toast';

/**
 * Contact Page - Get in touch with GolfCharity
 */
export default function Contact() {
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [contactData, setContactData] = useState({
        email: 'support@golfcharity.com.au',
        phone: '+61 3 9876 5432',
        address: '123 Collins Street, Melbourne VIC 3000',
        hours_mon_fri: '9:00 AM - 6:00 PM AEST',
        hours_sat: '10:00 AM - 4:00 PM AEST',
        hours_sun: 'Closed',
        facebook_url: 'https://facebook.com',
        twitter_url: 'https://x.com',
        instagram_url: 'https://instagram.com',
        linkedin_url: 'https://linkedin.com'
    });

    useEffect(() => {
        const fetchContactInfo = async () => {
            try {
                const content = await getSiteContent();
                const contactFields = content.filter(c => c.section_id === 'contact');
                if (contactFields.length > 0) {
                    setContactData(prev => {
                        const next = { ...prev };
                        contactFields.forEach(f => {
                            if (f.field_value) {
                                next[f.field_name] = f.field_value;
                            }
                        });
                        return next;
                    });
                }
            } catch (error) {
                console.error('Error fetching contact info:', error);
            }
        };
        fetchContactInfo();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            await submitContactInquiry({
                name: formData.name,
                email: formData.email,
                subject: formData.subject,
                message: formData.message
            });

            setIsSubmitting(false);
            setSubmitted(true);
            setFormData({ name: '', email: '', subject: '', message: '' });
            addToast('success', 'Thank you! Your message has been sent.');
        } catch (error) {
            console.error('Error submitting inquiry:', error);
            setIsSubmitting(false);
            addToast('error', 'Failed to send message. Please try again or call us.');
        }
    };

    const contactInfo = [
        {
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
            ),
            label: 'Email',
            value: contactData.email,
            href: `mailto:${contactData.email}`
        },
        {
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
            ),
            label: 'Phone',
            value: contactData.phone,
            href: `tel:${contactData.phone.replace(/\s+/g, '')}`
        },
        {
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
            label: 'Office',
            value: contactData.address,
            href: `https://maps.google.com/?q=${encodeURIComponent(contactData.address)}`
        }
    ];

    const socialLinks = [
        { name: 'Facebook', href: contactData.facebook_url, icon: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
        { name: 'X', href: contactData.twitter_url, icon: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
        { name: 'Instagram', href: contactData.instagram_url, icon: 'M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z' },
        { name: 'LinkedIn', href: contactData.linkedin_url, icon: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' }
    ];

    return (
        <PageTransition>
            <div className="pt-24 pb-16 lg:py-20">
                <div className="container-app">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
                            style={{
                                background: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid rgba(16, 185, 129, 0.2)'
                            }}
                        >
                            <span className="text-emerald-400 text-sm font-medium">Get In Touch</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-4xl lg:text-5xl font-bold mb-4"
                            style={{ color: 'var(--color-cream-100)' }}
                        >
                            Contact{' '}
                            <span style={{ color: '#10b981' }}>Us</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-lg max-w-2xl mx-auto"
                            style={{ color: 'var(--color-neutral-400)' }}
                        >
                            Have a question or feedback? We'd love to hear from you.
                        </motion.p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
                        {/* Contact Form */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="p-8 rounded-2xl"
                            style={{
                                background: 'rgba(255, 255, 255, 0.02)',
                                border: '1px solid rgba(255, 255, 255, 0.05)'
                            }}
                        >
                            {submitted ? (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Message Sent!</h3>
                                    <p className="text-zinc-400 mb-6">
                                        Thank you for reaching out. We'll get back to you within 24-48 hours.
                                    </p>
                                    <Button variant="outline" onClick={() => setSubmitted(false)}>
                                        Send Another Message
                                    </Button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <h2 className="text-xl font-bold text-white mb-6">Send us a Message</h2>

                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-300 mb-2">Name</label>
                                            <Input
                                                type="text"
                                                placeholder="Your name"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-300 mb-2">Email</label>
                                            <Input
                                                type="email"
                                                placeholder="your@email.com"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-zinc-300 mb-2">Subject</label>
                                        <Input
                                            type="text"
                                            placeholder="How can we help?"
                                            value={formData.subject}
                                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-zinc-300 mb-2">Message</label>
                                        <textarea
                                            className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none resize-none"
                                            rows={5}
                                            placeholder="Tell us more about your inquiry..."
                                            value={formData.message}
                                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        variant="primary"
                                        fullWidth
                                        loading={isSubmitting}
                                    >
                                        {isSubmitting ? 'Sending...' : 'Send Message'}
                                    </Button>
                                </form>
                            )}
                        </motion.div>

                        {/* Contact Info */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                            className="space-y-8"
                        >
                            {/* Contact Details */}
                            <div className="space-y-4">
                                <h2 className="text-xl font-bold text-white mb-6">Contact Information</h2>

                                {contactInfo.map((info, index) => (
                                    <a
                                        key={index}
                                        href={info.href}
                                        target={info.href.startsWith('http') ? '_blank' : undefined}
                                        rel={info.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                                        className="flex items-start gap-4 p-4 rounded-xl transition-colors hover:bg-white/5"
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.02)',
                                            border: '1px solid rgba(255, 255, 255, 0.05)'
                                        }}
                                    >
                                        <div
                                            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                                            style={{
                                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.1) 100%)',
                                                color: '#10b981'
                                            }}
                                        >
                                            {info.icon}
                                        </div>
                                        <div>
                                            <div className="text-sm text-zinc-400 mb-1">{info.label}</div>
                                            <div className="text-white font-medium">{info.value}</div>
                                        </div>
                                    </a>
                                ))}
                            </div>

                            {/* Business Hours */}
                            <div
                                className="p-6 rounded-xl"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    border: '1px solid rgba(255, 255, 255, 0.05)'
                                }}
                            >
                                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Business Hours
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-zinc-400">Monday - Friday</span>
                                        <span className="text-white">{contactData.hours_mon_fri}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-zinc-400">Saturday</span>
                                        <span className="text-white">{contactData.hours_sat}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-zinc-400">Sunday</span>
                                        <span className={contactData.hours_sun === 'Closed' ? 'text-zinc-500' : 'text-white'}>
                                            {contactData.hours_sun}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Social Links */}
                            <div>
                                <h3 className="font-bold text-white mb-4">Follow Us</h3>
                                <div className="flex gap-3">
                                    {socialLinks.map((social, index) => (
                                        <a
                                            key={index}
                                            href={social.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)'
                                            }}
                                            title={social.name}
                                        >
                                            <svg className="w-5 h-5 text-zinc-400 hover:text-white" viewBox="0 0 24 24" fill="currentColor">
                                                <path d={social.icon} />
                                            </svg>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Response Time Info */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="mt-16 text-center p-6 rounded-xl max-w-2xl mx-auto"
                        style={{
                            background: 'rgba(16, 185, 129, 0.05)',
                            border: '1px solid rgba(16, 185, 129, 0.1)'
                        }}
                    >
                        <p className="text-zinc-400">
                            <span className="text-emerald-400 font-medium">Average response time:</span>{' '}
                            We typically respond within 24-48 business hours. For urgent matters, please call us directly.
                        </p>
                    </motion.div>
                </div>
            </div>
        </PageTransition>
    );
}
