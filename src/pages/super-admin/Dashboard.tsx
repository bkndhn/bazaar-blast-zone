import { useQuery } from '@tanstack/react-query';
import { Users, Store, ShoppingCart } from 'lucide-react';
import { SuperAdminLayout } from '@/components/layout/SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

export default function SuperAdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['super-admin-stats'],
    queryFn: async () => {
      const [admins, stores, orders] = await Promise.all([
        supabase.from('admin_accounts').select('*', { count: 'exact', head: true }),
        supabase.from('stores').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('total'),
      ]);

      const totalRevenue = orders.data?.reduce((sum, o) => sum + Number(o.total), 0) || 0;

      return {
        admins: admins.count || 0,
        stores: stores.count || 0,
        revenue: totalRevenue,
      };
    },
  });

  const { data: recentAdmins } = useQuery({
    queryKey: ['recent-admins'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_accounts')
        .select(`
          *,
          profile:profiles(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

  return (
    <SuperAdminLayout title="Dashboard">
      {/* Stats Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Admins
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.admins || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Stores
            </CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.stores || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Platform Revenue
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{(stats?.revenue || 0).toLocaleString('en-IN')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Admins */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Admin Registrations</CardTitle>
        </CardHeader>
        <CardContent>
          {!recentAdmins?.length ? (
            <p className="text-center text-muted-foreground py-8">
              No admin registrations yet
            </p>
          ) : (
            <div className="space-y-3">
              {recentAdmins.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="font-medium">{admin.store_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(admin as any).profile?.email || 'No email'}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                    admin.status === 'active'
                      ? 'bg-success/20 text-success'
                      : 'bg-warning/20 text-warning'
                  }`}>
                    {admin.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </SuperAdminLayout>
  );
}
