import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Package, Bell, Truck, Calendar, Link as LinkIcon, ChevronDown } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format, addDays, startOfDay, endOfDay, subDays, isWithinInterval, parseISO } from 'date-fns';

const orderStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];

const statusColors: Record<string, string> = {
  pending: 'bg-warning/20 text-warning',
  confirmed: 'bg-primary/20 text-primary',
  processing: 'bg-primary/20 text-primary',
  shipped: 'bg-accent/20 text-accent-foreground',
  out_for_delivery: 'bg-success/20 text-success',
  delivered: 'bg-success/20 text-success',
  cancelled: 'bg-destructive/20 text-destructive',
};

const COURIER_OPTIONS = [
  { value: 'delhivery', label: 'Delhivery', trackingUrl: 'https://www.delhivery.com/track/package/' },
  { value: 'professional', label: 'Professional Courier', trackingUrl: 'https://www.tpcindia.com/track.aspx?id=' },
  { value: 'bluedart', label: 'BlueDart', trackingUrl: 'https://www.bluedart.com/tracking/' },
  { value: 'dtdc', label: 'DTDC', trackingUrl: 'https://www.dtdc.in/tracking/tracking_results.asp?Ession_id=' },
  { value: 'ecom', label: 'Ecom Express', trackingUrl: 'https://ecomexpress.in/tracking/?awb_field=' },
  { value: 'xpressbees', label: 'XpressBees', trackingUrl: 'https://www.xpressbees.com/track?awbNo=' },
  { value: 'trackon', label: 'Trackon', trackingUrl: 'https://trackon.in/track?awb=' },
  { value: 'other', label: 'Other', trackingUrl: '' },
];

