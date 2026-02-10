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

        // ===================== RAZORPAY =====================
        if (action === 'create_order') {
            const { amount, currency = 'INR', admin_id } = params

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
                amount: Math.round(amount * 100),
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

            const { data: settings, error: settingsError } = await supabase
                .from('admin_settings')
                .select('razorpay_key_secret')
                .eq('admin_id', admin_id)
                .single()

            if (settingsError || !settings?.razorpay_key_secret) {
                throw new Error('Payment configuration not found')
            }

            const text = `${razorpay_order_id}|${razorpay_payment_id}`;
            const secret = settings.razorpay_key_secret;

            const encoder = new TextEncoder();
            const keyData = encoder.encode(secret);
            const textData = encoder.encode(text);

            const key = await crypto.subtle.importKey(
                'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
            );

            const signature = await crypto.subtle.sign('HMAC', key, textData);
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

        // ===================== PHONEPE =====================
        if (action === 'phonepe_initiate') {
            const { amount, admin_id, order_number, callback_url } = params

            const { data: settings, error: settingsError } = await supabase
                .from('admin_settings')
                .select('phonepe_merchant_id, phonepe_salt_key, phonepe_salt_index, phonepe_enabled')
                .eq('admin_id', admin_id)
                .single()

            if (settingsError || !settings?.phonepe_enabled || !settings?.phonepe_merchant_id || !settings?.phonepe_salt_key) {
                throw new Error('PhonePe configuration not found for this store')
            }

            const merchantId = settings.phonepe_merchant_id;
            const saltKey = settings.phonepe_salt_key;
            const saltIndex = settings.phonepe_salt_index || '1';
            const merchantTransactionId = `MT${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

            const payload = {
                merchantId,
                merchantTransactionId,
                merchantUserId: `MUID${Date.now()}`,
                amount: Math.round(amount * 100), // amount in paise
                redirectUrl: callback_url,
                redirectMode: 'REDIRECT',
                callbackUrl: callback_url,
                paymentInstrument: {
                    type: 'PAY_PAGE',
                },
            };

            const payloadString = JSON.stringify(payload);
            const base64Payload = btoa(payloadString);

            // Generate checksum: SHA256(base64Payload + "/pg/v1/pay" + saltKey) + "###" + saltIndex
            const checksumString = base64Payload + '/pg/v1/pay' + saltKey;
            const encoder = new TextEncoder();
            const data = encoder.encode(checksumString);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const sha256Hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            const checksum = sha256Hash + '###' + saltIndex;

            // Call PhonePe API
            const phonepeUrl = 'https://api.phonepe.com/apis/hermes/pg/v1/pay';

            const response = await fetch(phonepeUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-VERIFY': checksum,
                },
                body: JSON.stringify({ request: base64Payload }),
            });

            const result = await response.json();

            if (result.success && result.data?.instrumentResponse?.redirectInfo?.url) {
                return new Response(
                    JSON.stringify({
                        success: true,
                        redirect_url: result.data.instrumentResponse.redirectInfo.url,
                        merchant_transaction_id: merchantTransactionId,
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            } else {
                throw new Error(result.message || 'PhonePe payment initiation failed')
            }
        }

        if (action === 'phonepe_verify') {
            const { merchant_transaction_id, admin_id } = params

            const { data: settings, error: settingsError } = await supabase
                .from('admin_settings')
                .select('phonepe_merchant_id, phonepe_salt_key, phonepe_salt_index')
                .eq('admin_id', admin_id)
                .single()

            if (settingsError || !settings?.phonepe_merchant_id || !settings?.phonepe_salt_key) {
                throw new Error('PhonePe configuration not found')
            }

            const merchantId = settings.phonepe_merchant_id;
            const saltKey = settings.phonepe_salt_key;
            const saltIndex = settings.phonepe_salt_index || '1';

            // Generate checksum for status API
            const statusPath = `/pg/v1/status/${merchantId}/${merchant_transaction_id}`;
            const checksumString = statusPath + saltKey;
            const encoder = new TextEncoder();
            const data = encoder.encode(checksumString);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const sha256Hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            const checksum = sha256Hash + '###' + saltIndex;

            const statusUrl = `https://api.phonepe.com/apis/hermes${statusPath}`;

            const response = await fetch(statusUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-VERIFY': checksum,
                    'X-MERCHANT-ID': merchantId,
                },
            });

            const result = await response.json();

            if (result.success && result.code === 'PAYMENT_SUCCESS') {
                return new Response(
                    JSON.stringify({
                        verified: true,
                        transaction_id: result.data?.transactionId,
                        payment_instrument: result.data?.paymentInstrument,
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            } else {
                return new Response(
                    JSON.stringify({ verified: false, error: result.message || 'Payment not successful', code: result.code }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }
        }

        throw new Error(`Invalid action: ${action}`)

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return new Response(
            JSON.stringify({ error: message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
