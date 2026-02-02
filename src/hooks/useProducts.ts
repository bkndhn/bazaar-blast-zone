import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  is_active: boolean;
  category_id: string | null;
  store_id: string;
  admin_id: string;
  created_at: string;
  store?: {
    name: string;
  };
  category?: {
    name: string;
  };
  images?: ProductImage[];
}

export interface ProductImage {
  id: string;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
}

export function useProducts(options?: { categoryId?: string; storeId?: string; limit?: number }) {
  return useQuery({
    queryKey: ['products', options],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          *,
          store:stores(name),
          category:categories(name),
          images:product_images(id, image_url, is_primary, sort_order)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (options?.categoryId) {
        query = query.eq('category_id', options.categoryId);
      }

      if (options?.storeId) {
        query = query.eq('store_id', options.storeId);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Product[];
    },
  });
}

export function useProduct(productId: string) {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          store:stores(id, name, logo_url),
          category:categories(id, name),
          images:product_images(id, image_url, is_primary, sort_order)
        `)
        .eq('id', productId)
        .single();

      if (error) throw error;
      return data as Product;
    },
    enabled: !!productId,
  });
}
