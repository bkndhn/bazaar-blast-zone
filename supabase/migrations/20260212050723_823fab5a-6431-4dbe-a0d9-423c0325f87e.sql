
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS free_delivery_above numeric DEFAULT 0;
COMMENT ON COLUMN public.admin_settings.free_delivery_above IS 'Cart value above which delivery is free. 0 means no free delivery threshold.';
