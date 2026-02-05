
-- =====================================================
-- PRODUCT UNITS & VARIANTS SYSTEM
-- =====================================================

-- Add unit-related columns to products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS unit_type text DEFAULT 'piece',
ADD COLUMN IF NOT EXISTS unit_value numeric DEFAULT 1,
ADD COLUMN IF NOT EXISTS unit_label text DEFAULT 'pc',
ADD COLUMN IF NOT EXISTS usage_instructions text,
ADD COLUMN IF NOT EXISTS storage_instructions text,
ADD COLUMN IF NOT EXISTS extra_notes text,
ADD COLUMN IF NOT EXISTS min_quantity integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_quantity integer DEFAULT 10;

-- Increase max images per product to 10
-- (Already supported by product_images table)

-- =====================================================
-- ADMIN-ISOLATED CATEGORIES
-- =====================================================

-- Add admin_id to categories for isolation
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS admin_id uuid,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS show_on_home boolean DEFAULT true;

-- Drop existing policies on categories
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
DROP POLICY IF EXISTS "Super admins can manage categories" ON public.categories;

-- New RLS policies for admin-isolated categories
CREATE POLICY "Admins can manage their own categories"
ON public.categories
FOR ALL
USING (auth.uid() = admin_id)
WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Public can view active categories"
ON public.categories
FOR SELECT
USING (is_active = true);

-- =====================================================
-- SUPPORT TICKETS SYSTEM
-- =====================================================

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id),
  type text NOT NULL CHECK (type IN ('damaged', 'wrong_item', 'missing_item', 'other', 'general')),
  subject text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create ticket_images table for attachments
CREATE TABLE IF NOT EXISTS public.ticket_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create ticket_replies table
CREATE TABLE IF NOT EXISTS public.ticket_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  is_admin_reply boolean DEFAULT false,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on support tables
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;

-- Support tickets RLS policies
CREATE POLICY "Users can manage their own tickets"
ON public.support_tickets
FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view tickets for their store"
ON public.support_tickets
FOR SELECT
USING (auth.uid() = admin_id);

CREATE POLICY "Admins can update tickets for their store"
ON public.support_tickets
FOR UPDATE
USING (auth.uid() = admin_id);

-- Ticket images RLS
CREATE POLICY "Users can manage their ticket images"
ON public.ticket_images
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.support_tickets
  WHERE id = ticket_images.ticket_id AND user_id = auth.uid()
));

CREATE POLICY "Admins can view ticket images"
ON public.ticket_images
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.support_tickets
  WHERE id = ticket_images.ticket_id AND admin_id = auth.uid()
));

-- Ticket replies RLS
CREATE POLICY "Users can view replies on their tickets"
ON public.ticket_replies
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.support_tickets
  WHERE id = ticket_replies.ticket_id AND user_id = auth.uid()
));

CREATE POLICY "Users can create replies on their tickets"
ON public.ticket_replies
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.support_tickets
  WHERE id = ticket_replies.ticket_id AND user_id = auth.uid()
) AND is_admin_reply = false);

CREATE POLICY "Admins can view and create replies"
ON public.ticket_replies
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.support_tickets
  WHERE id = ticket_replies.ticket_id AND admin_id = auth.uid()
));

-- =====================================================
-- FAQ & HELP CONTENT (ADMIN-CONTROLLED)
-- =====================================================

-- Create faq table
CREATE TABLE IF NOT EXISTS public.faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create store_policies table
CREATE TABLE IF NOT EXISTS public.store_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('return', 'shipping', 'privacy', 'terms', 'refund', 'other')),
  title text NOT NULL,
  content text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on FAQ and policies
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_policies ENABLE ROW LEVEL SECURITY;

-- FAQ RLS policies
CREATE POLICY "Admins can manage their FAQs"
ON public.faqs
FOR ALL
USING (auth.uid() = admin_id);

CREATE POLICY "Public can view active FAQs"
ON public.faqs
FOR SELECT
USING (is_active = true);

-- Store policies RLS
CREATE POLICY "Admins can manage their policies"
ON public.store_policies
FOR ALL
USING (auth.uid() = admin_id);

CREATE POLICY "Public can view active policies"
ON public.store_policies
FOR SELECT
USING (is_active = true);

-- =====================================================
-- PAYMENT SETTINGS (ADMIN-ISOLATED)
-- =====================================================

-- Add payment settings to admin_settings
ALTER TABLE public.admin_settings
ADD COLUMN IF NOT EXISTS cod_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS online_payment_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS phonepe_merchant_id text,
ADD COLUMN IF NOT EXISTS razorpay_key_id text,
ADD COLUMN IF NOT EXISTS payment_required_before_ship boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ticket_window_days integer DEFAULT 7;

-- =====================================================
-- ADD LOCATION LINK TO ADDRESSES
-- =====================================================

ALTER TABLE public.addresses
ADD COLUMN IF NOT EXISTS location_link text;

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_faqs_updated_at
  BEFORE UPDATE ON public.faqs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_store_policies_updated_at
  BEFORE UPDATE ON public.store_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- FIX: Ensure products join correctly with admin_id
-- =====================================================

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_products_admin_id ON public.products(admin_id);
CREATE INDEX IF NOT EXISTS idx_categories_admin_id ON public.categories(admin_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_admin_id ON public.support_tickets(admin_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
