-- Insert sample categories
INSERT INTO public.categories (name, slug, image_url) VALUES
  ('Electronics', 'electronics', 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200'),
  ('Fashion', 'fashion', 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=200'),
  ('Home & Living', 'home-living', 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=200'),
  ('Beauty', 'beauty', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200'),
  ('Sports', 'sports', 'https://images.unsplash.com/photo-1461896836934- voices-3d-art-1?w=200'),
  ('Books', 'books', 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=200')
ON CONFLICT (slug) DO NOTHING;