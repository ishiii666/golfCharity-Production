/**
 * Direct Supabase REST API client
 * Bypasses the Supabase JS client to avoid timeout issues
 * Uses simple fetch calls for reliable data retrieval
 */

import { supabase } from './supabase';
import { getNextDrawDate } from '../utils/drawSchedule';

// Get config from environment
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Get the current auth token - either from session or fallback to anon key
 */
async function getAuthToken() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
            console.error('🔑 Token Check: Error getting session:', error.message);
        }
        if (session?.access_token) {
            console.log('🔑 Token Check: Authenticated session found for:', session.user.email);
            return session.access_token;
        } else {
            console.warn('🔑 Token Check: No active session found in storage.');
        }
    } catch (error) {
        console.error('🔑 Token Check: Fatal session fetch error:', error);
    }
    console.warn('🔑 Token Check: Falling back to ANON key. Action might be blocked.');
    return SUPABASE_KEY;
}

/**
 * Make a direct REST API call to Supabase
 */
async function supabaseRest(table, options = {}) {
    const { select = '*', filter = '', count = false, method = 'GET', body = null } = options;

    const url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}${filter ? '&' + filter : ''}`;

    const authToken = await getAuthToken();

    const headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
    };

    if (count) {
        headers['Prefer'] = 'count=exact';
    }

    const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();

    if (count) {
        const range = response.headers.get('Content-Range');
        const total = range ? parseInt(range.split('/')[1]) : data.length;
        return { data, count: total };
    }

    return { data };
}

/**
 * Get count of rows in a table
 */
export async function getTableCount(table) {
    try {
        const { count } = await supabaseRest(table, {
            select: 'id',
            count: true
        });
        return count;
    } catch (error) {
        console.error(`Error counting ${table}:`, error);
        return 0;
    }
}

/**
 * Get all rows from a table
 */
export async function getTableData(table, select = '*') {
    try {
        const { data } = await supabaseRest(table, { select });
        return data || [];
    } catch (error) {
        console.error(`Error fetching ${table}:`, error);
        return [];
    }
}

/**
 * Update a row in a table
 */
export async function updateRow(table, id, updates) {
    try {
        const authToken = await getAuthToken();
        const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;

        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(updates)
        });

        if (!response.ok) {
            let errorMessage = 'Update failed';
            try {
                const error = await response.json();
                errorMessage = error.message || error.error || errorMessage;
            } catch (e) {
                const text = await response.text();
                errorMessage = text || errorMessage;
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();

        if (data.length === 0) {
            console.error(`❌ Update failed: No rows modified in ${table}. Check RLS policies.`);
            throw new Error(`Permission denied: Could not update ${table}.`);
        }

        console.log(`✅ Updated ${table} row:`, id);
        return data[0];
    } catch (error) {
        console.error(`Error updating ${table}:`, error);
        throw error;
    }
}

/**
 * Delete a row from a table
 */
export async function deleteRow(table, id) {
    try {
        const authToken = await getAuthToken();
        const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;

        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Delete failed');
        }

        console.log(`🗑️ Deleted ${table} row:`, id);
        return { success: true };
    } catch (error) {
        console.error(`Error deleting ${table}:`, error);
        throw error;
    }
}

/**
 * Get detailed profile information (including banking) for a specific user
 */
export async function getWinnerProfileWithBanking(userId) {
    try {
        const authToken = await getAuthToken();
        const url = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=bank_name,bsb_number,account_number,full_name,email`;

        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();
        return data[0] || null;
    } catch (error) {
        console.error('Error fetching banking details:', error);
        return null;
    }
}

// =====================================================
// CONTENT MANAGEMENT API FUNCTIONS
// =====================================================

/**
 * Get all site content from database
 */
export async function getSiteContent() {
    try {
        const url = `${SUPABASE_URL}/rest/v1/site_content?select=*`;
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${await getAuthToken()}`
            }
        });

        if (!response.ok) {
            console.warn('Site content table may not exist yet');
            return [];
        }

        const data = await response.json();
        console.log('📝 Site content fetched:', data.length, 'items');
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Error fetching site content:', error);
        return [];
    }
}

/**
 * Save site content (upsert)
 */
export async function saveSiteContent(sectionId, fieldName, fieldValue, fieldType = 'text') {
    try {
        const authToken = await getAuthToken();
        const url = `${SUPABASE_URL}/rest/v1/site_content`;

        // First try to update existing
        const updateUrl = `${url}?section_id=eq.${sectionId}&field_name=eq.${fieldName}`;
        const updateResponse = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                field_value: fieldValue,
                updated_at: new Date().toISOString()
            })
        });

        if (updateResponse.ok) {
            const data = await updateResponse.json();
            if (data.length > 0) {
                return data[0];
            }
        }

        // If no existing row, insert new
        const insertResponse = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                section_id: sectionId,
                field_name: fieldName,
                field_value: fieldValue,
                field_type: fieldType
            })
        });

        if (!insertResponse.ok) {
            throw new Error('Failed to save content');
        }

        const data = await insertResponse.json();
        console.log('✅ Content saved:', sectionId, fieldName);
        return data[0];
    } catch (error) {
        console.error('Error saving content:', error);
        throw error;
    }
}

/**
 * Save multiple content items at once
 */
export async function saveSiteContentBulk(items) {
    try {
        const authToken = await getAuthToken();
        const results = [];

        for (const item of items) {
            const result = await saveSiteContent(
                item.section_id,
                item.field_name,
                item.field_value,
                item.field_type
            );
            results.push(result);
        }

        await logActivity('content_updated', `Updated ${items.length} content fields`);
        console.log('✅ Bulk content saved:', items.length, 'items');
        return results;
    } catch (error) {
        console.error('Error saving bulk content:', error);
        throw error;
    }
}

/**
 * Get count of active subscribers
 * @param {string} drawId - Optional specific draw to filter by
 * @param {boolean} global - If true, returns all active subscribers regardless of draw assignment
 */
export async function getActiveSubscribersCount(drawId = null, global = false) {
    try {
        const authToken = await getAuthToken();
        const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${authToken}` };

        // 1. Get profiles to distinguish admins from players
        const profilesUrl = `${SUPABASE_URL}/rest/v1/profiles?select=id,role,status`;
        const profileResponse = await fetch(profilesUrl, { headers });
        const profiles = await profileResponse.json();

        if (!Array.isArray(profiles)) return 0;

        const playerIds = new Set(profiles.filter(p => (p.role !== 'admin' || p.full_name === 'Test User') && p.status === 'active').map(p => p.id));

        // 2. Identify the target drawId if not provided (and not global)
        let targetId = drawId;
        if (!targetId && !global) {
            const currentDraw = await getCurrentDraw();
            targetId = currentDraw?.id;
        }

        // 3. Get active and trialing subscriptions
        const url = `${SUPABASE_URL}/rest/v1/subscriptions?status=in.(active,trialing)&select=user_id,current_period_end,plan,assigned_draw_id`;
        const response = await fetch(url, { headers });
        const subscriptions = await response.json();

        if (!Array.isArray(subscriptions)) return 0;

        // 4. Count only subscriptions belonging to players AND matching eligibility rules
        const nextDrawDate = getNextDrawDate();
        const activePlayerSubs = subscriptions.filter(s => {
            if (!playerIds.has(s.user_id)) return false;

            // If global count requested, any active sub for an active player counts
            if (global) return true;

            // ELIGIBILITY LOGIC:
            // 1. Annual subscribers are always counted if active
            if (s.plan === 'annual') return true;

            // 2. Monthly subscribers:
            // Check if assigned to THIS draw ID (or if it's currently an OPEN phase without a strict ID)
            if (s.assigned_draw_id && targetId && s.assigned_draw_id === targetId) {
                return true;
            }

            // 3. Fallback (date-based): If the subscription is active through the draw date
            if (s.current_period_end) {
                const endDateString = s.current_period_end.replace(' ', 'T');
                const end = new Date(endDateString);
                if (end >= nextDrawDate) return true;
            }

            // 4. Absolute Fallback: If no targetId specified, count all active subs
            return !targetId;
        });

        console.log(`📊 Active subscribers (${global ? 'global' : 'draw ' + (targetId || 'scheduled')}): ${activePlayerSubs.length}`);
        return activePlayerSubs.length;
    } catch (error) {
        console.error('Error fetching subscriber count:', error);
        return 0;
    }
}

/**
 * Get total donations amount
 */
export async function getTotalDonations() {
    try {
        const url = `${SUPABASE_URL}/rest/v1/donations?select=amount`;
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${await getAuthToken()}`
            }
        });

        if (!response.ok) {
            console.warn('Could not fetch donations:', response.status);
            return 0;
        }

        const donations = await response.json();
        const baseDonations = donations.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

        // Also fetch charity amounts from draw entries
        let drawImpact = 0;
        try {
            const entriesUrl = `${SUPABASE_URL}/rest/v1/draw_entries?charity_amount=gt.0&select=charity_amount`;
            const entriesRes = await fetch(entriesUrl, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${await getAuthToken()}`
                }
            });
            if (entriesRes.ok) {
                const entries = await entriesRes.json();
                drawImpact = entries.reduce((sum, e) => sum + (parseFloat(e.charity_amount) || 0), 0);
            }
        } catch (e) {
            console.warn('Could not fetch draw entry impact:', e.message);
        }

        const total = baseDonations + drawImpact;
        return Math.round(total * 100) / 100; // Round to 2 decimal places
    } catch (error) {
        console.error('Error summing donations:', error);
        return 0;
    }
}

/**
 * Get recent activity log entries
 */
