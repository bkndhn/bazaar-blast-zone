import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigation, Package, CheckCircle, Play, Square, MapPin, LogOut, Truck, Phone, IndianRupee, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const STATUS_SEQUENCE = ['confirmed', 'out_for_delivery', 'delivered'];

export default function DeliveryPartner() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [trackingActive, setTrackingActive] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const [paymentDialog, setPaymentDialog] = useState<{ open: boolean; order: any | null }>({ open: false, order: null });
  const [collectedAmount, setCollectedAmount] = useState('');

  // Fetch partner info
  const { data: partner } = useQuery({
    queryKey: ['delivery-partner', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('delivery_partners')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Fetch assigned orders
  const { data: orders, refetch } = useQuery({
    queryKey: ['partner-orders', partner?.id],
    queryFn: async () => {
      if (!partner) return [];
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(product_name, quantity, total_price),
          address:addresses(full_name, phone, address_line1, address_line2, city, state, postal_code, location_link)
        `)
        .eq('delivery_partner_id', partner.id)
        .in('status', ['confirmed', 'preparing', 'ready_for_pickup', 'processing', 'shipped', 'out_for_delivery'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!partner,
    refetchInterval: 15000,
  });

  // Completed orders today
  const { data: completedToday } = useQuery({
    queryKey: ['partner-completed', partner?.id],
    queryFn: async () => {
      if (!partner) return 0;
      const today = new Date().toISOString().split('T')[0];
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('delivery_partner_id', partner.id)
        .eq('status', 'delivered')
        .gte('delivered_at', today);
      return count || 0;
    },
    enabled: !!partner,
  });

  // Today's collected amount
  const { data: todayCollection } = useQuery({
    queryKey: ['partner-collection', partner?.id],
    queryFn: async () => {
      if (!partner) return 0;
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('orders')
        .select('total')
        .eq('delivery_partner_id', partner.id)
        .eq('status', 'delivered')
        .eq('payment_status', 'paid')
        .eq('payment_method', 'cod')
        .gte('delivered_at', today);
      return data?.reduce((sum, o) => sum + Number(o.total), 0) || 0;
    },
    enabled: !!partner,
  });

  const startTracking = useCallback((orderId: string) => {
    if (!partner || !('geolocation' in navigator)) {
      toast({ title: 'GPS not available', variant: 'destructive' });
      return;
    }

    setActiveOrderId(orderId);
    setTrackingActive(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        await supabase.from('delivery_tracking').insert({
          order_id: orderId,
          partner_id: partner.id,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => console.error('GPS error:', error),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    toast({ title: 'Live tracking started' });
  }, [partner]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTrackingActive(false);
    setActiveOrderId(null);
    toast({ title: 'Tracking stopped' });
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const updateStatus = useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: string; newStatus: string }) => {
      const updateData: any = { status: newStatus, updated_at: new Date().toISOString() };
      if (newStatus === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      }
      const { error } = await supabase.from('orders').update(updateData).eq('id', orderId);
      if (error) throw error;

      const order = orders?.find(o => o.id === orderId);
      if (order) {
        await supabase.from('order_status_history').insert({
          order_id: orderId,
          admin_id: order.admin_id,
          status: newStatus,
          notes: `Updated by delivery partner`,
        });
      }

      if (newStatus === 'delivered') stopTracking();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-orders'] });
      queryClient.invalidateQueries({ queryKey: ['partner-completed'] });
      queryClient.invalidateQueries({ queryKey: ['partner-collection'] });
      toast({ title: 'Status updated' });
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  // Collect payment (COD)
  const collectPayment = useMutation({
    mutationFn: async ({ orderId, amount }: { orderId: string; amount: number }) => {
      const { error } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          payment_id: `COD-${partner?.id?.slice(0, 8)}-${Date.now()}`,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', orderId);
      if (error) throw error;

      const order = orders?.find(o => o.id === orderId);
      if (order) {
        await supabase.from('order_status_history').insert({
          order_id: orderId,
          admin_id: order.admin_id,
          status: order.status,
          notes: `Payment collected: ₹${amount} (COD) by delivery partner`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-orders'] });
      queryClient.invalidateQueries({ queryKey: ['partner-collection'] });
      toast({ title: 'Payment collected successfully' });
      setPaymentDialog({ open: false, order: null });
      setCollectedAmount('');
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const getNextStatus = (currentStatus: string) => {
    const idx = STATUS_SEQUENCE.indexOf(currentStatus);
    if (idx >= 0 && idx < STATUS_SEQUENCE.length - 1) return STATUS_SEQUENCE[idx + 1];
    if (['preparing', 'ready_for_pickup', 'processing', 'shipped'].includes(currentStatus)) return 'out_for_delivery';
    return null;
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center"><p>Please log in</p></div>;

  if (!partner) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-6">
            <Truck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Not a Delivery Partner</h2>
            <p className="text-muted-foreground text-sm">Your account is not registered as a delivery partner. Contact the store admin to get added.</p>
            <Button variant="outline" className="mt-4" onClick={() => signOut()}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Delivery Dashboard</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={() => signOut()}>
          <LogOut className="h-5 w-5" />
        </Button>
      </header>

      <div className="p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{orders?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-success">{completedToday}</p>
              <p className="text-xs text-muted-foreground">Delivered</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-primary">₹{(todayCollection || 0).toLocaleString('en-IN')}</p>
              <p className="text-xs text-muted-foreground">Collected</p>
            </CardContent>
          </Card>
        </div>

        {/* Tracking Status */}
        {trackingActive && (
          <div className="rounded-lg bg-success/10 border border-success/30 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm font-medium text-success">GPS Tracking Active</span>
            </div>
            <Button size="sm" variant="outline" onClick={stopTracking} className="gap-1">
              <Square className="h-3 w-3" />
              Stop
            </Button>
          </div>
        )}

        {/* Orders */}
        <h2 className="font-semibold">Active Deliveries</h2>
        {!orders?.length ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Package className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground">No active deliveries</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const nextStatus = getNextStatus(order.status);
              const isActiveOrder = activeOrderId === order.id;
              const addr = order.address as any;
              const isCOD = (order.payment_method === 'cod' || !order.payment_method);
              const isPaid = order.payment_status === 'paid';

              return (
                <Card key={order.id} className={cn(isActiveOrder && 'border-success')}>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">#{order.order_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(order.created_at), 'MMM d, h:mm a')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">{order.status.replace('_', ' ')}</Badge>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="text-sm text-muted-foreground">
                      {order.items?.map((item: any, i: number) => (
                        <span key={i}>{item.product_name} ×{item.quantity}{i < order.items.length - 1 ? ', ' : ''}</span>
                      ))}
                    </div>

                    {/* Customer Info with Call button */}
                    {addr && (
                      <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{addr.full_name}</p>
                          <a href={`tel:${addr.phone}`} className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                            <Phone className="h-3 w-3" />
                            {addr.phone}
                          </a>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ''}, {addr.city}, {addr.state} - {addr.postal_code}
                        </p>
                        {addr.location_link && (
                          <a href={addr.location_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium">
                            <Navigation className="h-3 w-3" /> Open in Maps
                          </a>
                        )}
                      </div>
                    )}

                    {/* Amount & Payment Status */}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">₹{Number(order.total).toLocaleString('en-IN')}</span>
                        <Badge variant={isPaid ? 'default' : 'secondary'} className={cn('text-xs', isPaid && 'bg-success')}>
                          {isPaid ? '✓ Paid' : isCOD ? 'COD' : 'Online'}
                        </Badge>
                      </div>
                      {isCOD && !isPaid && order.status === 'out_for_delivery' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs"
                          onClick={() => {
                            setCollectedAmount(Number(order.total).toString());
                            setPaymentDialog({ open: true, order });
                          }}
                        >
                          <IndianRupee className="h-3 w-3" />
                          Collect
                        </Button>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {order.status !== 'out_for_delivery' && order.status !== 'delivered' && nextStatus === 'out_for_delivery' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1"
                          onClick={() => {
                            updateStatus.mutate({ orderId: order.id, newStatus: 'out_for_delivery' });
                            startTracking(order.id);
                          }}
                          disabled={updateStatus.isPending}
                        >
                          <Play className="h-3 w-3" />
                          Start Delivery
                        </Button>
                      )}

                      {order.status === 'out_for_delivery' && !isActiveOrder && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1"
                          onClick={() => startTracking(order.id)}
                        >
                          <Play className="h-3 w-3" />
                          Resume Tracking
                        </Button>
                      )}

                      {order.status === 'out_for_delivery' && (
                        <Button
                          size="sm"
                          className="flex-1 gap-1 bg-success hover:bg-success/90"
                          onClick={() => {
                            // If COD and not paid, prompt payment first
                            if (isCOD && !isPaid) {
                              setCollectedAmount(Number(order.total).toString());
                              setPaymentDialog({ open: true, order });
                              return;
                            }
                            updateStatus.mutate({ orderId: order.id, newStatus: 'delivered' });
                          }}
                          disabled={updateStatus.isPending}
                        >
                          <CheckCircle className="h-3 w-3" />
                          Mark Delivered
                        </Button>
                      )}

                      {nextStatus && order.status !== 'out_for_delivery' && nextStatus !== 'out_for_delivery' && (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => updateStatus.mutate({ orderId: order.id, newStatus: nextStatus })}
                          disabled={updateStatus.isPending}
                        >
                          Next: {nextStatus.replace('_', ' ')}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment Collection Dialog */}
      <Dialog open={paymentDialog.open} onOpenChange={(o) => setPaymentDialog({ open: o, order: o ? paymentDialog.order : null })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Collect Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
              <p>Order: <span className="font-medium">#{paymentDialog.order?.order_number}</span></p>
              <p>Total Amount: <span className="font-bold text-lg">₹{Number(paymentDialog.order?.total || 0).toLocaleString('en-IN')}</span></p>
            </div>
            <div className="space-y-2">
              <Label>Collected Amount (₹)</Label>
              <Input
                type="number"
                value={collectedAmount}
                onChange={(e) => setCollectedAmount(e.target.value)}
                placeholder="Enter amount collected"
              />
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 gap-1"
                onClick={() => {
                  if (!paymentDialog.order) return;
                  collectPayment.mutate({
                    orderId: paymentDialog.order.id,
                    amount: parseFloat(collectedAmount) || 0,
                  });
                }}
                disabled={collectPayment.isPending || !collectedAmount}
              >
                <IndianRupee className="h-4 w-4" />
                {collectPayment.isPending ? 'Processing...' : 'Confirm Collection'}
              </Button>
            </div>
            <Button
              variant="outline"
              className="w-full gap-1"
              onClick={() => {
                if (!paymentDialog.order) return;
                collectPayment.mutate({
                  orderId: paymentDialog.order.id,
                  amount: Number(paymentDialog.order.total),
                });
                // Also mark as delivered
                updateStatus.mutate({ orderId: paymentDialog.order.id, newStatus: 'delivered' });
              }}
              disabled={collectPayment.isPending || updateStatus.isPending}
            >
              <CheckCircle className="h-4 w-4" />
              Collect & Mark Delivered
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
