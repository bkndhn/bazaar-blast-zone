import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, UserCheck, UserX } from 'lucide-react';
import { SuperAdminLayout } from '@/components/layout/SuperAdminLayout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function SuperAdminAdmins() {
  const queryClient = useQueryClient();

  const { data: admins, isLoading } = useQuery({
    queryKey: ['all-admins'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_accounts')
        .select(`
          *,
          profile:profiles(full_name, email, phone)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: 'active' | 'paused' }) => {
      const { error } = await supabase
        .from('admin_accounts')
        .update({ status })
        .eq('user_id', userId);
      if (error) throw error;

      // Also update store is_active status
      await supabase
        .from('stores')
        .update({ is_active: status === 'active' })
        .eq('admin_id', userId);
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['all-admins'] });
      toast({ 
        title: status === 'active' ? 'Admin activated' : 'Admin paused',
        description: status === 'active' 
          ? 'The admin can now manage their store' 
          : 'The admin has been paused and cannot access their store'
      });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <SuperAdminLayout title="Manage Admins">
      <div className="mb-4">
        <p className="text-muted-foreground">
          {admins?.length || 0} registered admin(s)
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : !admins?.length ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-medium">No admins yet</p>
          <p className="mt-1 text-muted-foreground">
            Admins will appear here when they register
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {admins.map((admin) => (
            <div
              key={admin.id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{admin.store_name}</h3>
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      admin.status === 'active'
                        ? 'bg-success/20 text-success'
                        : 'bg-warning/20 text-warning'
                    )}>
                      {admin.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {(admin as any).profile?.email || 'No email'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {(admin as any).profile?.phone || 'No phone'}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Registered: {new Date(admin.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-2">
                  {admin.status === 'paused' ? (
                    <Button
                      size="sm"
                      className="gap-2 bg-success hover:bg-success/90"
                      onClick={() => updateStatus.mutate({ 
                        userId: admin.user_id, 
                        status: 'active' 
                      })}
                      disabled={updateStatus.isPending}
                    >
                      <UserCheck className="h-4 w-4" />
                      Activate
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-2"
                      onClick={() => updateStatus.mutate({ 
                        userId: admin.user_id, 
                        status: 'paused' 
                      })}
                      disabled={updateStatus.isPending}
                    >
                      <UserX className="h-4 w-4" />
                      Pause
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </SuperAdminLayout>
  );
}
