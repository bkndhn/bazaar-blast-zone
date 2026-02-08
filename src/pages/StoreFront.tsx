import { MainLayout } from '@/components/layout/MainLayout';
import { BannerCarousel } from '@/components/home/BannerCarousel';
import { CategoryScroll } from '@/components/home/CategoryScroll';
import { HomeSearch } from '@/components/home/HomeSearch';
import { useProducts } from '@/hooks/useProducts';
import { useAllCategories } from '@/hooks/useCategories';
import { useStore } from '@/contexts/StoreContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Store } from 'lucide-react';
import { Link } from 'react-router-dom';

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
      {/* Store Header */}
      {store && (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center gap-3">
            {store.logo_url ? (
              <img
                src={store.logo_url}
                alt={store.name}
                className="h-8 w-8 rounded-full object-cover border"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Store className="h-4 w-4 text-primary" />
              </div>
            )}
            <span className="font-semibold text-lg truncate">{store.name}</span>
          </div>
        </header>
      )}

      <BannerCarousel adminId={adminId ?? undefined} />
      <CategoryScroll adminId={adminId ?? undefined} />
      <section className="pb-6">
        <HomeSearch products={products} categories={categories} isLoading={productsLoading} />
      </section>

      {/* Store Footer Links */}
      <section className="py-6 border-t text-center">
        <Link
          to={`/terms?adminId=${adminId}`}
          className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1"
        >
          <iframe style={{ display: 'none' }} />
          Terms & Conditions
        </Link>
      </section>
    </MainLayout>
  );
}
