import { useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProductGrid } from '@/components/product/ProductGrid';
import { useProducts } from '@/hooks/useProducts';
import { useCategory } from '@/hooks/useCategories';
import { useStore } from '@/contexts/StoreContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function Category() {
  const { slug } = useParams<{ slug: string }>();
  const { adminId, isStoreRoute } = useStore();

  const { data: category, isLoading: categoryLoading } = useCategory(slug || '');

  // Filter products by both category AND adminId for proper isolation
  const { data: products, isLoading: productsLoading } = useProducts({
    categoryId: category?.id,
    adminId: adminId ?? undefined
  });

  // If not on a store route and no admin context, show store finder
  if (!isStoreRoute && !adminId) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          <Store className="h-16 w-16 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-semibold">No Store Selected</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md">
            Please access a specific store to browse categories.
          </p>
          <Button asChild className="mt-4">
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  if (categoryLoading) {
    return (
      <MainLayout>
        <div className="p-4">
          <Skeleton className="h-8 w-48 mb-4" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-4">
        {/* Category Header with image */}
        {category?.image_url && (
          <div className="relative mb-4 h-32 rounded-lg overflow-hidden">
            <img
              src={category.image_url}
              alt={category.name}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <h1 className="absolute bottom-4 left-4 text-2xl font-bold text-white">
              {category?.name || 'Category'}
            </h1>
          </div>
        )}

        {!category?.image_url && (
          <h1 className="mb-4 text-xl font-semibold">
            {category?.name || 'Category'}
          </h1>
        )}

        <ProductGrid
          products={products}
          loading={productsLoading}
          emptyMessage={`No products found in ${category?.name || 'this category'}`}
        />
      </div>
    </MainLayout>
  );
}
