import { Home, ShoppingBag, ShoppingCart, Heart, User } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';

const baseNavItems = [
  { icon: Home, label: 'Home', basePath: '/' },
  { icon: ShoppingBag, label: 'Products', basePath: '/products' },
  { icon: ShoppingCart, label: 'Cart', basePath: '/cart', badge: true },
  { icon: Heart, label: 'Wishlist', basePath: '/wishlist' },
  { icon: User, label: 'Account', basePath: '/account' },
];

export function BottomNav() {
  const location = useLocation();
  const { storeSlug } = useParams<{ storeSlug?: string }>();
  const { data: cart } = useCart();
  const { user } = useAuth();
  const cartCount = cart?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  // Check if we're on a store route
  const isStoreRoute = location.pathname.startsWith('/s/');

  // Extract store slug from path if we're on a store route
  const currentStoreSlug = storeSlug || (isStoreRoute ? location.pathname.split('/')[2] : null);

  // Generate paths with store prefix if on a store route
  const getPath = (basePath: string) => {
    if (currentStoreSlug) {
      // For home, link to store front
      if (basePath === '/') {
        return `/s/${currentStoreSlug}`;
      }
      return `/s/${currentStoreSlug}${basePath}`;
    }
    return basePath;
  };

  // Check if current path matches nav item
  const isActive = (basePath: string) => {
    const fullPath = getPath(basePath);
    if (basePath === '/' || basePath === '') {
      // Home is active if on store root or main root
      return location.pathname === fullPath || location.pathname === '/';
    }
    return location.pathname === fullPath || location.pathname.startsWith(fullPath + '/');
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card">
      <div className="flex h-bottom-nav items-center justify-around">
        {baseNavItems.map((item) => {
          const active = isActive(item.basePath);
          const Icon = item.icon;
          const path = getPath(item.basePath);

          return (
            <Link
              key={item.basePath}
              to={path}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {item.badge && user && cartCount > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-sale px-1 text-[10px] font-semibold text-sale-foreground">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
