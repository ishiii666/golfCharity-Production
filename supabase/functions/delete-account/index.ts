// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Delete User Account Edge Function
 * Completely removes a user from the system including auth.users
 */

Deno.serve(async (req) => {
    console.log('=== DELETE ACCOUNT FUNCTION CALLED ===');

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        console.log('Supabase URL configured:', !!supabaseUrl);
        console.log('Service key configured:', !!supabaseServiceKey);

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing Supabase configuration');
        }

        // Get the authorization header
        const authHeader = req.headers.get('Authorization');
        console.log('Auth header present:', !!authHeader);

        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Create admin client with service role
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        const token = authHeader.replace('Bearer ', '');
        const { data: { user: caller }, error: userError } = await supabaseAdmin.auth.getUser(token);

        if (userError || !caller) {
            return new Response(JSON.stringify({ error: 'Invalid user token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Get request body
        let targetUserId = caller.id;
        try {
            const body = await req.json();
            if (body.targetUserId) {
                // If a target user is specified, verify the caller is an admin
                const { data: profile } = await supabaseAdmin
                    .from('profiles')
                    .select('role')
                    .eq('id', caller.id)
                    .single();

                if (profile?.role === 'admin') {
                    targetUserId = body.targetUserId;
                    console.log(`Admin ${caller.email} is deleting user ${targetUserId}`);
                } else if (body.targetUserId !== caller.id) {
                    return new Response(JSON.stringify({ error: 'Unauthorized: Only admins can delete other users' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                }
            }
        } catch (e) {
            // No body or invalid JSON, default to deleting own account
        }

        console.log('=== DELETING USER ===', { targetUserId });

        // Step 1: Delete activity logs
        await supabaseAdmin.from('activity_log').delete().eq('user_id', targetUserId);

        // Step 2: Delete scores
        await supabaseAdmin.from('scores').delete().eq('user_id', targetUserId);

        // Step 3: Delete subscription records
        await supabaseAdmin.from('subscriptions').delete().eq('user_id', targetUserId);

        // Step 4: Delete verification uploads (added)
        await supabaseAdmin.from('verification_uploads').delete().eq('user_id', targetUserId);
        await supabaseAdmin.from('verification_uploads').delete().eq('reviewed_by', targetUserId); // If they were an admin once

        // Step 5: Anonymize or Delete Payouts (added)
        // We'll anonymize payouts to keep financial records accurate
        await supabaseAdmin.from('payouts').update({ user_id: null, reference: '(Deleted User Record)' }).eq('user_id', targetUserId);

        // Step 5b: Handle Charity Payouts references (added)
        await supabaseAdmin.from('charity_payouts').update({ processed_by: null }).eq('processed_by', targetUserId);

        // Step 5c: Handle Draw Simulations (added)
        await supabaseAdmin.from('draw_simulations').update({ run_by: null }).eq('run_by', targetUserId);

        // Step 6: Delete Draw Entries (added)
        await supabaseAdmin.from('draw_entries').delete().eq('user_id', targetUserId);

        // Step 7: Anonymize donations
        await supabaseAdmin.from('donations').update({
            user_id: null,
            donor_name: 'Deleted User',
            donor_email: null
        }).eq('user_id', targetUserId);

        // Step 8: Delete profile
        const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', targetUserId);
        if (profileError) {
            console.error('Profile deletion error:', profileError);
            throw new Error(`Database error deleting user: ${profileError.message}`);
        }

        // Step 9: DELETE THE AUTH USER
        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

        if (authDeleteError) {
            console.error('Auth deletion error:', authDeleteError);
            throw new Error(`Failed to delete auth user: ${authDeleteError.message}`);
        }

        return new Response(JSON.stringify({ success: true, message: 'Account completely deleted' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error('=== DELETE ACCOUNT ERROR ===', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
});

