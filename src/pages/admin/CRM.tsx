import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Users, ShoppingCart, Calendar } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function AdminCRM() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all customers who have ordered from this admin's store
  const { data: customers, isLoading: loadingCustomers } = useQuery({
    queryKey: ['admin-customers', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Get unique customers from orders
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          user_id,
          created_at,
          total
        `)
        .eq('admin_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get unique user IDs
      const userIds = [...new Set(orders?.map(o => o.user_id).filter(Boolean))];
      
      if (userIds.length === 0) return [];

      // Fetch profiles for these users
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      if (profileError) throw profileError;

      // Combine data
      const customerData = profiles?.map(profile => {
        const customerOrders = orders?.filter(o => o.user_id === profile.user_id) || [];
        const totalSpent = customerOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
        const lastOrder = customerOrders[0]?.created_at;
        
        return {
          ...profile,
          orderCount: customerOrders.length,
          totalSpent,
          lastOrder,
        };
      }) || [];

      return customerData;
    },
    enabled: !!user,
  });

  // Fetch all orders for this admin
  const { data: allOrders, isLoading: loadingOrders } = useQuery({
    queryKey: ['admin-all-orders', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .eq('admin_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const filteredCustomers = customers?.filter(c => 
    c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  );

  const downloadCustomersCSV = () => {
    if (!customers?.length) {
      toast({ title: 'No data to export', variant: 'destructive' });
      return;
    }

    const headers = ['Name', 'Email', 'Phone', 'Orders', 'Total Spent', 'Last Order', 'Last Login'];
    const rows = customers.map(c => [
      c.full_name || '',
      c.email || '',
      c.phone || '',
      c.orderCount,
      c.totalSpent.toFixed(2),
      c.lastOrder ? format(new Date(c.lastOrder), 'yyyy-MM-dd') : '',
      c.last_login ? format(new Date(c.last_login), 'yyyy-MM-dd HH:mm') : 'Never',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    downloadCSV(csv, 'customers.csv');
    toast({ title: 'Customers exported successfully' });
  };

  const downloadOrdersCSV = () => {
    if (!allOrders?.length) {
      toast({ title: 'No data to export', variant: 'destructive' });
      return;
    }

    const headers = ['Order Number', 'Date', 'Status', 'Subtotal', 'Shipping', 'Total', 'Items Count'];
    const rows = allOrders.map(o => [
      o.order_number,
      format(new Date(o.created_at), 'yyyy-MM-dd HH:mm'),
      o.status,
      o.subtotal,
      o.shipping_cost,
      o.total,
      o.items?.length || 0,
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    downloadCSV(csv, 'orders.csv');
    toast({ title: 'Orders exported successfully' });
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <AdminLayout title="CRM & Reports">
      {/* Export Buttons */}
      <div className="mb-6 flex flex-wrap gap-3">
        <Button onClick={downloadCustomersCSV} className="gap-2">
          <Download className="h-4 w-4" />
          Export Customers
        </Button>
        <Button onClick={downloadOrdersCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export Orders
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <Users className="h-5 w-5 text-muted-foreground" />
          <p className="mt-2 text-2xl font-bold">{customers?.length || 0}</p>
          <p className="text-sm text-muted-foreground">Total Customers</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <ShoppingCart className="h-5 w-5 text-muted-foreground" />
          <p className="mt-2 text-2xl font-bold">{allOrders?.length || 0}</p>
          <p className="text-sm text-muted-foreground">Total Orders</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <p className="mt-2 text-2xl font-bold">
            ₹{(allOrders?.reduce((sum, o) => sum + Number(o.total || 0), 0) || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-sm text-muted-foreground">Total Revenue</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <Users className="h-5 w-5 text-muted-foreground" />
          <p className="mt-2 text-2xl font-bold">
            {customers?.filter(c => c.last_login && new Date(c.last_login) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length || 0}
          </p>
          <p className="text-sm text-muted-foreground">Active (7d)</p>
        </div>
      </div>

      {/* Customer Search */}
      <div className="mb-4">
        <Input
          placeholder="Search customers by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Customer List */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-4">
          <h3 className="font-medium">Customer Directory</h3>
        </div>
        
        {loadingCustomers ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : !filteredCustomers?.length ? (
          <div className="p-8 text-center text-muted-foreground">
            {searchTerm ? 'No customers match your search' : 'No customers yet'}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredCustomers.map((customer) => (
              <div key={customer.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{customer.full_name || 'Anonymous'}</p>
                  <p className="text-sm text-muted-foreground">{customer.email}</p>
                  {customer.phone && (
                    <p className="text-sm text-muted-foreground">{customer.phone}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-medium">₹{customer.totalSpent.toLocaleString('en-IN')}</p>
                  <p className="text-sm text-muted-foreground">{customer.orderCount} orders</p>
                  <p className="text-xs text-muted-foreground">
                    Last login: {customer.last_login 
                      ? format(new Date(customer.last_login), 'MMM d, yyyy')
                      : 'Never'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
