import { createContext, useContext, useState, useEffect, useRef } from 'react';
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
    donationPercentage: 10,
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
    const isLoggingOut = useRef(false);

    // Check for existing session on mount
    useEffect(() => {
        if (!isSupabaseConfigured()) {
            // Mock mode - no Supabase configured
            console.log('🔧 Running in mock mode (Supabase not configured)');
            setIsLoading(false);
            return;
        }

        // Set a shorter timeout for session check to keep the app snappy
        const timeoutId = setTimeout(() => {
            console.warn('⚠️ Auth session timeout - forcing load completion');
            setIsLoading(false);
        }, 6000); // Increased to 6 seconds for reliability

        // Get initial session - no racing, just wait for it
        const initSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    // Detect invalid/expired refresh tokens and clear storage
                    if (error.message?.includes('Refresh Token')) {
                        console.warn('🔄 Invalid session detected - clearing storage');
                        await supabase.auth.signOut();
                    }
                    throw error;
                }

                clearTimeout(timeoutId);

                if (session?.user) {
                    console.log('✅ Session found:', session.user.email);
                    setUser(session.user);
                    setSession(session); // Cache the session

                    // CRITICAL SPEED FIX: Don't await profile/subscription fetch
                    fetchProfile(session.user.id, session.user.email, session.access_token);
                    fetchSubscription(session.user.id, session.access_token);

                    setIsLoading(false);
                } else {
                    console.log('ℹ️ No active session');
                    setIsLoading(false);
                }
            } catch (err) {
                // Only log unexpected errors
                const isSilentError =
                    err.message?.includes('Auth session missing!') ||
                    err.message?.includes('Refresh Token') ||
                    err.message?.includes('abort') ||
                    err.message?.includes('timeout') ||
                    err.name === 'AbortError';

                if (!isSilentError) {
                    console.error('Session init error:', err);
                    setError(err.message);
                }

                clearTimeout(timeoutId);
                setIsLoading(false);
            }
        };

        initSession();

        // Listen for auth changes
        const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log(`🔐 Auth Event: ${event}`, session ? 'Session Present' : 'No Session');

                // If we are currently logging out, ignore any events that might re-trigger login
                if (isLoggingOut.current && session) {
                    console.log('🚪 Ignoring auth event during logout');
                    return;
                }

                if (session?.user) {
                    setUser(session.user);
                    setSession(session);

                    // Only fetch if not already loading or if session changed
                    fetchProfile(session.user.id, session.user.email, session.access_token);
                    fetchSubscription(session.user.id, session.access_token);
                    setIsLoading(false);
                } else if (event === 'SIGNED_OUT' || !session) {
                    setUser(null);
                    setProfile(null);
                    setSubscription(null);
                    setSession(null);
                    setIsLoading(false);
                }
            }
        );

        return () => {
            clearTimeout(timeoutId);
            authListener.unsubscribe();
        };
    }, []);

    // SECURITY: Force logout if user becomes suspended
    useEffect(() => {
        if (profile?.status === 'suspended' && user) {
            console.warn('🚫 Account suspended - logging out');
            logout();
            setError('Your account has been suspended by the admin.');
        }
    }, [profile?.status, user]);

    // Fetch user profile - accepts accessToken as param to avoid getSession() hang
    const fetchProfile = async (userId, userEmail = null, accessToken = null) => {
        // Early exit if user logged out
        if (!userId) return;

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

            // Optimized: Fetch by ID or Email in a single request
            const query = userEmail
                ? `or=(id.eq.${userId},email.eq.${userEmail})`
                : `id.eq.${userId}`;

            const url = `${supabaseUrl}/rest/v1/profiles?${query}&select=*`;
            console.log('🔍 Optimized profile fetch URL:', url);

            const response = await fetch(url, { headers });
            const data = await response.json();

            if (data && data.length > 0) {
                console.log('✅ Profile fetched:', data[0]);
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
        if (!userId) return;
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
                        const response = await fetch(
                            `${supabaseUrl}/functions/v1/verify-subscription`,
                            {
                                method: 'POST',
                                headers: {
                                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ user_id: userId, force: true })
                            }
                        );

                        if (!response.ok) {
                            const errorText = await response.text();
                            console.error('[SUBSCRIPTION] Verify error:', errorText);
                            throw new Error(errorText);
                        }

                        const verifyData = await response.json();
                        console.log('[SUBSCRIPTION] Verify result:', verifyData);

                        if (verifyData?.subscription) {
                            console.log('[SUBSCRIPTION] ✅ Synced from Stripe:', verifyData.subscription.status, verifyData.subscription.plan);
                            setSubscription(verifyData.subscription);
                            return;
                        }
                    } catch (verifyErr) {
                        console.error('[SUBSCRIPTION] Verify exception:', verifyErr.message || verifyErr);
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
    const signup = async (email, password, fullName, selectedCharityId = null) => {
        if (!isSupabaseConfigured()) {
            // Mock signup
            setUser({ ...MOCK_USER, email, fullName, selectedCharityId });
            setProfile({ ...MOCK_USER, email, full_name: fullName, selected_charity_id: selectedCharityId });
            return { success: true };
        }

        setIsLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        selected_charity_id: selectedCharityId
                    },
                    emailRedirectTo: import.meta.env.PROD
                        ? 'https://www.golfcharity.com.au/dashboard'
                        : `${window.location.origin}/dashboard`
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

    // Sign in with Google
    const loginWithGoogle = async () => {
        if (!isSupabaseConfigured()) {
            // Mock Google login
            setUser({ ...MOCK_USER });
            setProfile({ ...MOCK_USER });
            return { success: true };
        }

        setIsLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: import.meta.env.PROD
                        ? 'https://www.golfcharity.com.au/dashboard'
                        : `${window.location.origin}/dashboard`,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'select_account',
                    },
                }
            });

            if (error) throw error;
            return { success: true, data };
        } catch (err) {
            setError(err.message);
            setIsLoading(false);
            return { success: false, error: err.message };
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

            if (data?.user) {
                // IMMEDIATELY fetch profile to check for suspension
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                const headers = {
                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${data.session.access_token}`
                };

                const url = `${supabaseUrl}/rest/v1/profiles?id=eq.${data.user.id}&select=status`;
                const response = await fetch(url, { headers });
                const profiles = await response.json();

                if (profiles && profiles.length > 0 && profiles[0].status === 'suspended') {
                    // USER IS SUSPENDED - Log them out immediately
                    await supabase.auth.signOut();
                    setUser(null);
                    setProfile(null);
                    setSession(null);
                    setSubscription(null);
                    return {
                        success: false,
                        error: 'Your account has been suspended by the admin. Please contact support for more information.'
                    };
                }
            }

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
        console.log('🚪 Logging out...');
        isLoggingOut.current = true;

        // Clear local state immediately for snappy UI
        setUser(null);
        setProfile(null);
        setSession(null);
        setSubscription(null);

        if (!isSupabaseConfigured()) {
            isLoggingOut.current = false;
            return;
        }

        try {
            // Force local cleanup first to be safe
            localStorage.removeItem('supabase.auth.token');
            // Try to find any other supabase keys
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.includes('supabase.auth.token') || key.includes('-auth-token'))) {
                    localStorage.removeItem(key);
                }
            }

            // Attempt global sign out
            const { error } = await supabase.auth.signOut();

            if (error) {
                console.warn('🚪 Logout: Global signOut failed, doing local cleanup', error.message);
                // Scope: local is generally more reliable if token is already dead
                await supabase.auth.signOut({ scope: 'local' }).catch(() => { });
            }

            console.log('🚪 Logout: Done');
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            // Keep the ref true for a moment to allow any trailing events to be ignored
            setTimeout(() => {
                isLoggingOut.current = false;
            }, 1000);
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

    /* Debug logging
    console.log('🔐 Admin check:', {
        'app_metadata.role': user?.app_metadata?.role,
        'user_metadata.role': user?.user_metadata?.role,
        'profile.role': profile?.role,
        'isAdmin': isAdmin
    }); */

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
            console.log('[DELETE] 🚀 Starting account deletion process');

            // Step 1: Force a hard refresh of the session to get a guaranteed fresh JWT
            console.log('[DELETE] 1. Requesting session refresh from Supabase...');
            const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();

            if (refreshError) {
                console.warn('[DELETE] Session refresh returned an error:', refreshError.message);
                // Continue anyway, maybe the existing session is still okay
            }

            const { data: { session: currentSession } } = await supabase.auth.getSession();

            if (!currentSession?.access_token) {
                console.error('[DELETE] Critical: No access token found after refresh attempt');
                return { success: false, error: 'Your session has expired. Please log out and back in to delete your account.' };
            }

            const token = currentSession.access_token;
            const userId = currentSession.user?.id;
            console.log('[DELETE] 2. Verified session for user:', currentSession.user?.email, '(ID:', userId?.substring(0, 8) + '...)');

            // Step 2: Verify the JWT against project auth to be 100% sure it's valid for this project
            console.log('[DELETE] 3. Verifying JWT validity with Auth server...');
            const { data: { user: verifiedUser }, error: verifyError } = await supabase.auth.getUser(token);

            if (verifyError || !verifiedUser) {
                console.error('[DELETE] JWT verification failed:', verifyError?.message);
                return {
                    success: false,
                    error: `Authentication verification failed: ${verifyError?.message || 'Unknown error'}. Please try logging out and back in.`
                };
            }
            console.log('[DELETE] 4. JWT verified successfully');

            // Step 3: Call delete-account edge function
            console.log('[DELETE] 5. Calling delete-account edge function...');
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

            // Log exactly where we are sending the request
            console.log('[DELETE] Fetching URL:', `${supabaseUrl}/functions/v1/delete-account`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 40000);

            const response = await fetch(
                `${supabaseUrl}/functions/v1/delete-account`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'X-Client-Info': 'golf-charity-frontend'
                    },
                    signal: controller.signal
                }
            );

            clearTimeout(timeoutId);
            console.log('[DELETE] 6. Response status:', response.status);

            if (!response.ok) {
                const errorBody = await response.text();
                let errorMessage = 'Account deletion failed';

                try {
                    const json = JSON.parse(errorBody);
                    errorMessage = json.message || json.error || errorMessage;
                } catch (e) {
                    errorMessage = errorBody || errorMessage;
                }

                console.error('[DELETE] Edge function error details:', {
                    status: response.status,
                    body: errorMessage
                });

                if (response.status === 401) {
                    return {
                        success: false,
                        error: 'Authorization error (401). This usually means your session is stale. Please log out, log back in, and try again immediately.'
                    };
                }

                throw new Error(errorMessage);
            }

            const result = await response.json();
            console.log('[DELETE] 7. Result received:', result);

            // Step 4: Clear local state completely
            console.log('[DELETE] 8. Success! Wiping local state and storage...');
            setUser(null);
            setProfile(null);
            setSession(null);
            setSubscription(null);

            // Clear ALL local storage starting with supabase or sb-
            try {
                const keys = Object.keys(localStorage);
                keys.forEach(key => {
                    if (key.includes('supabase') || key.includes('sb-')) {
                        localStorage.removeItem(key);
                    }
                });
                console.log('[DELETE] Storage wiped.');
            } catch (e) {
                console.warn('[DELETE] Storage wipe failed:', e);
            }

            return { success: true };
        } catch (err) {
            console.error('[DELETE] ❌ Deletion process failed:', err);
            return { success: false, error: err.message || 'An unexpected error occurred during account deletion.' };
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
        bankName: profile?.bank_name,
        bsbNumber: profile?.bsb_number,
        accountNumber: profile?.account_number,
        accountBalance: profile?.account_balance || 0,
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

    // Check if user is suspended
    const isSuspended = profile?.status === 'suspended';

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
        isSuspended,
        setupCompleted,
        isLoading,
        isAdmin,
        error,
        login,
        signup,
        loginWithGoogle,
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
