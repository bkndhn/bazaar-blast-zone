-- Add last_login column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Create storage buckets for products and stores
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('store-assets', 'store-assets', true) ON CONFLICT DO NOTHING;

-- Storage policies for product images
CREATE POLICY "Public can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update their product images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete their product images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
  AND public.has_role(auth.uid(), 'admin')
);

-- Storage policies for store assets
CREATE POLICY "Public can view store assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'store-assets');

CREATE POLICY "Admins can upload store assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'store-assets' 
  AND auth.role() = 'authenticated'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update their store assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'store-assets' 
  AND auth.role() = 'authenticated'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete their store assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'store-assets' 
  AND auth.role() = 'authenticated'
  AND public.has_role(auth.uid(), 'admin')
);