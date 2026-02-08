import { MainLayout } from '@/components/layout/MainLayout';
import { BannerCarousel } from '@/components/home/BannerCarousel';
import { CategoryScroll } from '@/components/home/CategoryScroll';
import { HomeSearch } from '@/components/home/HomeSearch';
import { useProducts } from '@/hooks/useProducts';
import { useAllCategories } from '@/hooks/useCategories';
import { useStore } from '@/contexts/StoreContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Store } from 'lucide-react';

export default function StoreFront() {
  const { store, adminId, isLoading: storeLoading } = useStore();
  const { data: products, isLoading: productsLoading } = useProducts({ adminId: adminId ?? undefined });
  const { data: categories } = useAllCategories(adminId ?? undefined);

  if (storeLoading) {
    return (
      <MainLayout showHeader={false}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Skeleton className="h-8 w-48" />
        </div>
      </MainLayout>
    );
  }

  if (!store) {
    return (
      <MainLayout showHeader={false}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          <Store className="h-16 w-16 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-semibold">Store Not Found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This store doesn't exist or is currently unavailable.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showHeader={false}>
      <BannerCarousel adminId={adminId ?? undefined} />
      <CategoryScroll adminId={adminId ?? undefined} />
      <section className="pb-6">
        <HomeSearch products={products} categories={categories} isLoading={productsLoading} />
      </section>
    </MainLayout>
  );
}
