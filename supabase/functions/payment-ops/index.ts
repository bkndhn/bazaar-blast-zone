import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Razorpay from 'https://esm.sh/razorpay@2.9.2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { action, ...params } = await req.json()

        if (action === 'create_order') {
            const { amount, currency = 'INR', admin_id } = params

            // Get admin settings for credentials
            const { data: settings, error: settingsError } = await supabase
                .from('admin_settings')
                .select('razorpay_key_id, razorpay_key_secret')
                .eq('admin_id', admin_id)
                .single()

            if (settingsError || !settings?.razorpay_key_id || !settings?.razorpay_key_secret) {
                throw new Error('Payment configuration not found for this store')
            }

            const instance = new Razorpay({
                key_id: settings.razorpay_key_id,
                key_secret: settings.razorpay_key_secret,
            })

            const order = await instance.orders.create({
                amount: Math.round(amount * 100), // amount in smallest currency unit
                currency,
                receipt: `receipt_${Date.now()}`,
            })

            return new Response(
                JSON.stringify({
                    order_id: order.id,
                    key_id: settings.razorpay_key_id
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (action === 'verify_payment') {
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature, admin_id } = params

            // Get admin settings for secret
            const { data: settings, error: settingsError } = await supabase
                .from('admin_settings')
                .select('razorpay_key_secret')
                .eq('admin_id', admin_id)
                .single()

            if (settingsError || !settings?.razorpay_key_secret) {
                throw new Error('Payment configuration not found')
            }

            // Verify signature
            // Using crypto to verify signature as per Razorpay documentation
            // text = orderId + "|" + paymentId
            const text = `${razorpay_order_id}|${razorpay_payment_id}`;
            const secret = settings.razorpay_key_secret;

            const encoder = new TextEncoder();
            const keyData = encoder.encode(secret);
            const textData = encoder.encode(text);

            const key = await crypto.subtle.importKey(
                'raw',
                keyData,
                { name: 'HMAC', hash: 'SHA-256' },
                false,
                ['sign']
            );

            const signature = await crypto.subtle.sign('HMAC', key, textData);

            // Convert array buffer to hex string
            const generated_signature = Array.from(new Uint8Array(signature))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');

            if (generated_signature === razorpay_signature) {
                return new Response(
                    JSON.stringify({ verified: true }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            } else {
                return new Response(
                    JSON.stringify({ verified: false, error: 'Invalid signature' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }
        }

        throw new Error(`Invalid action: ${action}`)

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
