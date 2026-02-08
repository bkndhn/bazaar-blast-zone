ALTER TABLE public.admin_settings
ADD COLUMN IF NOT EXISTS shiprocket_email TEXT,
ADD COLUMN IF NOT EXISTS shiprocket_password TEXT,
ADD COLUMN IF NOT EXISTS is_shipping_integration_enabled BOOLEAN DEFAULT false;
