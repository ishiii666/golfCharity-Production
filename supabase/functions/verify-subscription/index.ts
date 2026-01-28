import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    console.log('=== VERIFY SUBSCRIPTION v4 ===');

    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');

        console.log('Config check:', { url: !!supabaseUrl, service: !!supabaseServiceKey, stripe: !!stripeKey });

        if (!supabaseUrl || !supabaseServiceKey) {
            return new Response(
                JSON.stringify({ error: 'Server config error' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Parse request body
        let userId = null;
        let force = false;
        try {
            const body = await req.json();
            userId = body.user_id;
            force = body.force || false;
            console.log('Request user_id:', userId, 'force:', force);
        } catch {
            return new Response(
                JSON.stringify({ error: 'user_id required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        if (!userId) {
            return new Response(
                JSON.stringify({ error: 'user_id required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // Check existing subscription unless force sync is requested
        if (!force) {
            const { data: existingSub, error: subErr } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            console.log('Existing sub check:', { found: !!existingSub, error: subErr?.message });

            if (existingSub) {
                return new Response(
                    JSON.stringify({ subscription: existingSub, source: 'database', synced: true }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
        }

        // Get profile with stripe_customer_id
        const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select('stripe_customer_id')
            .eq('id', userId)
            .maybeSingle();

        console.log('Profile check:', { customerId: profile?.stripe_customer_id, error: profileErr?.message });

        if (!profile?.stripe_customer_id) {
            return new Response(
                JSON.stringify({ subscription: null, message: 'No Stripe customer' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        if (!stripeKey) {
            return new Response(
                JSON.stringify({ subscription: null, error: 'Stripe not configured' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Fetch all subscriptions from Stripe (including cancelled/past_due)
        console.log('Fetching from Stripe:', profile.stripe_customer_id);
        const stripeRes = await fetch(
            `https://api.stripe.com/v1/subscriptions?customer=${profile.stripe_customer_id}&status=all&limit=1`,
            { headers: { 'Authorization': `Bearer ${stripeKey}` } }
        );
        const stripeData = await stripeRes.json();

        console.log('Stripe response:', { ok: stripeRes.ok, hasData: !!stripeData.data?.length });

        if (!stripeData.data?.length) {
            // If we found NO subscription on Stripe, we should deactivate the DB record if it exists
            if (force) {
                await supabase.from('subscriptions').delete().eq('user_id', userId);
                await supabase.from('profiles').update({ subscription_type: 'none' }).eq('id', userId);
            }
            return new Response(
                JSON.stringify({ subscription: null, message: 'No Stripe subscription found' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Build subscription record
        const s = stripeData.data[0];
        const now = new Date().toISOString();

        const subRecord = {
            user_id: userId,
            stripe_customer_id: profile.stripe_customer_id,
            stripe_subscription_id: s.id,
            plan: s.items?.data?.[0]?.price?.recurring?.interval === 'year' ? 'annual' : 'monthly',
            status: s.status, // Preserve actual Stripe status (active, past_due, canceled, trialing, etc.)
            current_period_start: s.current_period_start ? new Date(s.current_period_start * 1000).toISOString() : now,
            current_period_end: s.current_period_end ? new Date(s.current_period_end * 1000).toISOString() : now,
            cancel_at_period_end: s.cancel_at_period_end || false,
            updated_at: now
        };

        console.log('Upserting subscription:', JSON.stringify(subRecord));

        // Use UPSERT by user_id
        const { data: upserted, error: upsertErr } = await supabase
            .from('subscriptions')
            .upsert(subRecord, { onConflict: 'user_id' })
            .select()
            .single();

        if (upsertErr) {
            console.error('UPSERT FAILED:', upsertErr.message);
            // Fallback for environments where unique constraints might be different
            // Return the record we intended to save so the UI can at least show current Stripe truth
            return new Response(
                JSON.stringify({
                    subscription: subRecord,
                    source: 'stripe',
                    synced: false,
                    error: upsertErr.message
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Also update the profile for quick access
        const isSubscribed = ['active', 'trialing'].includes(s.status);
        await supabase
            .from('profiles')
            .update({
                subscription_type: isSubscribed ? subRecord.plan : 'none'
            })
            .eq('id', userId);

        console.log('✅ Synchronized with Stripe and updated profile');
        return new Response(
            JSON.stringify({ subscription: upserted, source: 'stripe', synced: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (err) {
        console.error('EXCEPTION:', err);
        return new Response(
            JSON.stringify({ error: String(err) }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
