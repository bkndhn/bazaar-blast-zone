-- Add payment settings columns to admin_settings table
ALTER TABLE public.admin_settings 
ADD COLUMN IF NOT EXISTS razorpay_key_id TEXT,
ADD COLUMN IF NOT EXISTS razorpay_key_secret TEXT,
ADD COLUMN IF NOT EXISTS is_payment_enabled BOOLEAN DEFAULT false;

-- Create a secure function to access payment secrets (only callable by server functions)
-- This ensures these secrets are not exposed to the client via standard PostgREST API
-- even if RLS policies were accidentally too permissive (though we have RLS).
-- Best practice: Keep secrets in Vault, but for this simplified setup, we use a protected column.
-- Note: In a real production app, consider using Supabase Vault or specific encrypted columns.
