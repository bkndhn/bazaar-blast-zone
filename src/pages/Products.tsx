import { MainLayout } from '@/components/layout/MainLayout';
import { HomeSearch } from '@/components/home/HomeSearch';
import { useProducts } from '@/hooks/useProducts';
import { useAllCategories } from '@/hooks/useCategories';
import { useStore } from '@/contexts/StoreContext';
import { Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function Products() {
  // Get adminId from StoreContext if available
  const { adminId, isStoreRoute } = useStore();

  const { data: products, isLoading } = useProducts({ adminId: adminId ?? undefined });
  const { data: categories } = useAllCategories(adminId ?? undefined);

  // If not on a store route and no admin context, show store finder
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
            <Link to="/">Go Home</Link>
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
