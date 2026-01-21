import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"
import { createHmac } from "node:crypto"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

// Verify Stripe webhook signature
function verifyStripeSignature(payload: string, signature: string, secret: string): boolean {
    try {
        const parts = signature.split(',').reduce((acc, part) => {
            const [key, value] = part.split('=')
            acc[key] = value
            return acc
        }, {} as Record<string, string>)

        const timestamp = parts['t']
        const sig = parts['v1']

        if (!timestamp || !sig) return false

        const signedPayload = `${timestamp}.${payload}`
        const expectedSig = createHmac('sha256', secret)
            .update(signedPayload)
            .digest('hex')

        return sig === expectedSig
    } catch {
        return false
    }
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!stripeKey || !webhookSecret || !supabaseUrl || !supabaseServiceKey) {
        console.error('Missing environment variables')
        return new Response('Server misconfigured', { status: 500 })
    }

    const signature = req.headers.get('stripe-signature')
    if (!signature) {
        console.error('Missing stripe-signature header')
        return new Response('Missing stripe-signature header', { status: 400 })
    }

    const body = await req.text()

    // Verify signature
    if (!verifyStripeSignature(body, signature, webhookSecret)) {
        console.error('Webhook signature verification failed')
        return new Response('Webhook signature verification failed', { status: 400 })
    }

    const event = JSON.parse(body)
    console.log('Processing Stripe event:', event.type)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const stripeHeaders = {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object
                const metadata = session.metadata || {}

                console.log('Checkout session completed')
                console.log('Session mode:', session.mode)
                console.log('Metadata:', JSON.stringify(metadata))

                // Handle DONATIONS (payment mode)
                if (session.mode === 'payment' && metadata.type === 'donation' && metadata.charity_id) {
                    console.log('Processing donation for charity:', metadata.charity_id)

                    const amountInDollars = session.amount_total / 100

                    // Insert donation record
                    const { error: donationError } = await supabase.from('donations').insert({
                        user_id: metadata.user_id !== 'anonymous' ? metadata.user_id : null,
                        charity_id: metadata.charity_id,
                        amount: amountInDollars,
                        currency: session.currency || 'aud',
                        stripe_payment_intent_id: session.payment_intent,
                        source: 'direct',
                        status: 'completed'
                    })

                    if (donationError) {
                        console.error('Donation insert error:', donationError)
                    } else {
                        console.log('✅ Donation recorded:', amountInDollars, session.currency)
                    }

                    // Update charity total_raised using RPC
                    const { error: charityError } = await supabase.rpc('increment_charity_total', {
                        p_charity_id: metadata.charity_id,
                        p_amount: amountInDollars
                    })

                    if (charityError) {
                        console.error('Charity total update error:', charityError)
                    } else {
                        console.log('✅ Charity total updated for:', metadata.charity_name)
                    }
                }

                // Handle SUBSCRIPTIONS (subscription mode)
                const userId = metadata.supabase_user_id
                if (session.mode === 'subscription' && userId && session.subscription) {
                    // Fetch subscription details from Stripe
                    const subResponse = await fetch(
                        `https://api.stripe.com/v1/subscriptions/${session.subscription}?expand[]=default_payment_method`,
                        { headers: { 'Authorization': `Bearer ${stripeKey}` } }
                    )
                    const subscription = await subResponse.json()

                    if (subscription.error) {
                        console.error('Error fetching subscription:', subscription.error)
                        break
                    }

                    // Determine plan type
                    const interval = subscription.items?.data?.[0]?.price?.recurring?.interval
                    const plan = interval === 'year' ? 'annual' : 'monthly'
                    const priceId = subscription.items?.data?.[0]?.price?.id

                    console.log('Plan type:', plan)
                    console.log('Price ID:', priceId)

                    // Get payment method details
                    let paymentMethodData: Record<string, string | number> = {}
                    const pm = subscription.default_payment_method
                    if (pm && pm.card) {
                        paymentMethodData = {
                            payment_method_brand: pm.card.brand,
                            payment_method_last4: pm.card.last4,
                            payment_method_exp_month: pm.card.exp_month,
                            payment_method_exp_year: pm.card.exp_year
                        }
                    }

                    // Upsert subscription record
                    const { error: subError } = await supabase.from('subscriptions').upsert({
                        user_id: userId,
                        stripe_customer_id: session.customer,
                        stripe_subscription_id: subscription.id,
                        stripe_price_id: priceId,
                        plan: plan,
                        status: 'active',
                        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                        updated_at: new Date().toISOString(),
                        ...paymentMethodData
                    }, { onConflict: 'user_id' })

                    if (subError) {
                        console.error('Subscription upsert error:', subError)
                    } else {
                        console.log('✅ Subscription created for user:', userId)
                        // Note: Jackpot grows only from unpaid 40% when no 5-match winner
                        // It does NOT grow from subscription payments
                    }

                    // Mark user setup as complete in profiles
                    const { error: profileError } = await supabase.from('profiles')
                        .update({
                            setup_completed: true,
                            stripe_customer_id: session.customer
                        })
                        .eq('id', userId)

                    if (profileError) {
                        console.error('Profile update error:', profileError)
                    } else {
                        console.log('✅ Profile setup_completed updated for user:', userId)
                    }
                }
                break
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object

                console.log('Processing subscription update:', subscription.id)
                console.log('Subscription status:', subscription.status)

                // Determine status
                let status = 'active'
                if (subscription.status === 'past_due') status = 'past_due'
                else if (subscription.status === 'canceled' || subscription.status === 'unpaid') status = 'cancelled'
                else if (subscription.status === 'trialing') status = 'trialing'
                else if (subscription.status === 'active') status = 'active'

                // Get plan details (for plan changes)
                const priceId = subscription.items?.data?.[0]?.price?.id
                const interval = subscription.items?.data?.[0]?.price?.recurring?.interval
                const plan = interval === 'year' ? 'annual' : 'monthly'

                console.log('Plan detected:', plan, 'Price ID:', priceId)

                // Safely parse timestamps with null checks
                let currentPeriodEnd: string | null = null
                let currentPeriodStart: string | null = null

                if (subscription.current_period_end && typeof subscription.current_period_end === 'number') {
                    currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString()
                }
                if (subscription.current_period_start && typeof subscription.current_period_start === 'number') {
                    currentPeriodStart = new Date(subscription.current_period_start * 1000).toISOString()
                }

                // Build update object with only valid fields
                const updateData: Record<string, unknown> = {
                    status: status,
                    cancel_at_period_end: subscription.cancel_at_period_end || false,
                    updated_at: new Date().toISOString()
                }

                // Add plan/price if available (for plan changes)
                if (priceId) {
                    updateData.stripe_price_id = priceId
                    updateData.plan = plan
                }

                // Add period dates if available
                if (currentPeriodEnd) {
                    updateData.current_period_end = currentPeriodEnd
                }
                if (currentPeriodStart) {
                    updateData.current_period_start = currentPeriodStart
                }

                console.log('Updating subscription with:', JSON.stringify(updateData))

                const { error } = await supabase.from('subscriptions')
                    .update(updateData)
                    .eq('stripe_subscription_id', subscription.id)

                if (error) {
                    console.error('Subscription update error:', error)
                } else {
                    console.log('✅ Subscription updated successfully:', subscription.id, 'Plan:', plan)
                }
                break
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object

                const { error } = await supabase.from('subscriptions')
                    .update({
                        status: 'cancelled',
                        updated_at: new Date().toISOString()
                    })
                    .eq('stripe_subscription_id', subscription.id)

                if (error) console.error('Subscription delete error:', error)
                else console.log('Subscription cancelled:', subscription.id)
                break
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object
                const subscriptionId = invoice.subscription

                if (subscriptionId) {
                    const { error } = await supabase.from('subscriptions')
                        .update({
                            status: 'past_due',
                            updated_at: new Date().toISOString()
                        })
                        .eq('stripe_subscription_id', subscriptionId)

                    if (error) console.error('Payment failed update error:', error)
                    else console.log('Subscription marked past_due:', subscriptionId)
                }
                break
            }

            case 'charge.succeeded': {
                // Handle one-time donations
                const charge = event.data.object
                const metadata = charge.metadata

                if (metadata?.type === 'donation' && metadata?.charity_id) {
                    const { error: donationError } = await supabase.from('donations').insert({
                        user_id: metadata.user_id !== 'anonymous' ? metadata.user_id : null,
                        charity_id: metadata.charity_id,
                        amount: charge.amount / 100,
                        currency: charge.currency,
                        stripe_charge_id: charge.id,
                        source: 'direct',
                        status: 'completed'
                    })

                    if (donationError) console.error('Donation insert error:', donationError)

                    const { error: rpcError } = await supabase.rpc('increment_charity_total', {
                        p_charity_id: metadata.charity_id,
                        p_amount: charge.amount / 100
                    })

                    if (rpcError) console.error('Charity update error:', rpcError)
                    else console.log('Donation recorded for charity:', metadata.charity_id)
                }
                break
            }

            default:
                console.log('Unhandled event type:', event.type)
        }
    } catch (error) {
        console.error('Event processing error:', error.message)
        return new Response(`Processing Error: ${error.message}`, { status: 500 })
    }

    return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    })
})
