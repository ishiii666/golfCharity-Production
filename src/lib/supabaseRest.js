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
 * Enrich charity data with robust image fallbacks and standardized fields
 */
export function enrichCharityData(c) {
    if (!c) return null;

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
    } else if (name.includes('salvation') || name.includes('army') || category.includes('community')) {
        fallbackImageId = 'photo-1469571486292-0ba58a3f068b';
    } else if (name.includes('red cross') || name.includes('humanitarian')) {
        fallbackImageId = 'photo-1488521787991-ed7bbaae773c';
    }

    let fallbackUrl = `https://images.unsplash.com/${fallbackImageId}?auto=format&fit=crop&q=80&w=800`;
    fallbackLogo = `https://images.unsplash.com/${fallbackImageId}?auto=format&fit=crop&q=80&w=200`;

    // Priority 1: High-quality local assets for core charities
    if (name.includes('blue') || category.includes('mental')) {
        fallbackUrl = '/images/charities/beyond_blue_main.png';
        fallbackLogo = '/images/charities/beyond_blue_main.png';
    } else if (name.includes('cancer') || category.includes('medical') || category.includes('health')) {
        fallbackUrl = '/images/charities/cancer_council_main.png';
        fallbackLogo = '/images/charities/cancer_council_main.png';
    }

    // Return object with standardized fields
    return {
        ...c,
        image_url: c.image_url || c.image || fallbackUrl,
        logo_url: c.logo_url || c.logo || fallbackLogo,
        image: c.image_url || c.image || fallbackUrl,
        logo: c.logo_url || c.logo || fallbackLogo
    };
}

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
        const url = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=bank_name,bsb_number,account_number,full_name,email,stripe_account_id`;

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

        // AUTO-FIX: Ensure "9th" is transformed to "1st" globally for consistency
        const sanitizedData = Array.isArray(data) ? data.map(item => ({
            ...item,
            field_value: (typeof item.field_value === 'string')
                ? item.field_value.replace(/9th/g, '1st')
                : item.field_value
        })) : [];

        return sanitizedData;
    } catch (error) {
        console.error('Error fetching site content:', error);
        return [];
    }
}

// =====================================================
// FAQ MANAGEMENT API FUNCTIONS
// =====================================================

/**
 * Get all FAQs from database
 */
export async function getFaqs() {
    try {
        const url = `${SUPABASE_URL}/rest/v1/faqs?select=*&order=display_order.asc`;
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${await getAuthToken()}`
            }
        });

        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.error('Error fetching FAQs:', error);
        return [];
    }
}

/**
 * Save/Update an FAQ
 */
export async function saveFaq(faq) {
    try {
        const authToken = await getAuthToken();
        const url = faq.id
            ? `${SUPABASE_URL}/rest/v1/faqs?id=eq.${faq.id}`
            : `${SUPABASE_URL}/rest/v1/faqs`;

        const response = await fetch(url, {
            method: faq.id ? 'PATCH' : 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(faq)
        });

        if (!response.ok) throw new Error('Failed to save FAQ');
        const data = await response.json();
        return data[0];
    } catch (error) {
        console.error('Error saving FAQ:', error);
        throw error;
    }
}

/**
 * Delete an FAQ
 */
export async function deleteFaq(id) {
    try {
        const authToken = await getAuthToken();
        const url = `${SUPABASE_URL}/rest/v1/faqs?id=eq.${id}`;

        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!response.ok) throw new Error('Failed to delete FAQ');
        return { success: true };
    } catch (error) {
        console.error('Error deleting FAQ:', error);
        throw error;
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
        const profilesUrl = `${SUPABASE_URL}/rest/v1/profiles?select=id,role,status,full_name`;
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
 * Get total donations amount (Cleaned to avoid double counting)
 * Sum of: All Direct Gifts + All Prize Splits + All Subscription Slices
 */
export async function getTotalDonations() {
    try {
        const url = `${SUPABASE_URL}/rest/v1/donations?select=amount,source`;
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${await getAuthToken()}`
            }
        });

        if (!response.ok) return 0;

        const donations = await response.json();
        const total = donations.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

        return Math.round(total * 100) / 100;
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
        const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${authToken}` };

        // 1. Fetch ALL draw entries for winnings and charity impact
        const entriesUrl = `${SUPABASE_URL}/rest/v1/draw_entries?user_id=eq.${userId}&select=net_payout,gross_prize,charity_amount,is_paid,paid_at,payment_reference,draw_id,draws(month_year)`;
        const entriesRes = await fetch(entriesUrl, { headers });
        const entries = await entriesRes.json();

        const totalWinnings = entries.reduce((sum, entry) => sum + (Number(entry.net_payout) || 0), 0);
        const totalCharityImpact = entries.reduce((sum, entry) => sum + (Number(entry.charity_amount) || 0), 0);

        // Calculate "Paid Out" from draw entries marked as paid
        const winnerPrizesPaid = entries
            .filter(e => e.is_paid)
            .reduce((sum, e) => sum + (Number(e.net_payout) || 0), 0);

        // 2. Fetch manual payouts (withdrawals/portal transfers)
        const payoutsUrl = `${SUPABASE_URL}/rest/v1/payouts?user_id=eq.${userId}&select=*&order=transfer_date.desc`;
        const payoutsRes = await fetch(payoutsUrl, { headers });
        const payouts = await payoutsRes.json();

        const manualPaidOut = payouts.reduce((sum, payout) => sum + (Number(payout.amount) || 0), 0);

        // Total Paid Out = Prize settlements + Manual withdrawals
        const totalPaidOut = winnerPrizesPaid + manualPaidOut;

        // 3. Fetch profile for join date and balance
        const profileUrl = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=created_at,account_balance`;
        const profileRes = await fetch(profileUrl, { headers });
        const profile = await profileRes.json();

        const joinDate = profile[0]?.created_at || new Date().toISOString();
        const diffTime = Math.abs(new Date() - new Date(joinDate));
        const membershipMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.44));

        // 4. Combine histories for the "Financials" tab
        const combinedHistory = [
            ...payouts.map(p => ({
                id: p.id,
                amount: p.amount,
                date: p.transfer_date,
                reference: p.reference || 'SYSTEM',
                type: 'Withdrawal',
                status: 'Confirmed'
            })),
            ...entries.filter(e => e.is_paid).map(e => ({
                id: e.id,
                amount: e.net_payout,
                date: e.paid_at,
                reference: e.payment_reference || e.payout_ref || 'PRIZE_SETTLEMENT',
                type: `Prize (${e.draws?.month_year || 'Historical'})`,
                status: 'Settled'
            }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        return {
            totalWinnings,
            totalPaidOut,
            totalCharityImpact,
            currentBalance: Number(profile[0]?.account_balance || 0),
            membershipMonths: Math.max(1, membershipMonths),
            joinDate: joinDate,
            payouts: combinedHistory
        };
    } catch (error) {
        console.error('Error fetching user stats:', error);
        return { totalWinnings: 0, totalPaidOut: 0, totalCharityImpact: 0, currentBalance: 0, membershipMonths: 0, payouts: [] };
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
        return { success: false, error: error.message };
    }
}

export async function deleteUser(userId) {
    try {
        const authToken = await getAuthToken();
        const url = `${SUPABASE_URL}/functions/v1/delete-account`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ targetUserId: userId })
        });

        if (!response.ok) {
            let errorMessage = 'Failed to delete user';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (e) {
                // If not JSON, get text
                const text = await response.text();
                errorMessage = text || response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error deleting user:', error);
        throw error;
    }
}

/**
 * Insert a row into a table
 */
export async function insertData(table, rowData) {
    try {
        const authToken = await getAuthToken();
        const url = `${SUPABASE_URL}/rest/v1/${table}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(rowData)
        });

        if (!response.ok) {
            let errorMessage = 'Insert failed';
            try {
                const text = await response.text();
                try {
                    const error = JSON.parse(text);
                    errorMessage = error.message || error.error || errorMessage;
                } catch (e) {
                    errorMessage = text || errorMessage;
                }
            } catch (e) {
                errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        // Handle empty response (common when RLS allows INSERT but not SELECT/representation)
        const text = await response.text();
        if (!text) return { success: true };

        try {
            const data = JSON.parse(text);
            return Array.isArray(data) ? data[0] : data;
        } catch (e) {
            return { success: true };
        }
    } catch (error) {
        console.error(`Error inserting into ${table}:`, error);
        throw error;
    }
}

