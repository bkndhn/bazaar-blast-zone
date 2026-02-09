import { useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { HomeSearch } from '@/components/home/HomeSearch';
import { useProducts } from '@/hooks/useProducts';
import { useAllCategories } from '@/hooks/useCategories';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';

const LAST_STORE_KEY = 'bazaar_last_store';

export default function Products() {
  const { adminId, isStoreRoute, storeSlug } = useStore();
  const { user, isAdmin, isSuperAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Save current store to localStorage when on a store route
  useEffect(() => {
    if (storeSlug) {
      localStorage.setItem(LAST_STORE_KEY, storeSlug);
    }
  }, [storeSlug]);

  // Redirect logic for non-store routes
  useEffect(() => {
    if (!authLoading && !isStoreRoute) {
      // Check for last store
      const lastStore = localStorage.getItem(LAST_STORE_KEY);

      if (user) {
        if (isSuperAdmin) {
          navigate('/super-admin');
          return;
        }
        if (isAdmin) {
          navigate('/admin/products');
          return;
        }
      }

      // Redirect to last store's products page if available
      if (lastStore) {
        navigate(`/s/${lastStore}/products`);
        return;
      }
    }
  }, [user, isAdmin, isSuperAdmin, authLoading, isStoreRoute, navigate]);

  const { data: products, isLoading } = useProducts({ adminId: adminId ?? undefined });
  const { data: categories } = useAllCategories(adminId ?? undefined);

  // Show loading while checking auth or redirecting
  if (authLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </MainLayout>
    );
  }

  // If not on store route and no admin context, show redirect message
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
      <div className="py-4 space-y-4">
        <h1 className="text-xl font-semibold px-4">All Products</h1>
        <HomeSearch products={products} categories={categories} isLoading={isLoading} />
      </div>
    </MainLayout>
  );
}
