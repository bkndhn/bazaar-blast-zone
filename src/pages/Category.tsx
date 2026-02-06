import { useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProductGrid } from '@/components/product/ProductGrid';
import { useProducts } from '@/hooks/useProducts';
import { useCategory } from '@/hooks/useCategories';
import { Skeleton } from '@/components/ui/skeleton';

export default function Category() {
  const { slug } = useParams<{ slug: string }>();
  const { data: category, isLoading: categoryLoading } = useCategory(slug || '');
  
  const { data: products, isLoading: productsLoading } = useProducts({ 
    categoryId: category?.id 
  });

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
