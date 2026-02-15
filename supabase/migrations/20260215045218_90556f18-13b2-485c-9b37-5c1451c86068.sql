
-- 1. Add 'delivery_partner' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'delivery_partner';

-- 2. Delivery partners table
CREATE TABLE public.delivery_partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, admin_id)
);
ALTER TABLE public.delivery_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage their delivery partners"
  ON public.delivery_partners FOR ALL
  USING (admin_id = auth.uid() OR user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

-- 3. Delivery tracking table (GPS coordinates)
CREATE TABLE public.delivery_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES public.delivery_partners(id),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tracking visible to order owner, admin, and partner"
  ON public.delivery_tracking FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND (user_id = auth.uid() OR admin_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM public.delivery_partners WHERE id = partner_id AND user_id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Partners can insert tracking"
  ON public.delivery_tracking FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.delivery_partners WHERE id = partner_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND admin_id = auth.uid())
  );

-- 4. Inventory details (extended product info for sellers)
CREATE TABLE public.inventory_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE UNIQUE,
  admin_id UUID NOT NULL,
  cost_price NUMERIC DEFAULT 0,
  purchase_supplier TEXT,
  purchase_date DATE,
  expiry_date DATE,
  low_stock_alert_level INT DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage their own inventory"
  ON public.inventory_details FOR ALL
  USING (admin_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

-- 5. Stock history (transaction log)
CREATE TABLE public.stock_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id),
  quantity_change INT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sale', 'restock', 'adjustment', 'cancellation')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage their stock history"
  ON public.stock_history FOR ALL
  USING (admin_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

-- 6. Add delivery partner and same-day delivery columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_partner_id UUID REFERENCES public.delivery_partners(id),
  ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS delivery_slot TEXT;

-- 7. Add same-day delivery settings to admin_settings
ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS same_day_delivery_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS same_day_cutoff_time TIME DEFAULT '14:00',
  ADD COLUMN IF NOT EXISTS same_day_delivery_charge NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_slots JSONB DEFAULT '["9:00 AM - 12:00 PM", "12:00 PM - 3:00 PM", "3:00 PM - 6:00 PM", "6:00 PM - 9:00 PM"]'::jsonb;

-- 8. Triggers for updated_at
CREATE TRIGGER update_delivery_partners_updated_at BEFORE UPDATE ON public.delivery_partners
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_inventory_details_updated_at BEFORE UPDATE ON public.inventory_details
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 9. Index for fast tracking lookups
CREATE INDEX idx_delivery_tracking_order_id ON public.delivery_tracking(order_id);
CREATE INDEX idx_delivery_tracking_created_at ON public.delivery_tracking(created_at DESC);
CREATE INDEX idx_stock_history_product_id ON public.stock_history(product_id);
CREATE INDEX idx_stock_history_admin_id ON public.stock_history(admin_id);
CREATE INDEX idx_inventory_details_expiry ON public.inventory_details(expiry_date);
