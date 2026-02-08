ALTER TABLE public.admin_settings
ADD COLUMN IF NOT EXISTS theme_color_hsl TEXT DEFAULT '217 91% 60%';