export async function getRecentActivity(limit = 10) {
    try {
        const url = `${SUPABASE_URL}/rest/v1/activity_log?select=*&order=created_at.desc&limit=${limit}`;
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${await getAuthToken()}`
            }
        });

        if (!response.ok) {
            // Table might not exist yet - return empty array
            console.warn('Could not fetch activity log:', response.status);
            return [];
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching activity log:', error);
        return [];
    }
}

/**
 * Log an admin activity
 */
export async function logActivity(actionType, description, metadata = {}) {
    try {
        const authToken = await getAuthToken();
        const url = `${SUPABASE_URL}/rest/v1/activity_log`;

        await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action_type: actionType,
                description: description,
                metadata: metadata
            })
        });
    } catch (error) {
        console.warn('Failed to log activity:', error);
    }
}

/**
 * Get user statistics including total winnings and membership duration
 */
export async function getUserStats(userId) {
    try {
        const authToken = await getAuthToken();

        // Fetch draw entries (net_payout) for total winnings
        const entriesUrl = `${SUPABASE_URL}/rest/v1/draw_entries?user_id=eq.${userId}&select=net_payout,gross_prize`;
        const entriesRes = await fetch(entriesUrl, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`
            }
        });
        const entries = await entriesRes.json();

        const totalWinnings = entries.reduce((sum, entry) => sum + (Number(entry.net_payout) || 0), 0);

        // Fetch payouts
        const payoutsUrl = `${SUPABASE_URL}/rest/v1/payouts?user_id=eq.${userId}&select=*&order=transfer_date.desc`;
        const payoutsRes = await fetch(payoutsUrl, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`
            }
        });
        const payouts = await payoutsRes.json();

        const totalPaidOut = payouts.reduce((sum, payout) => sum + (Number(payout.amount) || 0), 0);

        // Fetch profile for join date
        const profileUrl = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=created_at,account_balance`;
        const profileRes = await fetch(profileUrl, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`
            }
        });
        const profile = await profileRes.json();

        const joinDate = profile[0]?.created_at || new Date().toISOString();
        const diffTime = Math.abs(new Date() - new Date(joinDate));
        const membershipMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.44));

        return {
            totalWinnings,
            totalPaidOut,
            currentBalance: Math.max(0, totalWinnings - totalPaidOut),
            membershipMonths: Math.max(1, membershipMonths), // Ensure at least 1 if they exist
            joinDate: joinDate,
            payouts: payouts
        };
    } catch (error) {
        console.error('Error fetching user stats:', error);
        return { totalWinnings: 0, totalPaidOut: 0, currentBalance: 0, membershipMonths: 0, payouts: [] };
    }
}

/**
 * Record a manual payout for a user
 */
export async function recordPayout(userId, amount, date, reference = '') {
    try {
        const authToken = await getAuthToken();

        // 1. Create payout record
        const payoutUrl = `${SUPABASE_URL}/rest/v1/payouts`;
        const payoutRes = await fetch(payoutUrl, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                user_id: userId,
                amount: amount,
                transfer_date: date,
                reference: reference
            })
        });

        if (!payoutRes.ok) throw new Error('Failed to record payout');

        // 2. Update user balance
        const profileUrl = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=account_balance`;
        const profileRes = await fetch(profileUrl, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`
            }
        });
        const profile = await profileRes.json();
        const currentBalance = Number(profile[0]?.account_balance || 0);

        await updateRow('profiles', userId, {
            account_balance: currentBalance - Number(amount)
        });

        return { success: true };
    } catch (error) {
        console.error('Error recording payout:', error);
        throw error;
    }
}

/**
 * Update user password (Admin)
 * NOTE: This requires an Edge Function since only service_role can do this via API
 */
export async function adminUpdatePassword(userId, newPassword) {
    try {
        const authToken = await getAuthToken();

        // Safety check: Don't even try if we don't have a real user session
        if (authToken === SUPABASE_KEY) {
            throw new Error('You must be logged in to perform this action.');
        }

        const response = await fetch(
            `${SUPABASE_URL}/functions/v1/admin-action`,
            {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await getAuthToken()}`
                },
                body: JSON.stringify({
                    action: 'update_password',
                    user_id: userId,
                    password: newPassword
                })
            }
        );

        if (!response.ok) {
            // If function doesn't exist, we fallback to a message
            const text = await response.text();
            throw new Error(text || 'Admin action function failed.');
        }

        return await response.json();
    } catch (error) {
        console.error('Error updating password:', error);
        throw error;
    }
}

/**
 * Get admin dashboard stats - NOW WITH REAL DATA
 */
export async function getAdminStats() {
    console.log('📊 Fetching admin stats (real data)...');

    const authToken = await getAuthToken();
    const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${authToken}` };

    // 1. Get profiles counts (total, active, suspended)
    const profilesRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,role,status`, { headers });
    const profilesArr = await profilesRes.json();
    const profiles = Array.isArray(profilesArr) ? profilesArr : [];

    const totalUsers = profiles.filter(p => p.role !== 'admin').length;
    const activeUsers = profiles.filter(p => p.role !== 'admin' && p.status === 'active').length;
    const suspendedUsers = profiles.filter(p => p.role !== 'admin' && p.status === 'suspended').length;

    // 2. Fetch other stats
    const [charities, totalDonated, recentActivity, currentDraw, winners] = await Promise.all([
        getTableData('charities', 'id'),
        getTotalDonations(),
        getRecentActivity(5),
        getCurrentDraw(),
        getTableData('draw_entries', 'id,is_paid,tier')
    ]);

    // 3. Get accurate subscriber count (global for dashboard)
    const activeSubCount = await getActiveSubscribersCount(null, true);

    // 4. Calculate pending payouts (verified but not paid)
    const pendingPayouts = (winners || []).filter(w => w.tier !== null && !w.is_paid).length;

    // 5. Monthly estimated revenue (Active Subs * $5 minimum share)
    const monthlyRev = activeSubCount * 5;

    // Determine what draw is "Next"
    const nextDrawLabel = currentDraw?.status === 'open'
        ? currentDraw.month_year
        : getDrawMonthYear();

    console.log('📊 Admin Stats Updated:', { activeSubCount, nextDrawLabel, pendingPayouts });

    return {
        totalUsers,
        activeUsers,
        suspendedUsers,
        activeSubscribers: activeSubCount,
        totalCharities: (Array.isArray(charities) ? charities.length : 0),
        totalDonated: totalDonated,
        recentActivity: recentActivity,
        nextDrawDate: nextDrawLabel,
        pendingPayouts,
        monthlyRevenue: monthlyRev
    };
}

/**
 * Get all charities for admin management
 */
export async function getCharities() {
    try {
        console.log('🏥 Fetching charities with LIVE stats...');

        // 1. Fetch base data in parallel
        const [charities, profiles, subscriptions] = await Promise.all([
            getTableData('charities', '*'),
            getTableData('profiles', 'id,selected_charity_id,status,role'),
            getTableData('subscriptions', 'user_id,plan,status')
        ]);

        if (!charities || charities.length === 0) return [];

        // 2. Map user IDs to their subscription plan
        const subMap = {};
        (subscriptions || []).forEach(s => {
            if (s.status === 'active') {
                subMap[s.user_id] = s.plan;
            }
        });

        // 3. Initialize stats maps
        const raisedMap = {};
        const supportersMap = {};

        charities.forEach(c => {
            raisedMap[c.id] = 0;
            supportersMap[c.id] = 0;
        });

        // 4. Calculate LIVE impact based STRICTLY on active plans (as requested)
        // This removes the "Phantom" numbers by deriving value from actual users
        (profiles || []).forEach(p => {
            const role = String(p.role || '').toLowerCase();
            const status = String(p.status || '').toLowerCase();

            if (p.selected_charity_id && status === 'active' && role !== 'admin') {
                // Count as a supporter
                if (supportersMap[p.selected_charity_id] !== undefined) {
                    supportersMap[p.selected_charity_id]++;
                }

                // Calculate contribution based on plan
                // Monthly: $11 -> ~$2.20 charity share
                // Annual: $108 -> ~$21.60 charity share
                const plan = subMap[p.id];
                if (plan && raisedMap[p.selected_charity_id] !== undefined) {
                    const contribution = plan === 'annual' ? 21.60 : 2.20;
                    raisedMap[p.selected_charity_id] += contribution;
                }
            }
        });

        // 7. Merge stats back into charities
        return (charities || []).map(c => {
            // Live stats from aggregation (STRICT - NO FALLBACKS)
            const liveRaised = raisedMap[c.id] || 0;
            const liveSupporters = supportersMap[c.id] || 0;

            // Image Fallbacks based on category - Using high-quality optimized Unsplash URLs
            const name = c.name?.toLowerCase() || '';
            const category = c.category?.toLowerCase() || '';

            // Standardizing Unsplash fallbacks with proper query params
            let fallbackImageId = 'photo-1488521787991-ed7bbaae773c'; // Default humanitarian
            let fallbackLogo = 'https://images.unsplash.com/photo-1599305090748-39322251147d?auto=format&fit=crop&q=80&w=200';

            if (name.includes('blue') || category.includes('mental')) {
                fallbackImageId = 'photo-1527137342181-19aab11a8ee1';
            } else if (name.includes('cancer') || category.includes('medical') || category.includes('health')) {
                fallbackImageId = 'photo-1579154235602-3c2c244b748b';
            } else if (name.includes('starlight') || category.includes('child')) {
                fallbackImageId = 'photo-1502086223501-7ea6ecd79368';
            } else if (name.includes('wild') || category.includes('environ')) {
                fallbackImageId = 'photo-1441974231531-c6227db76b6e';
            } else if (name.includes('salvation') || category.includes('community')) {
                fallbackImageId = 'photo-1469571486292-0ba58a3f068b';
            }

            let fallbackUrl = `https://images.unsplash.com/${fallbackImageId}?auto=format&fit=crop&q=80&w=800`;

            // Use locally hosted custom generated images for core charities
            if (name.includes('blue') || category.includes('mental')) {
                fallbackUrl = '/images/charities/beyond_blue_main.png';
            } else if (name.includes('cancer') || category.includes('medical') || category.includes('health')) {
                fallbackUrl = '/images/charities/cancer_council_main.png';
            }

            return {
                ...c,
                total_raised: liveRaised,
                supporters: liveSupporters,
                supporter_count: liveSupporters,
                totalRaised: liveRaised,
                supporterCount: liveSupporters,
                image_url: c.image_url || fallbackUrl,
                logo_url: c.logo_url || fallbackLogo,
                image: c.image_url || fallbackUrl,
                logo: c.logo_url || fallbackLogo
            };
        }).sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || a.name.localeCompare(b.name));

    } catch (error) {
        console.error('Error fetching charities with stats:', error);
        return getTableData('charities', '*'); // Fallback to basic data
    }
}

/**
 * Get only active charities for user-facing pages
 * Note: Fetches all charities since not all may have 'active' status set
 */
export async function getActiveCharities() {
    try {
        console.log('🏥 Fetching active charities with LIVE stats...');
        const allCharities = await getCharities();

        // Filter out inactive charities
        const activeCharities = allCharities.filter(c => c.status !== 'inactive');

        console.log('🏥 Active charities fetched:', activeCharities.length);
        return activeCharities;
    } catch (error) {
        console.error('Error fetching active charities:', error);
        return [];
    }
}

/**
 * Get a single charity by ID for editing
 * @param {string} id - The charity ID
 * @returns {Object|null} Charity data or null if not found
 */
