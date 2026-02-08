ALTER TABLE public.admin_settings
ADD COLUMN IF NOT EXISTS terms_conditions TEXT;
