import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigation, Package, CheckCircle, Play, Square, MapPin, LogOut, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
          items:order_items(product_name, quantity),
          address:addresses(full_name, phone, address_line1, city, state, postal_code, location_link)
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

      // Log status history
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
      toast({ title: 'Status updated' });
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
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{orders?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Active Orders</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-success">{completedToday}</p>
              <p className="text-xs text-muted-foreground">Delivered Today</p>
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
                      <Badge variant="outline" className="capitalize">{order.status.replace('_', ' ')}</Badge>
                    </div>

                    {/* Items */}
                    <div className="text-sm text-muted-foreground">
                      {order.items?.map((item: any, i: number) => (
                        <span key={i}>{item.product_name} ×{item.quantity}{i < order.items.length - 1 ? ', ' : ''}</span>
                      ))}
                    </div>

                    {/* Address */}
                    {addr && (
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <div>
                          <p className="font-medium">{addr.full_name} • {addr.phone}</p>
                          <p className="text-muted-foreground">{addr.address_line1}, {addr.city}</p>
                          {addr.location_link && (
                            <a href={addr.location_link} target="_blank" rel="noopener noreferrer" className="text-primary text-xs hover:underline mt-1 inline-flex items-center gap-1">
                              <Navigation className="h-3 w-3" /> Navigate
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Amount */}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="text-sm">
                        <span className="text-muted-foreground">Amount: </span>
                        <span className="font-semibold">₹{Number(order.total).toLocaleString('en-IN')}</span>
                        <span className="text-xs ml-1 capitalize text-muted-foreground">({order.payment_method || 'cod'})</span>
                      </span>
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
                          onClick={() => updateStatus.mutate({ orderId: order.id, newStatus: 'delivered' })}
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
    </div>
  );
}