export async function getCharityById(id) {
    try {
        const url = `${SUPABASE_URL}/rest/v1/charities?id=eq.${id}&select=*`;
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${await getAuthToken()}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch charity');
        }

        const charities = await response.json();
        return charities.length > 0 ? charities[0] : null;
    } catch (error) {
        console.error('Error fetching charity by ID:', error);
        return null;
    }
}

/**
 * Get recent supporters for a charity
 * @param {string} charityId - The charity ID to get supporters for
 * @param {number} limit - Maximum number of supporters to return
 * @returns {Array} List of supporter display names
 */
export async function getCharitySupporters(charityId, limit = 12) {
    try {
        const url = `${SUPABASE_URL}/rest/v1/profiles?selected_charity_id=eq.${charityId}&status=eq.active&select=full_name&limit=${limit}&order=updated_at.desc`;
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${await getAuthToken()}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch supporters');
        }

        const profiles = await response.json();

        // Format names for display (privacy: first name + last initial)
        const supporterNames = profiles.map(p => {
            if (p.full_name && p.full_name.trim()) {
                const parts = p.full_name.trim().split(/\s+/);
                if (parts.length >= 2) {
                    const lastInitial = parts[parts.length - 1][0].toUpperCase();
                    return `${parts[0]} ${lastInitial}.`;
                }
                return parts[0];
            }
            return 'Anonymous';
        });

        console.log(`👥 Fetched ${supporterNames.length} supporters for charity ${charityId}`);
        return supporterNames;
    } catch (error) {
        console.error('Error fetching charity supporters:', error);
        return [];
    }
}

/**
 * Upload charity image to Supabase Storage
 * @param {File} file - The image file to upload
 * @param {string} charityId - The charity ID for naming
 * @param {string} type - 'image' or 'logo'
 * @returns {string} Public URL of uploaded image
 */
export async function uploadCharityImage(file, charityId, type = 'image') {
    try {
        const authToken = await getAuthToken();
        const fileExt = file.name.split('.').pop();
        const fileName = `${charityId}_${type}_${Date.now()}.${fileExt}`;

        console.log(`📤 Uploading ${type} for charity ${charityId}...`);

        // Upload to Supabase Storage
        const uploadUrl = `${SUPABASE_URL}/storage/v1/object/charity-images/${fileName}`;
        const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': file.type,
                'x-upsert': 'true'
            },
            body: file
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Upload failed:', error);
            throw new Error('Failed to upload image');
        }

        // Return public URL
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/charity-images/${fileName}`;
        console.log(`✅ Image uploaded: ${publicUrl}`);
        return publicUrl;
    } catch (error) {
        console.error('Error uploading charity image:', error);
        throw error;
    }
}

/**
 * Delete charity image from Supabase Storage
 * @param {string} imageUrl - The full URL of the image to delete
 */
export async function deleteCharityImage(imageUrl) {
    try {
        if (!imageUrl || !imageUrl.includes('charity-images')) {
            return; // Not a storage URL, nothing to delete
        }

        const authToken = await getAuthToken();
        const fileName = imageUrl.split('/charity-images/').pop();

        const deleteUrl = `${SUPABASE_URL}/storage/v1/object/charity-images/${fileName}`;
        await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`
            }
        });

        console.log(`🗑️ Image deleted: ${fileName}`);
    } catch (error) {
        console.warn('Error deleting charity image:', error);
    }
}

/**
 * Get a single user profile by ID directly
 */
export async function getUserById(userId) {
    try {
        const authToken = await getAuthToken();
        const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${authToken}` };

        // Fetch profile and subscriptions in parallel for reliability
        const [profileRes, subsRes] = await Promise.all([
            fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`, { headers }),
            fetch(`${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${userId}&status=eq.active`, { headers })
        ]);

        const profileData = await profileRes.json();
        const subsData = await subsRes.json();

        if (!profileData || profileData.length === 0) return null;

        const profile = profileData[0];
        profile.subscriptions = subsData || [];

        return profile;
    } catch (error) {
        console.error('Error fetching user by ID:', error);
        return null;
    }
}

/**
 * Get all users/profiles for admin management with subscription data
 */
export async function getUsers() {
    try {
        // Fetch profiles
        const profiles = await getTableData('profiles', '*');
        console.log('👥 Profiles fetched:', profiles.length);

        // Fetch ALL subscriptions (not just active) for debugging
        const authToken = await getAuthToken();
        const url = `${SUPABASE_URL}/rest/v1/subscriptions?select=*`;
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`
            }
        });

        let subscriptions = [];
        if (response.ok) {
            subscriptions = await response.json();
            console.log('📋 Subscriptions from DB:', subscriptions);
        } else {
            console.warn('⚠️ Failed to fetch subscriptions:', response.status);
        }

        // Create a map of user_id to subscription info
        const subscriptionMap = {};
        subscriptions.forEach(sub => {
            const status = sub.status?.toLowerCase();
            const isActive = status === 'active' || status === 'trialing';

            // Only map the plan if the subscription is currently active
            if (isActive) {
                subscriptionMap[sub.user_id] = sub.plan || 'active';
            }
        });

        console.log('📋 Subscription map (Active only):', subscriptionMap);

        // Merge subscription data into profiles
        const profilesWithSubs = profiles.map(profile => ({
            ...profile,
            subscription_type: subscriptionMap[profile.id] || 'none'
        }));

        console.log('👥 Users with subscriptions:', profilesWithSubs.map(p => ({
            name: p.full_name,
            sub: p.subscription_type
        })));

        return profilesWithSubs.filter(p => p.role !== 'admin');
    } catch (error) {
        console.error('Error fetching users with subscriptions:', error);
        return getTableData('profiles', '*');
    }
}

/**
 * Insert a row into a table
 */
export async function insertRow(table, data) {
    const url = `${SUPABASE_URL}/rest/v1/${table}`;
    const authToken = await getAuthToken();

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Insert error:', errorText);
        throw new Error(errorText || 'Insert failed');
    }

    return response.json();
}

/**
 * Assign subscription to a user (admin function)
 * Creates or updates subscription record
 */
export async function assignSubscription(userId, plan) {
    const authToken = await getAuthToken();

    console.log(`📋 Assigning ${plan} subscription to user ${userId}`);

    // If plan is 'none' or 'free', delete the subscription
    if (plan === 'none' || plan === 'free') {
        try {
            const deleteUrl = `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${userId}`;
            await fetch(deleteUrl, {
                method: 'DELETE',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${authToken}`
                }
            });
            console.log('📋 Subscription removed (set to free)');
            return { success: true, message: 'Subscription removed' };
        } catch (error) {
            console.warn('No subscription to delete:', error);
            return { success: true, message: 'User is now free tier' };
        }
    }

    // Check if subscription already exists
    const checkUrl = `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${userId}&select=id`;
    const checkResponse = await fetch(checkUrl, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${authToken}`
        }
    });

    const existingSubs = await checkResponse.json();

    // 1. Determine the target draw for this subscription
    let targetDrawId = null;
    let targetMonthYear = null;
    let drawsRemaining = (plan === 'annual' ? 12 : 1);

    try {
        // Find the current active/open draw
        const drawUrl = `${SUPABASE_URL}/rest/v1/draws?status=eq.open&select=id,month_year&limit=1&order=created_at.asc`;
        const drawRes = await fetch(drawUrl, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`
            }
        });
        const openDraws = await drawRes.json();

        if (openDraws && openDraws.length > 0) {
            targetDrawId = openDraws[0].id;
            targetMonthYear = openDraws[0].month_year;
        } else {
            // No open draw? Check if we need to assign to next month
            targetMonthYear = getDrawMonthYear();
            const nextDraw = await createNewDraw(targetMonthYear);
            if (nextDraw) {
                targetDrawId = nextDraw.id;
            }
        }
    } catch (err) {
        console.error('Error finding target draw:', err);
    }

    const subscriptionData = {
        user_id: userId,
        plan: plan,
        status: 'active',
        assigned_draw_id: targetDrawId,
        assigned_draw_month: targetMonthYear,
        draws_remaining: drawsRemaining,
        // Legacy fields for compatibility
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + (plan === 'annual' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
        stripe_subscription_id: `test_sub_${Date.now()}`,
        stripe_customer_id: `test_cus_${userId.substring(0, 8)}`
    };

    if (existingSubs && Array.isArray(existingSubs) && existingSubs.length > 0) {
        // Update existing subscription
        const updateUrl = `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${userId}`;
        const response = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                plan: plan,
                status: 'active',
                assigned_draw_id: subscriptionData.assigned_draw_id,
                assigned_draw_month: subscriptionData.assigned_draw_month,
                draws_remaining: subscriptionData.draws_remaining,
                current_period_start: subscriptionData.current_period_start,
                current_period_end: subscriptionData.current_period_end
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error);
        }

        console.log(`📋 Subscription updated. Assigned to: ${targetMonthYear || 'Unknown'}`);
        return { success: true, message: `Subscription updated for ${targetMonthYear || 'next cycle'}` };
    } else {
        // Create new subscription
        const response = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(subscriptionData)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error);
        }

        console.log(`📋 New subscription created. Assigned to: ${targetMonthYear || 'Unknown'}`);
        return { success: true, message: `Subscribed to ${targetMonthYear || 'next cycle'}` };
    }
}

/**
 * Sync user subscription from Stripe (calls edge function)
 */
