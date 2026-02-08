import { MainLayout } from '@/components/layout/MainLayout';
import { BannerCarousel } from '@/components/home/BannerCarousel';
import { CategoryScroll } from '@/components/home/CategoryScroll';
import { HomeSearch } from '@/components/home/HomeSearch';
import { useProducts } from '@/hooks/useProducts';
import { useAllCategories } from '@/hooks/useCategories';
import { useStore } from '@/contexts/StoreContext';
import { Store, ShoppingBag, UserPlus, LogIn, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Index = () => {
  // Only show products if we have a specific admin context
  const { adminId, isStoreRoute, store } = useStore();

  const { data: products, isLoading } = useProducts({ adminId: adminId ?? undefined });
  const { data: categories } = useAllCategories(adminId ?? undefined);

  // If not on a store route and no admin context, show welcome/store finder
  if (!isStoreRoute && !adminId) {
    return (
      <MainLayout showHeader={false}>
        <div className="flex flex-col min-h-[80vh] px-4 py-8">
          {/* Hero Section */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Store className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Welcome to Bazaar</h1>
            <p className="mt-2 text-muted-foreground max-w-md mx-auto">
              Your multi-vendor marketplace. Shop from trusted sellers or become one!
            </p>
          </div>

          {/* How It Works */}
          <div className="space-y-4 max-w-md mx-auto w-full">
            {/* For Shoppers */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  For Shoppers
                </CardTitle>
                <CardDescription>
                  Access stores directly via their unique URL
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-muted p-3 font-mono text-sm">
                  yoursite.com<span className="text-primary font-semibold">/s/store-name</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Get the store URL from your seller to start shopping!
                </p>
              </CardContent>
            </Card>

            {/* For Sellers */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UserPlus className="h-5 w-5 text-success" />
                  Become a Seller
                </CardTitle>
                <CardDescription>
                  Create your online store in minutes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>✓ Free to sign up</li>
                  <li>✓ Add unlimited products</li>
                  <li>✓ Custom store branding</li>
                  <li>✓ Order management dashboard</li>
                </ul>
                <Button asChild className="w-full gap-2">
                  <Link to="/auth?mode=signup">
                    Sign Up as Seller
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Already a Seller */}
            <Card className="border-dashed">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LogIn className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">Already a seller?</span>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/auth">Login</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Footer Note */}
          <p className="text-center text-xs text-muted-foreground mt-8">
            Each store has its own products, categories, and branding.
          </p>
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
