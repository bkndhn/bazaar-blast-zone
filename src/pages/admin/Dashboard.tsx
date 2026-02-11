import { useQuery } from '@tanstack/react-query';
import { Package, ShoppingCart, DollarSign, TrendingUp, AlertTriangle, Clock, CheckCircle, Truck } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { isPast, format } from 'date-fns';

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

const statusColors: Record<string, string> = {
  pending: 'bg-warning/20 text-warning',
  confirmed: 'bg-primary/20 text-primary',
  processing: 'bg-blue-500/20 text-blue-600',
  preparing: 'bg-orange-500/20 text-orange-600',
  ready_for_pickup: 'bg-emerald-500/20 text-emerald-600',
  shipped: 'bg-indigo-500/20 text-indigo-600',
  out_for_delivery: 'bg-cyan-500/20 text-cyan-600',
  delivered: 'bg-success/20 text-success',
  cancelled: 'bg-destructive/20 text-destructive',
};

export default function AdminDashboard() {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['admin-stats', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('admin_id', user.id);

      const { data: orders } = await supabase
        .from('orders')
        .select('total, status, estimated_delivery_date, created_at')
        .eq('admin_id', user.id);

      const totalOrders = orders?.length || 0;
      const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total), 0) || 0;

      // Status breakdown
      const statusBreakdown: Record<string, number> = {};
      let overdueCount = 0;
      orders?.forEach(o => {
        statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1;
        if (o.estimated_delivery_date && o.status !== 'delivered' && o.status !== 'cancelled' && isPast(new Date(o.estimated_delivery_date))) {
          overdueCount++;
        }
      });

      return {
        products: productsCount || 0,
        orders: totalOrders,
        revenue: totalRevenue,
        statusBreakdown,
        overdueCount,
      };
    },
    enabled: !!user,
  });

  const { data: recentOrders } = useQuery({
    queryKey: ['admin-recent-orders', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, status, total, created_at, estimated_delivery_date, payment_method')
        .eq('admin_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const activeStatuses = Object.entries(stats?.statusBreakdown || {})
    .filter(([status]) => status !== 'delivered' && status !== 'cancelled')
    .sort((a, b) => b[1] - a[1]);

  return (
    <AdminLayout title="Dashboard">
      {/* Stats Cards */}
      <div className="mb-6 grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.products || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.orders || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(stats?.revenue || 0).toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>

        <Card className={stats?.overdueCount ? 'border-destructive/50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
            <AlertTriangle className={cn('h-4 w-4', stats?.overdueCount ? 'text-destructive' : 'text-muted-foreground')} />
          </CardHeader>
          <CardContent>
            <div className={cn('text-2xl font-bold', stats?.overdueCount ? 'text-destructive' : '')}>{stats?.overdueCount || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Order Status Breakdown */}
      {activeStatuses.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Active Orders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {activeStatuses.map(([status, count]) => (
                <div key={status} className={cn('flex items-center gap-2 rounded-lg px-3 py-2', statusColors[status] || 'bg-muted')}>
                  <span className="text-lg font-bold">{count}</span>
                  <span className="text-sm font-medium capitalize">{statusLabels[status] || status}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {!recentOrders?.length ? (
            <p className="text-center text-muted-foreground py-8">No orders yet. Start promoting your products!</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => {
                const isOverdue = order.estimated_delivery_date && order.status !== 'delivered' && order.status !== 'cancelled' && isPast(new Date(order.estimated_delivery_date));
                return (
                  <div key={order.id} className={cn('flex items-center justify-between rounded-lg border border-border p-3', isOverdue && 'border-destructive/50')}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">#{order.order_number}</p>
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium capitalize', statusColors[order.status] || 'bg-muted text-muted-foreground')}>
                          {statusLabels[order.status] || order.status}
                        </span>
                        {isOverdue && <Badge variant="destructive" className="text-[10px] px-1 py-0">OVERDUE</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(order.created_at), 'MMM d, h:mm a')}
                        {order.estimated_delivery_date && order.status !== 'delivered' && order.status !== 'cancelled' && (
                          <span className={cn('ml-2', isOverdue ? 'text-destructive' : '')}>
                            • Est: {format(new Date(order.estimated_delivery_date), 'MMM d')}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">₹{Number(order.total).toLocaleString('en-IN')}</p>
                      <span className="text-[10px] capitalize text-muted-foreground">{order.payment_method || 'cod'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