export async function syncSubscription(userId, force = false) {
    try {
        console.log(`🔄 Syncing subscription for user ${userId} (force: ${force})...`);

        const response = await fetch(
            `${SUPABASE_URL}/functions/v1/verify-subscription`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ user_id: userId, force })
            }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Sync failed: ${error}`);
        }

        const data = await response.json();
        console.log('✅ Sync response:', data);
        return { success: true, subscription: data.subscription };
    } catch (error) {
        console.error('Error syncing subscription:', error);
        throw error;
    }
}

/**
 * Get current draw settings
 */
export async function getDrawSettings() {
    try {
        const url = `${SUPABASE_URL}/rest/v1/draw_settings?select=*&limit=1`;
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${await getAuthToken()}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch draw settings');
        }

        const data = await response.json();
        return data[0] || {
            base_amount_per_sub: 5,
            tier1_percent: 40,
            tier2_percent: 35,
            tier3_percent: 25,
            jackpot_cap: 250000
        };
    } catch (error) {
        console.error('Error fetching draw settings:', error);
        return {
            base_amount_per_sub: 5,
            tier1_percent: 40,
            tier2_percent: 35,
            tier3_percent: 25,
            jackpot_cap: 250000
        };
    }
}

/**
 * Update draw settings
 */
export async function updateDrawSettings(settings) {
    try {
        const authToken = await getAuthToken();
        const url = `${SUPABASE_URL}/rest/v1/draw_settings?id=not.is.null`;

        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...settings,
                updated_at: new Date().toISOString()
            })
        });

        if (!response.ok) {
            throw new Error('Failed to update draw settings');
        }

        await logActivity('settings_updated', 'Draw prize settings updated');
        console.log('✅ Draw settings updated');
        return { success: true };
    } catch (error) {
        console.error('Error updating draw settings:', error);
        throw error;
    }
}

// =====================================================
// DRAW ENGINE API FUNCTIONS
// =====================================================

/**
 * Get all draws, ordered by date (newest first)
 */
export async function getDraws() {
    try {
        const url = `${SUPABASE_URL}/rest/v1/draws?select=*&order=created_at.desc`;
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${await getAuthToken()}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch draws');
        }

        const draws = await response.json();
        console.log('🎯 Draws fetched:', draws.length);
        return draws;
    } catch (error) {
        console.error('Error fetching draws:', error);
        return [];
    }
}

/**
 * Get the current active draw (status = 'open')
 */
export async function getCurrentDraw() {
    try {
        const authToken = await getAuthToken();
        const headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${authToken}`
        };

        // 1. Try to find the OLDEST 'open' draw first
        // This ensures if a past month is reset, it becomes the active target again
        const openUrl = `${SUPABASE_URL}/rest/v1/draws?status=eq.open&select=*&order=created_at.asc&limit=1`;
        const openRes = await fetch(openUrl, { headers });
        const openDraws = await openRes.json();

        if (Array.isArray(openDraws) && openDraws.length > 0) {
            console.log('🎯 Current Draw: Found active OPEN cycle:', openDraws[0].month_year);
            return openDraws[0];
        }

        // 2. If no open draws, get the newest published/completed draw for historical context
        const historyUrl = `${SUPABASE_URL}/rest/v1/draws?select=*&order=created_at.desc&limit=1`;
        const historyRes = await fetch(historyUrl, { headers });
        const historyDraws = await historyRes.json();

        if (Array.isArray(historyDraws) && historyDraws.length > 0) {
            console.log('🎯 Current Draw: Found most recent published cycle:', historyDraws[0].month_year);
            return historyDraws[0];
        }

        return null;
    } catch (error) {
        console.error('Error fetching current draw:', error);
        return null;
    }
}

/**
 * Get current jackpot amount
 */
export async function getJackpot() {
    try {
        const authToken = await getAuthToken();
        const url = `${SUPABASE_URL}/rest/v1/jackpot_tracker?select=amount&limit=1`;
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch jackpot');
        }

        const data = await response.json();
        const amount = data[0]?.amount || 0;
        return typeof amount === 'string' ? parseFloat(amount) : amount;
    } catch (error) {
        console.error('Error fetching jackpot:', error);
        return 0;
    }
}

/**
 * Get score frequencies within a range for this month
 * Returns array of { score, count } sorted by frequency
 */
export async function getScoreFrequencies(minScore = 1, maxScore = 45) {
    try {
        const authToken = await getAuthToken();

        // Get all scores for this month
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const url = `${SUPABASE_URL}/rest/v1/scores?score=gte.${minScore}&score=lte.${maxScore}&created_at=gte.${monthStart.toISOString()}&select=score`;
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch scores');
        }

        const scores = await response.json();

        // Count frequencies
        const freqMap = {};
        for (const s of scores) {
            freqMap[s.score] = (freqMap[s.score] || 0) + 1;
        }

        // Convert to array and sort
        const freqArray = Object.entries(freqMap)
            .map(([score, count]) => ({ score: parseInt(score), count }))
            .sort((a, b) => a.count - b.count || a.score - b.score);

        console.log('📊 Score frequencies calculated:', freqArray.length, 'unique scores');
        return freqArray;
    } catch (error) {
        console.error('Error fetching score frequencies:', error);
        return [];
    }
}

/**
 * Generate winning numbers: 3 least popular + 2 most popular
 */
export function generateWinningNumbers(frequencies) {
    if (frequencies.length < 5) {
        console.warn('Not enough score data to generate winning numbers');
        return [];
    }

    // 3 least popular (first 3)
    const leastPopular = frequencies.slice(0, 3).map(f => f.score);

    // 2 most popular (last 2)
    const mostPopular = frequencies.slice(-2).map(f => f.score);

    const winningNumbers = [...leastPopular, ...mostPopular];
    console.log('🎲 Winning numbers generated:', winningNumbers);
    return winningNumbers;
}

/**
 * Get user's last 5 scores
 */
export async function getUserScores(userId, limit = 5) {
    try {
        const authToken = await getAuthToken();
        const url = `${SUPABASE_URL}/rest/v1/scores?user_id=eq.${userId}&select=score&order=created_at.desc&limit=${limit}`;
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user scores');
        }

        const data = await response.json();
        return data.map(s => s.score);
    } catch (error) {
        console.error('Error fetching user scores:', error);
        return [];
    }
}

/**
 * Get all users eligible for a specific draw
 * Filters by active subscriptions (Annual OR Monthly assigned to this draw)
 */