/**
 * Submit a contact inquiry
 */
export async function submitContactInquiry(inquiryData) {
    return insertData('contact_inquiries', inquiryData);
}

/**
 * Get all contact inquiries (Admin only)
 */
export async function getContactInquiries() {
    try {
        const { data } = await supabaseRest('contact_inquiries', {
            select: '*',
            filter: 'order=created_at.desc'
        });
        return data || [];
    } catch (error) {
        console.error('Error fetching contact inquiries:', error);
        return [];
    }
}

/**
 * Update a contact inquiry (Status, Notes)
 */
export async function updateContactInquiry(id, updates) {
    return updateRow('contact_inquiries', id, updates);
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
    const [charities, totalDonated, recentActivity, currentDraw, winners, charitySummary] = await Promise.all([
        getTableData('charities', 'id'),
        getTotalDonations(),
        getRecentActivity(5),
        getCurrentDraw(),
        getTableData('draw_entries', 'id,is_paid,tier'),
        getCharityPayoutSummary()
    ]);

    // 3. Get accurate subscriber count and plan details for revenue
    const subsUrl = `${SUPABASE_URL}/rest/v1/subscriptions?status=eq.active&select=plan`;
    const subsRes = await fetch(subsUrl, { headers });
    const activeSubs = subsRes.ok ? await subsRes.json() : [];
    const activeSubCount = activeSubs.length;

    // 4. Calculate Platform Revenue and Prize Pool contribution
    const monthlyRev = activeSubs.reduce((sum, sub) => {
        const amount = sub.plan === 'annual' ? 9 : 11;
        return sum + (amount - 5);
    }, 0);

    const prizePoolRev = activeSubCount * 5;

    // 5. Calculate pending payouts (verified but not paid)
    const pendingPayouts = (winners || []).filter(w => w.tier !== null && !w.is_paid).length;

    // 7. Charities needing payout
    const charityPayoutCount = (charitySummary || []).length;

    // Determine what draw is "Next"
    const nextDrawLabel = currentDraw?.status === 'open'
        ? currentDraw.month_year
        : getDrawMonthYear();

    // 8. Contact inquiries count (pending)
    const inquiryUrl = `${SUPABASE_URL}/rest/v1/contact_inquiries?status=eq.pending&select=id`;
    const inquiryRes = await fetch(inquiryUrl, { headers });
    const pendingInquiries = inquiryRes.ok ? await inquiryRes.json() : [];
    const pendingInquiryCount = pendingInquiries.length;

    console.log('📊 Admin Stats Updated:', { activeSubCount, nextDrawLabel, pendingPayouts, pendingInquiryCount });

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
        monthlyRevenue: monthlyRev,
        prizePoolRevenue: prizePoolRev,
        charityPayoutCount,
        pendingInquiriesCount: pendingInquiryCount
    };
}

/**
 * Get all charities for admin management
 */
