import { MainLayout } from '@/components/layout/MainLayout';
import { HomeSearch } from '@/components/home/HomeSearch';
import { useProducts } from '@/hooks/useProducts';
import { useAllCategories } from '@/hooks/useCategories';


export default function Products() {
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useAllCategories();

  return (
    <MainLayout>
      <div className="py-4 space-y-4">
        <h1 className="text-xl font-semibold px-4">All Products</h1>
        <HomeSearch products={products} categories={categories} isLoading={isLoading} />
      </div>
    </MainLayout>
  );
}
