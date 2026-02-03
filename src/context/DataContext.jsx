import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getActiveCharities, getFaqs } from '../lib/supabaseRest';

const DataContext = createContext(null);

/**
 * DataProvider - Global cache for common application data
 * Caches charities, FAQs, etc. to prevent loading spinners on every navigation
 */
export function DataProvider({ children }) {
    const [charities, setCharities] = useState([]);
    const [charitiesLoading, setCharitiesLoading] = useState(true);
    const [faqs, setFaqs] = useState([]);
    const [faqsLoading, setFaqsLoading] = useState(true);

    const fetchCharities = useCallback(async (force = false) => {
        if (!force && charities.length > 0) return;
        try {
            const data = await getActiveCharities();
            setCharities(data || []);
        } catch (error) {
            console.error('Error fetching global charities:', error);
        } finally {
            setCharitiesLoading(false);
        }
    }, [charities]);

    const fetchFaqs = useCallback(async (force = false) => {
        if (!force && faqs.length > 0) return;
        try {
            const data = await getFaqs();
            setFaqs(data || []);
        } catch (error) {
            console.error('Error fetching global FAQs:', error);
        } finally {
            setFaqsLoading(false);
        }
    }, [faqs]);

    // Initial pre-fetch
    useEffect(() => {
        fetchCharities();
        fetchFaqs();
    }, []);

    const value = {
        charities,
        charitiesLoading,
        refreshCharities: () => fetchCharities(true),
        faqs,
        faqsLoading,
        refreshFaqs: () => fetchFaqs(true)
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
}

export function useGlobalData() {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useGlobalData must be used within a DataProvider');
    }
    return context;
}
