import { useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { CategoryScroll } from '@/components/home/CategoryScroll';
import { HomeSearch } from '@/components/home/HomeSearch';
import { useProducts } from '@/hooks/useProducts';
import { useAllCategories } from '@/hooks/useCategories';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { Store, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const LAST_STORE_KEY = 'bazaar_last_store';

export default function Products() {
  const { adminId, isStoreRoute, storeSlug } = useStore();
  const { user, isAdmin, isSuperAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (storeSlug) localStorage.setItem(LAST_STORE_KEY, storeSlug);
  }, [storeSlug]);

  useEffect(() => {
    if (!authLoading && !isStoreRoute) {
      const lastStore = localStorage.getItem(LAST_STORE_KEY);
      if (user) {
        if (isSuperAdmin) { navigate('/super-admin'); return; }
        if (isAdmin) { navigate('/admin/products'); return; }
      }
      if (lastStore) { navigate(`/s/${lastStore}/products`); return; }
    }
  }, [user, isAdmin, isSuperAdmin, authLoading, isStoreRoute, navigate]);

  const { data: products, isLoading } = useProducts({ adminId: adminId ?? undefined });
  const { data: categories } = useAllCategories(adminId ?? undefined);

  // Fetch admin settings for free delivery info
  const { data: storeSettings } = useQuery({
    queryKey: ['store-settings-products', adminId],
    queryFn: async () => {
      if (!adminId) return null;
      const { data } = await supabase.from('admin_settings').select('*').eq('admin_id', adminId).maybeSingle();
      return data;
    },
    enabled: !!adminId,
  });

  const freeDeliveryAbove = (storeSettings as any)?.free_delivery_above || 0;

  if (authLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </MainLayout>
    );
  }

  if (!isStoreRoute && !adminId) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          <Store className="h-16 w-16 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-semibold">No Store Selected</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md">
            Please access a specific store to browse products.
          </p>
          <Button asChild className="mt-4">
            <Link to="/">Find a Store</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Free delivery banner */}
      {freeDeliveryAbove > 0 && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 text-center">
          <p className="text-xs font-medium text-primary flex items-center justify-center gap-1">
            <Truck className="h-3.5 w-3.5" />
            Free delivery on orders above ₹{freeDeliveryAbove.toLocaleString('en-IN')}!
          </p>
        </div>
      )}
      
      {/* Sticky category + search */}
      <div className="sticky top-[var(--nav-height,56px)] z-40 bg-background shadow-sm pb-1">
        <CategoryScroll adminId={adminId ?? undefined} />
        <HomeSearch products={products} categories={categories} isLoading={isLoading} adminId={adminId ?? undefined} searchOnly />
      </div>
      
      <div className="py-4 space-y-4">
        <h1 className="text-xl font-semibold px-4">All Products</h1>
        <HomeSearch products={products} categories={categories} isLoading={isLoading} adminId={adminId ?? undefined} gridOnly />
      </div>
    </MainLayout>
  );
}
