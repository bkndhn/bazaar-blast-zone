import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, ShieldCheck, Search, Clock } from 'lucide-react';
import { SuperAdminLayout } from '@/components/layout/SuperAdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface UserWithRoles {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  last_login: string | null;
  roles: string[];
  isAdmin: boolean;
}

export default function SuperAdminUsers() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [promoteDialog, setPromoteDialog] = useState<{ open: boolean; user: UserWithRoles | null }>({
    open: false,
    user: null,
  });
  const [storeName, setStoreName] = useState('');

  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      // First get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;
      if (!profiles?.length) return [];

      // Get all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Get admin accounts to check who's already an admin
      const { data: adminAccounts, error: adminError } = await supabase
        .from('admin_accounts')
        .select('user_id');

      if (adminError) throw adminError;

      const adminUserIds = new Set(adminAccounts?.map(a => a.user_id));
      const rolesMap = new Map<string, string[]>();
      
      roles?.forEach(r => {
        const existing = rolesMap.get(r.user_id) || [];
        existing.push(r.role);
        rolesMap.set(r.user_id, existing);
      });

      return profiles.map(user => ({
        ...user,
        roles: rolesMap.get(user.user_id) || [],
        isAdmin: adminUserIds.has(user.user_id),
      })) as UserWithRoles[];
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('users-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => refetch()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_roles' },
        () => refetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const filteredUsers = users?.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const promoteToAdmin = useMutation({
    mutationFn: async ({ userId, storeName }: { userId: string; storeName: string }) => {
      // Add admin role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' });
      
      if (roleError && !roleError.message.includes('duplicate')) throw roleError;

      // Create admin account (paused by default)
      const { error: accountError } = await supabase
        .from('admin_accounts')
        .insert({ 
          user_id: userId, 
          store_name: storeName,
          status: 'paused' // New admins are paused by default
        });
      
      if (accountError) throw accountError;

      // Create store (inactive by default)
      const { error: storeError } = await supabase
        .from('stores')
        .insert({
          admin_id: userId,
          name: storeName,
          is_active: false,
        });

      if (storeError) throw storeError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      queryClient.invalidateQueries({ queryKey: ['all-admins'] });
      queryClient.invalidateQueries({ queryKey: ['all-stores'] });
      toast({ 
        title: 'User promoted to Admin',
        description: 'They are now paused. Activate them from the Admins page.'
      });
      setPromoteDialog({ open: false, user: null });
      setStoreName('');
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handlePromote = () => {
    if (!promoteDialog.user || !storeName.trim()) {
      toast({ title: 'Please enter a store name', variant: 'destructive' });
      return;
    }
    promoteToAdmin.mutate({ 
      userId: promoteDialog.user.user_id, 
      storeName: storeName.trim() 
    });
  };

  return (
    <SuperAdminLayout title="Manage Users">
      <div className="mb-4 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {users?.length || 0} users
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : !filteredUsers?.length ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-medium">No users found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{user.full_name || 'Anonymous'}</h3>
                    {user.roles.includes('super_admin') && (
                      <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                        Super Admin
                      </span>
                    )}
                    {user.roles.includes('admin') && (
                      <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-medium">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Joined: {format(new Date(user.created_at), 'MMM d, yyyy')}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Last login: {user.last_login 
                        ? format(new Date(user.last_login), 'MMM d, HH:mm')
                        : 'Never'}
                    </span>
                  </div>
                </div>

                <div>
                  {!user.isAdmin && !user.roles.includes('super_admin') && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => setPromoteDialog({ open: true, user })}
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Promote to Admin
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Promote Dialog */}
      <Dialog 
        open={promoteDialog.open} 
        onOpenChange={(open) => {
          setPromoteDialog({ ...promoteDialog, open });
          if (!open) setStoreName('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promote to Admin</DialogTitle>
            <DialogDescription>
              Make "{promoteDialog.user?.full_name || promoteDialog.user?.email}" a store admin.
              They'll be able to manage products, orders, and their own store.
              <br /><br />
              <strong>Note:</strong> New admins are paused by default. You can activate them from the Admins page.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="storeName">Store Name *</Label>
              <Input
                id="storeName"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Enter store name"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setPromoteDialog({ open: false, user: null })}
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePromote}
              disabled={promoteToAdmin.isPending || !storeName.trim()}
            >
              {promoteToAdmin.isPending ? 'Promoting...' : 'Promote to Admin'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
}
