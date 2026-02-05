// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { inquiryId, responseMessage } = await req.json()

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const resendApiKey = Deno.env.get('RESEND_API_KEY')

        if (!resendApiKey) {
            throw new Error('RESEND_API_KEY is not configured in Supabase secrets. Please add it to enable direct email responses.')
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Verify admin
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Missing authorization header')

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: userError } = await supabase.auth.getUser(token)

        if (userError || !user) throw new Error('Unauthorized')

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (profile?.role !== 'admin') throw new Error('Forbidden: Only admins can send responses')

        // Get inquiry
        const { data: inquiry, error: inquiryErr } = await supabase
            .from('contact_inquiries')
            .select('*')
            .eq('id', inquiryId)
            .single()

        if (inquiryErr || !inquiry) throw new Error('Inquiry not found')

        // Send email via Resend
        const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${resendApiKey}`
            },
            body: JSON.stringify({
                from: 'Golf Charity Support <support@golfcharity.com.au>',
                to: inquiry.email,
                subject: `Re: ${inquiry.subject || 'Your Inquiry'}`,
                html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px;">
            <h2 style="color: #10b981;">Hi ${inquiry.name},</h2>
            <p>Thank you for reaching out to Golf Charity. Here is our response to your message:</p>
            
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 25px 0; line-height: 1.6;">
              ${responseMessage.replace(/\n/g, '<br>')}
            </div>
            
            <p>Best regards,<br><strong>The Golf Charity Team</strong></p>
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
              <p>Requested on: ${new Date(inquiry.created_at).toLocaleDateString()}</p>
              <p style="font-style: italic;">Original Message: "${inquiry.message}"</p>
            </div>
          </div>
        `
            })
        })

        if (!emailRes.ok) {
            const errorData = await emailRes.json()
            console.error('Resend Error:', errorData)
            throw new Error(`Email provider error: ${errorData.message || 'Unknown error'}`)
        }

        // Update inquiry record
        const { error: updateErr } = await supabase
            .from('contact_inquiries')
            .update({
                status: 'responded',
                response_message: responseMessage,
                responded_by: user.id,
                responded_at: new Date().toISOString()
            })
            .eq('id', inquiryId)

        if (updateErr) throw new Error(`Database update failed: ${updateErr.message}`)

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error('Function Error:', error)
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        return new Response(JSON.stringify({ error: errorMessage }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
