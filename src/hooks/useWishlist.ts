import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: {
    id: string;
    name: string;
    price: number;
    compare_at_price: number | null;
    images: { image_url: string; is_primary: boolean }[];
    store: { name: string };
  };
}

export function useWishlist() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['wishlist', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('wishlist_items')
        .select(`
          *,
          product:products(
            id,
            name,
            price,
            compare_at_price,
            images:product_images(image_url, is_primary),
            store:stores(name)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WishlistItem[];
    },
    enabled: !!user,
  });
}

export function useToggleWishlist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      if (!user) throw new Error('Must be logged in');

      // Check if already in wishlist
      const { data: existing } = await supabase
        .from('wishlist_items')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .single();

      if (existing) {
        // Remove from wishlist
        const { error } = await supabase
          .from('wishlist_items')
          .delete()
          .eq('id', existing.id);

        if (error) throw error;
        return { added: false };
      } else {
        // Add to wishlist
        const { error } = await supabase
          .from('wishlist_items')
          .insert({ user_id: user.id, product_id: productId });

        if (error) throw error;
        return { added: true };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      toast({
        title: result.added ? 'Added to wishlist' : 'Removed from wishlist',
        description: result.added 
          ? 'Item has been added to your wishlist'
          : 'Item has been removed from your wishlist',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useIsInWishlist(productId: string) {
  const { data: wishlist } = useWishlist();
  return wishlist?.some(item => item.product_id === productId) ?? false;
}
