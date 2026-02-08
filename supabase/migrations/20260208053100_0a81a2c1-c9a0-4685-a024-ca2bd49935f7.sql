
-- Add slug column to stores for unique storefront URLs
ALTER TABLE public.stores ADD COLUMN slug text UNIQUE;

-- Create index for fast slug lookups
CREATE INDEX idx_stores_slug ON public.stores(slug) WHERE slug IS NOT NULL;

-- Create a function to auto-generate slug from store name
CREATE OR REPLACE FUNCTION public.generate_store_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug text;
  new_slug text;
  counter int := 0;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := lower(regexp_replace(trim(NEW.name), '[^a-zA-Z0-9]+', '-', 'g'));
    base_slug := trim(both '-' from base_slug);
    new_slug := base_slug;
    
    WHILE EXISTS (SELECT 1 FROM public.stores WHERE slug = new_slug AND id != NEW.id) LOOP
      counter := counter + 1;
      new_slug := base_slug || '-' || counter;
    END LOOP;
    
    NEW.slug := new_slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to auto-generate slug on insert/update
CREATE TRIGGER stores_generate_slug
BEFORE INSERT OR UPDATE OF name ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.generate_store_slug();

-- Generate slugs for existing stores
UPDATE public.stores SET slug = lower(regexp_replace(trim(name), '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;
