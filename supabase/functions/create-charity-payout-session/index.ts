// @ts-nocheck
import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno"

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
        const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
        if (!stripeKey) throw new Error('STRIPE_SECRET_KEY not configured')

        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        if (!supabaseUrl || !supabaseServiceKey) throw new Error('Supabase env vars missing')

        // Get user from auth header
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Missing authorization header')

        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        const token = authHeader.replace('Bearer ', '')

        // Use the token to get the user
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)
        if (authError || !user) throw new Error('Authentication failed: ' + (authError?.message || 'No user found'))

        // Check if user is admin
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profileError || profile?.role !== 'admin') {
            throw new Error('Unauthorized: Admin access required')
        }

        const body = await req.json()
        const { payoutId, amount, charityName, type } = body

        if (!payoutId || !amount || !charityName) {
            throw new Error('Missing required fields: payoutId, amount, charityName')
        }

        const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
        const origin = req.headers.get('origin') || 'http://localhost:5173'

        console.log(`🏢 Creating charity payout session for ${charityName} ($${amount})`)

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'aud',
                    product_data: {
                        name: `Charity Payout: ${charityName}`,
                        description: `Fulfillment of ${type || 'donations'} for ${charityName}`,
                    },
                    unit_amount: Math.round(amount * 100), // cents
                },
                quantity: 1,
            }],
            success_url: `${origin}/admin/finance?payout=success&payoutId=${payoutId}`,
            cancel_url: `${origin}/admin/finance?payout=canceled`,
            metadata: {
                type: 'charity_fulfillment',
                payout_id: payoutId,
                admin_id: user.id,
                charity_name: charityName
            }
        })

        return new Response(
            JSON.stringify({ url: session.url }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('Charity payout session error:', error.message)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
