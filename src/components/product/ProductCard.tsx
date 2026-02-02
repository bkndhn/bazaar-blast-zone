import { Heart, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToggleWishlist, useIsInWishlist } from '@/hooks/useWishlist';
import { Product } from '@/hooks/useProducts';

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const { user } = useAuth();
  const toggleWishlist = useToggleWishlist();
  const isInWishlist = useIsInWishlist(product.id);
  
  const primaryImage = product.images?.find(img => img.is_primary)?.image_url 
    || product.images?.[0]?.image_url
    || '/placeholder.svg';
  
  const discount = product.compare_at_price 
    ? Math.round((1 - product.price / product.compare_at_price) * 100) 
    : 0;

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (user) {
      toggleWishlist.mutate(product.id);
    }
  };

  return (
    <Link 
      to={`/product/${product.id}`}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md',
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
        {user && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'absolute right-2 top-2 h-8 w-8 rounded-full bg-card/80 backdrop-blur-sm',
              isInWishlist && 'text-sale'
            )}
            onClick={handleWishlistClick}
          >
            <Heart className={cn('h-4 w-4', isInWishlist && 'fill-current')} />
          </Button>
        )}

        {/* Discount Badge */}
        {discount > 0 && (
          <span className="absolute left-2 top-2 rounded bg-sale px-2 py-0.5 text-xs font-semibold text-sale-foreground">
            {discount}% OFF
          </span>
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

        {/* Rating (placeholder) */}
        <div className="mt-1 flex items-center gap-1">
          <div className="flex items-center gap-0.5 rounded bg-success px-1.5 py-0.5">
            <span className="text-xs font-semibold text-success-foreground">4.2</span>
            <Star className="h-3 w-3 fill-success-foreground text-success-foreground" />
          </div>
          <span className="text-xs text-muted-foreground">(1.2k)</span>
        </div>

        {/* Price */}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-base font-bold text-foreground">
            ₹{product.price.toLocaleString('en-IN')}
          </span>
          {product.compare_at_price && (
            <span className="text-sm text-muted-foreground line-through">
              ₹{product.compare_at_price.toLocaleString('en-IN')}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
