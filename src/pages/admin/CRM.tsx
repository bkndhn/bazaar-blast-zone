import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Users, ShoppingCart, Calendar, Search, Phone, Mail, MapPin, ChevronDown, ChevronUp, IndianRupee, FileSpreadsheet, Printer } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface CustomerData {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  last_login: string | null;
  orderCount: number;
  totalSpent: number;
  lastOrder: string | null;
  addresses: Array<{
    id: string;
    full_name: string;
    address_line1: string;
    address_line2: string | null;
    city: string;
    state: string;
    postal_code: string;
    phone: string;
    is_default: boolean;
  }>;
}

export default function AdminCRM() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);

  // Fetch all customers who have ordered from this admin's store
  const { data: customers, isLoading: loadingCustomers } = useQuery({
    queryKey: ['admin-customers', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: orders, error } = await supabase
        .from('orders')
        .select('user_id, created_at, total')
        .eq('admin_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userIds = [...new Set(orders?.map(o => o.user_id).filter(Boolean))];
      if (userIds.length === 0) return [];

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      if (profileError) throw profileError;

      const { data: addresses } = await supabase
        .from('addresses')
        .select('*')
        .in('user_id', userIds);

      const customerData: CustomerData[] = profiles?.map(profile => {
        const customerOrders = orders?.filter(o => o.user_id === profile.user_id) || [];
        const totalSpent = customerOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
        const lastOrder = customerOrders[0]?.created_at;
        const customerAddresses = addresses?.filter(a => a.user_id === profile.user_id) || [];

        return {
          ...profile,
          orderCount: customerOrders.length,
          totalSpent,
          lastOrder,
          addresses: customerAddresses,
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
        .select(`*, items:order_items(*)`)
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

  // ---- EXCEL EXPORT (TSV with auto-fit columns) ----
  const exportExcel = (type: 'customers' | 'orders') => {
    if (type === 'customers') {
      if (!customers?.length) { toast({ title: 'No data to export', variant: 'destructive' }); return; }
      const headers = ['Name', 'Email', 'Phone', 'Address', 'City', 'State', 'Pincode', 'Orders', 'Total Spent (₹)', 'Last Order', 'Last Login'];
      const rows = customers.map(c => {
        const addr = c.addresses?.find(a => a.is_default) || c.addresses?.[0];
        return [
          c.full_name || '', c.email || '', c.phone || '',
          addr ? `${addr.address_line1}${addr.address_line2 ? ', ' + addr.address_line2 : ''}` : '',
          addr?.city || '', addr?.state || '', addr?.postal_code || '',
          c.orderCount, c.totalSpent.toFixed(2),
          c.lastOrder ? format(new Date(c.lastOrder), 'yyyy-MM-dd') : '',
          c.last_login ? format(new Date(c.last_login), 'yyyy-MM-dd HH:mm') : 'Never',
        ];
      });
      downloadTSV(headers, rows, 'customers.xls');
    } else {
      if (!allOrders?.length) { toast({ title: 'No data to export', variant: 'destructive' }); return; }
      const headers = ['Order #', 'Date', 'Status', 'Payment Method', 'Payment Status', 'Subtotal (₹)', 'Shipping (₹)', 'Total (₹)', 'Items', 'Tracking #'];
      const rows = allOrders.map(o => [
        o.order_number,
        format(new Date(o.created_at), 'yyyy-MM-dd HH:mm'),
        o.status, o.payment_method || 'cod', o.payment_status || 'pending',
        o.subtotal, o.shipping_cost, o.total,
        o.items?.length || 0, o.tracking_number || '',
      ]);
      downloadTSV(headers, rows, 'orders.xls');
    }
    toast({ title: `${type === 'customers' ? 'Customers' : 'Orders'} exported as Excel` });
  };

  const downloadTSV = (headers: string[], rows: any[][], filename: string) => {
    // Using HTML table format for .xls so Excel auto-fits columns
    let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">';
    html += '<head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>';
    html += '<x:Name>Sheet1</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>';
    html += '</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>';
    html += '<table border="1"><thead><tr>';
    headers.forEach(h => { html += `<th style="font-weight:bold;background:#f0f0f0;white-space:nowrap">${h}</th>`; });
    html += '</tr></thead><tbody>';
    rows.forEach(row => {
      html += '<tr>';
      row.forEach(cell => { html += `<td style="white-space:nowrap">${cell ?? ''}</td>`; });
      html += '</tr>';
    });
    html += '</tbody></table></body></html>';

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // ---- PDF / PRINT ----
  const printReport = (type: 'customers' | 'orders') => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) { toast({ title: 'Please allow popups', variant: 'destructive' }); return; }

    let tableHtml = '';
    if (type === 'customers') {
      if (!customers?.length) { toast({ title: 'No data', variant: 'destructive' }); return; }
      tableHtml = `<table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>City</th><th>Orders</th><th>Total (₹)</th><th>Last Order</th></tr></thead><tbody>`;
      customers.forEach(c => {
        const addr = c.addresses?.find(a => a.is_default) || c.addresses?.[0];
        tableHtml += `<tr><td>${c.full_name || '-'}</td><td>${c.email || '-'}</td><td>${c.phone || '-'}</td><td>${addr?.city || '-'}</td><td>${c.orderCount}</td><td>${c.totalSpent.toLocaleString('en-IN')}</td><td>${c.lastOrder ? format(new Date(c.lastOrder), 'dd MMM yyyy') : '-'}</td></tr>`;
      });
      tableHtml += '</tbody></table>';
    } else {
      if (!allOrders?.length) { toast({ title: 'No data', variant: 'destructive' }); return; }
      tableHtml = `<table><thead><tr><th>Order #</th><th>Date</th><th>Status</th><th>Payment</th><th>Subtotal</th><th>Shipping</th><th>Total</th></tr></thead><tbody>`;
      allOrders.forEach(o => {
        tableHtml += `<tr><td>${o.order_number}</td><td>${format(new Date(o.created_at), 'dd MMM yyyy')}</td><td>${o.status}</td><td>${o.payment_method || 'cod'}</td><td>₹${o.subtotal}</td><td>₹${o.shipping_cost}</td><td>₹${o.total}</td></tr>`;
      });
      tableHtml += '</tbody></table>';
    }

    printWindow.document.write(`<!DOCTYPE html><html><head><title>${type === 'customers' ? 'Customers Report' : 'Orders Report'}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 16px; font-size: 11px; }
        h1 { font-size: 16px; margin-bottom: 8px; }
        p { font-size: 10px; color: #666; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 4px 6px; text-align: left; white-space: nowrap; }
        th { background: #f5f5f5; font-weight: bold; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <h1>${type === 'customers' ? 'Customer Report' : 'Orders Report'}</h1>
      <p>Generated: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}</p>
      ${tableHtml}
    </body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  const toggleExpand = (customerId: string) => {
    setExpandedCustomer(expandedCustomer === customerId ? null : customerId);
  };

  return (
    <AdminLayout title="CRM & Reports">
      {/* Stats Cards */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Customers</span>
          </div>
          <p className="mt-1 text-xl font-bold">{customers?.length || 0}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Orders</span>
          </div>
          <p className="mt-1 text-xl font-bold">{allOrders?.length || 0}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-success" />
            <span className="text-xs text-muted-foreground">Revenue</span>
          </div>
          <p className="mt-1 text-xl font-bold">
            ₹{(allOrders?.reduce((sum, o) => sum + Number(o.total || 0), 0) || 0).toLocaleString('en-IN')}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Active (7d)</span>
          </div>
          <p className="mt-1 text-xl font-bold">
            {customers?.filter(c => c.last_login && new Date(c.last_login) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length || 0}
          </p>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Button onClick={() => exportExcel('customers')} size="sm" className="gap-1 text-xs">
          <FileSpreadsheet className="h-3 w-3" />
          Customers Excel
        </Button>
        <Button onClick={() => exportExcel('orders')} variant="outline" size="sm" className="gap-1 text-xs">
          <FileSpreadsheet className="h-3 w-3" />
          Orders Excel
        </Button>
        <Button onClick={() => printReport('customers')} variant="outline" size="sm" className="gap-1 text-xs">
          <Printer className="h-3 w-3" />
          Customers PDF
        </Button>
        <Button onClick={() => printReport('orders')} variant="outline" size="sm" className="gap-1 text-xs">
          <Printer className="h-3 w-3" />
          Orders PDF
        </Button>
      </div>

      {/* Customer Search */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Customer List */}
      <div className="space-y-2">
        {loadingCustomers ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))
        ) : !filteredCustomers?.length ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
            {searchTerm ? 'No customers match your search' : 'No customers yet'}
          </div>
        ) : (
          filteredCustomers.map((customer) => {
            const isExpanded = expandedCustomer === customer.id;
            const defaultAddress = customer.addresses?.find(a => a.is_default) || customer.addresses?.[0];

            return (
              <div key={customer.id} className="rounded-lg border border-border bg-card overflow-hidden">
                <button
                  onClick={() => toggleExpand(customer.id)}
                  className="w-full p-3 text-left flex items-center gap-3"
                >
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">
                      {customer.full_name?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{customer.full_name || 'Anonymous'}</p>
                    <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-success">₹{customer.totalSpent.toLocaleString('en-IN')}</p>
                    <p className="text-xs text-muted-foreground">{customer.orderCount} orders</p>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-border p-3 space-y-2 bg-muted/30">
                    {customer.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <a href={`tel:${customer.phone}`} className="text-primary">{customer.phone}</a>
                      </div>
                    )}
                    {/* Show phone from address if profile phone is not set */}
                    {!customer.phone && defaultAddress?.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <a href={`tel:${defaultAddress.phone}`} className="text-primary">{defaultAddress.phone}</a>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      <a href={`mailto:${customer.email}`} className="text-primary truncate">{customer.email}</a>
                    </div>
                    {defaultAddress && (
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
                        <div>
                          <p>{defaultAddress.address_line1}</p>
                          {defaultAddress.address_line2 && <p>{defaultAddress.address_line2}</p>}
                          <p>{defaultAddress.city}, {defaultAddress.state} {defaultAddress.postal_code}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Past Orders */}
                    {customer.orderCount > 0 && (
                      <div className="pt-2 border-t border-border">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          <ShoppingCart className="h-3 w-3 inline mr-1" />
                          Recent Orders
                        </p>
                        <div className="space-y-1">
                          {(allOrders || [])
                            .filter(o => o.user_id === customer.user_id)
                            .slice(0, 5)
                            .map((order: any) => (
                              <div key={order.id} className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">#{order.order_number}</span>
                                <span className={`capitalize ${order.status === 'delivered' ? 'text-success' : order.status === 'cancelled' ? 'text-destructive' : 'text-foreground'}`}>
                                  {order.status}
                                </span>
                                <span className="font-medium">₹{Number(order.total).toLocaleString('en-IN')}</span>
                                <span className="text-muted-foreground">{format(new Date(order.created_at), 'dd MMM')}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-2 text-xs text-muted-foreground border-t border-border">
                      <p>Last Order: {customer.lastOrder ? format(new Date(customer.lastOrder), 'MMM d, yyyy') : 'Never'}</p>
                      <p>Last Login: {customer.last_login ? format(new Date(customer.last_login), 'MMM d, yyyy h:mm a') : 'Never'}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </AdminLayout>
  );
}