export async function getEligibleUsers(drawId = null) {
    try {
        const authToken = await getAuthToken();
        const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${authToken}` };

        // 1. Get ALL active and trialing subscriptions
        const subUrl = `${SUPABASE_URL}/rest/v1/subscriptions?status=in.(active,trialing)&select=user_id,current_period_end,plan,assigned_draw_id`;
        const subResponse = await fetch(subUrl, { headers });
        const subscriptions = await subResponse.json();

        if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
            console.warn('⚠️ getEligibleUsers: No active subscriptions found in DB');
            return [];
        }

        // Identify target draw if not provided
        let targetId = drawId;
        if (!targetId) {
            const activeDraw = await getCurrentDraw();
            targetId = activeDraw?.id;
        }

        // Filter for those valid for THIS specific draw
        const nextDrawDate = getNextDrawDate();
        const validSubscriptions = subscriptions.filter(s => {
            // Annual subscribers are always eligible if active
            if (s.plan === 'annual') return true;

            // Check if assigned to THIS draw ID
            if (s.assigned_draw_id && targetId && s.assigned_draw_id === targetId) {
                return true;
            }

            // Fallback (date-based): Is the subscription active through the draw date?
            if (s.current_period_end) {
                const endDateString = s.current_period_end.replace(' ', 'T');
                const end = new Date(endDateString);
                if (end >= nextDrawDate) return true;
            }

            // Final fallback: if no targetId specified, count all active subs
            return !targetId;
        });

        if (validSubscriptions.length === 0) {
            console.warn(`⚠️ getEligibleUsers: No subscriptions valid for draw date ${nextDrawDate.toISOString()}`);
            return [];
        }

        const activeUserIds = [...new Set(validSubscriptions.map(s => s.user_id))];

        // 2. Get profiles for these users, EXCLUDING admins and suspended users
        const profileUrl = `${SUPABASE_URL}/rest/v1/profiles?id=in.(${activeUserIds.join(',')})&role=neq.admin&status=eq.active&select=*`;
        const profileResponse = await fetch(profileUrl, { headers });
        const profiles = await profileResponse.json();

        // 3. For each profile, get their scores
        const eligibleUsers = [];
        for (const profile of profiles) {
            const scoresUrl = `${SUPABASE_URL}/rest/v1/scores?user_id=eq.${profile.id}&select=score&limit=10`;
            const scoresResponse = await fetch(scoresUrl, { headers });
            const scores = await scoresResponse.json();

            // Add user even if they have 0 scores for now, to confirm data is flowing
            // We can add the '>= 5' filter back once we see counts > 0
            eligibleUsers.push({
                ...profile,
                scores: Array.isArray(scores) ? scores.map(s => s.score) : []
            });
        }

        console.log(`✅ getEligibleUsers: Returning ${eligibleUsers.length} users`);
        return eligibleUsers;
    } catch (error) {
        console.error('❌ getEligibleUsers failed:', error);
        return [];
    }
}

/**
 * Count matches between user scores and winning numbers
 */
export function countMatches(userScores, winningNumbers) {
    const winSet = new Set(winningNumbers);
    let matches = 0;
    for (const score of userScores) {
        if (winSet.has(score)) matches++;
    }
    return matches;
}

/**
 * Simulate a draw with given score range (admin preview)
 * Returns winner counts and estimated payouts without saving
 */
export async function simulateDraw(minScore = 1, maxScore = 45, drawId = null) {
    try {
        // Get settings and frequencies in parallel
        const [settings, frequencies] = await Promise.all([
            getDrawSettings(),
            getScoreFrequencies(minScore, maxScore)
        ]);

        if (frequencies.length < 5) {
            return { error: 'Not enough score data in this range' };
        }

        // Generate winning numbers
        const winningNumbers = generateWinningNumbers(frequencies);

        // Get all eligible users for this draw context
        const eligibleUsers = await getEligibleUsers(drawId);

        if (eligibleUsers.length === 0) {
            return {
                error: 'No eligible participants',
                winningNumbers
            };
        }

        // Calculate matches for each user
        let tier1Count = 0, tier2Count = 0, tier3Count = 0;
        const entries = [];

        for (const user of eligibleUsers) {
            const matches = countMatches(user.scores, winningNumbers);
            let tier = null;

            if (matches === 5) { tier = 1; tier1Count++; }
            else if (matches === 4) { tier = 2; tier2Count++; }
            else if (matches === 3) { tier = 3; tier3Count++; }

            entries.push({
                user_id: user.id,
                name: user.full_name,
                scores: user.scores,
                matches,
                tier
            });
        }

        // Calculate prize pools using dynamic settings
        const basePrizePool = eligibleUsers.length * settings.base_amount_per_sub;
        const rawJackpot = await getJackpot();
        const jackpot = typeof rawJackpot === 'string' ? parseFloat(rawJackpot) : rawJackpot;

        // Standard allocations
        const tier1Percent = settings.tier1_percent / 100;
        const tier2Percent = settings.tier2_percent / 100;
        const tier3Percent = settings.tier3_percent / 100;

        let tier1Standard = basePrizePool * tier1Percent;
        let tier2Standard = basePrizePool * tier2Percent;
        let tier3Standard = basePrizePool * tier3Percent;

        // Jackpot cap logic ($250,000 diversion)
        const cap = settings.jackpot_cap || 250000;
        const totalPotentialJackpot = jackpot + tier1Standard;
        let capReached = false;
        let rolloverToTier2 = 0;

        if (totalPotentialJackpot > cap) {
            capReached = true;
            rolloverToTier2 = totalPotentialJackpot - cap;
            // The 5-match pool is strictly capped at $250k
            tier1Standard = Math.max(0, cap - jackpot);
        }

        const tier1Pool = Math.min(totalPotentialJackpot, cap);
        const tier2Pool = tier2Standard + rolloverToTier2;
        const tier3Pool = tier3Standard;

        // Payouts split among winners
        const tier1Payout = tier1Count > 0 ? tier1Pool / tier1Count : 0;
        const tier2Payout = tier2Count > 0 ? tier2Pool / tier2Count : 0;
        const tier3Payout = tier3Count > 0 ? tier3Pool / tier3Count : 0;

        // Jackpot rollover if no 5-match winner
        const jackpotRollover = tier1Count === 0 ? tier1Pool : 0;

        console.log('🔮 Simulation complete:', {
            tier1Count,
            tier2Count,
            tier3Count,
            capReached,
            rolloverToTier2
        });

        return {
            winningNumbers,
            leastPopular: frequencies.slice(0, 3).map(f => f.score),
            mostPopular: frequencies.slice(-2).map(f => f.score),
            scoreRange: { min: minScore, max: maxScore },
            participants: eligibleUsers.length,
            prizePool: basePrizePool,
            currentJackpot: jackpot,
            tier1: { count: tier1Count, pool: tier1Pool, payout: tier1Payout, base: tier1Standard },
            tier2: { count: tier2Count, pool: tier2Pool, payout: tier2Payout, base: tier2Standard, diversion: rolloverToTier2 },
            tier3: { count: tier3Count, pool: tier3Pool, payout: tier3Payout, base: tier3Standard },
            jackpotRollover,
            capReached,
            entries: entries.filter(e => e.tier !== null),
            settings
        };
    } catch (error) {
        console.error('Error simulating draw:', error);
        return { error: error.message };
    }
}

/**
 * Run the draw and save results to database
 */
export async function runDraw(drawId, minScore = 1, maxScore = 45) {
    try {
        const authToken = await getAuthToken();

        // First, simulate to get all data for THIS specific draw
        const simulation = await simulateDraw(minScore, maxScore, drawId);

        if (simulation.error) {
            return { success: false, error: simulation.error };
        }

        // Update draw with results
        const updateUrl = `${SUPABASE_URL}/rest/v1/draws?id=eq.${drawId}`;
        const drawUpdate = {
            status: 'completed',
            score_range_min: minScore,
            score_range_max: maxScore,
            winning_numbers: simulation.winningNumbers,
            prize_pool: simulation.prizePool,
            jackpot_added: simulation.currentJackpot,
            tier1_pool: simulation.tier1.pool,
            tier2_pool: simulation.tier2.pool,
            tier3_pool: simulation.tier3.pool,
            participants_count: simulation.participants,
            tier1_winners: simulation.tier1.count,
            tier2_winners: simulation.tier2.count,
            tier3_winners: simulation.tier3.count,
            tier1_rollover_amount: simulation.jackpotRollover,
            tier2_rollover_amount: simulation.tier2.diversion || 0,
            jackpot_cap_reached: simulation.capReached,
            draw_date: new Date().toISOString()
        };

        const updateResponse = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(drawUpdate)
        });

        if (!updateResponse.ok) {
            throw new Error('Failed to update draw');
        }

        // Create draw entries for all eligible users in bulk for better performance and reliability
        const eligibleUsers = await getEligibleUsers(drawId);
        if (eligibleUsers.length > 0) {
            const entriesToInsert = eligibleUsers.map(user => {
                const matches = countMatches(user.scores, simulation.winningNumbers);
                let tier = null;
                let grossPrize = 0;

                if (matches === 5) { tier = 1; grossPrize = simulation.tier1.payout; }
                else if (matches === 4) { tier = 2; grossPrize = simulation.tier2.payout; }
                else if (matches === 3) { tier = 3; grossPrize = simulation.tier3.payout; }

                const donationPercent = (user.donation_percentage || 10) / 100;
                const charityAmount = grossPrize * donationPercent;
                const netPayout = grossPrize - charityAmount;

                return {
                    draw_id: drawId,
                    user_id: user.id,
                    scores: user.scores,
                    matches,
                    tier,
                    gross_prize: grossPrize,
                    charity_amount: charityAmount,
                    net_payout: netPayout,
                    charity_id: user.selected_charity_id,
                    verification_status: tier ? 'Pending' : null
                };
            });

            // Use bulk insert
            const entryUrl = `${SUPABASE_URL}/rest/v1/draw_entries`;
            const entryResponse = await fetch(entryUrl, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(entriesToInsert)
            });

            if (!entryResponse.ok) {
                console.error('Failed to insert draw entries in bulk');
            } else {
                console.log(`✅ Inserted ${entriesToInsert.length} draw entries`);

                // Update account balances for winners
                const winningEntries = entriesToInsert.filter(e => e.tier !== null && e.net_payout > 0);
                if (winningEntries.length > 0) {
                    console.log(`💰 Syncing balances for ${winningEntries.length} winners...`);
                    for (const entry of winningEntries) {
                        try {
                            // Fetch current balance
                            const pUrl = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${entry.user_id}&select=account_balance`;
                            const pRes = await fetch(pUrl, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${authToken}` } });
                            const pData = await pRes.json();
                            const currentBal = pData[0]?.account_balance || 0;

                            // Update with new winnings
                            await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${entry.user_id}`, {
                                method: 'PATCH',
                                headers: {
                                    'apikey': SUPABASE_KEY,
                                    'Authorization': `Bearer ${authToken}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ account_balance: currentBal + entry.net_payout })
                            });
                        } catch (balErr) {
                            console.error(`Failed to update balance for user ${entry.user_id}:`, balErr);
                        }
                    }
                }
            }
        }

        // Update jackpot
        if (simulation.tier1.count === 0) {
            // No 5-match winner - add to jackpot
            const currentJackpot = typeof simulation.currentJackpot === 'string' ? parseFloat(simulation.currentJackpot) : simulation.currentJackpot;
            const rollover = typeof simulation.jackpotRollover === 'string' ? parseFloat(simulation.jackpotRollover) : simulation.jackpotRollover;
            const newJackpot = currentJackpot + rollover;
            await updateJackpot(newJackpot, drawId);
        } else {
            // Reset jackpot
            await updateJackpot(0, drawId);
        }

        // Log activity
        await logActivity('draw_completed', `Draw completed: ${simulation.tier1.count} tier1, ${simulation.tier2.count} tier2, ${simulation.tier3.count} tier3 winners`);

        console.log('✅ Draw executed successfully');
        return { success: true, simulation };
    } catch (error) {
        console.error('Error running draw:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update jackpot amount
 */
export async function updateJackpot(amount, drawId = null) {
    try {
        const authToken = await getAuthToken();
        const url = `${SUPABASE_URL}/rest/v1/jackpot_tracker?id=not.is.null`;

        const body = {
            amount,
            last_updated: new Date().toISOString()
        };

        // Only add last_draw_id if drawId is provided
        if (drawId) {
            body.last_draw_id = drawId;
        }

        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Failed to update jackpot: ${errText}`);
        }

        console.log('💰 Jackpot updated to:', amount);
        return { success: true };
    } catch (error) {
        console.error('Error updating jackpot:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Publish draw results (make visible to users)
 */
export async function publishDraw(drawId) {
    try {
        const authToken = await getAuthToken();
        const url = `${SUPABASE_URL}/rest/v1/draws?id=eq.${drawId}`;

        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'published',
                published_at: new Date().toISOString()
            })
        });

        if (!response.ok) {
            throw new Error('Failed to publish draw');
        }

        // 2. AUTOMATIC EXPIRATION: Expire all one-draw (monthly) subscriptions assigned to this draw
        try {
            // Fetch information about the draw we just published to get the month name
            const drawDataRes = await fetch(`${SUPABASE_URL}/rest/v1/draws?id=eq.${drawId}&select=month_year`, {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${authToken}` }
            });
            const drawData = await drawDataRes.json();
            const monthName = drawData && drawData[0]?.month_year;

            // Build a broad expiration filter to catch both ID-based and Month-based assignments
            // This handles legacy users who might be missing the assigned_draw_id
            const expireFilters = monthName
                ? `assigned_draw_id.eq.${drawId},assigned_draw_month.eq.${monthName}`
                : `assigned_draw_id.eq.${drawId}`;

            const expireUrl = `${SUPABASE_URL}/rest/v1/subscriptions?plan=eq.monthly&or=(${expireFilters})`;

            const expireRes = await fetch(expireUrl, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: 'cancelled',
                    draws_remaining: 0,
                    updated_at: new Date().toISOString()
                })
            });

            if (expireRes.ok) {
                console.log(`🔌 Robust Expiration: Monthly subscriptions for ${monthName || drawId} deactivated.`);
            } else {
                console.warn('⚠️ Expiration partial failure:', await expireRes.text());
            }
        } catch (expireErr) {
            console.error('Error during robust subscription expiration:', expireErr);
        }

        await logActivity('draw_published', `Draw ${drawId} published`);
        console.log('📢 Draw published');
        return { success: true };
    } catch (error) {
        console.error('Error publishing draw:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Reset a draw (Admin only)
 * Reverts a completed or published draw to 'open' status
 * Deletes draw entries, restores jackpot, and reactivates subscriptions
 */
export async function resetDraw(drawId) {
    try {
        const authToken = await getAuthToken();
        const headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        };

        // 1. Get draw details to find jackpot carryover and month name
        const drawRes = await fetch(`${SUPABASE_URL}/rest/v1/draws?id=eq.${drawId}&select=*`, { headers });
        const drawData = await drawRes.json();
        if (!drawData || drawData.length === 0) throw new Error('Draw not found');
        const draw = drawData[0];

        // 2. Restore Jackpot Tracker
        // When a draw is run, the tracker is updated. We should set it back to the carryover amount this draw started with.
        // If jackpot_added is null, it means there was no previous carryover, so reset to 0.
        const restoreAmount = draw.jackpot_added !== null ? Number(draw.jackpot_added) : 0;
        await updateJackpot(restoreAmount, drawId);

        // 3. Delete all draw_entries for this draw
        // This clears winners and their associated payout records
        const deleteEntriesUrl = `${SUPABASE_URL}/rest/v1/draw_entries?draw_id=eq.${drawId}`;
        const deleteRes = await fetch(deleteEntriesUrl, {
            method: 'DELETE',
            headers
        });
        if (!deleteRes.ok) console.warn('Possible failure deleting entries:', await deleteRes.text());

        // 4. Reactivate Monthly Subscriptions
        // Reverses the 'cancelled' status set during publishDraw
        const monthName = draw.month_year;
        const subFilters = monthName
            ? `assigned_draw_id.eq.${drawId},assigned_draw_month.eq.${monthName}`
            : `assigned_draw_id.eq.${drawId}`;

        const subUrl = `${SUPABASE_URL}/rest/v1/subscriptions?plan=eq.monthly&or=(${subFilters})`;
        await fetch(subUrl, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
                status: 'active',
                draws_remaining: 1,
                updated_at: new Date().toISOString()
            })
        });

        // 5. Reset Draw Record
        const resetUrl = `${SUPABASE_URL}/rest/v1/draws?id=eq.${drawId}`;
        const resetResponse = await fetch(resetUrl, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
                status: 'open',
                winning_numbers: null,
                prize_pool: 0,
                jackpot_added: null,
                tier1_pool: 0,
                tier2_pool: 0,
                tier3_pool: 0,
                participants_count: 0,
                tier1_winners: 0,
                tier2_winners: 0,
                tier3_winners: 0,
                tier1_rollover_amount: 0,
                tier2_rollover_amount: 0,
                jackpot_cap_reached: false,
                draw_date: null,
                published_at: null,
                updated_at: new Date().toISOString()
            })
        });

        if (!resetResponse.ok) throw new Error('Failed to reset draw record');

        // 6. Delete associated donations
        // This ensures the "Total Donated" metrics are updated correctly
        const deleteDonationsUrl = `${SUPABASE_URL}/rest/v1/donations?draw_id=eq.${drawId}`;
        await fetch(deleteDonationsUrl, { method: 'DELETE', headers });

        await logActivity('draw_reset', `Draw ${drawId} (${monthName}) has been reset to OPEN status.`);
        console.log('🔄 Draw reset successfully');
        return { success: true };
    } catch (error) {
        console.error('Error resetting draw:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Create a new draw for the next month
 */
export async function createNewDraw(monthYear) {
    try {
        const authToken = await getAuthToken();
        const url = `${SUPABASE_URL}/rest/v1/draws`;

        // 1. DEDUPLICATION CHECK: See if this month already exists
        const checkUrl = `${url}?month_year=eq.${monthYear}&select=id`;
        const checkResponse = await fetch(checkUrl, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`
            }
        });

        const existingData = await checkResponse.json();
        if (existingData && existingData.length > 0) {
            console.log('⏭️ Draw already exists for:', monthYear);
            return existingData[0];
        }

        // 2. Create if not exists
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                month_year: monthYear,
                status: 'open'
            })
        });

        if (!response.ok) {
            throw new Error('Failed to create draw');
        }

        const data = await response.json();
        await logActivity('draw_created', `New draw created: ${monthYear}`);
        console.log('🆕 New draw created:', monthYear);
        return data[0];
    } catch (error) {
        console.error('Error creating draw:', error);
        return null;
    }
}

