import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Store, Eye, EyeOff } from 'lucide-react';
import { SuperAdminLayout } from '@/components/layout/SuperAdminLayout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function SuperAdminStores() {
  const queryClient = useQueryClient();

  const { data: stores, isLoading } = useQuery({
    queryKey: ['all-stores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select(`
          *,
          admin:admin_accounts(status, store_name),
          products:products(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ storeId, isActive }: { storeId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('stores')
        .update({ is_active: isActive })
        .eq('id', storeId);
      if (error) throw error;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['all-stores'] });
      toast({ 
        title: isActive ? 'Store activated' : 'Store deactivated',
        description: isActive 
          ? 'The store is now visible to customers' 
          : 'The store is hidden from customers'
      });
    },
  });

  return (
    <SuperAdminLayout title="Manage Stores">
      <div className="mb-4">
        <p className="text-muted-foreground">
          {stores?.length || 0} registered store(s)
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : !stores?.length ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <Store className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-medium">No stores yet</p>
          <p className="mt-1 text-muted-foreground">
            Stores will appear here when admins create them
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {stores.map((store) => (
            <div
              key={store.id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-start gap-4">
                {/* Store Logo */}
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg bg-muted">
                  {store.logo_url ? (
                    <img
                      src={store.logo_url}
                      alt={store.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Store className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>

                {/* Store Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{store.name}</h3>
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      store.is_active
                        ? 'bg-success/20 text-success'
                        : 'bg-muted text-muted-foreground'
                    )}>
                      {store.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                    {store.description || 'No description'}
                  </p>
                  <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
                    <span>Products: {(store as any).products?.[0]?.count || 0}</span>
                    <span>Created: {new Date(store.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div>
                  <Button
                    size="sm"
                    variant={store.is_active ? 'outline' : 'default'}
                    className="gap-2"
                    onClick={() => toggleActive.mutate({ 
                      storeId: store.id, 
                      isActive: !store.is_active 
                    })}
                    disabled={toggleActive.isPending}
                  >
                    {store.is_active ? (
                      <>
                        <EyeOff className="h-4 w-4" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4" />
                        Activate
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </SuperAdminLayout>
  );
}
