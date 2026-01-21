import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2023-10-16',
})

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Create Setup Intent Edge Function
 * 
 * Creates a Stripe Customer (if not exists) and a SetupIntent
 * for collecting payment method during initial setup.
 * Then creates a subscription based on the selected price.
 */
serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Get user from auth header
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            throw new Error('Missing authorization header')
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)

        if (authError || !user) {
            throw new Error('Not authenticated')
        }

        const { priceId, origin } = await req.json()
        if (!priceId) {
            throw new Error('Missing priceId - please select a plan')
        }

        // Get or create Stripe customer
        const { data: profile } = await supabase
            .from('profiles')
            .select('stripe_customer_id, email, full_name')
            .eq('id', user.id)
            .single()

        let customerId = profile?.stripe_customer_id

        // Create Stripe customer if doesn't exist
        if (!customerId) {
            console.log('Creating new Stripe customer for user:', user.id)
            const customer = await stripe.customers.create({
                email: user.email || profile?.email,
                name: profile?.full_name,
                metadata: {
                    supabase_user_id: user.id,
                    created_via: 'setup_intent'
                }
            })
            customerId = customer.id

            // Save customer ID to profile
            await supabase
                .from('profiles')
                .update({ stripe_customer_id: customerId })
                .eq('id', user.id)

            console.log('Saved Stripe customer ID:', customerId)
        }

        // Create checkout session for subscription (simpler flow)
        // Using checkout session instead of setup intent for better UX
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${origin || req.headers.get('origin')}/complete-setup?success=true`,
            cancel_url: `${origin || req.headers.get('origin')}/complete-setup?canceled=true`,
            metadata: {
                supabase_user_id: user.id,
                setup_flow: 'true'
            },
            subscription_data: {
                metadata: {
                    supabase_user_id: user.id
                }
            }
        })

        console.log('Created checkout session:', session.id)

        return new Response(
            JSON.stringify({
                url: session.url,
                customerId: customerId
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Setup intent error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