export async function getCharities() {
    try {
        console.log('🏥 Fetching charities with COMPREHENSIVE LIVE stats...');

        // 1. Fetch base data in parallel
        const [charities, profiles, subscriptions, donations, drawEntries] = await Promise.all([
            getTableData('charities', '*'),
            getTableData('profiles', 'id,selected_charity_id,status,role'),
            getTableData('subscriptions', 'user_id,plan,status'),
            getTableData('donations', 'charity_id,amount'),
            getTableData('draw_entries', 'charity_id,charity_amount')
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

        // 4. Calculate contribution from actual donation records (Direct)
        (donations || []).forEach(d => {
            if (raisedMap[d.charity_id] !== undefined) {
                raisedMap[d.charity_id] += parseFloat(d.amount || 0);
            }
        });

        // 4.1. Calculate contribution from Draw Entries (Impact)
        (drawEntries || []).forEach(e => {
            if (e.charity_id && raisedMap[e.charity_id] !== undefined) {
                raisedMap[e.charity_id] += parseFloat(e.charity_amount || 0);
            }
        });

        // 5. Calculate supporters from active profiles
        (profiles || []).forEach(p => {
            const role = String(p.role || '').toLowerCase();
            const status = String(p.status || '').toLowerCase();

            if (p.selected_charity_id && status === 'active' && role !== 'admin') {
                if (supportersMap[p.selected_charity_id] !== undefined) {
                    supportersMap[p.selected_charity_id]++;
                }

                // OPTIONAL: If we want "Current Projected Growth" in the raisedMap, 
                // we could add current month's sub-cut here. 
                // However, for "Total Raised", we should stick to actual processed donations.
            }
        });

        // 6. Merge stats back into charities and enrich
        return (charities || []).map(c => {
            const liveRaised = raisedMap[c.id] || 0;
            const liveSupporters = supportersMap[c.id] || 0;

            const enriched = enrichCharityData(c);
            return {
                ...enriched,
                total_raised: liveRaised,
                supporters: liveSupporters,
                supporter_count: liveSupporters,
                totalRaised: liveRaised,
                supporterCount: liveSupporters
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
                    'apikey': SUPABASE_KEY,
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await getAuthToken()}`
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

        // 1. Try to find a 'completed' draw first (Needs Audit/Action)
        const completedUrl = `${SUPABASE_URL}/rest/v1/draws?status=eq.completed&select=*&order=created_at.asc&limit=1`;
        const completedRes = await fetch(completedUrl, { headers });
        const completedDraws = await completedRes.json();

        if (Array.isArray(completedDraws) && completedDraws.length > 0) {
            console.log('🎯 Current Draw: Found COMPLETED draw needing audit:', completedDraws[0].month_year);
            return completedDraws[0];
        }

        // 2. Try to find the OLDEST 'open' draw
        const openUrl = `${SUPABASE_URL}/rest/v1/draws?status=eq.open&select=*&order=created_at.asc&limit=1`;
        const openRes = await fetch(openUrl, { headers });
        const openDraws = await openRes.json();

        if (Array.isArray(openDraws) && openDraws.length > 0) {
            console.log('🎯 Current Draw: Found active OPEN cycle:', openDraws[0].month_year);
            return openDraws[0];
        }

        // 3. Fallback to newest
        const historyUrl = `${SUPABASE_URL}/rest/v1/draws?select=*&order=created_at.desc&limit=1`;
        const historyRes = await fetch(historyUrl, { headers });
        const historyDraws = await historyRes.json();

        if (Array.isArray(historyDraws) && historyDraws.length > 0) {
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

        // FIXED: Expand window to 90 days to avoid "Day 1" bugs and ensure enough data
        const lookbackDate = new Date();
        lookbackDate.setDate(lookbackDate.getDate() - 90);
        lookbackDate.setHours(0, 0, 0, 0);

        const url = `${SUPABASE_URL}/rest/v1/scores?score=gte.${minScore}&score=lte.${maxScore}&created_at=gte.${lookbackDate.toISOString()}&select=score`;
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

        // 2. Get profiles for these users
        const profileUrl = `${SUPABASE_URL}/rest/v1/profiles?id=in.(${activeUserIds.join(',')})&status=eq.active&select=*`;
        const profileResponse = await fetch(profileUrl, { headers });
        const profilesRaw = await profileResponse.json();

        // Consistent Filtering: Exclude real admins, keep players and "Test User"
        const profiles = (profilesRaw || []).filter(p =>
            p.role !== 'admin' ||
            p.full_name === 'Test User' ||
            p.email === 'testuser777@gmail.com'
        );

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

                // Phase 1: Create donation records for the charity share of each win (Decision Logic)
                const winningEntries = entriesToInsert.filter(e => e.tier !== null && e.charity_amount > 0);
                if (winningEntries.length > 0) {
                    console.log(`🎁 Creating ${winningEntries.length} donation records for survivors...`);
                    const donationsToInsert = winningEntries.map(entry => ({
                        charity_id: entry.charity_id,
                        user_id: entry.user_id,
                        draw_id: drawId,
                        amount: entry.charity_amount,
                        source: 'prize_split',
                        status: 'pending'
                    }));

                    await fetch(`${SUPABASE_URL}/rest/v1/donations`, {
                        method: 'POST',
                        headers: {
                            'apikey': SUPABASE_KEY,
                            'Authorization': `Bearer ${authToken}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify(donationsToInsert)
                    });
                }

                // NOTE: Wallet balance updates (Execution Logic) have been removed from this module.
                // They will now be handled exclusively by the Finance module upon verification and settlement.
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
/**
 * REVISED: Comprehensive Charity Financial Report
 * Based on winner-led donations and direct gifts logic.
 */
export async function getCharityDonationsReport() {
    try {
        console.log('📊 Generating Charity Financial Report (Winner-Led Logic)...');
        const authToken = await getAuthToken();
        const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${authToken}` };

        // 1. Fetch live charities and stats with profile joining for donations
        const [charities, profiles, donationsRes, drawEntries, payoutsRes] = await Promise.all([
            getCharities(),
            getTableData('profiles', 'id,full_name,email,selected_charity_id,status,role,donation_percentage'),
            fetch(`${SUPABASE_URL}/rest/v1/donations?select=*,profiles(full_name,email),charity_payout_id,charity_payouts(status,payout_ref,paid_at),draws(month_year)&order=created_at.desc`, { headers }),
            getTableData('draw_entries', 'user_id,draw_id,charity_id,charity_amount,tier,matches'),
            getTableData('charity_payouts', 'charity_id,status,amount,payout_ref')
        ]);

        const donations = donationsRes.ok ? await donationsRes.json() : [];
        const payouts = Array.isArray(payoutsRes) ? payoutsRes : [];
        const activeProfiles = profiles.filter(p => p.status === 'active' && p.role !== 'admin');

        // 1.1 Create pool map for granular ledger
        const poolMap = {};
        (drawEntries || []).forEach(e => {
            poolMap[`${e.user_id}_${e.draw_id}`] = e.matches;
        });

        // 2. Map all stats to each charity
        const report = (charities || []).map(c => {
            const supporterCount = (activeProfiles || []).filter(p => p.selected_charity_id === c.id).length;

            // Filter direct donations
            const directGiftRecords = (donations || [])
                .filter(d => d.charity_id === c.id && d.source === 'direct')
                .map(d => ({
                    id: d.id,
                    donor: d.profiles?.full_name || 'Anonymous',
                    email: d.profiles?.email,
                    amount: parseFloat(d.amount) || 0,
                    date: d.created_at,
                    status: d.charity_payouts?.status || 'unpaid',
                    payout_ref: d.charity_payouts?.payout_ref || '--',
                    stripe_ref: d.stripe_payment_intent_id || d.stripe_charge_id || '--'
                }));

            // New: Detailed Winner-Led Records for the "Everything" Report
            const winnerLedRecords = (donations || [])
                .filter(d => d.charity_id === c.id && d.source !== 'direct')
                .map(d => {
                    const matches = poolMap[`${d.user_id}_${d.draw_id}`];
                    const donorName = d.profiles?.full_name || 'Contributor';
                    // Use loose equality to handle matches=0 correctly
                    const poolInfo = (matches !== undefined && matches !== null) ? `${matches} Match Pool` : 'Prize Share';

                    return {
                        id: d.id,
                        donor: donorName,
                        amount: parseFloat(d.amount) || 0,
                        date: d.created_at,
                        status: d.charity_payouts?.status || 'unpaid',
                        payout_ref: d.charity_payouts?.payout_ref || '--',
                        stripe_ref: d.stripe_payment_intent_id || d.stripe_charge_id || '--',
                        contribution_source: `Prize Contribution by ${donorName} (${poolInfo}) - $${(parseFloat(d.amount) || 0).toFixed(2)}`,
                        draw_name: d.draws?.month_year || 'N/A'
                    };
                });

            const directGiftTotal = directGiftRecords.reduce((sum, d) => sum + d.amount, 0);

            const winnerDonationTotal = (drawEntries || [])
                .filter(e => e.charity_id === c.id && e.tier !== null)
                .reduce((sum, e) => sum + (parseFloat(e.charity_amount) || 0), 0);

            const pendingAmount = (payouts || [])
                .filter(p => p.charity_id === c.id && p.status === 'pending')
                .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

            const enriched = enrichCharityData(c);

            const supporters = (activeProfiles || [])
                .filter(p => p.selected_charity_id === c.id)
                .map(p => ({
                    name: p.full_name || 'Anonymous Supporter',
                    email: p.email,
                    percentage: p.donation_percentage || 10
                }));

            return {
                id: c.id,
                name: c.name,
                category: c.category,
                logo_url: enriched.logo_url,
                supporter_count: supporterCount,
                supporters: supporters,
                direct_donations: directGiftTotal,
                direct_gifts_detail: directGiftRecords,
                winner_donations: winnerDonationTotal,
                winner_led_detail: winnerLedRecords, // Full history for the ledger
                total_raised: directGiftTotal + winnerDonationTotal,
                pending_balance: pendingAmount,
                payout_status: pendingAmount > 0 ? 'payout_pending' : 'settled',
                next_cycle_status: c.status !== 'inactive' ? 'open' : 'closed'
            };
        });

        return report.sort((a, b) => b.total_raised - a.total_raised);
    } catch (error) {
        console.error('Error generating charity report:', error);
        return [];
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

        // IMPROVED: Use !inner for reliable status filtering on the joined draws table
        // This ensures the DB only returns entries where the draw is actually published/completed
        const url = `${SUPABASE_URL}/rest/v1/draw_entries?select=*,draws!inner(month_year,status),profiles(full_name)&tier=not.is.null&draws.status=in.(completed,published)&order=created_at.desc`;

        const response = await fetch(url, { headers });
        const filteredData = await (response.ok ? response.json() : []);

        console.log(`📊 Winners for verification: ${filteredData?.length || 0} records fetched`);
        return Array.isArray(filteredData) ? filteredData : [];
    } catch (error) {
        console.error('Error getting winners:', error);
        return [];
    }
}

/**
 * Get Winner Audit Report
 * Returns all winning entries across all draws with payout status
 */
export async function getWinnerAuditReport() {
    try {
        const authToken = await getAuthToken();
        const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${authToken}` };

        // Fetch all winners (where tier is not null)
        const url = `${SUPABASE_URL}/rest/v1/draw_entries?select=*,profiles(full_name,email),draws(month_year,status),charities(name,logo_url)&tier=not.is.null&order=created_at.desc`;

        const response = await fetch(url, { headers });
        if (!response.ok) return [];

        const data = await response.json();
        return (Array.isArray(data) ? data : []).map(winner => ({
            ...winner,
            charities: enrichCharityData(winner.charities)
        }));
    } catch (error) {
        console.error('Error getting winner audit report:', error);
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

        // Phase 3: Consolidate Balance Updates - Execution Phase
        // First, fetch the entry to get the user_id and payout amount
        const entryUrl = `${SUPABASE_URL}/rest/v1/draw_entries?id=eq.${entryId}&select=user_id,net_payout,is_paid`;
        const entryResponse = await fetch(entryUrl, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${authToken}` }
        });
        const entryData = await entryResponse.json();

        if (!entryData || entryData.length === 0) throw new Error('Entry not found');
        if (entryData[0].is_paid) return { success: true, message: 'Already paid' };

        const userId = entryData[0].user_id;
        const amount = parseFloat(entryData[0].net_payout);

        // 1. Mark as paid in draw_entries
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
                payout_status: 'paid',
                paid_at: new Date().toISOString(),
                payout_ref: reference,
                payment_reference: reference,
                verified_by: adminId
            })
        });

        if (!response.ok) throw new Error('Failed to mark as paid');

        // 2. Increment user's wallet balance (Consolidated Execution Logic)
        if (amount > 0) {
            console.log(`💰 Crediting ${amount} to user ${userId} balance...`);
            // We use the supabase client here for a cleaner atomic increment if possible, 
            // or a manual fetch-update via REST
            const { error: balanceError } = await supabase.rpc('increment_balance', {
                user_id: userId,
                amount: amount
            });

            if (balanceError) {
                console.error('Balance update failed, attempting manual fallback...');
                // Fallback to manual if RPC doesn't exist (though it should in this architecture)
                const { data: profile } = await supabase.from('profiles').select('account_balance').eq('id', userId).single();
                const newBalance = (profile?.account_balance || 0) + amount;
                await supabase.from('profiles').update({ account_balance: newBalance }).eq('id', userId);
            }
        }

        await logActivity('winner_paid', `Entry ${entryId} paid. Ref: ${reference}. Balance updated.`);
        console.log('✅ Winner marked as paid and balance synchronized');
        return { success: true };
    } catch (error) {
        console.error('Error marking as paid:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Get aggregated payable winners (grouped by draw)
 */
export async function getAggregatedPayableWinners() {
    try {
        const authToken = await getAuthToken();
        // Phase 3: 'Published' Firewall - Only fetch winners from draws that have been publicly announced.
        const url = `${SUPABASE_URL}/rest/v1/draw_entries?select=id,net_payout,draw_id,draws!inner(month_year,status)&draws.status=eq.published&verification_status=eq.verified&payout_status=in.(pending,processing)&is_paid=eq.false`;

        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await (response.ok ? response.json() : []);
        if (!Array.isArray(data)) return [];

        // Group by draw
        const groups = {};
        data.forEach(entry => {
            const drawId = entry.draw_id;
            const monthYear = entry.draws?.month_year || 'Unknown Draw';

            if (!groups[drawId]) {
                groups[drawId] = {
                    draw_id: drawId,
                    month_year: monthYear,
                    total_amount: 0,
                    winner_count: 0,
                    entry_ids: []
                };
            }

            groups[drawId].total_amount += Number(entry.net_payout) || 0;
            groups[drawId].winner_count += 1;
            groups[drawId].entry_ids.push(entry.id);
        });

        return Object.values(groups).sort((a, b) => b.month_year.localeCompare(a.month_year));
    } catch (error) {
        console.error('Error fetching aggregated winners:', error);
        return [];
    }
}

/**
 * Fetches individual verified but unpaid winners for a specific draw
 * Used for granular settlement in the Finance & Payouts section
 */
export async function getPayableWinnersForDraw(drawId) {
    try {
        const { data, error } = await supabase
            .from('draw_entries')
            .select(`
                *,
                profiles:user_id (
                    full_name,
                    email,
                    bsb_number,
                    account_number,
                    bank_name
                ),
                draws:draw_id (
                    month_year
                )
            `)
            .eq('draw_id', drawId)
            .eq('verification_status', 'verified')
            .is('is_paid', false);

        if (error) throw error;

        // Map to a consistent format
        return data.map(w => ({
            id: w.id,
            userId: w.user_id,
            'Name': w.profiles?.full_name || 'Unknown',
            'Email': w.profiles?.email || 'N/A',
            'Match Tier': `${w.tier}-Match`,
            'Gross Prize': parseFloat(w.gross_prize),
            'Charity Donation': parseFloat(w.charity_amount),
            'Net Payout': parseFloat(w.net_payout),
            'Verification Status': w.verification_status,
            'isPaid': w.is_paid,
            paymentReference: w.payment_reference,
            paidAt: w.paid_at
        }));
    } catch (error) {
        console.error('Error fetching payable winners for draw:', error);
        return [];
    }
}

/**
 * Mark a batch of winners as paid
 */
export async function markBatchWinnersAsPaid(entryIds, reference, adminId) {
    try {
        const authToken = await getAuthToken();

        // Phase 3: Bulk Execution
        // We need to settle each one to ensure balance updates happen
        console.log(`🏦 Settling batch of ${entryIds.length} winners...`);

        const results = [];
        for (const id of entryIds) {
            const res = await markWinnerAsPaid(id, reference, adminId);
            results.push(res);
        }

        const failed = results.filter(r => !r.success);
        if (failed.length > 0) {
            console.warn(`⚠️ Batch partial failure: ${failed.length} errors`);
        }

        return { success: failed.length === 0, total: entryIds.length, settled: results.length - failed.length };
    } catch (error) {
        console.error('Error in batch payout:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get all winners that are verified but not paid
 */
export async function getUnpaidWinners() {
    try {
        const authToken = await getAuthToken();
        const url = `${SUPABASE_URL}/rest/v1/draw_entries?select=*,draws(month_year,status),profiles(full_name,bank_name,bsb_number,account_number)&tier=not.is.null&verification_status=eq.verified&payout_status=in.(pending,processing)&order=created_at.desc`;

        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await (response.ok ? await response.json() : []);
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Error fetching unpaid winners:', error);
        return [];
    }
}

/**
 * Get all winners that have been paid (settled)
 */
export async function getSettledPlayerPayouts(limit = 100) {
    try {
        const authToken = await getAuthToken();
        const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${authToken}` };

        // 1. Fetch settled individual winners
        const winnersRes = await fetch(`${SUPABASE_URL}/rest/v1/draw_entries?select=*,draws(month_year),profiles(full_name),charities(name,logo_url)&is_paid=eq.true&order=paid_at.desc&limit=${limit}`, { headers });
        const winners = winnersRes.ok ? await winnersRes.json() : [];

        // 2. Fetch settled charity winner-led funds with detailed donation links
        const charityRes = await fetch(`${SUPABASE_URL}/rest/v1/charity_payouts?select=*,charities(name,logo_url),donations(*,profiles(full_name),draws(month_year))&status=eq.paid&order=updated_at.desc&limit=${limit}`, { headers });
        const charityPayouts = charityRes.ok ? await charityRes.json() : [];

        // 2.1 Fetch match counts for these donations to show pool info
        const winnerDonations = charityPayouts.flatMap(p => p.donations?.filter(d => d.source !== 'direct' && d.user_id && d.draw_id) || []);
        let poolMap = {};
        if (winnerDonations.length > 0) {
            // Fix: Use correct PostgREST and filters for multi-column matching
            const entryQueries = winnerDonations.map(d => `and(user_id.eq.${d.user_id},draw_id.eq.${d.draw_id})`).join(',');
            const entriesRes = await fetch(`${SUPABASE_URL}/rest/v1/draw_entries?select=user_id,draw_id,matches&or=(${entryQueries})`, { headers });
            const entries = entriesRes.ok ? await entriesRes.json() : [];
            entries.forEach(e => { poolMap[`${e.user_id}_${e.draw_id}`] = e.matches; });
        }

        // 3. Combine and format for the UI
        const combined = [
            ...winners.map(w => ({
                ...w,
                type: 'player_settlement',
                charities: enrichCharityData(w.charities)
            })),
            ...charityPayouts
                .filter(p => {
                    // Only include in this ledger if the distribution came from winner prize shares
                    return p.donations?.some(d => d.source === 'prize_split' || d.source === 'subscription' || d.source === 'winner_manual');
                })
                .map(p => {
                    const donations = p.donations?.filter(d => d.source !== 'direct') || [];
                    const d0 = donations[0];
                    const matches0 = d0 ? poolMap[`${d0.user_id}_${d0.draw_id}`] : null;
                    const poolInfo0 = (matches0 !== undefined && matches0 !== null) ? `${matches0} Match Pool` : 'Prize Share';

                    const detailLabel = donations.length === 1
                        ? `Prize Contribution by ${donations[0].profiles?.full_name || 'User'} (${poolInfo0})`
                        : `${donations.length} Winner Contributions`;

                    return {
                        id: p.id,
                        paid_at: p.paid_at || p.updated_at,
                        profiles: { full_name: p.charities?.name || 'Charity' },
                        charities: enrichCharityData(p.charities),
                        tier: 'Charity Distribution',
                        draws: { month_year: detailLabel },
                        net_payout: p.amount,
                        payment_reference: p.payout_ref,
                        type: 'charity_settlement',
                        isCharity: true,
                        donations_detail: donations.map(d => {
                            const m = poolMap[`${d.user_id}_${d.draw_id}`];
                            return {
                                ...d,
                                pool_info: (m !== undefined && m !== null) ? `${m} Match Pool` : 'Prize Share'
                            };
                        })
                    };
                })
        ];

        return combined.sort((a, b) => new Date(b.paid_at || 0) - new Date(a.paid_at || 0)).slice(0, limit);
    } catch (error) {
        console.error('Error fetching combined settlement payouts:', error);
        return [];
    }
}

/**
 * Get a summary of all pending donations for charities (not yet paid out)
 * Strictly based on actual donation records, separated by source.
 */
export async function getCharityPayoutSummary() {
    try {
        const authToken = await getAuthToken();
        const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${authToken}` };

        // Phase 3: 'Published' Firewall - Only fetch donations from published draws OR direct gifts.
        // We join draws specifically to check status for winner-led donations.
        // 1. Fetch base data in parallel
        // We fetch ALL pending donations and filter status in JS for maximum reliability
        const [donationsRes, charitiesRes, profilesRes, entriesRes] = await Promise.all([
            fetch(`${SUPABASE_URL}/rest/v1/donations?select=*,profiles(full_name,email),draws(status,month_year)&charity_payout_id=is.null`, { headers }),
            getCharities(),
            getTableData('profiles', 'id,selected_charity_id,status,role'),
            fetch(`${SUPABASE_URL}/rest/v1/draw_entries?select=user_id,draw_id,matches&tier=not.is.null`, { headers })
        ]);

        let donations = donationsRes.ok ? await donationsRes.json() : [];

        // Apply "Published" firewall in JS: 
        // Only include if:
        // a) It's a direct gift (source = direct)
        // b) It's a prize split from a PUBLISHED draw
        donations = donations.filter(d => {
            if (d.source === 'direct') return true;
            if (d.source === 'subscription') return true;
            return d.draws?.status === 'published';
        });
        const activeCharities = Array.isArray(charitiesRes) ? charitiesRes : [];
        const profiles = Array.isArray(profilesRes) ? profilesRes : [];
        const entries = entriesRes.ok ? await entriesRes.json() : [];

        // 1.1 Create entry map for fast lookup: key = `${user_id}_${draw_id}`
        const entryMap = {};
        entries.forEach(e => {
            entryMap[`${e.user_id}_${e.draw_id}`] = e.matches;
        });

        // 2. Initialize summary with charities
        const summary = {};
        activeCharities.forEach(charity => {
            summary[charity.id] = {
                charity_id: charity.id,
                name: charity.name,
                logo_url: charity.logo_url,
                stripe_account_id: charity.stripe_account_id,
                winner_donations: 0,
                direct_donations: 0,
                direct_donors: [],
                winner_records: [],
                supporter_count: profiles.filter(p => p.selected_charity_id === charity.id && p.status === 'active').length,
                winner_donation_ids: [],
                direct_donation_ids: [],
                total_amount: 0
            };
        });

        // 3. Process actual donation records
        (donations || []).forEach(d => {
            const cid = d.charity_id;
            if (summary[cid]) {
                const amount = parseFloat(d.amount || 0);
                summary[cid].total_amount += amount;

                if (d.source === 'direct') {
                    summary[cid].direct_donations += amount;
                    summary[cid].direct_donation_ids.push(d.id);
                    summary[cid].direct_donors.push({
                        id: d.id,
                        donor: d.profiles?.full_name || 'Anonymous',
                        email: d.profiles?.email,
                        amount: amount,
                        date: d.created_at
                    });
                } else {
                    summary[cid].winner_donations += amount;
                    summary[cid].winner_donation_ids.push(d.id);
                    const matches = entryMap[`${d.user_id}_${d.draw_id}`];
                    const poolInfo = (matches !== undefined && matches !== null) ? `${matches} Match Pool` : 'Prize Share';
                    summary[cid].winner_records.push({
                        id: d.id,
                        amount: amount,
                        source: d.source,
                        date: d.created_at,
                        draw_name: d.draws?.month_year || 'N/A',
                        user_name: d.profiles?.full_name || 'Anonymous',
                        pool_info: poolInfo
                    });
                }
            }
        });

        return Object.values(summary).filter(s => s.total_amount > 0 || s.supporter_count > 0);
    } catch (error) {
        console.error('Error fetching charity payout summary:', error);
        return [];
    }
}

/**
 * Get history of charity payouts with granular donation lineage
 */
export async function getCharityPayouts() {
    try {
        const authToken = await getAuthToken();
        const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${authToken}` };
        // Fetch with full donation and profile context
        const url = `${SUPABASE_URL}/rest/v1/charity_payouts?select=*,charities(name,logo_url,stripe_account_id),donations(source,amount,created_at,user_id,draw_id,profiles(full_name))&order=created_at.desc`;

        const response = await fetch(url, { headers });
        const data = await (response.ok ? await response.json() : []);
        const payouts = Array.isArray(data) ? data : [];

        // Fetch pool matching info for winner-led donations
        const winnerDonations = payouts.flatMap(p => p.donations?.filter(d => d.source !== 'direct' && d.user_id && d.draw_id) || []);
        let poolMap = {};
        if (winnerDonations.length > 0) {
            const entryQueries = winnerDonations.map(d => `and(user_id.eq.${d.user_id},draw_id.eq.${d.draw_id})`).join(',');
            const entriesRes = await fetch(`${SUPABASE_URL}/rest/v1/draw_entries?select=user_id,draw_id,matches&or=(${entryQueries})`, { headers });
            const entries = entriesRes.ok ? await entriesRes.json() : [];
            entries.forEach(e => { poolMap[`${e.user_id}_${e.draw_id}`] = e.matches; });
        }

        // Enrich the payouts with a detail label for the UI
        return payouts.map(p => {
            if (p.charities) {
                p.charities = enrichCharityData(p.charities);
            }

            const winDonations = p.donations?.filter(d => d.source !== 'direct') || [];
            let detailLabel = 'Direct Distribution';

            if (winDonations.length > 0) {
                if (winDonations.length === 1) {
                    const d = winDonations[0];
                    const matches = poolMap[`${d.user_id}_${d.draw_id}`];
                    // Fix: Handle matches=0 and null safely
                    const poolInfo = (matches !== undefined && matches !== null) ? `${matches} Match Pool` : 'Prize Share';
                    detailLabel = `Prize Contribution by ${d.profiles?.full_name || 'User'} (${poolInfo})`;
                } else {
                    detailLabel = `${winDonations.length} Winner Contributions Batch`;
                }
            }

            return {
                ...p,
                detail_label: detailLabel,
                donations_detail: winDonations.map(d => {
                    const m = poolMap[`${d.user_id}_${d.draw_id}`];
                    return {
                        ...d,
                        pool_info: (m !== undefined && m !== null) ? `${m} Match Pool` : 'Prize Share'
                    };
                })
            };
        });
    } catch (error) {
        console.error('Error fetching charity payouts:', error);
        return [];
    }
}

/**
 * Create a new charity payout record
 */
export async function createCharityPayout(charityId, amount, reference, donationIds = []) {
    try {
        const authToken = await getAuthToken();

        // 1. Create the payout record
        const payoutUrl = `${SUPABASE_URL}/rest/v1/charity_payouts`;
        const payoutData = {
            charity_id: charityId,
            amount: amount,
            status: reference ? 'paid' : 'pending',
            payout_ref: reference || null,
            paid_at: reference ? new Date().toISOString() : null
        };

        const payoutResponse = await fetch(payoutUrl, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(payoutData)
        });

        if (!payoutResponse.ok) {
            const err = await payoutResponse.json();
            throw new Error(err.message || 'Failed to create charity payout record');
        }

        const createdPayouts = await payoutResponse.json();
        const payoutId = createdPayouts[0].id;

        // 2. Link the donations to this payout
        if (donationIds.length > 0) {
            const updateUrl = `${SUPABASE_URL}/rest/v1/donations?id=in.(${donationIds.join(',')})`;
            await fetch(updateUrl, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ charity_payout_id: payoutId })
            });
        }

        await logActivity('charity_payout_created', `Created payout of ${amount} for charity ${charityId}. Status: ${payoutData.status}`);
        return { success: true, payoutId };
    } catch (error) {
        console.error('Error creating charity payout:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Rollback a charity payout (delete record and unlink donations)
 */
export async function rollbackCharityPayout(payoutId) {
    try {
        const authToken = await getAuthToken();
        const headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${authToken}`
        };

        // 1. Unlink donations first
        await fetch(`${SUPABASE_URL}/rest/v1/donations?charity_payout_id=eq.${payoutId}`, {
            method: 'PATCH',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ charity_payout_id: null })
        });

        // 2. Delete the payout record
        await fetch(`${SUPABASE_URL}/rest/v1/charity_payouts?id=eq.${payoutId}`, {
            method: 'DELETE',
            headers
        });

        return { success: true };
    } catch (error) {
        console.error('Error rolling back charity payout:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Mark a charity payout as paid
 */
export async function markCharityPayoutAsPaid(payoutId, reference) {
    try {
        const authToken = await getAuthToken();
        const url = `${SUPABASE_URL}/rest/v1/charity_payouts?id=eq.${payoutId}`;

        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'paid',
                paid_at: new Date().toISOString(),
                payout_ref: reference
            })
        });

        if (!response.ok) throw new Error('Failed to mark charity payout as paid');

        await logActivity('charity_payout_paid', `Charity payout ${payoutId} marked as paid. Ref: ${reference}`);
        return { success: true };
    } catch (error) {
        console.error('Error marking charity payout as paid:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Create a Stripe Checkout session to fulfill a payout (Admin)
 */
export async function createPayoutSession(entryId, amount, winnerName, drawMonth) {
    try {
        const authToken = await getAuthToken();
        const functionUrl = `${SUPABASE_URL}/functions/v1/create-payout-session-v2`;
        console.log('📡 Fetching Payout Session:', functionUrl);

        const response = await fetch(
            functionUrl,
            {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
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
 * Create a Stripe Checkout session to fulfill a charity payout (Admin)
 */
export async function createCharityPayoutSession(payoutId, amount, charityName, type) {
    try {
        const authToken = await getAuthToken();
        const functionUrl = `${SUPABASE_URL}/functions/v1/create-charity-payout-session-v2`;
        console.log('📡 Fetching Charity Payout Session:', functionUrl);

        const response = await fetch(
            functionUrl,
            {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ payoutId, amount, charityName, type })
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create charity payout session');
        }

        const data = await response.json();
        return { success: true, url: data.url };
    } catch (error) {
        console.error('Error creating charity payout session:', error);
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
                    'apikey': SUPABASE_KEY,
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
 * SYNCED with Dashboard and getActiveSubscribersCount logic
 */
export async function getSubscriptionReport() {
    try {
        const authToken = await getAuthToken();
        const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${authToken}` };

        // 1. Get ALL profiles to determine total players vs admins
        const profilesUrl = `${SUPABASE_URL}/rest/v1/profiles?select=id,role,status,full_name`;
        const profileRes = await fetch(profilesUrl, { headers });
        const allProfiles = await profileRes.json();

        // Filter for players (excluding admins, including Test User)
        const playerProfiles = (allProfiles || []).filter(p => p.role !== 'admin' || p.full_name === 'Test User');
        const playerIds = new Set(playerProfiles.map(p => p.id));

        // 2. Get all subscriptions
        const subsUrl = `${SUPABASE_URL}/rest/v1/subscriptions?select=id,user_id,status,plan`;
        const subsResponse = await fetch(subsUrl, { headers });
        const subscriptions = await subsResponse.json();

        // 3. Match players to their actual subscription status
        const playerSubsMap = {};
        (subscriptions || []).forEach(s => {
            if (playerIds.has(s.user_id)) {
                playerSubsMap[s.user_id] = s;
            }
        });

        // 4. Calculate Stats
        const activeCount = playerProfiles.filter(p => playerSubsMap[p.id]?.status === 'active').length;
        const totalPlayers = playerProfiles.length;
        const inactiveCount = totalPlayers - activeCount;

        // 5. Get eligible users (Sync with Draw logic)
        const eligibleUsers = await getEligibleUsers();

        // 6. Revenue Calculations (Dynamic based on logic: $5 to Prize Pool, remainder to Platform)
        let totalPlatformRevenue = 0;
        let totalPrizePoolRevenue = 0;

        playerProfiles.forEach(p => {
            const sub = playerSubsMap[p.id];
            if (sub?.status === 'active') {
                const amount = sub.plan === 'annual' ? 9 : 11;
                totalPrizePoolRevenue += 5;
                totalPlatformRevenue += (amount - 5);
            }
        });

        console.log('📊 Subscription report (Strict Sync):', { active: activeCount, total: totalPlayers, eligible: eligibleUsers.length });

        return {
            active: activeCount,
            inactive: inactiveCount,
            total: totalPlayers,
            eligible: eligibleUsers.length,
            platformRevenue: totalPlatformRevenue,
            prizePoolRevenue: totalPrizePoolRevenue,
            subscriptions: (subscriptions || []).filter(s => playerIds.has(s.user_id))
        };
    } catch (error) {
        console.error('Error getting subscription report:', error);
        return { active: 0, inactive: 0, total: 0, eligible: 0, platformRevenue: 0, prizePoolRevenue: 0, subscriptions: [] };
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

        const url = `${SUPABASE_URL}/rest/v1/subscriptions?status=eq.active&created_at=gte.${startDate.toISOString()}&select=created_at,plan`;
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
            const amount = sub.plan === 'annual' ? 9 : 11; // Monthly is $11, Annual is $9/mo equivalent ($108 total)
            monthlyData[monthKey].value += amount;
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

        const url = `${SUPABASE_URL}/rest/v1/profiles?role=not.eq.admin&created_at=gte.${startDate.toISOString()}&select=created_at`;
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

        // 1. Get active subscriptions count and plan details
        const subsUrl = `${SUPABASE_URL}/rest/v1/subscriptions?status=eq.active&select=plan`;
        const subsRes = await fetch(subsUrl, { headers });
        const activeSubs = subsRes.ok ? await subsRes.json() : [];
        const activeSubscribers = activeSubs.length;

        // 2. Calculate Total Monthly Platform Revenue ($5 goes to prize pool)
        const currentRevenue = activeSubs.reduce((sum, sub) => {
            const amount = sub.plan === 'annual' ? 9 : 11;
            return sum + (amount - 5);
        }, 0);

        // 3. Get total players
        const usersUrl = `${SUPABASE_URL}/rest/v1/profiles?role=not.eq.admin&select=id`;
        const usersResponse = await fetch(usersUrl, { headers });
        const users = usersResponse.ok ? await usersResponse.json() : [];
        const totalUsers = Array.isArray(users) ? users.length : 0;

        // 4. Calculate Total Community Impact (All-time actual donations)
        const totalDonated = await getTotalDonations();

        // 5. Total Prize Pool Contribution ($5/sub)
        const totalPrizePool = activeSubscribers * 5;

        // 6. Granular Audit Totals for Reports
        const [donationsRes, payoutsRes] = await Promise.all([
            fetch(`${SUPABASE_URL}/rest/v1/donations?select=amount,source,charity_payout_id,charity_payouts(status)`, { headers }),
            fetch(`${SUPABASE_URL}/rest/v1/charity_payouts?status=eq.pending&select=amount`, { headers })
        ]);

        const donations = donationsRes.ok ? await donationsRes.json() : [];
        const payouts = payoutsRes.ok ? await payoutsRes.json() : [];

        const totalDirectPaid = donations
            .filter(d => d.source === 'direct' && d.charity_payouts?.status === 'paid')
            .reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

        const winnerLedPending = donations
            .filter(d => d.source !== 'direct' && (d.charity_payout_id === null || d.charity_payouts?.status === 'pending'))
            .reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

        return {
            totalRevenue: currentRevenue,
            totalPrizePool,
            activeSubscribers,
            totalUsers,
            totalDonated,
            totalAwarded: (donations || []).filter(d => d.source !== 'direct' && d.charity_payouts?.status === 'paid').reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0),
            avgDonation: totalDonated > 0 ? totalDonated / (activeSubscribers || 1) : 0,
            totalDirectPaid,
            winnerLedPending
        };
    } catch (error) {
        console.error('Error getting report stats:', error);
        return {
            totalRevenue: 0,
            totalPrizePool: 0,
            activeSubscribers: 0,
            totalUsers: 0,
            totalDonated: 0,
            avgDonation: 0,
            totalDirectPaid: 0,
            winnerLedPending: 0
        };
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
        const [charities, profiles, siteContent] = await Promise.all([
            getCharities(),
            getTableData('profiles', 'id,role,status'),
            getSiteContent()
        ]);

        // Calculate actual real-time values
        let totalRaised = charities.reduce((sum, c) => sum + (c.total_raised || 0), 0);
        let charityCount = charities.filter(c => c.status !== 'inactive').length;
        let golferCount = profiles.filter(p => p.role !== 'admin' && p.status === 'active').length;

        // Apply manual overrides from site_content if they exist
        siteContent.forEach(item => {
            if (item.section_id === 'stats') {
                if (item.field_name === 'totalRaised' && item.field_value) totalRaised = parseFloat(item.field_value);
                if (item.field_name === 'charities' && item.field_value) charityCount = parseInt(item.field_value);
                if (item.field_name === 'activeGolfers' && item.field_value) golferCount = parseInt(item.field_value);
            }
        });

        // Calculate lives impacted (estimate: each $10 donated helps ~3 lives)
        const livesImpacted = Math.floor(totalRaised * 0.3);

        return {
            totalRaised: Math.round(totalRaised),
            charityCount,
            golferCount,
            livesImpacted: livesImpacted || 0,
            activeSubscribers: profiles.filter(p => p.status === 'active' && p.role !== 'admin').length
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
 * Supports 'impact' (default) or 'winners' mode
 */
export async function getLeaderboardData(limit = 5, type = 'impact') {
    try {
        const publicHeaders = {
            'apikey': SUPABASE_KEY,
            'Content-Type': 'application/json'
        };

        const ACCENTS = [
            { accent: "from-emerald-400 to-teal-600", glow: "rgba(16, 185, 129, 0.3)" },
            { accent: "from-teal-400 to-emerald-600", glow: "rgba(20, 184, 166, 0.3)" },
            { accent: "from-lime-400 to-emerald-600", glow: "rgba(163, 230, 53, 0.3)" },
            { accent: "from-emerald-500 to-emerald-800", glow: "rgba(16, 185, 129, 0.2)" },
            { accent: "from-zinc-500 to-zinc-800", glow: "rgba(113, 113, 122, 0.2)" }
        ];

        // --- MOCK DATA DEFINITIONS ---
        const MOCK_IMPACT = [
            { name: "James Mitchell", initials: "JM", scores: [34, 31, 38, 29, 35], raised: 2450, charity: "Red Cross", donation_percentage: 10, avg: 33 },
            { name: "Sarah Chen", initials: "SC", scores: [32, 28, 41, 30, 36], raised: 1890, charity: "Beyond Blue", donation_percentage: 10, avg: 33 },
            { name: "Michael O'Brien", initials: "MO", scores: [35, 33, 30, 37, 32], raised: 1650, charity: "Smith Family", donation_percentage: 10, avg: 33 },
            { name: "Emma Williams", initials: "EW", scores: [31, 36, 29, 34, 33], raised: 1420, charity: "OzHarvest", donation_percentage: 10, avg: 32 },
            { name: "Avery Thompson", initials: "AT", scores: [28, 32, 25, 30, 29], raised: 850, charity: "Cancer Council", donation_percentage: 10, avg: 29 }
        ];

        const MOCK_WINNERS = [
            { name: "Lucas Grant", initials: "LG", scores: [42, 38, 44, 36, 40], raised: 5250, charity: "Black Dog Institute", donation_percentage: 10, avg: 40, winnerTier: "5 MATCH JACKPOT WINNER", winningNumbers: [42, 38, 44, 36, 40] },
            { name: "Sophia Rossi", initials: "SR", scores: [39, 41, 37, 35, 38], raised: 1250, charity: "Rural Aid", donation_percentage: 10, avg: 38, winnerTier: "4 MATCH POOL WINNER", winningNumbers: [39, 41, 37, 35, 20] },
            { name: "Oliver Bennett", initials: "OB", scores: [36, 34, 32, 38, 35], raised: 750, charity: "Lifeline", donation_percentage: 10, avg: 35, winnerTier: "3 MATCH POOL WINNER", winningNumbers: [36, 34, 32, 10, 15] },
            { name: "Isabella Wright", initials: "IW", scores: [40, 42, 38, 36, 41], raised: 5250, charity: "Headspace", donation_percentage: 20, avg: 39, winnerTier: "5 MATCH JACKPOT WINNER", winningNumbers: [40, 42, 38, 36, 41] },
            { name: "Ethan Hunt", initials: "EH", scores: [38, 36, 34, 40, 32], raised: 1250, charity: "Starlight Foundation", donation_percentage: 10, avg: 36, winnerTier: "4 MATCH POOL WINNER", winningNumbers: [38, 36, 34, 40, 10] }
        ];

        let finalLeaderboard = [];

        if (type === 'winners') {
            // 🏆 HALL OF FAME MODE
            console.log('🏆 Fetching Hall of Fame Winners...');
            try {
                const winnersRes = await fetch(
                    `${SUPABASE_URL}/rest/v1/draw_entries?select=id,user_id,gross_prize,matches,scores,charity_id,draw_id,draws(month_year,winning_numbers)&gross_prize=gt.0&order=created_at.desc&limit=${limit}`,
                    { headers: publicHeaders }
                );
                if (winnersRes.ok) {
                    const recentWinners = await winnersRes.json();
                    if (recentWinners.length > 0) {
                        // Get profiles and charities for real winners
                        const userIds = recentWinners.map(w => w.user_id).filter(Boolean);
                        const charityIds = recentWinners.map(w => w.charity_id).filter(Boolean);

                        const [profilesRes, charitiesRes] = await Promise.all([
                            fetch(`${SUPABASE_URL}/rest/v1/profiles?id=in.(${userIds.join(',')})&select=id,full_name,donation_percentage`, { headers: publicHeaders }),
                            fetch(`${SUPABASE_URL}/rest/v1/charities?id=in.(${charityIds.join(',')})&select=id,name`, { headers: publicHeaders })
                        ]);

                        const profiles = profilesRes.ok ? await profilesRes.json() : [];
                        const charities = charitiesRes.ok ? await charitiesRes.json() : [];
                        const charityMap = Object.fromEntries(charities.map(c => [c.id, c.name]));

                        recentWinners.forEach(w => {
                            const profile = profiles.find(p => p.id === w.user_id);
                            const draw = w.draws || {};
                            finalLeaderboard.push({
                                id: w.id,
                                name: profile?.full_name || 'Premium Player',
                                initials: (profile?.full_name || '??').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2),
                                scores: w.scores || [],
                                raised: `$${Number(w.gross_prize).toLocaleString()}`,
                                raisedValue: Number(w.gross_prize),
                                charity: charityMap[w.charity_id] || 'Selected Charity',
                                percentage: `${profile?.donation_percentage || 10}%`,
                                avg: Math.round((w.scores || []).reduce((a, b) => a + Number(b), 0) / (w.scores?.length || 1)),
                                winnerTier: `${w.matches} DRAW POOL WINNER`,
                                winningNumbers: draw.winning_numbers || [],
                                isMock: false
                            });
                        });
                    }
                }
            } catch (e) {
                console.warn('Leaderboard: Winners fetch failed', e.message);
            }

            // Backfill with MOCK_WINNERS
            for (const mock of MOCK_WINNERS) {
                if (finalLeaderboard.length >= limit) break;
                if (!finalLeaderboard.some(p => p.name.toLowerCase() === mock.name.toLowerCase())) {
                    finalLeaderboard.push({
                        ...mock,
                        raised: `$${mock.raised.toLocaleString()}`,
                        raisedValue: mock.raised,
                        isMock: true
                    });
                }
            }
        } else {
            // 🌿 COMMUNITY IMPACT MODE
            console.log('🌿 Fetching Community Impact leaders...');
            try {
                // Fetch direct donations
                const donationsRes = await fetch(`${SUPABASE_URL}/rest/v1/donations?select=user_id,amount`, { headers: publicHeaders });
                const allDonations = donationsRes.ok ? await donationsRes.json() : [];

                const userTotals = {};
                allDonations.forEach(d => {
                    if (d.user_id) userTotals[d.user_id] = (userTotals[d.user_id] || 0) + (parseFloat(d.amount) || 0);
                });

                const sortedImpactUserIds = Object.entries(userTotals)
                    .filter(([_, amount]) => amount > 0)
                    .sort((a, b) => b[1] - a[1])
                    .map(([id]) => id);

                if (sortedImpactUserIds.length > 0) {
                    const topIds = sortedImpactUserIds.slice(0, limit);
                    const [profilesRes, scoresRes] = await Promise.all([
                        fetch(`${SUPABASE_URL}/rest/v1/profiles?id=in.(${topIds.join(',')})&select=id,full_name,selected_charity_id,donation_percentage`, { headers: publicHeaders }),
                        fetch(`${SUPABASE_URL}/rest/v1/scores?user_id=in.(${topIds.join(',')})&select=user_id,score&order=created_at.desc`, { headers: publicHeaders })
                    ]);

                    const profiles = profilesRes.ok ? await profilesRes.json() : [];
                    const allScores = scoresRes.ok ? await scoresRes.json() : [];

                    // Get unique charities
                    const charIds = [...new Set(profiles.map(p => p.selected_charity_id).filter(Boolean))];
                    const charitiesRes = charIds.length > 0 ? await fetch(`${SUPABASE_URL}/rest/v1/charities?id=in.(${charIds.join(',')})&select=id,name`, { headers: publicHeaders }) : { ok: false };
                    const charityMap = charitiesRes.ok ? Object.fromEntries((await charitiesRes.json()).map(c => [c.id, c.name])) : {};

                    profiles.forEach(p => {
                        const name = (p.full_name || '').toLowerCase();
                        if (name === 'admin' || name === 'saurabh singh' || name === 'asmit') return;

                        const userScores = allScores.filter(s => s.user_id === p.id).map(s => s.score).slice(0, 5);
                        const raised = userTotals[p.id] || 0;
                        const mockExample = MOCK_IMPACT.find(m => m.name.toLowerCase() === name);

                        finalLeaderboard.push({
                            id: p.id,
                            name: p.full_name || 'Anonymous Golfer',
                            initials: (p.full_name || '??').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2),
                            scores: userScores.length >= 5 ? userScores : (mockExample ? mockExample.scores : [...userScores, ...Array(5 - userScores.length).fill(0)]),
                            raised: `$${Math.round(raised).toLocaleString()}`,
                            raisedValue: raised,
                            charity: charityMap[p.selected_charity_id] || (mockExample ? mockExample.charity : 'Various Charities'),
                            percentage: `${p.donation_percentage || 10}%`,
                            avg: userScores.length > 0 ? Math.round(userScores.reduce((a, b) => a + b, 0) / userScores.length) : (mockExample ? mockExample.avg : 0),
                            isMock: false
                        });
                    });
                }
            } catch (e) {
                console.error('Impact mode error:', e);
            }

            // Backfill with MOCK_IMPACT
            for (const mock of MOCK_IMPACT) {
                if (finalLeaderboard.length >= limit) break;
                if (!finalLeaderboard.some(p => p.name.toLowerCase() === mock.name.toLowerCase())) {
                    finalLeaderboard.push({
                        ...mock,
                        raised: `$${mock.raised.toLocaleString()}`,
                        raisedValue: mock.raised,
                        isMock: true
                    });
                }
            }
        }

        // Final Sort: Real Users first, then by value
        finalLeaderboard.sort((a, b) => {
            if (a.isMock !== b.isMock) return a.isMock ? 1 : -1;
            return b.raisedValue - a.raisedValue;
        });

        // Slice and map accents
        return finalLeaderboard.slice(0, limit).map((p, i) => ({
            ...p,
            rank: i + 1,
            ...(ACCENTS[i] || ACCENTS[0])
        }));

    } catch (error) {
        console.error('Leaderboard Critical Error:', error);
        const fallback = type === 'winners' ? MOCK_WINNERS : MOCK_IMPACT;
        return fallback.slice(0, limit).map((p, i) => ({
            ...p,
            rank: i + 1,
            raised: `$${p.raised.toLocaleString()}`,
            raisedValue: p.raised,
            isMock: true,
            ...(ACCENTS[i] || ACCENTS[0])
        }));
    }
}

