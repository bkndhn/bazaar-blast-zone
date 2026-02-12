import { useState, useEffect, useMemo } from 'react';
import { Search, X, SlidersHorizontal, MapPin, Clock, Truck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Product } from '@/hooks/useProducts';
import { Category } from '@/hooks/useCategories';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface HomeSearchProps {
  products?: Product[];
  categories?: Category[];
  isLoading?: boolean;
  adminId?: string;
}

const isTamilNaduPincode = (pincode: string) => {
  const pin = parseInt(pincode);
  return pin >= 600000 && pin <= 643999;
};

export function HomeSearch({ products, categories, isLoading, adminId }: HomeSearchProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [filterOpen, setFilterOpen] = useState(false);
  const [pincode, setPincode] = useState('');
  const [pincodeChecked, setPincodeChecked] = useState(false);

  // Fetch admin settings for delivery estimation
  const { data: storeSettings } = useQuery({
    queryKey: ['store-delivery-settings', adminId],
    queryFn: async () => {
      if (!adminId) return null;
      const { data } = await supabase.from('admin_settings').select('delivery_within_tamilnadu_days, delivery_outside_tamilnadu_days, free_delivery_above').eq('admin_id', adminId).maybeSingle();
      return data;
    },
    enabled: !!adminId,
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    let result = products;

    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.category?.name?.toLowerCase().includes(q)
      );
    }

    if (selectedCategory !== 'all') {
      result = result.filter(p => p.category_id === selectedCategory);
    }

    switch (sortBy) {
      case 'price-low': return [...result].sort((a, b) => a.price - b.price);
      case 'price-high': return [...result].sort((a, b) => b.price - a.price);
      case 'name': return [...result].sort((a, b) => a.name.localeCompare(b.name));
      default: return [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  }, [products, debouncedQuery, selectedCategory, sortBy]);

  const hasActiveFilters = selectedCategory !== 'all' || sortBy !== 'newest';
  const isSearching = debouncedQuery.trim().length > 0 || hasActiveFilters;

  const isTN = pincode ? isTamilNaduPincode(pincode) : null;
  const deliveryDays = storeSettings && isTN !== null
    ? (isTN ? (storeSettings.delivery_within_tamilnadu_days || 3) : (storeSettings.delivery_outside_tamilnadu_days || 7))
    : null;

  const handlePincodeCheck = () => {
    if (pincode.length === 6) setPincodeChecked(true);
  };

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="flex gap-2 px-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search products, brands and more..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 w-full rounded-full border-muted bg-muted pl-10 pr-10 text-sm"
          />
          {query && (
            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2" onClick={() => setQuery('')}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10 flex-shrink-0 relative">
              <SlidersHorizontal className="h-4 w-4" />
              {hasActiveFilters && <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary" />}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[80vh]">
            <SheetHeader>
              <SheetTitle>Filters & Sort</SheetTitle>
            </SheetHeader>
            <div className="py-4 space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Sort By</Label>
                <RadioGroup value={sortBy} onValueChange={setSortBy}>
                  {[
                    { value: 'newest', label: 'Newest First' },
                    { value: 'price-low', label: 'Price: Low to High' },
                    { value: 'price-high', label: 'Price: High to Low' },
                    { value: 'name', label: 'Name: A to Z' },
                  ].map(opt => (
                    <div key={opt.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={opt.value} id={`sort-${opt.value}`} />
                      <Label htmlFor={`sort-${opt.value}`} className="font-normal">{opt.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {categories && categories.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Category</Label>
                  <RadioGroup value={selectedCategory} onValueChange={setSelectedCategory}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="all" id="cat-all" />
                      <Label htmlFor="cat-all" className="font-normal">All Categories</Label>
                    </div>
                    {categories.map((cat) => (
                      <div key={cat.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={cat.id} id={`cat-${cat.id}`} />
                        <Label htmlFor={`cat-${cat.id}`} className="font-normal">{cat.name}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => { setSelectedCategory('all'); setSortBy('newest'); }}>Clear All</Button>
                <Button className="flex-1" onClick={() => setFilterOpen(false)}>Apply</Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Pincode Delivery Check */}
      {adminId && storeSettings && (
        <div className="px-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Input
              type="text"
              placeholder="Enter pincode"
              maxLength={6}
              value={pincode}
              onChange={(e) => { setPincode(e.target.value.replace(/\D/g, '')); setPincodeChecked(false); }}
              className="h-8 w-28 text-xs"
            />
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handlePincodeCheck} disabled={pincode.length !== 6}>
              Check
            </Button>
            {pincodeChecked && deliveryDays !== null && (
              <span className="text-xs text-primary flex items-center gap-1">
                <Clock className="h-3 w-3" />
                ~{deliveryDays} days delivery
              </span>
            )}
          </div>
        </div>
      )}

      {/* Results info when searching */}
      {isSearching && (
        <p className="px-4 text-sm text-muted-foreground">
          {filteredProducts.length} results{debouncedQuery && ` for "${debouncedQuery}"`}
        </p>
      )}

      {/* Product Grid */}
      <div className="px-4">
        <ProductGrid
          products={isSearching ? filteredProducts : filteredProducts}
          loading={isLoading}
          emptyMessage={debouncedQuery ? `No products found for "${debouncedQuery}"` : 'No products found'}
        />
      </div>
    </div>
  );
}
