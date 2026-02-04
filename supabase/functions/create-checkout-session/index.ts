import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Validate Environment Variables
        const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        if (!stripeKey) {
            console.error('STRIPE_SECRET_KEY not configured')
            throw new Error('Payment system is not yet configured on the server.')
        }

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Supabase env vars missing')
            throw new Error('Server configuration error: Database connection details missing.')
        }

        // 2. Authenticate User
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            console.error('Missing authorization header')
            throw new Error('User session not found. Please log in.')
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        const token = authHeader.replace('Bearer ', '')

        console.log('Verifying user session...')
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)

        if (authError || !user) {
            console.error('Auth error:', authError?.message || 'No user found')
            return new Response(
                JSON.stringify({ error: 'Session expired or invalid. Please log in again.' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log('Processing request for user:', user.id)

        // 3. Parse Request Body
        const body = await req.json()
        const { priceId } = body

        if (!priceId) {
            throw new Error('Invalid request: Missing plan identification (priceId).')
        }

        console.log('Price ID identified:', priceId)

        // 4. Initialize Stripe
        const stripe = new Stripe(stripeKey, {
            apiVersion: '2023-10-16',
        })

        // 5. Get or Create Stripe Customer
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('stripe_customer_id, email, full_name')
            .eq('id', user.id)
            .single()

        if (profileError) {
            console.warn('Profile fetch warning:', profileError.message)
        }

        let customerId = profile?.stripe_customer_id

        if (!customerId) {
            console.log('Creating new Stripe customer...')
            const customer = await stripe.customers.create({
                email: user.email || profile?.email || '',
                name: profile?.full_name || '',
                metadata: {
                    supabase_user_id: user.id,
                },
            })
            customerId = customer.id

            // Update profile with customer ID
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ stripe_customer_id: customerId })
                .eq('id', user.id)

            if (updateError) {
                console.error('Failed to update profile with customer ID:', updateError.message)
            }
        }

        // 6. Create Stripe Checkout Session
        const origin = req.headers.get('origin') || 'https://www.golfcharity.com.au'
        console.log('Initializing checkout from origin:', origin)

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: `${origin}/pricing?success=true`,
            cancel_url: `${origin}/pricing?canceled=true`,
            customer_update: {
                address: 'auto',
            },
            subscription_data: {
                metadata: {
                    supabase_user_id: user.id,
                },
            },
            metadata: {
                supabase_user_id: user.id,
            },
        })

        if (!session.url) {
            throw new Error('Stripe failed to generate a checkout URL.')
        }

        console.log('Checkout session created successfully:', session.id)

        return new Response(
            JSON.stringify({ url: session.url }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during checkout.'
        console.error('Checkout error detail:', errorMessage)

        return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
