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

        // Verify user token by decoding JWT
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

        console.log('User lookup result:', { userId: user?.id, email: user?.email, error: userError?.message });

        if (userError || !user) {
            console.error('User verification failed:', userError);
            return new Response(
                JSON.stringify({ error: 'Invalid user token: ' + (userError?.message || 'No user found') }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const userId = user.id;
        const userEmail = user.email;
        console.log('=== DELETING USER ===', { userId, userEmail });

        // Step 1: Delete activity logs (Must happen before auth user deletion as it references auth.users)
        console.log('Step 1: Deleting activity logs...');
        const { error: logsError } = await supabaseAdmin
            .from('activity_log')
            .delete()
            .eq('user_id', userId);
        console.log('Activity logs deleted:', { error: logsError?.message });

        // Step 2: Delete scores
        console.log('Step 2: Deleting scores...');
        const { error: scoresError } = await supabaseAdmin
            .from('scores')
            .delete()
            .eq('user_id', userId);
        console.log('Scores deleted:', { error: scoresError?.message });

        // Step 3: Delete subscription record
        console.log('Step 3: Deleting subscription...');
        const { error: subError } = await supabaseAdmin
            .from('subscriptions')
            .delete()
            .eq('user_id', userId);
        console.log('Subscription deleted:', { error: subError?.message });

        // Step 4: Anonymize donations
        console.log('Step 4: Anonymizing donations...');
        const { error: donationError } = await supabaseAdmin
            .from('donations')
            .update({
                user_id: null,
                donor_name: 'Deleted User',
                donor_email: null
            })
            .eq('user_id', userId);
        console.log('Donations anonymized:', { error: donationError?.message });

        // Step 5: Delete profile
        console.log('Step 5: Deleting profile...');
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .delete()
            .eq('id', userId);
        console.log('Profile deleted:', { error: profileError?.message });

        // Step 6: DELETE THE AUTH USER
        console.log('Step 6: Deleting auth user...');
        const { data: deleteData, error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        console.log('Auth user deletion result:', {
            success: !authDeleteError,
            error: authDeleteError?.message,
            data: deleteData
        });

        if (authDeleteError) {
            console.error('CRITICAL: Failed to delete auth user:', authDeleteError);
            throw new Error(`Failed to delete auth user: ${authDeleteError.message}`);
        }

        console.log('=== USER COMPLETELY DELETED ===', { userId, userEmail });

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Account completely deleted',
                deletedUserId: userId,
                deletedEmail: userEmail
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('=== DELETE ACCOUNT ERROR ===', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Unknown error occurred' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

