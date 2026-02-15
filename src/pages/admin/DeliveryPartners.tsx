import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Truck, Plus, Trash2, UserCheck, UserX } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export default function AdminDeliveryPartners() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [formData, setFormData] = useState({ email: '', name: '', phone: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; orderId: string | null }>({ open: false, orderId: null });

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

  const addPartner = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      // Look up user by email
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', formData.email.toLowerCase().trim())
        .maybeSingle();

      if (!profile) throw new Error('No user found with that email. They need to sign up first.');

      // Add delivery_partner role
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
      toast({ title: 'Order assigned to partner' });
      setAssignDialog({ open: false, orderId: null });
    },
  });

  return (
    <AdminLayout title="Delivery Partners">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{partners?.length || 0} partner(s)</p>
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" /> Add Partner
          </Button>
        </div>

        {/* Partners list */}
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

        {/* Unassigned Orders */}
        {unassignedOrders && unassignedOrders.length > 0 && (
          <>
            <h3 className="font-semibold mt-6">Unassigned Orders ({unassignedOrders.length})</h3>
            {unassignedOrders.map(order => (
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
                    {partners?.filter(p => p.is_active).map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Add Partner Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Delivery Partner</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">The person must have an account on the platform first.</p>
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
