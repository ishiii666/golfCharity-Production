import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

/**
 * useScores - Hook for managing user golf scores
 * 
 * Features:
 * - Fetch user's scores (latest 5)
 * - Add new score
 * - Delete score
 * - Real-time updates (optional)
 */

export function useScores() {
    const { user, isAuthenticated } = useAuth();
    const [scores, setScores] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch scores from database
    const fetchScores = useCallback(async () => {
        // If not authenticated or no Supabase, show empty state
        if (!isAuthenticated || !user?.id) {
            setScores([]);
            setIsLoading(false);
            return;
        }

        if (!isSupabaseConfigured()) {
            console.warn('Supabase not configured');
            setScores([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            console.log('📊 Fetching scores for user:', user.id);

            const { data, error } = await supabase
                .from('scores')
                .select('*')
                .eq('user_id', user.id)
                .order('played_date', { ascending: false })
                .limit(5);

            if (error) throw error;

            console.log('📊 Scores fetched:', data?.length || 0);
            setScores(data || []);
        } catch (err) {
            console.error('Fetch scores error:', err);
            setError(err.message);
            // Show empty state on error, not mock data
            setScores([]);
        } finally {
            setIsLoading(false);
        }
    }, [user?.id, isAuthenticated]);


    // Add new score
    const addScore = async (scoreData) => {
        if (!isAuthenticated) {
            return { success: false, error: 'Not authenticated' };
        }

        if (!isSupabaseConfigured()) {
            // Mock mode - add to local state
            const newScore = {
                id: Date.now().toString(),
                ...scoreData,
                user_id: user.id
            };
            setScores((prev) => [newScore, ...prev].slice(0, 5));
            return { success: true, data: newScore };
        }

        try {
            // First, check how many scores the user has
            const { data: existingScores, error: countError } = await supabase
                .from('scores')
                .select('id, played_date')
                .eq('user_id', user.id)
                .order('played_date', { ascending: true });

            if (countError) throw countError;

            // If user already has 5 or more scores, delete the oldest one
            if (existingScores && existingScores.length >= 5) {
                const oldestScore = existingScores[0]; // Already sorted ascending, so first is oldest
                console.log('📊 Deleting oldest score to maintain 5-score limit:', oldestScore.id);

                const { error: deleteError } = await supabase
                    .from('scores')
                    .delete()
                    .eq('id', oldestScore.id)
                    .eq('user_id', user.id);

                if (deleteError) {
                    console.error('Error deleting oldest score:', deleteError);
                    // Continue anyway - we'll just have 6 temporarily
                }
            }

            // Now insert the new score
            const { data, error } = await supabase
                .from('scores')
                .insert({
                    user_id: user.id,
                    score: scoreData.score,
                    played_date: scoreData.played_date,
                    course_name: scoreData.course_name || null
                })
                .select()
                .single();

            if (error) throw error;

            // Refresh scores to get latest 5
            await fetchScores();

            return { success: true, data };
        } catch (err) {
            console.error('Add score error:', err);
            return { success: false, error: err.message };
        }
    };

    // Delete score
    const deleteScore = async (scoreId) => {
        if (!isAuthenticated) {
            return { success: false, error: 'Not authenticated' };
        }

        if (!isSupabaseConfigured()) {
            // Mock mode
            setScores((prev) => prev.filter((s) => s.id !== scoreId));
            return { success: true };
        }

        try {
            const { error } = await supabase
                .from('scores')
                .delete()
                .eq('id', scoreId)
                .eq('user_id', user.id);

            if (error) throw error;

            // Refresh scores
            await fetchScores();

            return { success: true };
        } catch (err) {
            console.error('Delete score error:', err);
            return { success: false, error: err.message };
        }
    };

    // Initial fetch
    useEffect(() => {
        fetchScores();
    }, [fetchScores]);

    // Derived state
    const scoreValues = scores.map((s) => s.score);
    const hasEnoughScores = scores.length >= 5;
    const averageScore = scores.length > 0
        ? Math.round(scores.reduce((acc, s) => acc + s.score, 0) / scores.length)
        : 0;

    return {
        scores,
        scoreValues,
        isLoading,
        error,
        hasEnoughScores,
        averageScore,
        addScore,
        deleteScore,
        refresh: fetchScores
    };
}

export default useScores;
