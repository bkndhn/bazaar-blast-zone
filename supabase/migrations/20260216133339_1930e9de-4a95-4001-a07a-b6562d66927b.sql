
-- Add custom weight tracking to cart items for weight-based products
ALTER TABLE public.cart_items 
  ADD COLUMN IF NOT EXISTS custom_weight DOUBLE PRECISION DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS custom_unit TEXT DEFAULT NULL;

-- Add custom weight tracking to order items for weight-based products  
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS custom_weight DOUBLE PRECISION DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS custom_unit TEXT DEFAULT NULL;

-- Add delivery_slots JSON config to admin_settings (already exists as jsonb)
-- Add ticket_window_days (already exists)
-- Ensure same_day fields exist (they should from prior migration)
