import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Check if Stripe key is configured
        const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
        if (!stripeKey) {
            console.error('STRIPE_SECRET_KEY not configured')
            throw new Error('Payment system not configured')
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Supabase env vars missing')
            throw new Error('Database not configured')
        }

        // Get user from auth header
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            console.error('Missing authorization header')
            throw new Error('Missing authorization header')
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        const token = authHeader.replace('Bearer ', '')

        console.log('Authenticating user...')
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)

        if (authError) {
            console.error('Auth error:', authError.message)
            throw new Error('Authentication failed: ' + authError.message)
        }

        if (!user) {
            console.error('No user found')
            throw new Error('Not authenticated')
        }

        console.log('User authenticated:', user.id)

        const body = await req.json()
        const { priceId } = body

        console.log('Price ID received:', priceId)

        if (!priceId) {
            throw new Error('Missing priceId')
        }

        // Check if user already has a Stripe customer ID
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('stripe_customer_id, email')
            .eq('id', user.id)
            .single()

        if (profileError) {
            console.error('Profile error:', profileError.message)
        }

        let customerId = profile?.stripe_customer_id

        // Use fetch to call Stripe API directly (more compatible)
        const stripeHeaders = {
            'Authorization': `Bearer ${stripeKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        }

        // Create Stripe customer if doesn't exist
        if (!customerId) {
            console.log('Creating Stripe customer...')

            const customerResponse = await fetch('https://api.stripe.com/v1/customers', {
                method: 'POST',
                headers: stripeHeaders,
                body: new URLSearchParams({
                    email: user.email || profile?.email || '',
                    'metadata[supabase_user_id]': user.id,
                }),
            })

            const customerData = await customerResponse.json()

            if (customerData.error) {
                console.error('Stripe customer error:', customerData.error.message)
                throw new Error('Failed to create customer: ' + customerData.error.message)
            }

            customerId = customerData.id
            console.log('Stripe customer created:', customerId)

            // Save customer ID to profile
            await supabase
                .from('profiles')
                .update({ stripe_customer_id: customerId })
                .eq('id', user.id)
        }

        // Create checkout session using Stripe API directly
        const origin = req.headers.get('origin') || 'http://localhost:5173'
        console.log('Creating checkout session with origin:', origin)

        const sessionResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
            method: 'POST',
            headers: stripeHeaders,
            body: new URLSearchParams({
                customer: customerId,
                mode: 'subscription',
                'payment_method_types[0]': 'card',
                'line_items[0][price]': priceId,
                'line_items[0][quantity]': '1',
                success_url: `${origin}/pricing?success=true`,
                cancel_url: `${origin}/pricing?canceled=true`,
                'metadata[supabase_user_id]': user.id,
            }),
        })

        const sessionData = await sessionResponse.json()

        if (sessionData.error) {
            console.error('Stripe session error:', sessionData.error.message)
            throw new Error('Failed to create checkout: ' + sessionData.error.message)
        }

        console.log('Checkout session created:', sessionData.id)

        return new Response(
            JSON.stringify({ url: sessionData.url }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
        console.error('Checkout session error:', errorMessage)
        return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