export default function AdminOrders() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [updateDialog, setUpdateDialog] = useState<{
    open: boolean;
    order: any | null;
  }>({
    open: false,
    order: null,
  });

  // Date filter state (default: today)
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'last7' | 'last30' | 'custom' | 'all'>('today');
  const [customFromDate, setCustomFromDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customToDate, setCustomToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  // Form state for update dialog
  const [updateForm, setUpdateForm] = useState({
    status: '',
    notes: '',
    tracking_number: '',
    courier_service: '',
    estimated_delivery_date: '',
  });

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

  // Filter orders by date
  const filteredOrders = (orders || []).filter((order) => {
    if (dateFilter === 'all') return true;
    const orderDate = parseISO(order.created_at);
    const today = startOfDay(new Date());

    switch (dateFilter) {
      case 'today':
        return isWithinInterval(orderDate, { start: today, end: new Date() });
      case 'yesterday':
        const yesterday = subDays(today, 1);
        return isWithinInterval(orderDate, { start: yesterday, end: today });
      case 'last7':
        return isWithinInterval(orderDate, { start: subDays(today, 7), end: new Date() });
      case 'last30':
        return isWithinInterval(orderDate, { start: subDays(today, 30), end: new Date() });
      case 'custom':
        const from = startOfDay(parseISO(customFromDate));
        const to = endOfDay(parseISO(customToDate));
        return isWithinInterval(orderDate, { start: from, end: to });
      default:
        return true;
    }
  });

  // Fetch admin settings for default delivery estimates
  const { data: adminSettings } = useQuery({
    queryKey: ['admin-settings', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('admin_settings')
        .select('*')
        .eq('admin_id', user.id)
        .maybeSingle();
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

          // Request notification permission and show
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Order Received!', {
              body: `Order #${(payload.new as any).order_number} - ₹${Number((payload.new as any).total).toLocaleString('en-IN')}`,
              icon: '/icons/icon-192x192.png',
            });
          }
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

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetch]);

  const updateOrder = useMutation({
    mutationFn: async (data: {
      orderId: string;
      status: string;
      notes?: string;
      tracking_number?: string;
      courier_service?: string;
      estimated_delivery_date?: string;
    }) => {
      const courier = COURIER_OPTIONS.find(c => c.value === data.courier_service);
      const trackingUrl = courier && data.tracking_number
        ? courier.trackingUrl + data.tracking_number
        : null;

      const updateData: any = {
        status: data.status,
        updated_at: new Date().toISOString(),
      };

      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.tracking_number) updateData.tracking_number = data.tracking_number;
      if (data.courier_service) updateData.courier_service = data.courier_service;
      if (trackingUrl) updateData.courier_tracking_url = trackingUrl;
      if (data.estimated_delivery_date) updateData.estimated_delivery_date = data.estimated_delivery_date;

      if (data.status === 'shipped' && !updateData.shipped_at) {
        updateData.shipped_at = new Date().toISOString();
      }
      if (data.status === 'delivered' && !updateData.delivered_at) {
        updateData.delivered_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', data.orderId);

      if (error) throw error;

      // Add status history entry
      if (data.notes || data.status) {
        await supabase
          .from('order_status_history')
          .insert({
            order_id: data.orderId,
            admin_id: user!.id,
            status: data.status,
            notes: data.notes || null,
          });
      }

      // Reduce stock when order is delivered
      if (data.status === 'delivered') {
        // Fetch order items to get product IDs and quantities
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('product_id, quantity')
          .eq('order_id', data.orderId);

        if (orderItems && orderItems.length > 0) {
          for (const item of orderItems) {
            if (item.product_id) {
              // Get current stock
              const { data: product } = await supabase
                .from('products')
                .select('stock_quantity')
                .eq('id', item.product_id)
                .single();

              if (product) {
                const newStock = Math.max(0, product.stock_quantity - item.quantity);
                await supabase
                  .from('products')
                  .update({ stock_quantity: newStock })
                  .eq('id', item.product_id);
              }
            }
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast({ title: 'Order updated successfully' });
      setUpdateDialog({ open: false, order: null });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const syncStatus = useMutation({
    mutationFn: async (order: any) => {
      const { data, error } = await supabase.functions.invoke('shipping-ops', {
        body: {
          action: 'sync_status',
          orderId: order.id,
          adminId: user?.id,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast({ title: 'Status Synced', description: data.message });
    },
    onError: (error) => {
      toast({ title: 'Sync Failed', description: error.message, variant: 'destructive' });
    },
  });

  const handleOpenUpdate = (order: any) => {
    // Calculate default estimated delivery based on address
    const isTamilnadu = order.address?.state?.toLowerCase().includes('tamil');
    const defaultDays = isTamilnadu
      ? (adminSettings?.delivery_within_tamilnadu_days || 3)
      : (adminSettings?.delivery_outside_tamilnadu_days || 7);

    const defaultDate = order.estimated_delivery_date || format(addDays(new Date(), defaultDays), 'yyyy-MM-dd');

    setUpdateForm({
      status: order.status,
      notes: '',
      tracking_number: order.tracking_number || '',
      courier_service: order.courier_service || '',
      estimated_delivery_date: defaultDate,
    });
    setUpdateDialog({ open: true, order });
  };

  const handleSubmitUpdate = () => {
    if (!updateDialog.order) return;

    updateOrder.mutate({
      orderId: updateDialog.order.id,
      status: updateForm.status,
      notes: updateForm.notes,
      tracking_number: updateForm.tracking_number,
      courier_service: updateForm.courier_service,
      estimated_delivery_date: updateForm.estimated_delivery_date,
    });
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

      {/* Date Filter */}
      <div className="mb-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Filter:</span>
          {[
            { value: 'today', label: 'Today' },
            { value: 'yesterday', label: 'Yesterday' },
            { value: 'last7', label: '7 Days' },
            { value: 'last30', label: '30 Days' },
            { value: 'custom', label: 'Custom' },
            { value: 'all', label: 'All' },
          ].map((option) => (
            <Button
              key={option.value}
              variant={dateFilter === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateFilter(option.value as typeof dateFilter)}
            >
              {option.label}
            </Button>
          ))}
          <span className="ml-auto text-sm text-muted-foreground">
            {filteredOrders.length} order(s)
          </span>
        </div>

        {/* Custom Date Range Inputs */}
        {dateFilter === 'custom' && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-sm">From:</Label>
              <Input
                type="date"
                value={customFromDate}
                onChange={(e) => {
                  setCustomFromDate(e.target.value);
                  // If to date is before from date, update it
                  if (e.target.value > customToDate) {
                    setCustomToDate(e.target.value);
                  }
                }}
                className="w-auto"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm">To:</Label>
              <Input
                type="date"
                value={customToDate}
                min={customFromDate}
                onChange={(e) => setCustomToDate(e.target.value)}
                className="w-auto"
              />
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : !filteredOrders.length ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-medium">
            {dateFilter === 'all' ? 'No orders yet' : 'No orders for this period'}
          </p>
          <p className="mt-1 text-muted-foreground">
            {dateFilter === 'all'
              ? 'Orders will appear here when customers place them'
              : 'Try selecting a different date range'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isExpanded = expandedOrders.has(order.id);
            const totalItems = order.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;

            return (
              <div
                key={order.id}
                className="rounded-lg border border-border bg-card overflow-hidden"
              >
                {/* Collapsed Header - Always Visible */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleOrderExpand(order.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm">#{order.order_number}</h3>
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                        statusColors[order.status] || 'bg-muted text-muted-foreground'
                      )}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <div className="text-right mr-3">
                    <p className="font-bold">₹{Number(order.total).toLocaleString('en-IN')}</p>
                    <p className="text-xs text-muted-foreground">{totalItems} item(s)</p>
                  </div>
                  <ChevronDown className={cn(
                    'h-5 w-5 text-muted-foreground transition-transform',
                    isExpanded && 'rotate-180'
                  )} />
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-border p-4 space-y-4">
                    {/* Order Items */}
                    <div className="space-y-2">
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
                      <div className="rounded bg-muted/50 p-3 text-sm">
                        <p className="font-medium">Ship to:</p>
                        <p>{order.address.full_name} • {order.address.phone}</p>
                        <p className="text-muted-foreground">
                          {order.address.address_line1}, {order.address.city}, {order.address.state} - {order.address.postal_code}
                        </p>
                      </div>
                    )}

                    {/* Tracking Info */}
                    {order.tracking_number && (
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <Truck className="h-4 w-4 text-muted-foreground" />
                          {order.courier_service}
                        </span>
                        <span className="text-muted-foreground">#{order.tracking_number}</span>
                      </div>
                    )}

                    {/* Estimated Delivery */}
                    {order.estimated_delivery_date && order.status !== 'delivered' && order.status !== 'cancelled' && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Est. Delivery:</span>
                        <span className="font-medium">
                          {format(new Date(order.estimated_delivery_date), 'MMM d, yyyy')}
                        </span>
                      </div>
                    )}

                    {/* Notes */}
                    {order.notes && (
                      <div className="rounded bg-primary/5 p-3 text-sm">
                        <p className="font-medium">Update Notes:</p>
                        <p className="text-muted-foreground">{order.notes}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="gap-2 flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenUpdate(order);
                        }}
                      >
                        <Package className="h-4 w-4" />
                        Update Order
                      </Button>
                      {adminSettings?.is_shipping_integration_enabled && order.tracking_number && (
                        <Button
                          variant="secondary"
                          className="gap-2 flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            syncStatus.mutate(order);
                          }}
                          disabled={syncStatus.isPending}
                        >
                          <Truck className={`h-4 w-4 ${syncStatus.isPending ? 'animate-spin' : ''}`} />
                          {syncStatus.isPending ? 'Syncing...' : 'Sync Status'}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Update Dialog */}
      <Dialog
        open={updateDialog.open}
        onOpenChange={(open) => setUpdateDialog({ ...updateDialog, open })}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Order #{updateDialog.order?.order_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={updateForm.status}
                onValueChange={(value) => setUpdateForm({ ...updateForm, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {orderStatuses.map((status) => (
                    <SelectItem key={status} value={status} className="capitalize">
                      {status.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Courier Service */}
            <div className="space-y-2">
              <Label>Courier Service</Label>
              <Select
                value={updateForm.courier_service}
                onValueChange={(value) => setUpdateForm({ ...updateForm, courier_service: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select courier" />
                </SelectTrigger>
                <SelectContent>
                  {COURIER_OPTIONS.map((courier) => (
                    <SelectItem key={courier.value} value={courier.value}>
                      {courier.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tracking Number */}
            <div className="space-y-2">
              <Label>Tracking Number</Label>
              <Input
                value={updateForm.tracking_number}
                onChange={(e) => setUpdateForm({ ...updateForm, tracking_number: e.target.value })}
                placeholder="Enter tracking number"
              />
            </div>

            {/* Estimated Delivery */}
            <div className="space-y-2">
              <Label>Estimated Delivery Date</Label>
              <Input
                type="date"
                value={updateForm.estimated_delivery_date}
                onChange={(e) => setUpdateForm({ ...updateForm, estimated_delivery_date: e.target.value })}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Update Note (visible to customer)</Label>
              <Textarea
                value={updateForm.notes}
                onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
                placeholder="e.g., Your order has been shipped and is on its way!"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setUpdateDialog({ open: false, order: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitUpdate}
              disabled={updateOrder.isPending}
            >
              {updateOrder.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
