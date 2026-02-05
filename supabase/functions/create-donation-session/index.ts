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
        const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
        if (!stripeKey) {
            throw new Error('Stripe is not configured on the server.')
        }

        const stripe = new Stripe(stripeKey, {
            apiVersion: '2023-10-16',
        })

        const body = await req.json()
        const { amount, charityId, charityName, userId } = body

        if (!amount || !charityId || !charityName) {
            throw new Error('Missing required fields: amount, charityId, or charityName')
        }

        const amountCents = Math.round(amount * 100)
        if (amountCents < 100) {
            throw new Error('Minimum donation amount is $1.00')
        }

        console.log(`Creating donation session for ${charityName}: $${amount}`)

        // Create checkout session for one-time payment
        const origin = req.headers.get('origin') || 'https://www.golfcharity.com.au'

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
                    unit_amount: amountCents,
                },
                quantity: 1,
            }],
            success_url: `${origin}/charities?donation=success&charity=${encodeURIComponent(charityName)}`,
            cancel_url: `${origin}/charities?donation=canceled`,
            metadata: {
                type: 'donation',
                charity_id: charityId,
                charity_name: charityName,
                user_id: userId || 'anonymous'
            }
        })

        if (!session.url) {
            throw new Error('Stripe failed to generate a donation checkout URL.')
        }

        console.log('Donation session created successfully:', session.id)

        return new Response(
            JSON.stringify({ url: session.url }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
        console.error('Donation session error:', errorMessage)

        return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
