import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  order_id: string | null;
  rating: number;
  review_text: string | null;
  is_verified_purchase: boolean;
  admin_id: string;
  created_at: string;
}

export function useProductReviews(productId: string) {
  return useQuery({
    queryKey: ['product-reviews', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ProductReview[];
    },
    enabled: !!productId,
  });
}

export function useProductRating(productId: string) {
  return useQuery({
    queryKey: ['product-rating', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('rating')
        .eq('product_id', productId);

      if (error) throw error;
      
      if (!data || data.length === 0) {
        return { average: 0, count: 0 };
      }

      const sum = data.reduce((acc, r) => acc + r.rating, 0);
      return {
        average: Math.round((sum / data.length) * 10) / 10,
        count: data.length,
      };
    },
    enabled: !!productId,
  });
}

export function useCanReviewProduct(productId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['can-review-product', productId, user?.id],
    queryFn: async () => {
      if (!user) return { canReview: false, deliveredOrderId: null };

      // Check if user has a delivered order with this product
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('order_id, product_id')
        .eq('product_id', productId);

      if (itemsError) throw itemsError;

      if (!orderItems || orderItems.length === 0) {
        return { canReview: false, deliveredOrderId: null };
      }

      const orderIds = orderItems.map(item => item.order_id);

      // Check if any of these orders are delivered and belong to the user
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'delivered')
        .in('id', orderIds);

      if (ordersError) throw ordersError;

      if (!orders || orders.length === 0) {
        return { canReview: false, deliveredOrderId: null };
      }

      // Check if user already reviewed this product
      const { data: existingReview, error: reviewError } = await supabase
        .from('product_reviews')
        .select('id')
        .eq('product_id', productId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (reviewError) throw reviewError;

      if (existingReview) {
        return { canReview: false, deliveredOrderId: null, alreadyReviewed: true };
      }

      return { canReview: true, deliveredOrderId: orders[0].id };
    },
    enabled: !!productId && !!user,
  });
}

export function useCreateProductReview() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      productId: string;
      orderId: string;
      rating: number;
      reviewText?: string;
      adminId: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('product_reviews')
        .insert({
          product_id: data.productId,
          user_id: user.id,
          order_id: data.orderId,
          rating: data.rating,
          review_text: data.reviewText || null,
          is_verified_purchase: true,
          admin_id: data.adminId,
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-reviews', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['product-rating', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['can-review-product', variables.productId] });
      toast({ title: 'Review submitted!', description: 'Thank you for your feedback.' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
