// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
// @ts-ignore
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Validate environment variables
        const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        if (!stripeKey) {
            console.error('Missing STRIPE_SECRET_KEY environment variable')
            throw new Error('Server configuration error: Stripe not configured')
        }

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Missing Supabase environment variables')
            throw new Error('Server configuration error: Database not configured')
        }

        // 2. Authenticate user
        const authHeader = req.headers.get('Authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.error('Missing or invalid authorization header')
            return new Response(
                JSON.stringify({ error: 'Missing authorization header. Please log in again.' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)

        if (authError || !user) {
            console.error('Auth error:', authError?.message || 'No user found')
            return new Response(
                JSON.stringify({ error: 'Session expired. Please log in again.' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log('Authenticated user:', user.id, user.email)

        // 3. Initialize Stripe
        const stripe = new Stripe(stripeKey, {
            apiVersion: '2023-10-16',
        })

        // 4. Get customer ID from profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('stripe_customer_id')
            .eq('id', user.id)
            .single()

        if (profileError) {
            console.error('Profile fetch error:', profileError.message)
            throw new Error('Unable to fetch your profile. Please try again.')
        }

        if (!profile?.stripe_customer_id) {
            console.error('No stripe_customer_id for user:', user.id)
            throw new Error('No active subscription found. Please subscribe first to manage your plan.')
        }

        console.log('Found Stripe customer:', profile.stripe_customer_id)

        // 5. Parse request body for optional return URL
        let returnUrl = `${req.headers.get('origin') || 'https://www.golfcharity.com.au'}/pricing`

        try {
            const body = await req.json()
            if (body.returnUrl && typeof body.returnUrl === 'string') {
                returnUrl = body.returnUrl
            }
        } catch {
            // No body or invalid JSON, use default return URL
        }

        console.log('Creating portal session with return URL:', returnUrl)

        // 6. Create billing portal session
        const session = await stripe.billingPortal.sessions.create({
            customer: profile.stripe_customer_id,
            return_url: returnUrl,
        })

        if (!session.url) {
            console.error('Stripe did not return a portal URL')
            throw new Error('Unable to create billing portal. Please try again.')
        }

        console.log('Portal session created successfully:', session.id)

        return new Response(
            JSON.stringify({ url: session.url }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
        console.error('Portal session error detail:', errorMessage)

        return new Response(
            JSON.stringify({ error: errorMessage }),
            {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})
