import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Heart, Share2, ShoppingCart, Star, Minus, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProduct } from '@/hooks/useProducts';
import { useAddToCart } from '@/hooks/useCart';
import { useToggleWishlist, useIsInWishlist } from '@/hooks/useWishlist';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading } = useProduct(id!);
  const { user } = useAuth();
  const addToCart = useAddToCart();
  const toggleWishlist = useToggleWishlist();
  const isInWishlist = useIsInWishlist(id!);
  
  const [quantity, setQuantity] = useState(1);
  const [currentImage, setCurrentImage] = useState(0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="flex h-nav-height items-center gap-3 px-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-6 flex-1" />
        </header>
        <Skeleton className="aspect-square w-full" />
        <div className="p-4 space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <h1 className="text-lg font-semibold">Product not found</h1>
        <Button asChild className="mt-4">
          <Link to="/">Go Home</Link>
        </Button>
      </div>
    );
  }

  const images = product.images?.sort((a, b) => {
    if (a.is_primary) return -1;
    if (b.is_primary) return 1;
    return a.sort_order - b.sort_order;
  }) || [];
  
  const currentImageUrl = images[currentImage]?.image_url || '/placeholder.svg';
  const discount = product.compare_at_price 
    ? Math.round((1 - product.price / product.compare_at_price) * 100) 
    : 0;

  const nextImage = () => {
    setCurrentImage((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImage((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 flex h-nav-height items-center justify-between bg-card/80 px-4 backdrop-blur-sm">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon">
            <Share2 className="h-5 w-5" />
          </Button>
          {user && (
            <Button 
              variant="ghost" 
              size="icon"
              className={cn(isInWishlist && 'text-sale')}
              onClick={() => toggleWishlist.mutate(product.id)}
            >
              <Heart className={cn('h-5 w-5', isInWishlist && 'fill-current')} />
            </Button>
          )}
        </div>
      </header>

      {/* Image Gallery */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={currentImageUrl}
          alt={product.name}
          className="h-full w-full object-contain"
        />
        
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full bg-card/80 backdrop-blur-sm"
              onClick={prevImage}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full bg-card/80 backdrop-blur-sm"
              onClick={nextImage}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>

            {/* Image Dots */}
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImage(index)}
                  className={cn(
                    'h-2 rounded-full transition-all',
                    index === currentImage ? 'w-4 bg-primary' : 'w-2 bg-muted-foreground/50'
                  )}
                />
              ))}
            </div>
          </>
        )}

        {/* Discount Badge */}
        {discount > 0 && (
          <span className="absolute left-4 top-4 rounded bg-sale px-2 py-1 text-sm font-semibold text-sale-foreground">
            {discount}% OFF
          </span>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4">
        {/* Store Name */}
        {product.store && (
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {product.store.name}
          </span>
        )}

        {/* Product Name */}
        <h1 className="mt-1 text-xl font-semibold">{product.name}</h1>

        {/* Rating */}
        <div className="mt-2 flex items-center gap-2">
          <div className="flex items-center gap-1 rounded bg-success px-2 py-0.5">
            <span className="text-sm font-semibold text-success-foreground">4.2</span>
            <Star className="h-3.5 w-3.5 fill-success-foreground text-success-foreground" />
          </div>
          <span className="text-sm text-muted-foreground">1,234 Ratings</span>
        </div>

        {/* Price */}
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-2xl font-bold">
            ₹{product.price.toLocaleString('en-IN')}
          </span>
          {product.compare_at_price && (
            <>
              <span className="text-lg text-muted-foreground line-through">
                ₹{product.compare_at_price.toLocaleString('en-IN')}
              </span>
              <span className="text-sm font-medium text-success">
                {discount}% off
              </span>
            </>
          )}
        </div>

        {/* Stock Status */}
        <div className="mt-3">
          {product.stock_quantity > 0 ? (
            <span className="text-sm text-success">In Stock</span>
          ) : (
            <span className="text-sm text-destructive">Out of Stock</span>
          )}
        </div>

        {/* Quantity Selector */}
        <div className="mt-4 flex items-center gap-4">
          <span className="text-sm font-medium">Quantity:</span>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-8 text-center font-medium">{quantity}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setQuantity(quantity + 1)}
              disabled={quantity >= product.stock_quantity}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Description
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">
              {product.description}
            </p>
          </div>
        )}
      </div>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 flex gap-3 border-t border-border bg-card p-4">
        <Button
          variant="outline"
          className="flex-1 gap-2"
          disabled={product.stock_quantity === 0}
          onClick={() => addToCart.mutate({ productId: product.id, quantity })}
        >
          <ShoppingCart className="h-4 w-4" />
          Add to Cart
        </Button>
        <Button 
          className="flex-1"
          disabled={product.stock_quantity === 0}
        >
          Buy Now
        </Button>
      </div>
    </div>
  );
}
