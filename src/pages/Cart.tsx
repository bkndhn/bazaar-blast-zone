import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useCart, useUpdateCartItem, useRemoveFromCart } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

export default function Cart() {
  const { user } = useAuth();
  const { data: cart, isLoading } = useCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveFromCart();
  const navigate = useNavigate();

  if (!user) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-semibold">Your cart is waiting</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to view your cart and start shopping
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
          <h1 className="mb-4 text-xl font-semibold">My Cart</h1>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!cart?.length) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-semibold">Your cart is empty</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Start adding items to your cart
          </p>
          <Button asChild className="mt-6">
            <Link to="/">Continue Shopping</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  // Calculate price considering custom weights
  const getItemPrice = (item: typeof cart[number]) => {
    if (item.custom_weight && item.product) {
      const baseWeight = (item.product as any).unit_value || 1;
      const pricePerUnit = item.product.price / baseWeight;
      return Math.round(pricePerUnit * item.custom_weight) * item.quantity;
    }
    return (item.product?.price || 0) * item.quantity;
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + getItemPrice(item),
    0
  );

  return (
    <MainLayout showHeader={false}>
      {/* Custom Header */}
      <header className="sticky top-0 z-40 flex h-nav-height items-center gap-3 border-b border-border bg-card px-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">My Cart ({cart.length})</h1>
      </header>

      {/* Cart Items */}
      <div className="p-4">
        <div className="space-y-3">
          {cart.map((item) => {
            const image = item.product?.images?.find(img => img.is_primary)?.image_url
              || item.product?.images?.[0]?.image_url
              || '/placeholder.svg';

            return (
              <div
                key={item.id}
                className="flex gap-3 rounded-lg border border-border bg-card p-3"
              >
                {/* Image */}
                <Link to={`/product/${item.product_id}`} className="flex-shrink-0">
                  <img
                    src={image}
                    alt={item.product?.name}
                    className="h-20 w-20 rounded-md object-cover"
                  />
                </Link>

                {/* Details */}
                <div className="flex flex-1 flex-col">
                  <Link
                    to={`/product/${item.product_id}`}
                    className="line-clamp-2 text-sm font-medium hover:underline"
                  >
                    {item.product?.name}
                  </Link>
                  <span className="mt-0.5 text-xs text-muted-foreground">
                    {item.product?.store?.name}
                  </span>
                  {item.custom_weight && (
                    <span className="mt-0.5 text-xs font-medium text-primary">
                      {item.custom_weight} {item.custom_unit || (item.product as any)?.unit_label || 'g'}
                    </span>
                  )}

                  <div className="mt-auto flex items-center justify-between">
                    <span className="font-semibold">
                      ₹{getItemPrice(item).toLocaleString('en-IN')}
                    </span>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateItem.mutate({ 
                          itemId: item.id, 
                          quantity: item.quantity - 1 
                        })}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateItem.mutate({ 
                          itemId: item.id, 
                          quantity: item.quantity + 1 
                        })}
                        disabled={item.quantity >= (item.product?.stock_quantity || 0)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem.mutate(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Checkout Summary - Fixed at bottom */}
      <div className="fixed bottom-bottom-nav left-0 right-0 border-t border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-bold">₹{subtotal.toLocaleString('en-IN')}</p>
          </div>
          <Button className="px-8" asChild>
            <Link to="/checkout">Checkout</Link>
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