// =====================================================
// ADMIN REPORTS API FUNCTIONS
// =====================================================

/**
 * Get draw analysis report for a specific draw
 * Returns winner counts by tier and payout details
 */
export async function getDrawAnalysisReport() {
    try {
        const authToken = await getAuthToken();
        const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${authToken}` };

        // ONLY GET COMPLETED OR PUBLISHED DRAWS FOR THE ANALYSIS REPORT
        // This ensures the report only shows finished results, not 'Live' or 'Reset' draws.
        const drawUrl = `${SUPABASE_URL}/rest/v1/draws?status=in.(completed,published)&select=*&order=draw_date.desc`;
        const drawResponse = await fetch(drawUrl, { headers });
        if (!drawResponse.ok) return [];

        const draws = await drawResponse.json();
        if (!Array.isArray(draws)) return [];

        const reports = [];
        for (const draw of draws) {
            const entriesUrl = `${SUPABASE_URL}/rest/v1/draw_entries?draw_id=eq.${draw.id}&select=*`;
            const entriesResponse = await fetch(entriesUrl, { headers });

            let entries = [];
            if (entriesResponse.ok) {
                const data = await entriesResponse.json();
                if (Array.isArray(data)) entries = data;
            }

            reports.push({
                ...draw,
                entries_count: entries.length,
                tier1_winners: entries.filter(e => e.tier === 1).length,
                tier2_winners: entries.filter(e => e.tier === 2).length,
                tier3_winners: entries.filter(e => e.tier === 3).length,
                total_charity: entries.reduce((sum, e) => sum + (Number(e.charity_amount) || 0), 0),
                total_payout: entries.reduce((sum, e) => sum + (Number(e.net_payout) || 0), 0)
            });
        }

        console.log('📊 Draw analysis reports generated:', reports.length);
        return reports;
    } catch (error) {
        console.error('Error getting draw analysis:', error);
        return [];
    }
}

/**
 * Get detailed winners list for a specific draw for export
 */
export async function getDrawWinnersExport(drawId) {
    try {
        const authToken = await getAuthToken();
        // Get entries with tier and prizes
        // We fetch profiles and charities as well for complete info
        const url = `${SUPABASE_URL}/rest/v1/draw_entries?draw_id=eq.${drawId}&tier=not.is.null&select=*,profiles(full_name,email),charities(name)&order=tier.asc`;

        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`
            }
        });

        const entries = await response.json();

        if (!Array.isArray(entries)) return [];

        return entries.map(e => ({
            id: e.id,
            userId: e.user_id,
            'Name': e.profiles?.full_name || 'Unknown',
            'Email': e.profiles?.email || 'N/A',
            'Match Tier': `${e.tier}-Match`,
            'Gross Prize': (e.gross_prize || 0),
            'Charity Name': e.charities?.name || 'Selected Charity',
            'Charity Donation': (e.charity_amount || 0),
            'Net Payout': (e.net_payout || 0),
            'Verification Status': e.verification_status || 'Pending',
            'isPaid': e.is_paid || false,
            'paidAt': e.paid_at,
            'paymentReference': e.payment_reference
        }));
    } catch (error) {
        console.error('Error fetching winners export:', error);
        return [];
    }
}

/**
 * Get charity donations report
 * Returns total raised per charity
 */
export async function getCharityDonationsReport() {
    try {
        console.log('📊 Fetching LIVE charity donations report...');
        const charities = await getCharities();

        const totalRaised = charities.reduce((sum, c) => sum + (c.total_raised || 0), 0);

        const reports = charities.map(c => ({
            id: c.id,
            name: c.name,
            category: c.category,
            logo_url: c.logo_url,
            image_url: c.image_url,
            image: c.image,
            logo: c.logo,
            total_raised: c.total_raised || 0,
            percentage: totalRaised > 0 ? Math.round((c.total_raised / totalRaised) * 100) : 0
        })).sort((a, b) => (b.total_raised || 0) - (a.total_raised || 0));

        return { charities: reports, total: totalRaised };
    } catch (error) {
        console.error('Error generating charity report:', error);
        return { charities: [], total: 0 };
    }
}

/**
 * Get jackpot history
 * Returns historical jackpot amounts
 */
export async function getJackpotHistory() {
    try {
        const authToken = await getAuthToken();

        // Get all completed/published draws with jackpot info
        const url = `${SUPABASE_URL}/rest/v1/draws?select=id,month_year,jackpot_added,tier1_winners,tier1_pool,draw_date&status=in.(completed,published)&order=draw_date.asc`;
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`
            }
        });

        const draws = await response.json();

        // Get current jackpot
        const currentJackpot = await getJackpot();

        console.log('📊 Jackpot history fetched:', draws.length, 'draws');
        return { history: draws, current: currentJackpot };
    } catch (error) {
        console.error('Error getting jackpot history:', error);
        return { history: [], current: 0 };
    }
}

/**
 * Get winners for verification
 * Returns entries that need admin verification
 */
export async function getWinnersForVerification() {
    try {
        const authToken = await getAuthToken();
        const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${authToken}` };

        // Fetch winners with draw and profile info
        // We filter out winners from 'open' draws to ensure consistency with results
        const url = `${SUPABASE_URL}/rest/v1/draw_entries?select=*,draws(month_year,status),profiles(full_name)&tier=not.is.null&draws.status=in.(completed,published)&order=created_at.desc`;

        const response = await fetch(url, { headers });
        const data = await (response.ok ? response.json() : []);

        if (!Array.isArray(data)) return [];

        // Manual filter backup for Nested status check
        const filteredData = data.filter(e => e.draws?.status !== 'open');

        console.log('📊 Winners for verification:', filteredData.length);
        return filteredData;
    } catch (error) {
        console.error('Error getting winners:', error);
        return [];
    }
}


/**
 * Update winner verification status
 */
