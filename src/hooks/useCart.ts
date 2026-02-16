import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  custom_weight: number | null;
  custom_unit: string | null;
  created_at: string;
  product?: {
    id: string;
    name: string;
    price: number;
    compare_at_price: number | null;
    stock_quantity: number;
    admin_id: string;
    store_id: string;
    unit_value: number | null;
    unit_label: string | null;
    unit_type: string | null;
    images: { image_url: string; is_primary: boolean }[];
    store: { name: string };
  };
}

export function useCart() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cart', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          product:products(
            id,
            name,
            price,
            compare_at_price,
            stock_quantity,
            admin_id,
            store_id,
            unit_value,
            unit_label,
            unit_type,
            images:product_images(image_url, is_primary),
            store:stores(name)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CartItem[];
    },
    enabled: !!user,
  });
}

export function useAddToCart() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, quantity = 1, customWeight, customUnit }: { productId: string; quantity?: number; customWeight?: number | null; customUnit?: string | null }) => {
      if (!user) throw new Error('Must be logged in to add to cart');

      // Check if already in cart with same custom weight
      const { data: existingItems } = await supabase
        .from('cart_items')
        .select('id, quantity, custom_weight')
        .eq('user_id', user.id)
        .eq('product_id', productId);

      // Find matching item (same weight for weight-based, or no weight for regular)
      const existing = existingItems?.find(item => {
        if (customWeight != null) return (item as any).custom_weight === customWeight;
        return (item as any).custom_weight == null;
      });

      if (existing) {
        // Update quantity
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: existing.quantity + quantity } as any)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new with custom weight
        const insertData: any = { user_id: user.id, product_id: productId, quantity };
        if (customWeight != null) insertData.custom_weight = customWeight;
        if (customUnit) insertData.custom_unit = customUnit;
        
        const { error } = await supabase
          .from('cart_items')
          .insert(insertData);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast({
        title: 'Added to cart',
        description: 'Item has been added to your cart',
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

export function useUpdateCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      if (quantity <= 0) {
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('id', itemId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity })
          .eq('id', itemId);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useRemoveFromCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast({
        title: 'Removed from cart',
        description: 'Item has been removed from your cart',
      });
    },
  });
}

export function useClearCart() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}
