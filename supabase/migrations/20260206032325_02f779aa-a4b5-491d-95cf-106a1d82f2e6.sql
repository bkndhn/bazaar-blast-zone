-- Add admin contact/support settings table
CREATE TABLE IF NOT EXISTS public.admin_support_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL UNIQUE,
  chat_enabled boolean DEFAULT false,
  chat_url text,
  phone_enabled boolean DEFAULT true,
  phone_number text,
  email_enabled boolean DEFAULT true,
  email_address text,
  whatsapp_enabled boolean DEFAULT false,
  whatsapp_number text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on admin_support_settings
ALTER TABLE public.admin_support_settings ENABLE ROW LEVEL SECURITY;

-- Policies for admin_support_settings
CREATE POLICY "Admins can manage their support settings"
  ON public.admin_support_settings
  FOR ALL
  USING (auth.uid() = admin_id);

CREATE POLICY "Public can view support settings"
  ON public.admin_support_settings
  FOR SELECT
  USING (true);

-- Add product reviews table for customer ratings
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  is_verified_purchase boolean DEFAULT false,
  admin_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on product_reviews
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Policies for product_reviews
CREATE POLICY "Users can view all reviews"
  ON public.product_reviews
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create reviews for their purchases"
  ON public.product_reviews
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
  ON public.product_reviews
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view reviews on their products"
  ON public.product_reviews
  FOR SELECT
  USING (auth.uid() = admin_id);

-- Create index for faster product review lookups
CREATE INDEX idx_product_reviews_product ON public.product_reviews(product_id);
CREATE INDEX idx_product_reviews_user ON public.product_reviews(user_id);