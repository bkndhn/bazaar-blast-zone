import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Package, Bell } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const orderStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

const statusColors: Record<string, string> = {
  pending: 'bg-warning/20 text-warning',
  confirmed: 'bg-primary/20 text-primary',
  processing: 'bg-primary/20 text-primary',
  shipped: 'bg-accent/20 text-accent-foreground',
  delivered: 'bg-success/20 text-success',
  cancelled: 'bg-destructive/20 text-destructive',
};

export default function AdminOrders() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [updateDialog, setUpdateDialog] = useState<{ open: boolean; orderId: string | null; currentNotes: string }>({
    open: false,
    orderId: null,
    currentNotes: '',
  });
  const [notes, setNotes] = useState('');

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['admin-orders', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(id, product_name, product_image, quantity, unit_price, total_price),
          address:addresses(full_name, phone, address_line1, city, state, postal_code)
        `)
        .eq('admin_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Real-time subscription for new orders
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('admin-orders-realtime')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'orders',
          filter: `admin_id=eq.${user.id}`
        },
        (payload) => {
          setNewOrderCount(prev => prev + 1);
          toast({
            title: '🎉 New Order Received!',
            description: `Order #${(payload.new as any).order_number} - ₹${Number((payload.new as any).total).toLocaleString('en-IN')}`,
          });
          refetch();
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'orders',
          filter: `admin_id=eq.${user.id}`
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetch]);

  const updateStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast({ title: 'Order status updated' });
    },
  });

  const updateNotes = useMutation({
    mutationFn: async ({ orderId, notes }: { orderId: string; notes: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ notes, updated_at: new Date().toISOString() })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast({ title: 'Order notes updated' });
      setUpdateDialog({ open: false, orderId: null, currentNotes: '' });
    },
  });

  const handleOpenNotes = (orderId: string, currentNotes: string) => {
    setNotes(currentNotes);
    setUpdateDialog({ open: true, orderId, currentNotes });
  };

  return (
    <AdminLayout title="Orders">
      {/* New Orders Notification */}
      {newOrderCount > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-primary/10 p-4">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary animate-bounce" />
            <span className="font-medium text-primary">
              {newOrderCount} new order(s) received!
            </span>
          </div>
          <Button size="sm" onClick={() => setNewOrderCount(0)}>
            Dismiss
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : !orders?.length ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-medium">No orders yet</p>
          <p className="mt-1 text-muted-foreground">
            Orders will appear here when customers place them
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">#{order.order_number}</h3>
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                      statusColors[order.status] || 'bg-muted text-muted-foreground'
                    )}>
                      {order.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-lg font-bold">
                    ₹{Number(order.total).toLocaleString('en-IN')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {order.items?.length || 0} item(s)
                  </p>
                </div>
              </div>

              {/* Order Items */}
              <div className="mt-4 space-y-2">
                {order.items?.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 text-sm">
                    <img
                      src={item.product_image || '/placeholder.svg'}
                      alt={item.product_name}
                      className="h-10 w-10 rounded object-cover"
                    />
                    <div className="flex-1">
                      <p className="line-clamp-1">{item.product_name}</p>
                      <p className="text-muted-foreground">
                        ₹{item.unit_price} × {item.quantity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Shipping Address */}
              {order.address && (
                <div className="mt-4 rounded bg-muted/50 p-3 text-sm">
                  <p className="font-medium">Ship to:</p>
                  <p>{order.address.full_name} • {order.address.phone}</p>
                  <p className="text-muted-foreground">
                    {order.address.address_line1}, {order.address.city}, {order.address.state} - {order.address.postal_code}
                  </p>
                </div>
              )}

              {/* Notes */}
              {order.notes && (
                <div className="mt-3 rounded bg-primary/5 p-3 text-sm">
                  <p className="font-medium">Update Notes:</p>
                  <p className="text-muted-foreground">{order.notes}</p>
                </div>
              )}

              {/* Status Update */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Select
                  value={order.status}
                  onValueChange={(value) => updateStatus.mutate({ orderId: order.id, status: value })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {orderStatuses.map((status) => (
                      <SelectItem key={status} value={status} className="capitalize">
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleOpenNotes(order.id, order.notes || '')}
                >
                  Add Update
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notes Dialog */}
      <Dialog 
        open={updateDialog.open} 
        onOpenChange={(open) => setUpdateDialog({ ...updateDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Customer Notes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Notes (visible to customer)</Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Your order has been packed and will ship today. Expected delivery: 3-5 days."
                className="w-full rounded-md border border-border bg-background p-3 text-sm min-h-[100px]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setUpdateDialog({ open: false, orderId: null, currentNotes: '' })}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => updateDialog.orderId && updateNotes.mutate({ 
                  orderId: updateDialog.orderId, 
                  notes 
                })}
                disabled={updateNotes.isPending}
              >
                {updateNotes.isPending ? 'Saving...' : 'Save Update'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
