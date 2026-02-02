import { Link } from 'react-router-dom';
import { Heart, ShoppingCart } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useWishlist, useToggleWishlist } from '@/hooks/useWishlist';
import { useAddToCart } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

export default function Wishlist() {
  const { user } = useAuth();
  const { data: wishlist, isLoading } = useWishlist();
  const toggleWishlist = useToggleWishlist();
  const addToCart = useAddToCart();

  if (!user) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
          <Heart className="h-16 w-16 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-semibold">Save your favorites</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to save items to your wishlist
          </p>
          <Button asChild className="mt-6">
            <Link to="/auth">Sign In</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-4">
          <h1 className="mb-4 text-xl font-semibold">My Wishlist</h1>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!wishlist?.length) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
          <Heart className="h-16 w-16 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-semibold">Your wishlist is empty</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Save items you love for later
          </p>
          <Button asChild className="mt-6">
            <Link to="/">Explore Products</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-4">
        <h1 className="mb-4 text-xl font-semibold">My Wishlist ({wishlist.length})</h1>

        <div className="grid grid-cols-2 gap-3">
          {wishlist.map((item) => {
            const image = item.product?.images?.find(img => img.is_primary)?.image_url
              || item.product?.images?.[0]?.image_url
              || '/placeholder.svg';

            return (
              <div
                key={item.id}
                className="relative overflow-hidden rounded-lg border border-border bg-card"
              >
                {/* Remove button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 z-10 h-8 w-8 rounded-full bg-card/80 text-sale backdrop-blur-sm"
                  onClick={() => toggleWishlist.mutate(item.product_id)}
                >
                  <Heart className="h-4 w-4 fill-current" />
                </Button>

                <Link to={`/product/${item.product_id}`}>
                  <div className="aspect-square overflow-hidden bg-muted">
                    <img
                      src={image}
                      alt={item.product?.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-3">
                    <span className="text-[10px] text-muted-foreground">
                      {item.product?.store?.name}
                    </span>
                    <h3 className="mt-1 line-clamp-2 text-sm font-medium">
                      {item.product?.name}
                    </h3>
                    <p className="mt-2 font-semibold">
                      ₹{item.product?.price?.toLocaleString('en-IN')}
                    </p>
                  </div>
                </Link>

                <div className="border-t border-border p-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => addToCart.mutate({ productId: item.product_id })}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Add to Cart
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}
