import { useState, useEffect, useCallback } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { getActiveCharities } from '../lib/supabaseRest';
import { useAuth } from '../context/AuthContext';

/**
 * useCharities - Hook for fetching and managing charities
 */

// Mock charities for development
const MOCK_CHARITIES = [
    { id: '1', name: 'Beyond Blue', slug: 'beyond-blue', category: 'Mental Health', total_raised: 45230, supporter_count: 412, image: 'https://images.unsplash.com/photo-1527137342181-19aab11a8ee1?w=800' },
    { id: '2', name: 'Cancer Council', slug: 'cancer-council', category: 'Health Research', total_raised: 38750, supporter_count: 356, image: 'https://images.unsplash.com/photo-1579154235602-3c2c244b748b?w=800' },
    { id: '3', name: 'Salvation Army', slug: 'salvation-army', category: 'Community Support', total_raised: 52100, supporter_count: 489, image: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=800' },
    { id: '4', name: 'Red Cross Australia', slug: 'red-cross', category: 'Humanitarian', total_raised: 61200, supporter_count: 523, image: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800' }
];

export function useCharities() {
    const [charities, setCharities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchCharities = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getActiveCharities();
            setCharities(data || []);
        } catch (err) {
            console.error('Fetch charities error:', err);
            setError(err.message);
            // Fallback to MOCK only if everything fails and we're not configured
            if (!isSupabaseConfigured()) {
                setCharities(MOCK_CHARITIES);
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCharities();
    }, [fetchCharities]);

    const getCharityById = (id) => charities.find((c) => c.id === id);
    const featuredCharities = charities.filter((c) => c.is_featured);

    return {
        charities,
        featuredCharities,
        isLoading,
        error,
        getCharityById,
        refresh: fetchCharities
    };
}

/**
 * useDraws - Hook for fetching draw results
 */

const MOCK_DRAWS = [
    {
        id: '1',
        draw_date: '2026-01-01',
        status: 'published',
        winning_numbers: [12, 24, 31, 38, 42],
        prize_pool: 14235,
        jackpot_carryover: 5694
    }
];

export function useDraws() {
    const [draws, setDraws] = useState([]);
    const [latestDraw, setLatestDraw] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchDraws = useCallback(async () => {
        if (!isSupabaseConfigured()) {
            setDraws(MOCK_DRAWS);
            setLatestDraw(MOCK_DRAWS[0]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('draws')
                .select('*')
                .eq('status', 'published')
                .order('draw_date', { ascending: false })
                .limit(10);

            if (error) throw error;

            setDraws(data || []);
            setLatestDraw(data?.[0] || null);
        } catch (err) {
            console.error('Fetch draws error:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDraws();
    }, [fetchDraws]);

    return {
        draws,
        latestDraw,
        isLoading,
        error,
        refresh: fetchDraws
    };
}

/**
 * useUserEntries - Hook for fetching current user's draw entries and results
 */
export function useUserEntries() {
    const { user } = useAuth();
    const [entries, setEntries] = useState([]);
    const [latestResult, setLatestResult] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchEntries = useCallback(async () => {
        if (!user || !isSupabaseConfigured()) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('draw_entries')
                .select('*, draws(*), charities(*)')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setEntries(data || []);

            // Get the latest entry associated with a published draw
            const result = data?.find(e => e.draws && e.draws.status === 'published');
            setLatestResult(result || null);
        } catch (err) {
            console.error('Fetch user entries error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchEntries();
    }, [fetchEntries]);

    return {
        entries,
        latestResult,
        isLoading,
        refresh: fetchEntries
    };
}

