import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { BannerCarousel } from '@/components/home/BannerCarousel';
import { CategoryScroll } from '@/components/home/CategoryScroll';
import { HomeSearch } from '@/components/home/HomeSearch';
import { useProducts } from '@/hooks/useProducts';
import { useAllCategories } from '@/hooks/useCategories';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { Store, ShoppingBag, UserPlus, LogIn, ArrowRight, Search, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Index = () => {
  const { adminId, isStoreRoute } = useStore();
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [storeSlug, setStoreSlug] = useState('');

  const { data: products, isLoading } = useProducts({ adminId: adminId ?? undefined });
  const { data: categories } = useAllCategories(adminId ?? undefined);

  const handleGoToStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (storeSlug.trim()) {
      // Clean the slug - remove leading /s/ if user typed it
      const cleanSlug = storeSlug.trim().replace(/^\/s\//, '').replace(/^s\//, '');
      navigate(`/s/${cleanSlug}`);
    }
  };

  // If not on a store route and no admin context, show welcome/store finder
  if (!isStoreRoute && !adminId) {
    return (
      <MainLayout showHeader={false}>
        <div className="flex flex-col min-h-[80vh] px-4 py-8">
          {/* Hero Section */}
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Store className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Welcome to Bazaar</h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
              Multi-vendor marketplace. Shop from trusted sellers or become one!
            </p>
          </div>

          <div className="space-y-4 max-w-md mx-auto w-full">
            {/* Go to Store - Main Action */}
            <Card className="border-primary">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  Visit a Store
                </CardTitle>
                <CardDescription>
                  Enter a store name to start shopping
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGoToStore} className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      placeholder="e.g. greensquare-organic"
                      value={storeSlug}
                      onChange={(e) => setStoreSlug(e.target.value)}
                      className="pl-3"
                    />
                  </div>
                  <Button type="submit" disabled={!storeSlug.trim()}>
                    <Search className="h-4 w-4 mr-1" />
                    Go
                  </Button>
                </form>
                <p className="mt-2 text-xs text-muted-foreground">
                  Ask your seller for their store name
                </p>
              </CardContent>
            </Card>

            {/* For Sellers */}
            {!user ? (
              <>
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

                {/* Login */}
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
              </>
            ) : (
              // User is logged in - show dashboard access
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <LayoutDashboard className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Welcome back!</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[150px]">{user.email}</p>
                      </div>
                    </div>
                    <Button size="sm" asChild>
                      <Link to={isSuperAdmin ? '/super-admin' : isAdmin ? '/admin' : '/account'}>
                        {isSuperAdmin ? 'Super Admin' : isAdmin ? 'Dashboard' : 'My Account'}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
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
