import { useState } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProductGrid } from '@/components/product/ProductGrid';
import { useProducts } from '@/hooks/useProducts';

export default function Search() {
  const [query, setQuery] = useState('');
  const { data: products, isLoading } = useProducts();

  // Filter products based on search query (client-side for now)
  const filteredProducts = query.trim()
    ? products?.filter(product => 
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        product.description?.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <MainLayout showHeader={false}>
      {/* Search Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card px-4 py-3">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search for products, brands and more..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 w-full rounded-full pl-10 pr-10"
            autoFocus
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
              onClick={() => setQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </header>

      <div className="p-4">
        {!query.trim() ? (
          <div className="py-12 text-center">
            <SearchIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">
              Search for products, brands and more
            </p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              {filteredProducts?.length || 0} results for "{query}"
            </p>
            <ProductGrid 
              products={filteredProducts} 
              loading={isLoading}
              emptyMessage={`No products found for "${query}"`}
            />
          </>
        )}
      </div>
    </MainLayout>
  );
}
