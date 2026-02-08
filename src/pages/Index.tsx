import { MainLayout } from '@/components/layout/MainLayout';
import { BannerCarousel } from '@/components/home/BannerCarousel';
import { CategoryScroll } from '@/components/home/CategoryScroll';
import { HomeSearch } from '@/components/home/HomeSearch';
import { useProducts } from '@/hooks/useProducts';
import { useAllCategories } from '@/hooks/useCategories';
import { useStore } from '@/contexts/StoreContext';
import { Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Index = () => {
  // Only show products if we have a specific admin context
  const { adminId, isStoreRoute, store } = useStore();

  const { data: products, isLoading } = useProducts({ adminId: adminId ?? undefined });
  const { data: categories } = useAllCategories(adminId ?? undefined);

  // If not on a store route and no admin context, show store finder/landing
  if (!isStoreRoute && !adminId) {
    return (
      <MainLayout showHeader={false}>
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
          <Store className="h-20 w-20 text-primary mb-4" />
          <h1 className="text-2xl font-bold">Welcome to Bazaar</h1>
          <p className="mt-2 text-muted-foreground max-w-md">
            Discover amazing products from trusted sellers. Enter your store URL to start shopping.
          </p>
          <div className="mt-6 text-sm text-muted-foreground">
            <p>Access stores via: <code className="bg-muted px-2 py-1 rounded">/s/store-slug</code></p>
          </div>
          <Button asChild className="mt-4">
            <Link to="/auth">Seller Login</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showHeader={false}>
      {/* Banner Carousel */}
      <BannerCarousel adminId={adminId ?? undefined} />

      {/* Categories */}
      <CategoryScroll adminId={adminId ?? undefined} />

      {/* Search + All Products */}
      <section className="pb-6">
        <HomeSearch products={products} categories={categories} isLoading={isLoading} />
      </section>
    </MainLayout>
  );
};

export default Index;
