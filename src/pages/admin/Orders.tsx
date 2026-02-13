import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Package, Bell, Truck, Calendar, ChevronDown, MapPin } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format, addDays, startOfDay, endOfDay, subDays, isWithinInterval, parseISO, isPast } from 'date-fns';

const GENERAL_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];
const FOOD_STATUSES = ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled'];

const statusColors: Record<string, string> = {
  pending: 'bg-warning/20 text-warning border-warning/30',
  confirmed: 'bg-primary/20 text-primary border-primary/30',
  processing: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  preparing: 'bg-orange-500/20 text-orange-600 border-orange-500/30',
  ready_for_pickup: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30',
  shipped: 'bg-indigo-500/20 text-indigo-600 border-indigo-500/30',
  out_for_delivery: 'bg-cyan-500/20 text-cyan-600 border-cyan-500/30',
  delivered: 'bg-success/20 text-success border-success/30',
  cancelled: 'bg-destructive/20 text-destructive border-destructive/30',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  preparing: 'Preparing',
  ready_for_pickup: 'Ready for Pickup',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const COURIER_OPTIONS = [
  { value: 'delhivery', label: 'Delhivery', trackingUrl: 'https://www.delhivery.com/track/package/' },
  { value: 'professional', label: 'Professional Courier', trackingUrl: 'https://www.tpcindia.com/track.aspx?id=' },
  { value: 'bluedart', label: 'BlueDart', trackingUrl: 'https://www.bluedart.com/tracking/' },
  { value: 'dtdc', label: 'DTDC', trackingUrl: 'https://www.dtdc.in/tracking/tracking_results.asp?Ession_id=' },
  { value: 'ecom', label: 'Ecom Express', trackingUrl: 'https://ecomexpress.in/tracking/?awb_field=' },
  { value: 'xpressbees', label: 'XpressBees', trackingUrl: 'https://www.xpressbees.com/track?awbNo=' },
  { value: 'trackon', label: 'Trackon', trackingUrl: 'https://trackon.in/track?awb=' },
  { value: 'self_delivery', label: 'Self Delivery', trackingUrl: '' },
  { value: 'other', label: 'Other', trackingUrl: '' },
];

export default function AdminOrders() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [updateDialog, setUpdateDialog] = useState<{ open: boolean; order: any | null }>({ open: false, order: null });

  // Filters
  const [dateFilter, setDateFilter] = useState<string>('today');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customFromDate, setCustomFromDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customToDate, setCustomToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) newSet.delete(orderId);
      else newSet.add(orderId);
      return newSet;
    });
  };

  const [updateForm, setUpdateForm] = useState({
    status: '',
    notes: '',
    tracking_number: '',
    courier_service: '',
    estimated_delivery_date: '',
    payment_status: '',
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
          address:addresses(full_name, phone, address_line1, city, state, postal_code, location_link)
        `)
        .eq('admin_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

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

  const shopType = (adminSettings as any)?.shop_type || 'general';
  const orderStatuses = shopType === 'food' ? FOOD_STATUSES : GENERAL_STATUSES;

  // Filter orders
  const filteredOrders = (orders || []).filter((order) => {
    // Status filter
    if (statusFilter !== 'all' && statusFilter !== 'overdue') {
      if (order.status !== statusFilter) return false;
    }
    if (statusFilter === 'overdue') {
      if (!order.estimated_delivery_date || order.status === 'delivered' || order.status === 'cancelled') return false;
      if (!isPast(new Date(order.estimated_delivery_date))) return false;
    }

    // Date filter
    if (dateFilter === 'all') return true;
    const orderDate = parseISO(order.created_at);
    const today = startOfDay(new Date());

    switch (dateFilter) {
      case 'today':
        return isWithinInterval(orderDate, { start: today, end: new Date() });
      case 'yesterday':
        return isWithinInterval(orderDate, { start: subDays(today, 1), end: today });
      case 'last7':
        return isWithinInterval(orderDate, { start: subDays(today, 7), end: new Date() });
      case 'last30':
        return isWithinInterval(orderDate, { start: subDays(today, 30), end: new Date() });
      case 'custom':
        return isWithinInterval(orderDate, { start: startOfDay(parseISO(customFromDate)), end: endOfDay(parseISO(customToDate)) });
      default:
        return true;
    }
  });

  // Status counts
  const statusCounts = (orders || []).reduce((acc: Record<string, number>, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});
  const overdueCount = (orders || []).filter(o =>
    o.estimated_delivery_date && o.status !== 'delivered' && o.status !== 'cancelled' && isPast(new Date(o.estimated_delivery_date))
  ).length;

  // Real-time subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('admin-orders-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `admin_id=eq.${user.id}` },
        (payload) => {
          setNewOrderCount(prev => prev + 1);
          toast({ title: '🎉 New Order Received!', description: `Order #${(payload.new as any).order_number} - ₹${Number((payload.new as any).total).toLocaleString('en-IN')}` });
          refetch();
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Order Received!', { body: `Order #${(payload.new as any).order_number}`, icon: '/icons/icon-192x192.png' });
          }
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `admin_id=eq.${user.id}` }, () => { refetch(); })
      .subscribe();

    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    return () => { supabase.removeChannel(channel); };
  }, [user, refetch]);

  const updateOrder = useMutation({
    mutationFn: async (data: { orderId: string; status: string; notes?: string; tracking_number?: string; courier_service?: string; estimated_delivery_date?: string; payment_status?: string }) => {
      const courier = COURIER_OPTIONS.find(c => c.value === data.courier_service);
      const trackingUrl = courier && data.tracking_number ? courier.trackingUrl + data.tracking_number : null;

      const updateData: any = { status: data.status, updated_at: new Date().toISOString(), payment_status: data.payment_status || undefined };
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.tracking_number) updateData.tracking_number = data.tracking_number;
      if (data.courier_service) updateData.courier_service = data.courier_service;
      if (trackingUrl) updateData.courier_tracking_url = trackingUrl;
      if (data.estimated_delivery_date) updateData.estimated_delivery_date = data.estimated_delivery_date;
      if (data.status === 'shipped') updateData.shipped_at = new Date().toISOString();
      if (data.status === 'delivered') updateData.delivered_at = new Date().toISOString();

      const { error } = await supabase.from('orders').update(updateData).eq('id', data.orderId);
      if (error) throw error;

      await supabase.from('order_status_history').insert({ order_id: data.orderId, admin_id: user!.id, status: data.status, notes: data.notes || null });

      // Reduce stock on delivered
      if (data.status === 'delivered') {
        const { data: orderItems } = await supabase.from('order_items').select('product_id, quantity').eq('order_id', data.orderId);
        if (orderItems) {
          for (const item of orderItems) {
            if (item.product_id) {
              const { data: product } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single();
              if (product) {
                await supabase.from('products').update({ stock_quantity: Math.max(0, product.stock_quantity - item.quantity) }).eq('id', item.product_id);
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
      const { data, error } = await supabase.functions.invoke('shipping-ops', { body: { action: 'sync_status', orderId: order.id, adminId: user?.id } });
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
    const isTamilnadu = order.address?.state?.toLowerCase().includes('tamil');
    const defaultDays = isTamilnadu ? (adminSettings?.delivery_within_tamilnadu_days || 3) : (adminSettings?.delivery_outside_tamilnadu_days || 7);
    const defaultDate = order.estimated_delivery_date || format(addDays(new Date(), defaultDays), 'yyyy-MM-dd');
    setUpdateForm({ status: order.status, notes: '', tracking_number: order.tracking_number || '', courier_service: order.courier_service || '', estimated_delivery_date: defaultDate, payment_status: order.payment_status || 'pending' });
    setUpdateDialog({ open: true, order });
  };

  const handleSubmitUpdate = () => {
    if (!updateDialog.order) return;
    updateOrder.mutate({ orderId: updateDialog.order.id, status: updateForm.status, notes: updateForm.notes, tracking_number: updateForm.tracking_number, courier_service: updateForm.courier_service, estimated_delivery_date: updateForm.estimated_delivery_date, payment_status: updateForm.payment_status });
  };

  return (
    <AdminLayout title="Orders">
      {/* New Orders Notification */}
      {newOrderCount > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-primary/10 p-4">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary animate-bounce" />
            <span className="font-medium text-primary">{newOrderCount} new order(s) received!</span>
          </div>
          <Button size="sm" onClick={() => setNewOrderCount(0)}>Dismiss</Button>
        </div>
      )}

      {/* Status Tabs */}
      <div className="mb-4 overflow-x-auto">
        <div className="flex gap-2 min-w-max pb-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              statusFilter === 'all' ? 'bg-foreground text-background border-foreground' : 'bg-card text-muted-foreground border-border hover:bg-muted'
            )}
          >
            All ({orders?.length || 0})
          </button>
          {orderStatuses.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                statusFilter === status
                  ? statusColors[status] + ' border-current'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted'
              )}
            >
              {statusLabels[status]} ({statusCounts[status] || 0})
            </button>
          ))}
          {overdueCount > 0 && (
            <button
              onClick={() => setStatusFilter('overdue')}
              className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                statusFilter === 'overdue' ? 'bg-destructive/20 text-destructive border-destructive' : 'bg-card text-muted-foreground border-border hover:bg-muted'
              )}
            >
              ⚠️ Overdue ({overdueCount})
            </button>
          )}
        </div>
      </div>

      {/* Date Filter Dropdown */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <Select value={dateFilter} onValueChange={(v) => setDateFilter(v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="last7">Last 7 Days</SelectItem>
            <SelectItem value="last30">Last 30 Days</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>

        {dateFilter === 'custom' && (
          <div className="flex items-center gap-2 flex-wrap">
            <Input type="date" value={customFromDate} onChange={(e) => { setCustomFromDate(e.target.value); if (e.target.value > customToDate) setCustomToDate(e.target.value); }} className="w-auto" />
            <span className="text-sm text-muted-foreground">to</span>
            <Input type="date" value={customToDate} min={customFromDate} onChange={(e) => setCustomToDate(e.target.value)} className="w-auto" />
          </div>
        )}

        <span className="ml-auto text-sm text-muted-foreground font-medium">{filteredOrders.length} order(s)</span>
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
          <p className="mt-4 text-lg font-medium">{statusFilter !== 'all' ? `No ${statusLabels[statusFilter] || statusFilter} orders` : dateFilter === 'all' ? 'No orders yet' : 'No orders for this period'}</p>
          <p className="mt-1 text-muted-foreground">Try a different filter or date range</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const isExpanded = expandedOrders.has(order.id);
            const totalItems = order.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
            const isOverdue = order.estimated_delivery_date && order.status !== 'delivered' && order.status !== 'cancelled' && isPast(new Date(order.estimated_delivery_date));

            return (
              <div key={order.id} className={cn('rounded-lg border bg-card overflow-hidden', isOverdue && 'border-destructive/50')}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => toggleOrderExpand(order.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-sm">#{order.order_number}</h3>
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusColors[order.status] || 'bg-muted text-muted-foreground')}>
                        {statusLabels[order.status] || order.status}
                      </span>
                      {isOverdue && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">OVERDUE</Badge>}
                      {order.payment_method === 'cod' && <Badge variant="outline" className="text-[10px] px-1.5 py-0">COD</Badge>}
                      {order.payment_method === 'self_pickup' && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500 text-emerald-600">PICKUP</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
                      {order.estimated_delivery_date && order.status !== 'delivered' && order.status !== 'cancelled' && (
                        <span className={cn('ml-2', isOverdue ? 'text-destructive font-medium' : '')}>
                          • Est: {format(new Date(order.estimated_delivery_date), 'MMM d')}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right mr-3">
                    <p className="font-bold">₹{Number(order.total).toLocaleString('en-IN')}</p>
                    <p className="text-xs text-muted-foreground">{totalItems} item(s)</p>
                  </div>
                  <ChevronDown className={cn('h-5 w-5 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className="border-t border-border p-4 space-y-4">
                    {/* Items */}
                    <div className="space-y-2">
                      {order.items?.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-3 text-sm">
                          <img src={item.product_image || '/placeholder.svg'} alt={item.product_name} className="h-10 w-10 rounded object-cover" />
                          <div className="flex-1">
                            <p className="line-clamp-1">{item.product_name}</p>
                            <p className="text-muted-foreground">₹{item.unit_price} × {item.quantity} = ₹{Number(item.total_price).toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Price breakdown */}
                    <div className="rounded bg-muted/50 p-3 text-sm space-y-1">
                      <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{Number(order.subtotal).toLocaleString('en-IN')}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>₹{Number(order.shipping_cost).toLocaleString('en-IN')}</span></div>
                      <div className="flex justify-between font-medium border-t border-border pt-1"><span>Total</span><span>₹{Number(order.total).toLocaleString('en-IN')}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">Payment</span><span className="capitalize">{order.payment_method || 'COD'} • {order.payment_status || 'pending'}</span></div>
                    </div>

                    {/* Address */}
                    {order.address && (
                      <div className="rounded bg-muted/50 p-3 text-sm">
                        <p className="font-medium">Ship to:</p>
                        <p>{order.address.full_name} • {order.address.phone}</p>
                        <p className="text-muted-foreground">{order.address.address_line1}, {order.address.city}, {order.address.state} - {order.address.postal_code}</p>
                        {order.address.location_link && (
                          <a href={order.address.location_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary text-xs mt-1 hover:underline">
                            <MapPin className="h-3 w-3" /> Open in Google Maps
                          </a>
                        )}
                      </div>
                    )}

                    {/* Tracking */}
                    {order.tracking_number && (
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1"><Truck className="h-4 w-4 text-muted-foreground" />{order.courier_service}</span>
                        <span className="text-muted-foreground">#{order.tracking_number}</span>
                        {order.courier_tracking_url && (
                          <a href={order.courier_tracking_url} target="_blank" rel="noopener noreferrer" className="text-primary text-xs hover:underline">Track</a>
                        )}
                      </div>
                    )}

                    {order.estimated_delivery_date && order.status !== 'delivered' && order.status !== 'cancelled' && (
                      <div className={cn('flex items-center gap-2 text-sm', isOverdue && 'text-destructive')}>
                        <Calendar className="h-4 w-4" />
                        <span>Est. Delivery: <span className="font-medium">{format(new Date(order.estimated_delivery_date), 'MMM d, yyyy')}</span></span>
                        {isOverdue && <span className="text-xs font-medium">(Overdue!)</span>}
                      </div>
                    )}

                    {order.notes && (
                      <div className="rounded bg-primary/5 p-3 text-sm">
                        <p className="font-medium">Notes:</p>
                        <p className="text-muted-foreground">{order.notes}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button variant="outline" className="gap-2 flex-1" onClick={(e) => { e.stopPropagation(); handleOpenUpdate(order); }}>
                        <Package className="h-4 w-4" /> Update Order
                      </Button>
                      {adminSettings?.is_shipping_integration_enabled && order.tracking_number && (
                        <Button variant="secondary" className="gap-2 flex-1" onClick={(e) => { e.stopPropagation(); syncStatus.mutate(order); }} disabled={syncStatus.isPending}>
                          <Truck className={`h-4 w-4 ${syncStatus.isPending ? 'animate-spin' : ''}`} />
                          {syncStatus.isPending ? 'Syncing...' : 'Sync'}
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
      <Dialog open={updateDialog.open} onOpenChange={(open) => setUpdateDialog({ ...updateDialog, open })}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Order #{updateDialog.order?.order_number}</DialogTitle>
          </DialogHeader>
            <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={updateForm.status} onValueChange={(value) => setUpdateForm({ ...updateForm, status: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {orderStatuses.map((status) => (
                    <SelectItem key={status} value={status} className="capitalize">{statusLabels[status]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select value={updateForm.payment_status} onValueChange={(value) => setUpdateForm({ ...updateForm, payment_status: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid / Collected</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Courier Service</Label>
              <Select value={updateForm.courier_service} onValueChange={(value) => setUpdateForm({ ...updateForm, courier_service: value })}>
                <SelectTrigger><SelectValue placeholder="Select courier" /></SelectTrigger>
                <SelectContent>
                  {COURIER_OPTIONS.map((courier) => (
                    <SelectItem key={courier.value} value={courier.value}>{courier.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tracking Number</Label>
              <Input value={updateForm.tracking_number} onChange={(e) => setUpdateForm({ ...updateForm, tracking_number: e.target.value })} placeholder="Enter tracking number" />
            </div>

            <div className="space-y-2">
              <Label>Estimated Delivery Date</Label>
              <Input type="date" value={updateForm.estimated_delivery_date} onChange={(e) => setUpdateForm({ ...updateForm, estimated_delivery_date: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Update Note (visible to customer)</Label>
              <Textarea value={updateForm.notes} onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })} placeholder="e.g., Your order is being prepared!" rows={3} />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setUpdateDialog({ open: false, order: null })}>Cancel</Button>
            <Button onClick={handleSubmitUpdate} disabled={updateOrder.isPending}>{updateOrder.isPending ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
