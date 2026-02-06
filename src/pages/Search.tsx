import { useState, useEffect, useMemo } from 'react';
import { Search as SearchIcon, X, SlidersHorizontal } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProductGrid } from '@/components/product/ProductGrid';
import { useProducts } from '@/hooks/useProducts';
import { useAllCategories } from '@/hooks/useCategories';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';

export default function Search() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [filterOpen, setFilterOpen] = useState(false);
  
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useAllCategories();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    if (!products) return [];

    let result = products;

    // Filter by search query
    if (debouncedQuery.trim()) {
      const searchLower = debouncedQuery.toLowerCase();
      result = result.filter(product => 
        product.name.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower) ||
        product.category?.name?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter(product => product.category_id === selectedCategory);
    }

    // Sort
    switch (sortBy) {
      case 'price-low':
        result = [...result].sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        result = [...result].sort((a, b) => b.price - a.price);
        break;
      case 'name':
        result = [...result].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'newest':
      default:
        result = [...result].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
    }

    return result;
  }, [products, debouncedQuery, selectedCategory, sortBy]);

  const hasActiveFilters = selectedCategory !== 'all' || sortBy !== 'newest';

  return (
    <MainLayout showHeader={false}>
      {/* Search Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card px-4 py-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
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
          
          {/* Filter Button */}
          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-10 w-10 flex-shrink-0 relative"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary" />
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto max-h-[80vh]">
              <SheetHeader>
                <SheetTitle>Filters & Sort</SheetTitle>
              </SheetHeader>
              
              <div className="py-4 space-y-6">
                {/* Sort By */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Sort By</Label>
                  <RadioGroup value={sortBy} onValueChange={setSortBy}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="newest" id="newest" />
                      <Label htmlFor="newest" className="font-normal">Newest First</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="price-low" id="price-low" />
                      <Label htmlFor="price-low" className="font-normal">Price: Low to High</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="price-high" id="price-high" />
                      <Label htmlFor="price-high" className="font-normal">Price: High to Low</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="name" id="name" />
                      <Label htmlFor="name" className="font-normal">Name: A to Z</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Category Filter */}
                {categories && categories.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Category</Label>
                    <RadioGroup value={selectedCategory} onValueChange={setSelectedCategory}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all" id="all-cat" />
                        <Label htmlFor="all-cat" className="font-normal">All Categories</Label>
                      </div>
                      {categories.map((cat) => (
                        <div key={cat.id} className="flex items-center space-x-2">
                          <RadioGroupItem value={cat.id} id={cat.id} />
                          <Label htmlFor={cat.id} className="font-normal">{cat.name}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}

                {/* Clear & Apply */}
                <div className="flex gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      setSelectedCategory('all');
                      setSortBy('newest');
                    }}
                  >
                    Clear All
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={() => setFilterOpen(false)}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="p-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : !debouncedQuery.trim() && !hasActiveFilters ? (
          <div className="py-12 text-center">
            <SearchIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">
              Search for products, brands and more
            </p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              {filteredProducts?.length || 0} results
              {debouncedQuery && ` for "${debouncedQuery}"`}
            </p>
            <ProductGrid 
              products={filteredProducts} 
              loading={isLoading}
              emptyMessage={
                debouncedQuery 
                  ? `No products found for "${debouncedQuery}"` 
                  : 'No products found'
              }
            />
          </>
        )}
      </div>
    </MainLayout>
  );
}
