import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Sync ALL Payments from Stripe
 * More comprehensive - fetches charges and payment intents
 */

Deno.serve(async (req) => {
    console.log('=== SYNC ALL PAYMENTS FROM STRIPE v2 ===');

    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');

        if (!supabaseUrl || !supabaseServiceKey || !stripeKey) {
            return new Response(
                JSON.stringify({ error: 'Missing configuration' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // Get all charities to map by name
        const { data: charities } = await supabase.from('charities').select('id, name');
        console.log('Charities:', charities?.length);

        // Create a name-to-id map (lowercase for matching)
        const charityMap = {};
        for (const c of charities || []) {
            charityMap[c.name.toLowerCase()] = c.id;
            // Also store without spaces
            charityMap[c.name.toLowerCase().replace(/\s+/g, '')] = c.id;
        }
        console.log('Charity map:', Object.keys(charityMap));

        // Fetch charges from Stripe
        console.log('Fetching charges from Stripe...');
        const chargesRes = await fetch(
            'https://api.stripe.com/v1/charges?limit=100',
            { headers: { 'Authorization': `Bearer ${stripeKey}` } }
        );
        const chargesData = await chargesRes.json();

        console.log('Stripe charges response:', chargesRes.ok, chargesData.data?.length);

        if (chargesData.error) {
            return new Response(
                JSON.stringify({ error: chargesData.error.message }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const charges = chargesData.data || [];
        let imported = 0;
        let skipped = 0;
        const results = [];

        for (const charge of charges) {
            // Skip failed charges
            if (charge.status !== 'succeeded') {
                console.log('Skipping failed charge:', charge.id);
                skipped++;
                continue;
            }

            // Skip if already imported
            const { data: existing } = await supabase
                .from('donations')
                .select('id')
                .eq('stripe_charge_id', charge.id)
                .maybeSingle();

            if (existing) {
                console.log('Already imported:', charge.id);
                skipped++;
                continue;
            }

            // Try to extract charity info from description or metadata
            let charityId = null;
            let charityName = 'Unknown';

            // Check metadata first
            if (charge.metadata?.charity_id) {
                charityId = charge.metadata.charity_id;
                charityName = charge.metadata.charity_name || 'From metadata';
            }

            // Try to parse from description (e.g., "Donation to CharityName")
            if (!charityId && charge.description) {
                const match = charge.description.match(/donation to (.+)/i);
                if (match) {
                    const extractedName = match[1].trim().toLowerCase();
                    // Look up in our charity map
                    for (const [key, id] of Object.entries(charityMap)) {
                        if (extractedName.includes(key) || key.includes(extractedName)) {
                            charityId = id;
                            charityName = match[1].trim();
                            break;
                        }
                    }
                }
            }

            // If still no charity, use first charity as default
            if (!charityId && charities && charities.length > 0) {
                charityId = charities[0].id;
                charityName = charities[0].name + ' (default)';
            }

            if (!charityId) {
                console.log('No charity found for charge:', charge.id);
                results.push({ charge: charge.id, skipped: 'no charity' });
                skipped++;
                continue;
            }

            const amountInDollars = charge.amount / 100;

            const donationData = {
                user_id: null, // Can't determine from charge
                charity_id: charityId,
                amount: amountInDollars,
                currency: charge.currency,
                stripe_charge_id: charge.id,
                stripe_payment_intent_id: charge.payment_intent,
                source: 'direct',
                status: 'completed',
                created_at: new Date(charge.created * 1000).toISOString()
            };

            console.log('Importing:', amountInDollars, charge.currency, 'to', charityName);

            const { error: insertErr } = await supabase
                .from('donations')
                .insert(donationData);

            if (insertErr) {
                console.error('Insert error:', insertErr.message);
                results.push({ charge: charge.id, error: insertErr.message });
            } else {
                // Update charity total
                await supabase.rpc('increment_charity_total', {
                    p_charity_id: charityId,
                    p_amount: amountInDollars
                });

                imported++;
                results.push({
                    charge: charge.id,
                    charity: charityName,
                    amount: amountInDollars,
                    currency: charge.currency,
                    success: true
                });
            }
        }

        console.log('Import complete:', imported, 'imported,', skipped, 'skipped');

        return new Response(
            JSON.stringify({
                imported,
                skipped,
                total: charges.length,
                charities: Object.keys(charityMap),
                results
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (err) {
        console.error('Error:', err);
        return new Response(
            JSON.stringify({ error: String(err) }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
