import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    // Handle CORS preflight
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

        const stripe = new Stripe(stripeKey, {
            apiVersion: '2023-10-16',
            httpClient: Stripe.createFetchHttpClient(),
        });

        // Get the authorization header
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Create Supabase client with service role for admin operations
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // Create Supabase client with user's token to verify identity
        const supabaseUser = createClient(supabaseUrl, supabaseServiceKey, {
            global: {
                headers: { Authorization: authHeader }
            }
        });

        // Get the user
        const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Invalid user' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Get user's subscription from database
        const { data: subscription, error: subError } = await supabaseAdmin
            .from('subscriptions')
            .select('stripe_subscription_id, stripe_customer_id')
            .eq('user_id', user.id)
            .single();

        if (subError || !subscription) {
            console.log('No subscription found for user:', user.id);
            return new Response(
                JSON.stringify({ success: true, message: 'No active subscription to cancel' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Cancel the Stripe subscription immediately (no refund)
        if (subscription.stripe_subscription_id) {
            try {
                await stripe.subscriptions.cancel(subscription.stripe_subscription_id, {
                    prorate: false, // No refund/proration
                    invoice_now: false // Don't invoice for remaining usage
                });
                console.log('Stripe subscription cancelled:', subscription.stripe_subscription_id);
            } catch (stripeError) {
                console.error('Stripe cancellation error:', stripeError);
                // Continue even if Stripe fails - the subscription might already be cancelled
            }
        }

        // Update local subscription status
        await supabaseAdmin
            .from('subscriptions')
            .update({ status: 'cancelled' })
            .eq('user_id', user.id);

        return new Response(
            JSON.stringify({ success: true, message: 'Subscription cancelled successfully' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Cancel subscription error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
