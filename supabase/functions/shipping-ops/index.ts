import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { action, orderId, adminId } = await req.json()

        if (action === 'sync_status') {
            // 1. Get Admin Settings for Credentials
            const { data: settings } = await supabaseClient
                .from('admin_settings')
                .select('shiprocket_email, shiprocket_password, is_shipping_integration_enabled')
                .eq('admin_id', adminId)
                .single()

            if (!settings?.is_shipping_integration_enabled) {
                throw new Error('Shipping integration not enabled for this admin')
            }

            // 2. Fetch Order Details (Tracking Number)
            const { data: order } = await supabaseClient
                .from('orders')
                .select('*')
                .eq('id', orderId)
                .single()

            if (!order?.tracking_number) {
                throw new Error('Order does not have a tracking number')
            }

            // --- SIMULATION MODE (Mocking Shiprocket API Call) ---
            // In a real scenario, we would:
            // a. Login to Shiprocket API to get Token
            // b. Call Tracking API with order.tracking_number
            // c. Get status

            // Simulating a random status update for demonstration
            const mockStatuses = ['shipped', 'out_for_delivery', 'delivered']
            // Pick next status based on current
            let newStatus = order.status
            if (order.status === 'confirmed') newStatus = 'shipped'
            else if (order.status === 'shipped') newStatus = 'out_for_delivery'
            else if (order.status === 'out_for_delivery') newStatus = 'delivered'

            const mockTrackingResponse = {
                tracking_data: {
                    shipment_track: [{
                        current_status: newStatus.toUpperCase().replace(/_/g, ' '), // e.g., "OUT FOR DELIVERY"
                        scans: [
                            {
                                date: new Date().toISOString(),
                                activity: `Shipment is ${newStatus.replace(/_/g, ' ')}`,
                                location: "Hub, Mumbai"
                            }
                        ]
                    }]
                }
            }
            // -----------------------------------------------------

            // 3. Update Order Status in DB
            if (newStatus !== order.status) {
                const { error: updateError } = await supabaseClient
                    .from('orders')
                    .update({
                        status: newStatus,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', orderId)

                if (updateError) throw updateError

                // 4. Add History Entry
                await supabaseClient
                    .from('order_status_history')
                    .insert({
                        order_id: orderId,
                        admin_id: adminId,
                        status: newStatus,
                        notes: `Auto-updated by Shiprocket: ${mockTrackingResponse.tracking_data.shipment_track[0].scans[0].activity}`
                    })
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    message: `Status synced: ${newStatus}`,
                    previous_status: order.status,
                    new_status: newStatus
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        return new Response(
            JSON.stringify({ error: 'Invalid action' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return new Response(
            JSON.stringify({ error: message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
