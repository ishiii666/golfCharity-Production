import { useState, useEffect } from 'react';
import { getSiteContent } from '../lib/supabaseRest';

/**
 * Hook to fetch and access site content from Supabase
 */
export function useSiteContent() {
    const [content, setContent] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchContent() {
            try {
                const data = await getSiteContent();
                const contentMap = {};
                data.forEach(item => {
                    const key = `${item.section_id}_${item.field_name}`;
                    contentMap[key] = item.field_value;
                });
                setContent(contentMap);
            } catch (error) {
                console.error('Error in useSiteContent:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchContent();
    }, []);

    const getContent = (sectionId, fieldName, defaultValue = '') => {
        return content[`${sectionId}_${fieldName}`] || defaultValue;
    };

    return { content, loading, getContent };
}
