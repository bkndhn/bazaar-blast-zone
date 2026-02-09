import { useQuery } from '@tanstack/react-query';
import { IndianRupee, Banknote, CreditCard, TrendingUp, Calendar } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays, startOfDay } from 'date-fns';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

type DateRange = '7d' | '30d' | '90d' | 'all';

export default function PaymentReports() {
  const { user } = useAuth();
  const [range, setRange] = useState<DateRange>('30d');

  const { data: orders, isLoading } = useQuery({
    queryKey: ['payment-reports', user?.id, range],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('orders')
        .select('id, total, subtotal, shipping_cost, payment_method, payment_status, status, created_at')
        .eq('admin_id', user.id)
        .neq('status', 'cancelled');

      if (range !== 'all') {
        const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
        const fromDate = startOfDay(subDays(new Date(), days)).toISOString();
        query = query.gte('created_at', fromDate);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const stats = {
    totalRevenue: orders?.reduce((s, o) => s + Number(o.total || 0), 0) || 0,
    totalShipping: orders?.reduce((s, o) => s + Number(o.shipping_cost || 0), 0) || 0,
    codOrders: orders?.filter(o => o.payment_method === 'cod') || [],
    onlineOrders: orders?.filter(o => o.payment_method === 'online') || [],
    paidOrders: orders?.filter(o => o.payment_status === 'paid') || [],
    pendingPayment: orders?.filter(o => o.payment_status === 'pending') || [],
  };

  const codRevenue = stats.codOrders.reduce((s, o) => s + Number(o.total || 0), 0);
  const onlineRevenue = stats.onlineOrders.reduce((s, o) => s + Number(o.total || 0), 0);
  const codPct = stats.totalRevenue > 0 ? ((codRevenue / stats.totalRevenue) * 100).toFixed(1) : '0';
  const onlinePct = stats.totalRevenue > 0 ? ((onlineRevenue / stats.totalRevenue) * 100).toFixed(1) : '0';

  // Daily breakdown
  const dailyData = orders?.reduce((acc, o) => {
    const day = format(new Date(o.created_at), 'MMM dd');
    if (!acc[day]) acc[day] = { cod: 0, online: 0, total: 0 };
    const amount = Number(o.total || 0);
    if (o.payment_method === 'online') acc[day].online += amount;
    else acc[day].cod += amount;
    acc[day].total += amount;
    return acc;
  }, {} as Record<string, { cod: number; online: number; total: number }>) || {};

  const dailyRows = Object.entries(dailyData).slice(0, 15);

  return (
    <AdminLayout title="Payment Reports">
      {/* Date Range Filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(['7d', '30d', '90d', 'all'] as DateRange[]).map(r => (
          <Button
            key={r}
            size="sm"
            variant={range === r ? 'default' : 'outline'}
            onClick={() => setRange(r)}
            className="text-xs"
          >
            {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : r === '90d' ? '90 Days' : 'All Time'}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                  <IndianRupee className="h-3 w-3" /> Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">₹{stats.totalRevenue.toLocaleString('en-IN')}</p>
                <p className="text-xs text-muted-foreground">{orders?.length || 0} orders</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Shipping Earned
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">₹{stats.totalShipping.toLocaleString('en-IN')}</p>
              </CardContent>
            </Card>

            <Card className="border-success/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                  <CreditCard className="h-3 w-3" /> Online Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-success">₹{onlineRevenue.toLocaleString('en-IN')}</p>
                <p className="text-xs text-muted-foreground">{stats.onlineOrders.length} orders · {onlinePct}%</p>
              </CardContent>
            </Card>

            <Card className="border-warning/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                  <Banknote className="h-3 w-3" /> Cash on Delivery
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-warning">₹{codRevenue.toLocaleString('en-IN')}</p>
                <p className="text-xs text-muted-foreground">{stats.codOrders.length} orders · {codPct}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Payment Status Breakdown */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-sm">Payment Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-success" /> Paid
                  </span>
                  <span className="font-medium">
                    ₹{stats.paidOrders.reduce((s, o) => s + Number(o.total || 0), 0).toLocaleString('en-IN')}
                    <span className="text-xs text-muted-foreground ml-1">({stats.paidOrders.length})</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-warning" /> Pending
                  </span>
                  <span className="font-medium">
                    ₹{stats.pendingPayment.reduce((s, o) => s + Number(o.total || 0), 0).toLocaleString('en-IN')}
                    <span className="text-xs text-muted-foreground ml-1">({stats.pendingPayment.length})</span>
                  </span>
                </div>
              </div>

              {/* Visual Bar */}
              {stats.totalRevenue > 0 && (
                <div className="mt-4 h-3 rounded-full overflow-hidden bg-muted flex">
                  <div
                    className="bg-success h-full transition-all"
                    style={{ width: `${(onlineRevenue / stats.totalRevenue) * 100}%` }}
                  />
                  <div
                    className="bg-warning h-full transition-all"
                    style={{ width: `${(codRevenue / stats.totalRevenue) * 100}%` }}
                  />
                </div>
              )}
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>🟢 Online {onlinePct}%</span>
                <span>🟡 COD {codPct}%</span>
              </div>
            </CardContent>
          </Card>

          {/* Daily Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-1">
                <Calendar className="h-4 w-4" /> Daily Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dailyRows.length === 0 ? (
                <p className="text-center text-muted-foreground py-4 text-sm">No data for this period</p>
              ) : (
                <div className="overflow-x-auto -mx-4 px-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left py-2 font-medium">Date</th>
                        <th className="text-right py-2 font-medium">Online</th>
                        <th className="text-right py-2 font-medium">COD</th>
                        <th className="text-right py-2 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyRows.map(([day, data]) => (
                        <tr key={day} className="border-b border-border/50">
                          <td className="py-2">{day}</td>
                          <td className="text-right text-success">₹{data.online.toLocaleString('en-IN')}</td>
                          <td className="text-right text-warning">₹{data.cod.toLocaleString('en-IN')}</td>
                          <td className="text-right font-medium">₹{data.total.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </AdminLayout>
  );
}
