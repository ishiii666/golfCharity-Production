import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2023-10-16',
})

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { amount, charityId, charityName, userId } = await req.json()

        if (!amount || !charityId || !charityName) {
            throw new Error('Missing required fields: amount, charityId, charityName')
        }

        if (amount < 1) {
            throw new Error('Minimum donation amount is $1')
        }

        // Create checkout session for one-time payment
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'aud',
                    product_data: {
                        name: `Donation to ${charityName}`,
                        description: 'One-time charitable donation via Golf Charity',
                    },
                    unit_amount: Math.round(amount * 100), // Convert dollars to cents
                },
                quantity: 1,
            }],
            success_url: `${req.headers.get('origin')}/charities?donation=success&charity=${encodeURIComponent(charityName)}`,
            cancel_url: `${req.headers.get('origin')}/charities?donation=canceled`,
            metadata: {
                type: 'donation',
                charity_id: charityId,
                charity_name: charityName,
                user_id: userId || 'anonymous'
            }
        })

        return new Response(
            JSON.stringify({ url: session.url }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Donation session error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
