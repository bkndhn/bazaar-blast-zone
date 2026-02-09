
-- Add PhonePe columns to admin_settings (phonepe_merchant_id already exists)
-- Add phonepe_salt_key and phonepe_salt_index for PhonePe integration
ALTER TABLE public.admin_settings
ADD COLUMN IF NOT EXISTS phonepe_salt_key text,
ADD COLUMN IF NOT EXISTS phonepe_salt_index text DEFAULT '1',
ADD COLUMN IF NOT EXISTS phonepe_enabled boolean DEFAULT false;
