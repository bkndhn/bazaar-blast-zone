import { Heart, Star, ShoppingCart, Eye } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToggleWishlist, useIsInWishlist } from '@/hooks/useWishlist';
import { useAddToCart, useCart } from '@/hooks/useCart';
import { Product } from '@/hooks/useProducts';
import { toast } from '@/hooks/use-toast';

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toggleWishlist = useToggleWishlist();
  const isInWishlist = useIsInWishlist(product.id);
  const addToCart = useAddToCart();
  const { data: cart } = useCart();
  
  const primaryImage = product.images?.find(img => img.is_primary)?.image_url 
    || product.images?.[0]?.image_url
    || '/placeholder.svg';
  
  const discount = product.compare_at_price 
    ? Math.round((1 - product.price / product.compare_at_price) * 100) 
    : 0;

  const isInCart = cart?.some(item => item.product_id === product.id);
  const isOutOfStock = product.stock_quantity === 0;

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (user) {
      toggleWishlist.mutate(product.id);
    } else {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to add items to wishlist',
      });
      navigate('/auth');
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to add items to cart',
      });
      navigate('/auth');
      return;
    }
    if (isInCart) {
      navigate('/cart');
      return;
    }
    addToCart.mutate({ productId: product.id, quantity: 1 });
  };

  return (
    <Link 
      to={`/product/${product.id}`}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-all hover:shadow-md',
        className
      )}
    >
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={primaryImage}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        
        {/* Wishlist Button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'absolute right-2 top-2 h-8 w-8 rounded-full bg-card/80 backdrop-blur-sm transition-colors',
            isInWishlist && 'text-sale'
          )}
          onClick={handleWishlistClick}
        >
          <Heart className={cn('h-4 w-4', isInWishlist && 'fill-current')} />
        </Button>

        {/* Discount Badge */}
        {discount > 0 && (
          <span className="absolute left-2 top-2 rounded bg-sale px-2 py-0.5 text-xs font-semibold text-sale-foreground">
            {discount}% OFF
          </span>
        )}

        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <span className="rounded bg-destructive px-2 py-1 text-xs font-semibold text-destructive-foreground">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="flex flex-1 flex-col p-3">
        {/* Store Name */}
        {product.store?.name && (
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {product.store.name}
          </span>
        )}

        {/* Product Name */}
        <h3 className="mt-1 line-clamp-2 text-sm font-medium text-foreground">
          {product.name}
        </h3>

        {/* Rating */}
        <div className="mt-1 flex items-center gap-1">
          <div className="flex items-center gap-0.5 rounded bg-success px-1.5 py-0.5">
            <span className="text-xs font-semibold text-success-foreground">4.2</span>
            <Star className="h-3 w-3 fill-success-foreground text-success-foreground" />
          </div>
          <span className="text-xs text-muted-foreground">(1.2k)</span>
          {!isOutOfStock && (
            <span className="ml-auto text-xs text-success">In Stock</span>
          )}
        </div>

        {/* Price */}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-base font-bold text-foreground">
            ₹{product.price.toLocaleString('en-IN')}
            {(product as any).unit_label && (
              <span className="text-xs font-normal text-muted-foreground">
                /{(product as any).unit_label}
              </span>
            )}
          </span>
          {product.compare_at_price && (
            <span className="text-sm text-muted-foreground line-through">
              ₹{product.compare_at_price.toLocaleString('en-IN')}
            </span>
          )}
        </div>

        {/* Quick Add to Cart */}
        <Button
          variant={isInCart ? "secondary" : "default"}
          size="sm"
          className="mt-2 w-full gap-1"
          onClick={handleAddToCart}
          disabled={isOutOfStock || addToCart.isPending}
        >
          {isInCart ? (
            <>
              <Eye className="h-3.5 w-3.5" />
              View Cart
            </>
          ) : (
            <>
              <ShoppingCart className="h-3.5 w-3.5" />
              Add to Cart
            </>
          )}
        </Button>
      </div>
    </Link>
  );
}
