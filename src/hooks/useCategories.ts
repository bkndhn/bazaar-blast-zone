import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Category {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  parent_id: string | null;
  admin_id: string | null;
  is_active: boolean | null;
  show_on_home: boolean | null;
  sort_order: number | null;
  created_at: string;
}

// Categories for home page - respects show_on_home flag
// TODO: Filter by admin_id in multi-tenant setup
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .eq('show_on_home', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as Category[];
    },
  });
}

// All active categories (for product listing pages)
export function useAllCategories() {
  return useQuery({
    queryKey: ['all-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as Category[];
    },
  });
}

export function useCategory(categorySlug: string) {
  return useQuery({
    queryKey: ['category', categorySlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', categorySlug)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data as Category;
    },
    enabled: !!categorySlug,
  });
}
