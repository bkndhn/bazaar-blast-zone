import { useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProductGrid } from '@/components/product/ProductGrid';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';

export default function Category() {
  const { slug } = useParams<{ slug: string }>();
  const { data: categories } = useCategories();
  const category = categories?.find(c => c.slug === slug);
  
  const { data: products, isLoading } = useProducts({ 
    categoryId: category?.id 
  });

  return (
    <MainLayout>
      <div className="p-4">
        <h1 className="mb-4 text-xl font-semibold">
          {category?.name || 'Category'}
        </h1>
        <ProductGrid 
          products={products} 
          loading={isLoading}
          emptyMessage={`No products found in ${category?.name || 'this category'}`}
        />
      </div>
    </MainLayout>
  );
}
