
-- Function to generate date-based sequential order numbers like ORD-20260214-001
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  today_str text;
  seq_num int;
  new_order_number text;
BEGIN
  today_str := to_char(now(), 'YYYYMMDD');
  
  -- Count orders created today and add 1
  SELECT COALESCE(COUNT(*), 0) + 1 INTO seq_num
  FROM public.orders
  WHERE order_number LIKE 'ORD-' || today_str || '-%';
  
  new_order_number := 'ORD-' || today_str || '-' || lpad(seq_num::text, 3, '0');
  
  -- Handle unlikely collision
  WHILE EXISTS (SELECT 1 FROM public.orders WHERE order_number = new_order_number) LOOP
    seq_num := seq_num + 1;
    new_order_number := 'ORD-' || today_str || '-' || lpad(seq_num::text, 3, '0');
  END LOOP;
  
  RETURN new_order_number;
END;
$$;
