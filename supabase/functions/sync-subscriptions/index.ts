import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Sync Subscriptions from Stripe
 * 
 * This function fetches all active subscriptions from Stripe and syncs them
 * to the Supabase subscriptions table. It uses the stripe_customer_id from
 * profiles to match users.
 * 
 * Call this function to recover subscription data if webhooks failed.
 */

Deno.serve(async (req) => {
    console.log('=== SYNC SUBSCRIPTIONS FUNCTION CALLED ===');

    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!stripeKey || !supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing configuration');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // Get all profiles with stripe_customer_id
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, email, full_name, stripe_customer_id')
            .not('stripe_customer_id', 'is', null);

        if (profilesError) {
            throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
        }

        console.log(`Found ${profiles?.length || 0} profiles with Stripe customer IDs`);

        const results = {
            synced: 0,
            skipped: 0,
            errors: 0,
            details: []
        };

        // For each profile with a stripe_customer_id, fetch their subscription from Stripe
        for (const profile of profiles || []) {
            try {
                console.log(`Processing: ${profile.email} (${profile.stripe_customer_id})`);

                // Fetch subscriptions for this customer from Stripe
                const response = await fetch(
                    `https://api.stripe.com/v1/subscriptions?customer=${profile.stripe_customer_id}&status=all&limit=1`,
                    {
                        headers: {
                            'Authorization': `Bearer ${stripeKey}`,
                        }
                    }
                );

                const data = await response.json();

                if (data.error) {
                    console.error(`Stripe error for ${profile.email}:`, data.error);
                    results.errors++;
                    results.details.push({ email: profile.email, error: data.error.message });
                    continue;
                }

                const subscriptions = data.data || [];

                if (subscriptions.length === 0) {
                    console.log(`No subscriptions found for ${profile.email}`);
                    results.skipped++;
                    results.details.push({ email: profile.email, status: 'no_subscription' });
                    continue;
                }

                // Get the most recent subscription
                const stripeSub = subscriptions[0];
                console.log(`Found subscription: ${stripeSub.id}, status: ${stripeSub.status}`);

                // Determine plan type
                const interval = stripeSub.items?.data?.[0]?.price?.recurring?.interval;
                const plan = interval === 'year' ? 'annual' : 'monthly';
                const priceId = stripeSub.items?.data?.[0]?.price?.id;

                // Map Stripe status to our status
                let status = 'active';
                if (stripeSub.status === 'past_due') status = 'past_due';
                else if (stripeSub.status === 'canceled' || stripeSub.status === 'unpaid') status = 'cancelled';
                else if (stripeSub.status === 'trialing') status = 'trialing';
                else if (stripeSub.status === 'active') status = 'active';
                else status = stripeSub.status;

                // Upsert subscription record
                const { error: upsertError } = await supabase
                    .from('subscriptions')
                    .upsert({
                        user_id: profile.id,
                        stripe_customer_id: profile.stripe_customer_id,
                        stripe_subscription_id: stripeSub.id,
                        stripe_price_id: priceId,
                        plan: plan,
                        status: status,
                        current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
                        current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
                        cancel_at_period_end: stripeSub.cancel_at_period_end || false,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'user_id' });

                if (upsertError) {
                    console.error(`Upsert error for ${profile.email}:`, upsertError);
                    results.errors++;
                    results.details.push({ email: profile.email, error: upsertError.message });
                } else {
                    console.log(`✅ Synced subscription for ${profile.email}: ${status} ${plan}`);
                    results.synced++;
                    results.details.push({
                        email: profile.email,
                        status: status,
                        plan: plan,
                        synced: true
                    });
                }

            } catch (err) {
                console.error(`Error processing ${profile.email}:`, err);
                results.errors++;
                results.details.push({ email: profile.email, error: err.message });
            }
        }

        console.log('=== SYNC COMPLETE ===', results);

        return new Response(
            JSON.stringify({
                success: true,
                message: `Synced ${results.synced} subscriptions, skipped ${results.skipped}, errors ${results.errors}`,
                results
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('=== SYNC ERROR ===', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
