import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ArrowLeft, Package, Truck, CheckCircle, Clock, MapPin } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useOrder } from '@/hooks/useOrders';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const orderStatuses = [
  { key: 'pending', label: 'Order Placed', icon: Clock },
  { key: 'confirmed', label: 'Confirmed', icon: Package },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
];

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: order, isLoading, error } = useOrder(id || '');

  // Real-time subscription for order updates
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`order-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['order', id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </MainLayout>
    );
  }

  if (error || !order) {
    return (
      <MainLayout>
        <div className="p-4 text-center">
          <p className="text-muted-foreground">Order not found</p>
          <Button className="mt-4" onClick={() => navigate('/orders')}>
            Back to Orders
          </Button>
        </div>
      </MainLayout>
    );
  }

  const currentStatusIndex = orderStatuses.findIndex(s => s.key === order.status);

  return (
    <MainLayout>
      <div className="p-4">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/orders')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Order #{order.order_number}</h1>
            <p className="text-sm text-muted-foreground">
              Placed on {format(new Date(order.created_at), 'MMM d, yyyy')}
            </p>
          </div>
        </div>

        {/* Order Status Tracker */}
        <div className="mb-6 rounded-lg border border-border bg-card p-4">
          <h2 className="mb-4 font-medium">Order Status</h2>
          <div className="relative">
            {/* Progress Line */}
            <div className="absolute left-5 top-5 h-[calc(100%-40px)] w-0.5 bg-border" />
            <div 
              className="absolute left-5 top-5 w-0.5 bg-primary transition-all duration-500"
              style={{ height: `${Math.max(0, currentStatusIndex) * 33.33}%` }}
            />
            
            <div className="space-y-6">
              {orderStatuses.map((status, index) => {
                const Icon = status.icon;
                const isCompleted = index <= currentStatusIndex;
                const isCurrent = index === currentStatusIndex;
                
                return (
                  <div key={status.key} className="relative flex items-center gap-4">
                    <div className={cn(
                      'relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors',
                      isCompleted 
                        ? 'border-primary bg-primary text-primary-foreground' 
                        : 'border-border bg-background text-muted-foreground'
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className={cn(
                      'flex-1',
                      isCurrent && 'font-medium'
                    )}>
                      <p className={isCompleted ? 'text-foreground' : 'text-muted-foreground'}>
                        {status.label}
                      </p>
                      {isCurrent && (
                        <p className="text-sm text-primary">Current Status</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="mb-6 rounded-lg border border-border bg-card">
          <div className="border-b border-border p-4">
            <h2 className="font-medium">Order Items</h2>
          </div>
          <div className="divide-y divide-border">
            {order.items?.map((item) => (
              <div key={item.id} className="flex gap-3 p-4">
                <img
                  src={item.product_image || '/placeholder.svg'}
                  alt={item.product_name}
                  className="h-16 w-16 rounded-md object-cover"
                />
                <div className="flex-1">
                  <p className="font-medium">{item.product_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Qty: {item.quantity} × ₹{item.unit_price.toLocaleString('en-IN')}
                  </p>
                </div>
                <p className="font-medium">
                  ₹{item.total_price.toLocaleString('en-IN')}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-4 font-medium">Order Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>₹{order.subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>₹{order.shipping_cost.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-base font-medium">
              <span>Total</span>
              <span>₹{order.total.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="mt-6 rounded-lg border border-border bg-card p-4">
            <h2 className="mb-2 font-medium">Notes</h2>
            <p className="text-sm text-muted-foreground">{order.notes}</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
