import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

/**
 * useCharities - Hook for fetching and managing charities
 */

// Mock charities for development
const MOCK_CHARITIES = [
    { id: '1', name: 'Beyond Blue', slug: 'beyond-blue', category: 'Mental Health', total_raised: 45230, supporter_count: 412 },
    { id: '2', name: 'Cancer Council', slug: 'cancer-council', category: 'Health Research', total_raised: 38750, supporter_count: 356 },
    { id: '3', name: 'Salvation Army', slug: 'salvation-army', category: 'Community Support', total_raised: 52100, supporter_count: 489 },
    { id: '4', name: 'Red Cross Australia', slug: 'red-cross', category: 'Humanitarian', total_raised: 61200, supporter_count: 523 }
];

export function useCharities() {
    const [charities, setCharities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchCharities = useCallback(async () => {
        if (!isSupabaseConfigured()) {
            setCharities(MOCK_CHARITIES);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('charities')
                .select('*')
                .eq('status', 'active')
                .order('name');

            if (error) throw error;
            setCharities(data || []);
        } catch (err) {
            console.error('Fetch charities error:', err);
            setError(err.message);
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

