import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { cancelSubscription } from '../lib/stripe';

/**
 * AuthContext - Supabase-powered authentication
 * 
 * Features:
 * - Email/password authentication
 * - Session persistence across page refreshes
 * - Role-based access (user/admin)
 * - Falls back to mock mode if Supabase not configured
 */

const AuthContext = createContext(null);

// Mock user for development without Supabase
const MOCK_USER = {
    id: 'mock-user-id',
    email: 'demo@golfcharity.com.au',
    fullName: 'Demo Golfer',
    role: 'user',
    selectedCharityId: '1',
    donationPercentage: 20,
    scores: [
        { id: 1, score: 32, played_date: '2025-12-15', course_name: 'Royal Melbourne' },
        { id: 2, score: 28, played_date: '2025-12-22', course_name: 'Kingston Heath' },
        { id: 3, score: 35, played_date: '2025-12-29', course_name: 'Victoria Golf Club' },
        { id: 4, score: 31, played_date: '2026-01-05', course_name: 'Metropolitan GC' },
        { id: 5, score: 29, played_date: '2026-01-08', course_name: 'Huntingdale' }
    ],
    subscription: {
        status: 'active',
        plan: 'annual',
        currentPeriodEnd: '2026-12-15'
    }
};

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [subscription, setSubscription] = useState(null);
    const [session, setSession] = useState(null); // Cache session for API calls
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Check for existing session on mount
    useEffect(() => {
        if (!isSupabaseConfigured()) {
            // Mock mode - no Supabase configured
            console.log('🔧 Running in mock mode (Supabase not configured)');
            setIsLoading(false);
            return;
        }

        // Set a longer timeout to prevent false logout - Supabase can be slow
        const timeoutId = setTimeout(() => {
            console.warn('⚠️ Auth session timeout - forcing load completion (session may still be loading)');
            setIsLoading(false);
        }, 8000); // 8 seconds - give Supabase time to respond

        // Get initial session - no racing, just wait for it
        const initSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) throw error;

                clearTimeout(timeoutId);

                if (session?.user) {
                    console.log('✅ Session found:', session.user.email);
                    setUser(session.user);
                    setSession(session); // Cache the session
                    setIsLoading(false);

                    // Fetch profile in background (non-blocking) - pass token directly
                    fetchProfile(session.user.id, session.user.email, session.access_token).catch(err => {
                        console.warn('Profile fetch failed (non-blocking):', err.message);
                    });

                    // Fetch subscription status
                    fetchSubscription(session.user.id, session.access_token).catch(err => {
                        console.warn('Subscription fetch failed (non-blocking):', err.message);
                    });
                } else {
                    console.log('ℹ️ No active session');
                    setIsLoading(false);
                }
            } catch (err) {
                console.error('Session init error:', err);
                // Don't display abort/timeout errors to users - these are not actionable
                const isNonCriticalError = err.message?.includes('abort') ||
                    err.message?.includes('timeout') ||
                    err.name === 'AbortError';
                if (!isNonCriticalError) {
                    setError(err.message);
                }
                clearTimeout(timeoutId);
                setIsLoading(false);
            }
        };

        initSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('Auth event:', event);

                if (session?.user) {
                    setUser(session.user);
                    setSession(session); // Cache the session
                    try {
                        await fetchProfile(session.user.id, session.user.email, session.access_token);
                        await fetchSubscription(session.user.id, session.access_token);
                    } catch (e) {
                        console.warn('Profile/subscription fetch on auth change failed:', e);
                    }
                } else {
                    setUser(null);
                    setProfile(null);
                    setSubscription(null);
                }
                setIsLoading(false);
            }
        );

        return () => {
            clearTimeout(timeoutId);
            subscription.unsubscribe();
        };
    }, []);

    // Fetch user profile - accepts accessToken as param to avoid getSession() hang
    const fetchProfile = async (userId, userEmail = null, accessToken = null) => {
        try {
            console.log('🔍 Fetching profile for user ID:', userId);

            // Use passed token, or session state
            let token = accessToken || session?.access_token;

            if (!token) {
                console.warn('⚠️ No access token available for fetchProfile');
                return;
            }

            console.log('🔍 Using access token:', token ? 'YES' : 'NO');

            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const headers = {
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${token}`,
                'Prefer': 'return=representation'
            };

            // 1. Try fetching by ID
            let url = `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=*`;
            console.log('🔍 Fetch URL (ID):', url);

            let response = await fetch(url, { headers });
            let data = await response.json();

            console.log('🔍 Fetch response:', data);

            // 2. If no data, try by email
            if ((!data || data.length === 0) && userEmail) {
                console.log('🔍 ID query returned no data, trying by email:', userEmail);
                url = `${supabaseUrl}/rest/v1/profiles?email=eq.${userEmail}&select=*`;
                response = await fetch(url, { headers });
                data = await response.json();
            }

            if (data && data.length > 0) {
                console.log('✅ Profile fetched (fresh):', data[0]);
                console.log('✅ Phone in DB:', data[0]?.phone);
                setProfile(data[0]);
            } else {
                console.warn('⚠️ No profile found for user');
            }
        } catch (err) {
            console.error('❌ Profile fetch error:', err);
        }
    };

    // Fetch user subscription status from database WITH SELF-HEALING
    const fetchSubscription = async (userId, accessToken = null) => {
        try {
            console.log('[SUBSCRIPTION] Step 1: Fetching from database for user:', userId);

            const token = accessToken || session?.access_token;
            if (!token) {
                console.warn('[SUBSCRIPTION] No access token for subscription fetch');
                return;
            }

            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const url = `${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${userId}&select=*&order=created_at.desc&limit=1`;

            const response = await fetch(url, {
                headers: {
                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data && data.length > 0) {
                console.log('[SUBSCRIPTION] ✅ Found in database:', data[0].status, data[0].plan);
                setSubscription(data[0]);
            } else {
                // No subscription in DB - try self-healing
                console.log('[SUBSCRIPTION] Step 2: No DB record, checking profile for stripe_customer_id...');

                // Check if user has stripe_customer_id in profile
                const profileUrl = `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=stripe_customer_id`;
                const profileRes = await fetch(profileUrl, {
                    headers: {
                        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${token}`
                    }
                });
                const profileData = await profileRes.json();

                if (profileData?.[0]?.stripe_customer_id) {
                    // User has stripe_customer_id but no subscription - SYNC FROM STRIPE!
                    console.log('[SUBSCRIPTION] 🔄 SELF-HEALING: User has stripe_customer_id but no subscription record');
                    console.log('[SUBSCRIPTION] Calling verify-subscription to sync from Stripe...');

                    try {
                        const verifyRes = await fetch(
                            `${supabaseUrl}/functions/v1/verify-subscription`,
                            {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ user_id: userId })
                            }
                        );

                        console.log('[SUBSCRIPTION] Verify response status:', verifyRes.status);

                        // Check if response is OK before parsing
                        if (!verifyRes.ok) {
                            const errorText = await verifyRes.text();
                            console.error('[SUBSCRIPTION] Verify failed:', verifyRes.status, errorText.substring(0, 200));
                            throw new Error(`HTTP ${verifyRes.status}`);
                        }

                        const verifyData = await verifyRes.json();
                        console.log('[SUBSCRIPTION] Verify result:', verifyData);

                        if (verifyData.subscription) {
                            console.log('[SUBSCRIPTION] ✅ Synced from Stripe:', verifyData.subscription.status, verifyData.subscription.plan);
                            setSubscription(verifyData.subscription);
                            return;
                        }
                    } catch (verifyErr) {
                        console.error('[SUBSCRIPTION] Verify error:', verifyErr.message || verifyErr);
                    }
                }

                // No subscription found
                console.log('[SUBSCRIPTION] User has no subscription');
                setSubscription(null);
            }
        } catch (err) {
            console.error('[SUBSCRIPTION] Fetch error:', err);
            setSubscription(null);
        }
    };

    // Sign up with email/password
    const signup = async (email, password, fullName) => {
        if (!isSupabaseConfigured()) {
            // Mock signup
            setUser({ ...MOCK_USER, email, fullName });
            setProfile({ ...MOCK_USER, email, full_name: fullName });
            return { success: true };
        }

        setIsLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: fullName }
                }
            });

            if (error) throw error;

            return { success: true, data };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setIsLoading(false);
        }
    };

    // Sign in with email/password
    const login = async (email, password) => {
        if (!isSupabaseConfigured()) {
            // Mock login
            setUser({ ...MOCK_USER, email });
            setProfile({ ...MOCK_USER, email });
            return { success: true };
        }

        setIsLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            return { success: true, data };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setIsLoading(false);
        }
    };

    // Sign out
    const logout = async () => {
        // Always clear local state first
        setUser(null);
        setProfile(null);

        if (!isSupabaseConfigured()) {
            return;
        }

        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.error('Logout error:', err);
            // State is already cleared, so user is logged out locally
        }
    };

    // Update profile - Using direct fetch to bypass Supabase client hanging issue
    const updateProfile = async (updates) => {
        console.log('========== UPDATE PROFILE START ==========');
        console.log('📝 1. Updates received:', updates);

        if (!isSupabaseConfigured()) {
            console.log('📝 Mock mode - updating local state only');
            setProfile((prev) => ({ ...prev, ...updates }));
            return { success: true };
        }

        // Use profile.id first (more reliable), fallback to user.id
        const profileId = profile?.id || user?.id;

        if (!profileId) {
            console.error('❌ No profile/user ID available!');
            return { success: false, error: 'No profile ID available' };
        }

        const updateData = {
            ...updates,
            updated_at: new Date().toISOString()
        };

        console.log('📝 2. Update data:', updateData);
        console.log('📝 3. Profile ID (for update):', profileId);
        console.log('📝 4. Profile object:', profile);

        try {
            // Use cached session from state
            console.log('📝 5. Using cached session:', !!session);

            if (!session?.access_token) {
                throw new Error('No valid session - please log in again');
            }

            // Use direct fetch to Supabase REST API
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const url = `${supabaseUrl}/rest/v1/profiles?id=eq.${profileId}`;

            console.log('📝 6. Fetch URL:', url);
            console.log('📝 7. Starting fetch...');

            // Use return=representation to get the updated row back (verifies it worked)
            const response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${session.access_token}`,
                    'Prefer': 'return=representation'  // Return updated rows to verify
                },
                body: JSON.stringify(updateData)
            });

            console.log('📝 8. Fetch response status:', response.status);
            console.log('📝 9. Fetch response ok:', response.ok);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Fetch error:', errorText);
                throw new Error(`Update failed: ${response.status} - ${errorText}`);
            }

            // Parse the response to verify rows were updated
            const updatedRows = await response.json();
            console.log('📝 10. Updated rows:', updatedRows);

            if (!updatedRows || updatedRows.length === 0) {
                console.error('❌ No rows were updated! Profile ID may not exist in database.');
                throw new Error('No profile found to update. Please contact support.');
            }

            // Update local state with the returned data
            console.log('📝 11. Updating local profile state...');
            setProfile(updatedRows[0]);

            console.log('✅ Profile update successful!');
            console.log('========== UPDATE PROFILE END ==========');
            return { success: true };

        } catch (err) {
            console.error('❌ Exception caught:', err);
            console.log('========== UPDATE PROFILE END (ERROR) ==========');
            return { success: false, error: err?.message || 'Update failed' };
        }
    };

    // Check if user is admin - check multiple sources (app_metadata doesn't require RLS)
    // Priority: 1) app_metadata.role, 2) user_metadata.role, 3) profile.role
    const isAdmin = user?.app_metadata?.role === 'admin' ||
        user?.user_metadata?.role === 'admin' ||
        profile?.role === 'admin';

    // Debug logging
    console.log('🔐 Admin check:', {
        'app_metadata.role': user?.app_metadata?.role,
        'user_metadata.role': user?.user_metadata?.role,
        'profile.role': profile?.role,
        'isAdmin': isAdmin
    });

    // Change password function
    const changePassword = async (currentPassword, newPassword) => {
        if (!isSupabaseConfigured()) {
            return { success: false, error: 'Not available in demo mode' };
        }

        const userEmail = profile?.email || user?.email;
        console.log('🔐 Changing password for:', userEmail);

        if (!userEmail) {
            return { success: false, error: 'User email not found' };
        }

        // Create timeout wrapper
        const withTimeout = (promise, ms) => {
            return Promise.race([
                promise,
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error(`Request timed out after ${ms / 1000} seconds`)), ms)
                )
            ]);
        };

        try {
            // Re-authenticate with current password first (with timeout)
            console.log('🔐 Verifying current password...');
            const signInResult = await withTimeout(
                supabase.auth.signInWithPassword({
                    email: userEmail,
                    password: currentPassword
                }),
                15000
            );

            if (signInResult.error) {
                console.error('🔐 Current password verification failed:', signInResult.error);
                return { success: false, error: 'Current password is incorrect' };
            }

            console.log('🔐 Current password verified, updating to new password...');

            // Update to new password (with timeout)
            const updateResult = await withTimeout(
                supabase.auth.updateUser({ password: newPassword }),
                15000
            );

            if (updateResult.error) {
                console.error('🔐 Password update failed:', updateResult.error);
                throw updateResult.error;
            }

            console.log('✅ Password changed successfully');
            return { success: true };
        } catch (err) {
            console.error('❌ Change password error:', err);
            return { success: false, error: err.message || 'Password change failed' };
        }
    };

    // Delete account function - calls edge function for complete deletion
    const deleteAccount = async () => {
        if (!isSupabaseConfigured()) {
            return { success: false, error: 'Not available in demo mode' };
        }

        try {
            // Step 1: Cancel Stripe subscription first (no refund)
            console.log('[DELETE] Step 1: Cancelling Stripe subscription...');
            const cancelResult = await cancelSubscription();
            console.log('[DELETE] Stripe cancel result:', cancelResult);
            if (!cancelResult.success) {
                console.warn('[DELETE] Stripe cancellation warning:', cancelResult.error);
            }

            // Step 2: Get session for auth header
            console.log('[DELETE] Step 2: Getting session...');
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                console.error('[DELETE] No session found!');
                return { success: false, error: 'Not authenticated' };
            }
            console.log('[DELETE] Session found for user:', session.user?.email);

            // Step 3: Call edge function to completely delete user
            console.log('[DELETE] Step 3: Calling delete-account edge function...');
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const response = await fetch(
                `${supabaseUrl}/functions/v1/delete-account`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('[DELETE] Edge function response status:', response.status);
            const result = await response.json();
            console.log('[DELETE] Edge function result:', result);

            if (result.error) {
                console.error('[DELETE] Edge function returned error:', result.error);
                throw new Error(result.error);
            }

            // Clear local state
            console.log('[DELETE] Clearing local state...');
            setUser(null);
            setProfile(null);

            console.log('[DELETE] Account deletion complete!');
            return { success: true };
        } catch (err) {
            console.error('[DELETE] Account deletion error:', err);
            return { success: false, error: err.message };
        }
    };

    // Combined user data for components
    // Use Supabase user data as fallback when profile isn't loaded yet
    const userRole = user?.app_metadata?.role || user?.user_metadata?.role || profile?.role || 'user';
    const userData = user ? {
        id: user.id,
        email: profile?.email || user.email,
        fullName: profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        role: userRole,
        selectedCharityId: profile?.selected_charity_id,
        donationPercentage: profile?.donation_percentage,
        avatarUrl: profile?.avatar_url,
        // Profile settings fields
        phone: profile?.phone,
        state: profile?.state || 'VIC',
        golfHandicap: profile?.golf_handicap,
        homeClub: profile?.home_club,
        notificationSettings: profile?.notification_settings || {
            email: true,
            drawResults: true,
            newsletter: false,
            charityUpdates: true
        },
        subscription: subscription || null
    } : null;

    // Check if user has an active subscription
    const isSubscribed = subscription?.status === 'active' || subscription?.status === 'trialing';

    // Check if user has completed initial setup
    const setupCompleted = profile?.setup_completed === true;

    // Function to refresh profile data (for use after setup completion)
    const refreshProfile = async () => {
        if (user && session?.access_token) {
            await fetchProfile(user.id, user.email, session.access_token);
            await fetchSubscription(user.id, session.access_token);
        }
    };

    const value = {
        user: userData,
        profile,
        subscription,
        isAuthenticated: !!user,
        isSubscribed,
        setupCompleted,
        isLoading,
        isAdmin,
        error,
        login,
        signup,
        logout,
        updateProfile,
        changePassword,
        deleteAccount,
        refreshProfile,
        // Legacy compatibility
        isSupabaseConfigured: isSupabaseConfigured()
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
