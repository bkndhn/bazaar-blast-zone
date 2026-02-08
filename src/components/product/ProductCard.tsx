import { Heart, Star, ShoppingCart, Eye, Share2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToggleWishlist, useIsInWishlist } from '@/hooks/useWishlist';
import { useAddToCart, useCart } from '@/hooks/useCart';
import { useProductRating } from '@/hooks/useProductReviews';
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
  const { data: rating } = useProductRating(product.id);

  const primaryImage = product.images?.find(img => img.is_primary)?.image_url
    || product.images?.[0]?.image_url
    || '/placeholder.svg';

  const discount = product.compare_at_price
    ? Math.round((1 - product.price / product.compare_at_price) * 100)
    : 0;

  const isInCart = cart?.some(item => item.product_id === product.id);
  const isOutOfStock = product.stock_quantity === 0;
  const extendedProduct = product as any;

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
    addToCart.mutate(
      { productId: product.id, quantity: 1 },
      {
        onSuccess: () => {
          toast({ title: 'Added to cart!' });
        },
      }
    );
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Use published URL for sharing
    const publishedOrigin = 'https://bazaar-blast-zone.lovable.app';
    const productUrl = `${publishedOrigin}/product/${product.id}`;
    const shareText = `Check out ${product.name} at ₹${product.price.toLocaleString('en-IN')}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: product.name,
          text: shareText,
          url: productUrl,
        });
      } else {
        await navigator.clipboard.writeText(`${shareText} ${productUrl}`);
        toast({ title: 'Link copied to clipboard!' });
      }
    } catch (err) {
      // User cancelled share
    }
  };

  return (
    <Link
      to={`/product/${product.id}`}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-all hover:shadow-md h-full',
        className
      )}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        <img
          src={primaryImage}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {/* Top Actions */}
        <div className="absolute right-2 top-2 flex flex-col gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-8 w-8 rounded-full bg-card/80 backdrop-blur-sm transition-colors',
              isInWishlist && 'text-sale'
            )}
            onClick={handleWishlistClick}
          >
            <Heart className={cn('h-4 w-4', isInWishlist && 'fill-current')} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-card/80 backdrop-blur-sm"
            onClick={handleShare}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>

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

        {/* Rating - Dynamic from reviews */}
        <div className="mt-1 flex items-center gap-1">
          {rating && rating.count > 0 ? (
            <>
              <div className="flex items-center gap-0.5 rounded bg-success px-1.5 py-0.5">
                <span className="text-xs font-semibold text-success-foreground">
                  {rating.average}
                </span>
                <Star className="h-3 w-3 fill-success-foreground text-success-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">
                ({rating.count > 1000 ? `${(rating.count / 1000).toFixed(1)}k` : rating.count})
              </span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">No ratings yet</span>
          )}
          {!isOutOfStock && (
            <span className="ml-auto text-xs text-success">In Stock</span>
          )}
        </div>

        {/* Qty & Unit */}
        {extendedProduct.unit_value && (
          <p className="mt-1 text-xs text-muted-foreground">
            {extendedProduct.unit_value} {extendedProduct.unit_label || extendedProduct.unit_type}
          </p>
        )}

        {/* Price */}
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-base font-bold text-foreground">
            ₹{product.price.toLocaleString('en-IN')}
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
          className="mt-auto w-full gap-1 flex items-center justify-center"
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