export async function updateWinnerVerification(entryId, status, adminId) {
    try {
        const authToken = await getAuthToken();
        const url = `${SUPABASE_URL}/rest/v1/draw_entries?id=eq.${entryId}`;

        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                verification_status: status,
                verified_at: new Date().toISOString(),
                verified_by: adminId
            })
        });

        if (!response.ok) {
            throw new Error('Failed to update verification');
        }

        await logActivity('winner_verified', `Entry ${entryId} verification: ${status}`);
        console.log('✅ Winner verification updated');
        return { success: true };
    } catch (error) {
        console.error('Error updating verification:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Mark a winner as paid
 */
export async function markWinnerAsPaid(entryId, reference = '', adminId) {
    try {
        const authToken = await getAuthToken();
        const url = `${SUPABASE_URL}/rest/v1/draw_entries?id=eq.${entryId}`;

        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                is_paid: true,
                paid_at: new Date().toISOString(),
                payment_reference: reference,
                verification_status: 'Paid',
                verified_by: adminId
            })
        });

        if (!response.ok) {
            throw new Error('Failed to mark as paid');
        }

        await logActivity('winner_paid', `Entry ${entryId} marked as paid. Ref: ${reference}`);
        console.log('✅ Winner marked as paid');
        return { success: true };
    } catch (error) {
        console.error('Error marking as paid:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Create a Stripe Checkout session to fulfill a payout (Admin)
 */
export async function createPayoutSession(entryId, amount, winnerName, drawMonth) {
    try {
        const authToken = await getAuthToken();
        const functionUrl = `${SUPABASE_URL}/functions/v1/admin-payout-fulfill`;
        console.log('📡 Fetching Payout Session:', functionUrl);

        const response = await fetch(
            functionUrl,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ entryId, amount, winnerName, drawMonth })
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create payout session');
        }

        const data = await response.json();
        return { success: true, url: data.url };
    } catch (error) {
        console.error('Error creating payout session:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Process automated payout via Stripe Connect
 */
export async function processStripePayout(entryId) {
    try {
        console.log('💸 Processing automated Stripe payout for entry:', entryId);

        const response = await fetch(
            `${SUPABASE_URL}/functions/v1/process-payout`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await getAuthToken()}`
                },
                body: JSON.stringify({ entryId })
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Payout failed');
        }

        const data = await response.json();
        console.log('✅ Automated payout successful:', data);
        return { success: true, data };
    } catch (error) {
        console.error('Error processing Stripe payout:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get subscription report
 * Returns active/inactive counts and eligibility stats
 */
export async function getSubscriptionReport() {
    try {
        const authToken = await getAuthToken();

        // Get all subscriptions
        const subsUrl = `${SUPABASE_URL}/rest/v1/subscriptions?select=id,user_id,status,created_at`;
        const subsResponse = await fetch(subsUrl, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`
            }
        });
        const subscriptions = await subsResponse.json();

        const active = subscriptions.filter(s => s.status === 'active').length;
        const inactive = subscriptions.filter(s => s.status !== 'active').length;

        // Get eligible users (active sub + 5 scores)
        const eligibleUsers = await getEligibleUsers();

        console.log('📊 Subscription report:', { active, inactive, eligible: eligibleUsers.length });
        return {
            active,
            inactive,
            total: subscriptions.length,
            eligible: eligibleUsers.length,
            subscriptions
        };
    } catch (error) {
        console.error('Error getting subscription report:', error);
        return { active: 0, inactive: 0, total: 0, eligible: 0, subscriptions: [] };
    }
}

/**
 * Get monthly revenue data
 * Returns revenue aggregated by month
 */
export async function getMonthlyRevenue(months = 6) {
    try {
        const authToken = await getAuthToken();

        // Calculate date range
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);

        const url = `${SUPABASE_URL}/rest/v1/subscriptions?status=eq.active&created_at=gte.${startDate.toISOString()}&select=created_at,amount`;
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`
            }
        });

        const subscriptions = await response.json();

        // Group by month
        const monthlyData = {};
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        for (const sub of subscriptions) {
            const date = new Date(sub.created_at);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            const monthLabel = monthNames[date.getMonth()];

            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { month: monthLabel, value: 0, date: date };
            }
            monthlyData[monthKey].value += (sub.amount || 5); // Default $5 per subscription
        }

        // Convert to array and sort by date
        const result = Object.values(monthlyData)
            .sort((a, b) => a.date - b.date)
            .map(({ month, value }) => ({ month, value }));

        console.log('📊 Monthly revenue calculated:', result.length, 'months');
        return result;
    } catch (error) {
        console.error('Error getting monthly revenue:', error);
        return [];
    }
}

/**
 * Get monthly user growth
 * Returns new user counts by month
 */
export async function getMonthlyUserGrowth(months = 6) {
    try {
        const authToken = await getAuthToken();

        // Calculate date range
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);

        const url = `${SUPABASE_URL}/rest/v1/profiles?role=neq.admin&created_at=gte.${startDate.toISOString()}&select=created_at`;
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`
            }
        });

        const profiles = await response.json();

        // Group by month
        const monthlyData = {};
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        for (const profile of profiles) {
            const date = new Date(profile.created_at);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            const monthLabel = monthNames[date.getMonth()];

            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { month: monthLabel, value: 0, date: date };
            }
            monthlyData[monthKey].value += 1;
        }

        // Convert to array and sort
        const result = Object.values(monthlyData)
            .sort((a, b) => a.date - b.date)
            .map(({ month, value }) => ({ month, value }));

        console.log('📊 Monthly user growth calculated:', result.length, 'months');
        return result;
    } catch (error) {
        console.error('Error getting user growth:', error);
        return [];
    }
}

/**
 * Get overall report stats
 * Returns summary metrics
 */
