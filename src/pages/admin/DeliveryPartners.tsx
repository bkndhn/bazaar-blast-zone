import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Truck, Plus, Trash2, UserCheck, UserX, Package, Info } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminDeliveryPartners() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [formData, setFormData] = useState({ email: '', name: '', phone: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });

  const { data: partners } = useQuery({
    queryKey: ['delivery-partners', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('delivery_partners')
        .select('*')
        .eq('admin_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Unassigned orders
  const { data: unassignedOrders } = useQuery({
    queryKey: ['unassigned-orders', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, status, total, created_at')
        .eq('admin_id', user.id)
        .is('delivery_partner_id', null)
        .not('status', 'in', '("delivered","cancelled")')
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Assigned orders (active)
  const { data: assignedOrders } = useQuery({
    queryKey: ['assigned-orders', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, status, total, delivery_partner_id, created_at')
        .eq('admin_id', user.id)
        .not('delivery_partner_id', 'is', null)
        .not('status', 'in', '("delivered","cancelled")')
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const addPartner = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', formData.email.toLowerCase().trim())
        .maybeSingle();

      if (!profile) throw new Error('No user found with that email. They must sign up first with this email.');

      await supabase.from('user_roles').upsert({
        user_id: profile.user_id,
        role: 'delivery_partner' as any,
      }, { onConflict: 'user_id,role' } as any);

      const { error } = await supabase.from('delivery_partners').insert({
        user_id: profile.user_id,
        admin_id: user.id,
        name: formData.name,
        phone: formData.phone || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-partners'] });
      toast({ title: 'Delivery partner added' });
      setAddOpen(false);
      setFormData({ email: '', name: '', phone: '' });
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from('delivery_partners').update({ is_active: !isActive }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-partners'] });
      toast({ title: 'Partner status updated' });
    },
  });

  const deletePartner = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('delivery_partners').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-partners'] });
      toast({ title: 'Partner removed' });
      setDeleteConfirm({ open: false, id: null });
    },
  });

  const assignPartner = useMutation({
    mutationFn: async ({ orderId, partnerId }: { orderId: string; partnerId: string }) => {
      const { error } = await supabase.from('orders').update({ delivery_partner_id: partnerId } as any).eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unassigned-orders'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-orders'] });
      toast({ title: 'Order assigned to partner' });
    },
  });

  const activePartners = partners?.filter(p => p.is_active) || [];

  return (
    <AdminLayout title="Delivery Partners">
      <Tabs defaultValue="partners" className="space-y-4">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="partners">Partners ({partners?.length || 0})</TabsTrigger>
          <TabsTrigger value="assign">Assign Orders ({unassignedOrders?.length || 0})</TabsTrigger>
          <TabsTrigger value="active">Active Deliveries ({assignedOrders?.length || 0})</TabsTrigger>
        </TabsList>

        {/* Partners Tab */}
        <TabsContent value="partners" className="space-y-4">
          {/* How it works info */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-4">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-1 text-sm">
                  <p className="font-medium">How Delivery Partners Work</p>
                  <ol className="list-decimal list-inside space-y-0.5 text-muted-foreground text-xs">
                    <li>The person must <strong>sign up</strong> on the platform first with their email</li>
                    <li>Add them here using their registered email address</li>
                    <li>They log in with the <strong>same email & password</strong> they signed up with</li>
                    <li>They'll see a <strong>Delivery Dashboard</strong> with assigned orders</li>
                    <li>You assign orders to them from the "Assign Orders" tab</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{partners?.length || 0} partner(s)</p>
            <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1">
              <Plus className="h-4 w-4" /> Add Partner
            </Button>
          </div>

          {!partners?.length && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Truck className="h-12 w-12 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">No delivery partners yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add partners to assign deliveries to them</p>
            </div>
          )}

          {partners?.map(p => (
            <Card key={p.id}>
              <CardContent className="pt-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.phone || 'No phone'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={p.is_active ? 'default' : 'secondary'}>{p.is_active ? 'Active' : 'Inactive'}</Badge>
                  <Button size="sm" variant="outline" onClick={() => toggleActive.mutate({ id: p.id, isActive: p.is_active })}>
                    {p.is_active ? <UserX className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteConfirm({ open: true, id: p.id })}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Assign Orders Tab */}
        <TabsContent value="assign" className="space-y-3">
          {!unassignedOrders?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">No unassigned orders</p>
            </div>
          ) : unassignedOrders.map(order => (
            <div key={order.id} className="flex items-center justify-between rounded-lg border bg-card p-3 text-sm">
              <div>
                <p className="font-medium">#{order.order_number}</p>
                <p className="text-xs text-muted-foreground capitalize">{order.status} • ₹{Number(order.total).toLocaleString('en-IN')}</p>
              </div>
              <Select onValueChange={(partnerId) => assignPartner.mutate({ orderId: order.id, partnerId })}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Assign..." />
                </SelectTrigger>
                <SelectContent>
                  {activePartners.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                  {!activePartners.length && (
                    <div className="p-2 text-xs text-muted-foreground">No active partners</div>
                  )}
                </SelectContent>
              </Select>
            </div>
          ))}
        </TabsContent>

        {/* Active Deliveries Tab */}
        <TabsContent value="active" className="space-y-3">
          {!assignedOrders?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Truck className="h-12 w-12 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">No active deliveries</p>
            </div>
          ) : assignedOrders.map(order => {
            const partner = partners?.find(p => p.id === (order as any).delivery_partner_id);
            return (
              <div key={order.id} className="flex items-center justify-between rounded-lg border bg-card p-3 text-sm">
                <div>
                  <p className="font-medium">#{order.order_number}</p>
                  <p className="text-xs text-muted-foreground capitalize">{order.status} • ₹{Number(order.total).toLocaleString('en-IN')}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium">{partner?.name || 'Unknown'}</p>
                  <Badge variant="outline" className="text-xs capitalize">{order.status}</Badge>
                </div>
              </div>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* Add Partner Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Delivery Partner</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
              <p className="font-medium">Steps:</p>
              <p className="text-xs text-muted-foreground">1. Ask the person to sign up at your store URL</p>
              <p className="text-xs text-muted-foreground">2. Enter their registered email below</p>
              <p className="text-xs text-muted-foreground">3. They can then log in and see their delivery dashboard</p>
            </div>
            <div className="space-y-2">
              <Label>Email (registered account)</Label>
              <Input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="partner@email.com" />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            </div>
            <Button className="w-full" onClick={() => addPartner.mutate()} disabled={addPartner.isPending || !formData.email || !formData.name}>
              {addPartner.isPending ? 'Adding...' : 'Add Partner'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(o) => setDeleteConfirm({ open: o, id: o ? deleteConfirm.id : null })}
        title="Remove Partner?"
        description="This will remove the delivery partner from your store."
        confirmText="Remove"
        variant="destructive"
        onConfirm={() => deleteConfirm.id && deletePartner.mutate(deleteConfirm.id)}
        loading={deletePartner.isPending}
      />
    </AdminLayout>
  );
}
