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
        try {
            const body = await req.json();
            userId = body.user_id;
            console.log('Request user_id:', userId);
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

        // Check existing subscription
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

        // Fetch from Stripe
        console.log('Fetching from Stripe:', profile.stripe_customer_id);
        const stripeRes = await fetch(
            `https://api.stripe.com/v1/subscriptions?customer=${profile.stripe_customer_id}&status=all&limit=1`,
            { headers: { 'Authorization': `Bearer ${stripeKey}` } }
        );
        const stripeData = await stripeRes.json();

        console.log('Stripe response:', { ok: stripeRes.ok, hasData: !!stripeData.data?.length });

        if (!stripeData.data?.length) {
            return new Response(
                JSON.stringify({ subscription: null, message: 'No Stripe subscription' }),
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
            status: s.status === 'active' ? 'active' : 'cancelled',
            current_period_start: s.current_period_start ? new Date(s.current_period_start * 1000).toISOString() : now,
            current_period_end: s.current_period_end ? new Date(s.current_period_end * 1000).toISOString() : now,
            cancel_at_period_end: s.cancel_at_period_end || false,
            updated_at: now
        };

        console.log('Inserting subscription:', JSON.stringify(subRecord));

        // Try INSERT first (simpler than upsert)
        const { data: inserted, error: insertErr } = await supabase
            .from('subscriptions')
            .insert(subRecord)
            .select()
            .single();

        if (insertErr) {
            console.error('INSERT FAILED:', insertErr.message, insertErr.details, insertErr.hint);

            // Try update if insert failed (record might exist)
            const { data: updated, error: updateErr } = await supabase
                .from('subscriptions')
                .update(subRecord)
                .eq('user_id', userId)
                .select()
                .single();

            if (updateErr) {
                console.error('UPDATE ALSO FAILED:', updateErr.message);
                return new Response(
                    JSON.stringify({
                        subscription: subRecord,
                        source: 'stripe',
                        synced: false,
                        error: insertErr.message,
                        updateError: updateErr.message
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            console.log('✅ Updated existing record');
            return new Response(
                JSON.stringify({ subscription: updated, source: 'stripe', synced: true }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log('✅ Inserted new subscription');
        return new Response(
            JSON.stringify({ subscription: inserted, source: 'stripe', synced: true }),
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
