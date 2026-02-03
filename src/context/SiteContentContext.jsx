import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSiteContent } from '../lib/supabaseRest';

const SiteContentContext = createContext(null);

/**
 * SiteContentProvider - Global cache for CMS content
 * Prevents redundant fetch calls across different pages/components
 */
export function SiteContentProvider({ children }) {
    const [content, setContent] = useState({});
    const [loading, setLoading] = useState(true);
    const [lastFetched, setLastFetched] = useState(0);

    const fetchContent = useCallback(async (force = false) => {
        // Cache for 5 minutes unless forced
        const now = Date.now();
        if (!force && now - lastFetched < 5 * 60 * 1000 && Object.keys(content).length > 0) {
            return;
        }

        try {
            console.log('🌐 SiteContent: Fetching fresh content...');
            const data = await getSiteContent();
            const contentMap = {};

            data.forEach(item => {
                const key = `${item.section_id}_${item.field_name}`;
                let value = item.field_value || '';

                // AUTO-FIX: Ensure "9th" is transformed to "1st" globally for consistency
                if (typeof value === 'string' && value.includes('9th')) {
                    value = value.replace(/9th/g, '1st');
                }

                contentMap[key] = value;
            });

            setContent(contentMap);
            setLastFetched(now);
        } catch (error) {
            console.error('Error fetching site content global:', error);
        } finally {
            setLoading(false);
        }
    }, [content, lastFetched]);

    // Initial fetch
    useEffect(() => {
        fetchContent();
    }, [fetchContent]);

    const getContent = useCallback((sectionId, fieldName, defaultValue = '') => {
        return content[`${sectionId}_${fieldName}`] || defaultValue;
    }, [content]);

    const value = {
        content,
        loading,
        getContent,
        refreshContent: () => fetchContent(true)
    };

    return (
        <SiteContentContext.Provider value={value}>
            {children}
        </SiteContentContext.Provider>
    );
}

export function useSiteContent() {
    const context = useContext(SiteContentContext);
    if (!context) {
        throw new Error('useSiteContent must be used within a SiteContentProvider');
    }
    return context;
}

export default SiteContentContext;
