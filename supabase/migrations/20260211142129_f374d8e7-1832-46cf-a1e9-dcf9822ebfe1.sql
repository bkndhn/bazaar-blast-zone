
-- Add shop_type and self_pickup to admin_settings
ALTER TABLE public.admin_settings
ADD COLUMN IF NOT EXISTS shop_type text DEFAULT 'general',
ADD COLUMN IF NOT EXISTS self_pickup_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS service_area_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS service_area_radius_km numeric DEFAULT 10,
ADD COLUMN IF NOT EXISTS service_area_lat numeric DEFAULT null,
ADD COLUMN IF NOT EXISTS service_area_lng numeric DEFAULT null,
ADD COLUMN IF NOT EXISTS cutting_charges numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS extra_delivery_charges numeric DEFAULT 0;

-- shop_type values: 'general' (default ecommerce), 'food' (restaurant/meat/fish shop)
-- For food: order flow is ordered -> confirmed -> preparing -> ready_for_pickup -> out_for_delivery -> delivered | cancelled
-- For general: order flow is pending -> confirmed -> processing -> shipped -> out_for_delivery -> delivered | cancelled
