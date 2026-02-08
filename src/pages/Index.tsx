import { MainLayout } from '@/components/layout/MainLayout';
import { BannerCarousel } from '@/components/home/BannerCarousel';
import { CategoryScroll } from '@/components/home/CategoryScroll';
import { HomeSearch } from '@/components/home/HomeSearch';
import { useProducts } from '@/hooks/useProducts';
import { useAllCategories } from '@/hooks/useCategories';

const Index = () => {
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useAllCategories();

  return (
    <MainLayout showHeader={false}>
      {/* Banner Carousel */}
      <BannerCarousel />

      {/* Categories */}
      <CategoryScroll />

      {/* Search + All Products */}
      <section className="pb-6">
        <HomeSearch products={products} categories={categories} isLoading={isLoading} />
      </section>
    </MainLayout>
  );
};

export default Index;
