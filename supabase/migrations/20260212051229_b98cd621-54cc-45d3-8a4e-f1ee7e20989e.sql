
-- Allow public read of non-sensitive admin settings fields
CREATE POLICY "Public can view admin settings for delivery info"
ON public.admin_settings
FOR SELECT
USING (true);
