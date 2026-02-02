import { MainLayout } from '@/components/layout/MainLayout';
import { BannerCarousel } from '@/components/home/BannerCarousel';
import { CategoryScroll } from '@/components/home/CategoryScroll';
import { SectionHeader } from '@/components/home/SectionHeader';
import { ProductGrid } from '@/components/product/ProductGrid';
import { useProducts } from '@/hooks/useProducts';

const Index = () => {
  const { data: products, isLoading } = useProducts({ limit: 10 });

  return (
    <MainLayout>
      {/* Banner Carousel */}
      <BannerCarousel />

      {/* Categories */}
      <CategoryScroll />

      {/* Featured Products */}
      <section className="pb-6">
        <SectionHeader title="Featured Products" href="/products" />
        <div className="px-4">
          <ProductGrid products={products} loading={isLoading} />
        </div>
      </section>
    </MainLayout>
  );
};

export default Index;
