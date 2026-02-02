import { MainLayout } from '@/components/layout/MainLayout';
import { ProductGrid } from '@/components/product/ProductGrid';
import { useProducts } from '@/hooks/useProducts';

export default function Products() {
  const { data: products, isLoading } = useProducts();

  return (
    <MainLayout>
      <div className="p-4">
        <h1 className="mb-4 text-xl font-semibold">All Products</h1>
        <ProductGrid 
          products={products} 
          loading={isLoading}
          emptyMessage="No products available yet. Check back soon!"
        />
      </div>
    </MainLayout>
  );
}
