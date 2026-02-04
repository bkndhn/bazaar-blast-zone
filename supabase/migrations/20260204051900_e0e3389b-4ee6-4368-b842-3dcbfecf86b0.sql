-- Add order tracking fields to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tracking_number TEXT,
ADD COLUMN IF NOT EXISTS courier_service TEXT,
ADD COLUMN IF NOT EXISTS courier_tracking_url TEXT;

-- Create order status history table for tracking
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  admin_id UUID NOT NULL
);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their order history"
  ON public.order_status_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM orders WHERE orders.id = order_status_history.order_id AND orders.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage their order history"
  ON public.order_status_history FOR ALL
  USING (auth.uid() = admin_id);

-- Create order feedback table
CREATE TABLE IF NOT EXISTS public.order_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.order_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own feedback"
  ON public.order_feedback FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view feedback on their orders"
  ON public.order_feedback FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM orders WHERE orders.id = order_feedback.order_id AND orders.admin_id = auth.uid()
  ));

-- Create admin settings table for store-specific settings
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL UNIQUE,
  delivery_within_tamilnadu_days INTEGER DEFAULT 3,
  delivery_outside_tamilnadu_days INTEGER DEFAULT 7,
  shipping_cost_within_tamilnadu DECIMAL DEFAULT 40,
  shipping_cost_outside_tamilnadu DECIMAL DEFAULT 80,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage their own settings"
  ON public.admin_settings FOR ALL
  USING (auth.uid() = admin_id);

-- Create banner ads table
CREATE TABLE IF NOT EXISTS public.banner_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  title TEXT,
  image_url TEXT,
  link_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  type TEXT DEFAULT 'image' CHECK (type IN ('image', 'text')),
  text_content TEXT,
  background_color TEXT,
  text_color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.banner_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active banners"
  ON public.banner_ads FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage their banners"
  ON public.banner_ads FOR ALL
  USING (auth.uid() = admin_id);

-- Add trigger for updated_at
CREATE TRIGGER update_admin_settings_updated_at
  BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_banner_ads_updated_at
  BEFORE UPDATE ON public.banner_ads
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();