export async function getReportStats() {
    try {
        const authToken = await getAuthToken();
        const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${authToken}` };

        // 1. Get current draw to scope subscribers (sync with dashboard)
        const currentDraw = await getCurrentDraw();
        const activeSubscribers = await getActiveSubscribersCount(currentDraw?.id);

        // 2. Calculate Total Revenue from the current pool
        const totalRevenue = activeSubscribers * 5;

        // 3. Get total players
        const usersUrl = `${SUPABASE_URL}/rest/v1/profiles?role=neq.admin&select=id`;
        const usersResponse = await fetch(usersUrl, { headers });
        const users = usersResponse.ok ? await usersResponse.json() : [];
        const totalUsers = Array.isArray(users) ? users.length : 0;

        // 4. Get total donated (uses donations table, cleaned by resetDraw)
        const totalDonated = await getTotalDonations();

        return {
            totalRevenue,
            activeSubscribers,
            totalUsers,
            totalDonated,
            avgDonation: totalDonated > 0 ? totalDonated / (activeSubscribers || 1) : 0
        };
    } catch (error) {
        console.error('Error getting report stats:', error);
        return { totalRevenue: 0, activeSubscribers: 0, totalUsers: 0, totalDonated: 0, avgDonation: 0 };
    }
}

/**
 * Export data to CSV format
 */
export function exportToCSV(data, filename) {
    if (!data || data.length === 0) {
        console.warn('No data to export');
        return;
    }

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row =>
        Object.values(row).map(val =>
            typeof val === 'string' && val.includes(',') ? `"${val}"` : val
        ).join(',')
    );
    const csv = [headers, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('📥 CSV exported:', filename);
}

/**
 * Get user impact statistics for the My Charity page
 * Fetches real data from scores, donations, and profile tables
 * @param {string} userId - The user's ID
 * @returns {Object} Impact stats: totalDonated, roundsPlayed, monthsActive, impactRank
 */
export async function getUserImpactStats(userId) {
    if (!userId) {
        console.warn('⚠️ getUserImpactStats: No userId provided');
        return { totalDonated: 0, roundsPlayed: 0, monthsActive: 0, impactRank: 'N/A' };
    }

    const token = await getAuthToken();
    const headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    try {
        // 1. Get total donations from donations table
        let totalDonated = 0;
        try {
            const donationsRes = await fetch(
                `${SUPABASE_URL}/rest/v1/donations?user_id=eq.${userId}&select=amount`,
                { headers }
            );
            if (donationsRes.ok) {
                const donations = await donationsRes.json();
                totalDonated = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
            }
        } catch (e) {
            console.warn('Could not fetch donations:', e.message);
        }

        // 2. Get rounds played (count of scores)
        let roundsPlayed = 0;
        try {
            const scoresRes = await fetch(
                `${SUPABASE_URL}/rest/v1/scores?user_id=eq.${userId}&select=id`,
                { headers, method: 'HEAD' }
            );
            // Try to get count from header or fetch actual data
            const scoresCountRes = await fetch(
                `${SUPABASE_URL}/rest/v1/scores?user_id=eq.${userId}&select=id`,
                { headers }
            );
            if (scoresCountRes.ok) {
                const scores = await scoresCountRes.json();
                roundsPlayed = scores.length;
            }
        } catch (e) {
            console.warn('Could not fetch scores count:', e.message);
        }

        // 3. Get months active (from profile created_at)
        let monthsActive = 0;
        try {
            const profileRes = await fetch(
                `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=created_at`,
                { headers }
            );
            if (profileRes.ok) {
                const profiles = await profileRes.json();
                if (profiles.length > 0 && profiles[0].created_at) {
                    const createdAt = new Date(profiles[0].created_at);
                    const now = new Date();
                    monthsActive = Math.max(1, Math.floor((now - createdAt) / (1000 * 60 * 60 * 24 * 30)));
                }
            }
        } catch (e) {
            console.warn('Could not fetch profile:', e.message);
        }

        // 4. Calculate impact rank (compare to other users)
        let impactRank = 'N/A';
        try {
            // Get all users' donation totals
            const allDonationsRes = await fetch(
                `${SUPABASE_URL}/rest/v1/donations?select=user_id,amount`,
                { headers }
            );
            if (allDonationsRes.ok) {
                const allDonations = await allDonationsRes.json();

                // Aggregate by user
                const userTotals = {};
                allDonations.forEach(d => {
                    userTotals[d.user_id] = (userTotals[d.user_id] || 0) + (d.amount || 0);
                });

                const sortedTotals = Object.entries(userTotals)
                    .sort((a, b) => b[1] - a[1])
                    .map(([id]) => id);

                if (sortedTotals.length > 0) {
                    const userPosition = sortedTotals.indexOf(userId) + 1;
                    if (userPosition > 0) {
                        const percentile = Math.round((userPosition / sortedTotals.length) * 100);
                        impactRank = `Top ${Math.min(percentile, 100)}%`;
                    } else {
                        impactRank = 'New';
                    }
                } else {
                    impactRank = 'Pioneer';
                }
            }
        } catch (e) {
            console.warn('Could not calculate impact rank:', e.message);
        }

        console.log('📊 User impact stats:', { totalDonated, roundsPlayed, monthsActive, impactRank });
        return { totalDonated, roundsPlayed, monthsActive, impactRank };

    } catch (error) {
        console.error('Error fetching user impact stats:', error);
        return { totalDonated: 0, roundsPlayed: 0, monthsActive: 0, impactRank: 'N/A' };
    }
}

/**
 * Get homepage impact statistics
 * Returns: totalRaised, charityCount, golferCount, livesImpacted
 */
export async function getHomePageStats() {
    try {
        const [charities, profiles] = await Promise.all([
            getCharities(),
            getTableData('profiles', 'id,role,status')
        ]);

        const totalRaised = charities.reduce((sum, c) => sum + (c.total_raised || 0), 0);
        const charityCount = charities.filter(c => c.status !== 'inactive').length;

        // Count active non-admin golfers
        const golferCount = profiles.filter(p => p.role !== 'admin' && p.status === 'active').length;

        // Calculate lives impacted (estimate: each $10 donated helps ~3 lives)
        const livesImpacted = Math.floor(totalRaised * 0.3);

        return {
            totalRaised: Math.round(totalRaised),
            charityCount,
            golferCount,
            livesImpacted: livesImpacted || 0,
            activeSubscribers: profiles.filter(p => p.status === 'active' && p.role !== 'admin').length // Added for dashboard consistency
        };
    } catch (error) {
        console.error('Error fetching homepage stats:', error);
        return { totalRaised: 0, charityCount: 0, golferCount: 0, livesImpacted: 0 };
    }
}

/**
 * Get featured charities for homepage carousel
 * Returns charities with their names, descriptions, categories, and total raised
 */
export async function getFeaturedCharities(limit = 4) {
    try {
        console.log('🌟 Fetching LIVE featured charities...');
        const charities = await getCharities();

        // Use top charities from getCharities() which are already sorted by featured status
        const topCharities = charities
            .filter(c => c.status !== 'inactive')
            .slice(0, limit);

        // Map database fields to format expected by CharityCarousel.jsx
        return topCharities.map(c => ({
            id: c.id,
            name: c.name,
            category: c.category || 'Charity',
            description: c.description || '',
            raised: c.total_raised || 0,
            image: c.image || c.image_url
        }));
    } catch (error) {
        console.error('Error fetching featured charities:', error);
        return [];
    }
}

/**
 * Get leaderboard data for the homepage
 * Returns top 5 players by total amount raised
 */
export async function getLeaderboardData(limit = 5) {
    try {
        // We use ONLY the apikey for public data to ensure EVERYONE sees the same leaderboard
        // Session-based Authorization often restricts views based on RLS (Row Level Security)
        const publicHeaders = {
            'apikey': SUPABASE_KEY,
            'Content-Type': 'application/json'
        };

        console.log('🏆 getLeaderboardData: Fetching public community impact data...');

        // 1. Get ALL sources of impact: 'donations' table AND 'draw_entries' table
        let allDonations = [];
        let allDrawEntries = [];

        try {
            // Fetch direct donations (Public view)
            const donationsRes = await fetch(
                `${SUPABASE_URL}/rest/v1/donations?select=user_id,amount`,
                { headers: publicHeaders }
            );
            if (donationsRes.ok) {
                allDonations = await donationsRes.json();
            }

            // Fetch charity amounts from draw entries (Public view)
            const entriesRes = await fetch(
                `${SUPABASE_URL}/rest/v1/draw_entries?charity_amount=gt.0&select=user_id,charity_amount`,
                { headers: publicHeaders }
            );
            if (entriesRes.ok) {
                allDrawEntries = await entriesRes.json();
            }
        } catch (e) {
            console.warn('Leaderboard: Public data fetch failed', e.message);
        }

        // Aggregate impact totals by user
        const userTotals = {};

        // Sum from donations
        allDonations.forEach(d => {
            if (d.user_id) {
                userTotals[d.user_id] = (userTotals[d.user_id] || 0) + (parseFloat(d.amount) || 0);
            }
        });

        // Sum from draw entries
        allDrawEntries.forEach(e => {
            if (e.user_id) {
                userTotals[e.user_id] = (userTotals[e.user_id] || 0) + (parseFloat(e.charity_amount) || 0);
            }
        });

        // 2. Sort real users by combined impact
        const sortedRealUserIds = Object.entries(userTotals)
            .sort((a, b) => b[1] - a[1])
            .map(([id]) => id);

        // 3. Define the "Placeholder Champions" (Mock data for backfilling)
        const MOCK_PLAYERS = [
            {
                name: "James Mitchell",
                initials: "JM",
                scores: [34, 31, 38, 29, 35],
                raised: 2450,
                charity: "Red Cross",
                donation_percentage: 60,
                avg: 32
            },
            {
                name: "Sarah Chen",
                initials: "SC",
                scores: [32, 36, 33, 30, 34],
                raised: 1890,
                charity: "Beyond Blue",
                donation_percentage: 45,
                avg: 33
            },
            {
                name: "Michael O'Brien",
                initials: "MO",
                scores: [35, 29, 37, 32, 31],
                raised: 1650,
                charity: "Smith Family",
                donation_percentage: 50,
                avg: 33
            },
            {
                name: "Emma Williams",
                initials: "EW",
                scores: [30, 33, 35, 28, 36],
                raised: 1420,
                charity: "OzHarvest",
                donation_percentage: 40,
                avg: 32
            },
            {
                name: "David Kim",
                initials: "DK",
                scores: [33, 31, 34, 37, 29],
                raised: 980,
                charity: "RSPCA Australia",
                donation_percentage: 35,
                avg: 33
            }
        ];

        // Style presets for the ranks
        const ACCENTS = [
            { accent: "from-emerald-400 to-teal-600", glow: "rgba(16, 185, 129, 0.3)" },
            { accent: "from-teal-400 to-emerald-600", glow: "rgba(20, 184, 166, 0.3)" },
            { accent: "from-lime-400 to-emerald-600", glow: "rgba(163, 230, 53, 0.3)" },
            { accent: "from-emerald-500 to-emerald-800", glow: "rgba(16, 185, 129, 0.2)" },
            { accent: "from-zinc-500 to-zinc-800", glow: "rgba(113, 113, 122, 0.2)" }
        ];

        let finalLeaderboard = [];

        // 4. Fetch profiles and scores for real users
        // Create a set of IDs to fetch profiles for
        // We include specifically found winners + a general search for any active impact
        let targetUserIds = [...sortedRealUserIds];

        // Final attempt to get real users to show something real
        if (targetUserIds.length === 0) {
            console.log('🏆 No winners found in direct fetch, searching for active profiles...');
        }

        try {
            // Updated query: fetches specific winners OR any users with recorded community impact OR specific testers
            // Using a broad search to ensure we find 'Test User' even if the win record is private
            let profilesUrl = `${SUPABASE_URL}/rest/v1/profiles?select=id,full_name,selected_charity_id,donation_percentage`;

            // Build filter: specific winners OR top general profiles OR anyone named 'Test User'
            const orFilters = [
                'role.eq.player',
                'role.eq.user',
                'full_name.ilike.*Test*'
            ];

            if (sortedRealUserIds.length > 0) {
                orFilters.push(`id.in.(${sortedRealUserIds.slice(0, 20).join(',')})`);
            }

            profilesUrl += `&or=(${orFilters.join(',')})&limit=15`;

            const profilesRes = await fetch(profilesUrl, { headers: publicHeaders });
            const profiles = profilesRes.ok ? await profilesRes.json() : [];

            if (profiles && profiles.length > 0) {
                console.log(`🏆 Found ${profiles.length} real profiles to display`);

                // Get charity names
                const charityIds = [...new Set(profiles.map(p => p.selected_charity_id).filter(Boolean))];
                let charityMap = {};
                if (charityIds.length > 0) {
                    const charitiesRes = await fetch(
                        `${SUPABASE_URL}/rest/v1/charities?id=in.(${charityIds.join(',')})&select=id,name`,
                        { headers: publicHeaders }
                    );
                    if (charitiesRes.ok) {
                        const charities = await charitiesRes.json();
                        charities.forEach(c => {
                            charityMap[c.id] = c.name;
                        });
                    }
                }

                // Get scores
                let userScoresMap = {};
                const profileIds = profiles.map(p => p.id);
                if (profileIds.length > 0) {
                    const scoresRes = await fetch(
                        `${SUPABASE_URL}/rest/v1/scores?user_id=in.(${profileIds.join(',')})&select=user_id,score,created_at&order=created_at.desc`,
                        { headers: publicHeaders }
                    );
                    if (scoresRes.ok) {
                        const data = await scoresRes.json();
                        data.forEach(s => {
                            if (!userScoresMap[s.user_id]) userScoresMap[s.user_id] = [];
                            if (userScoresMap[s.user_id].length < 5) userScoresMap[s.user_id].push(s.score);
                        });
                    }
                }

                // Map real users to final format
                // Map real users to final format
                profiles.forEach(profile => {
                    // Skip the generic system Admin account but allow 'Test User' or other admins
                    if (profile.full_name === 'Admin') return;

                    // Use the aggregated impact found from donations/draws
                    const raised = userTotals[profile.id] || 0;

                    const scores = userScoresMap[profile.id] || [];
                    const initials = (profile.full_name || 'Anonymous').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

                    finalLeaderboard.push({
                        id: profile.id,
                        rank: 0, // Will set later
                        name: profile.full_name || 'Anonymous player',
                        initials,
                        scores: scores.length < 5 ? [...scores, ...Array(5 - scores.length).fill(0)] : scores,
                        raised: `$${Math.round(raised).toLocaleString()}`,
                        raisedValue: raised, // To keep sorting consistent
                        charity: charityMap[profile.selected_charity_id] || 'Various Charities',
                        charityId: profile.selected_charity_id,
                        percentage: `${profile.donation_percentage || 20}%`,
                        avg: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
                        isMock: false
                    });
                });
            }
        } catch (err) {
            console.error('Error fetching real golfer details:', err);
        }

        // 5. Backfill with mock data until limit is reached
        // We already have real users in finalLeaderboard from the profiles loop
        let mockIndex = 0;
        while (finalLeaderboard.length < limit && mockIndex < MOCK_PLAYERS.length) {
            const mock = MOCK_PLAYERS[mockIndex];

            // Check if mock user name is already in the list (prevents duplicates during tests)
            const isAlreadyPresent = finalLeaderboard.some(p => p.name === mock.name);

            if (!isAlreadyPresent) {
                finalLeaderboard.push({
                    ...mock,
                    rank: finalLeaderboard.length + 1,
                    raised: `$${mock.raised.toLocaleString()}`,
                    raisedValue: mock.raised,
                    isMock: true
                });
            }
            mockIndex++;
        }

        // 6. FINAL SORT: Prioritize Real Players over Mock Data
        // This ensures real club members are ALWAYS on top, even if their impact is low.
        finalLeaderboard.sort((a, b) => {
            // First Priority: Real vs Mock
            if (a.isMock !== b.isMock) {
                return a.isMock ? 1 : -1; // Real users (-1) come first
            }
            // Second Priority: Impact value (highest first)
            return (b.raisedValue || 0) - (a.raisedValue || 0);
        });

        // 7. Truncate to limit and assign rank + styling
        return finalLeaderboard.slice(0, limit).map((player, index) => ({
            ...player,
            rank: index + 1, // Reset rank according to final sorted position
            ...(ACCENTS[index] || ACCENTS[ACCENTS.length - 1])
        }));

    } catch (error) {
        console.error('Leaderboard: Critical error', error);
        return MOCK_PLAYERS.slice(0, limit).map((p, i) => ({
            ...p,
            raised: `$${p.raised.toLocaleString()}`,
            raisedValue: p.raised,
            isMock: true,
            ...(ACCENTS[i] || ACCENTS[ACCENTS.length - 1])
        }));
    }
}

