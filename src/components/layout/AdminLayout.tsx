import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Settings,
  LogOut,
  ChevronLeft,
  Store,
  Users,
  FolderOpen,
  Image,
  MessageCircle,
  HelpCircle,
  Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const adminNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Package, label: 'Products', path: '/admin/products' },
  { icon: FolderOpen, label: 'Categories', path: '/admin/categories' },
  { icon: Image, label: 'Banners', path: '/admin/banners' },
  { icon: ShoppingCart, label: 'Orders', path: '/admin/orders' },
  { icon: Users, label: 'CRM', path: '/admin/crm' },
  { icon: MessageCircle, label: 'Tickets', path: '/admin/support' },
  { icon: HelpCircle, label: 'Help/FAQ', path: '/admin/support-settings' },
  { icon: Settings, label: 'Settings', path: '/admin/settings' },
];

// Show only first 5 in bottom nav on mobile, rest in sidebar
const mobileBottomNavItems = adminNavItems.slice(0, 5);
const mobileMoreItems = adminNavItems.slice(5);

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isAdmin, isSuperAdmin } = useAuth();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // Fetch admin's theme settings
  const { data: adminSettings } = useQuery({
    queryKey: ['admin-settings-theme', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('admin_settings')
        .select('theme_color_hsl')
        .eq('admin_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Apply theme to admin layout
  useEffect(() => {
    const root = document.documentElement;
    const themeColor = adminSettings?.theme_color_hsl;

    if (themeColor) {
      root.style.setProperty('--primary', themeColor);
      root.style.setProperty('--ring', themeColor);

      // Update status bar meta tag
      const hexColor = hslToHex(themeColor);
      let metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.setAttribute('name', 'theme-color');
        document.head.appendChild(metaThemeColor);
      }
      metaThemeColor.setAttribute('content', hexColor);
    }

    return () => {
      // Reset on unmount (leaving admin area)
      root.style.setProperty('--primary', '217 91% 60%');
      root.style.setProperty('--ring', '217 91% 60%');
    };
  }, [adminSettings?.theme_color_hsl]);

  // Helper to convert HSL to Hex for meta tag
  function hslToHex(hsl: string): string {
    try {
      const parts = hsl.match(/[\d.]+/g);
      if (!parts || parts.length < 3) return '#3b82f6';

      let h = parseFloat(parts[0]);
      let s = parseFloat(parts[1]) / 100;
      let l = parseFloat(parts[2]) / 100;

      const c = (1 - Math.abs(2 * l - 1)) * s;
      const x = c * (1 - Math.abs((h / 60) % 2 - 1));
      const m = l - c / 2;
      let r = 0, g = 0, b = 0;

      if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
      else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
      else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
      else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
      else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
      else { r = c; g = 0; b = x; }

      const toHex = (n: number) => {
        const hex = Math.round((n + m) * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      };

      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    } catch {
      return '#3b82f6';
    }
  }

  // Redirect if not admin (super admins should use super-admin routes)
  if (!isAdmin) {
    navigate(isSuperAdmin ? '/super-admin' : '/');
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <span className="font-semibold">Seller Dashboard</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSignOutConfirm(true)}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </header>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden w-56 border-r border-border bg-card md:block">
          <nav className="flex flex-col gap-1 p-4">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {/* Page Header */}
          <div className="border-b border-border bg-card px-4 py-4 md:px-6">
            <h1 className="text-xl font-semibold">{title}</h1>
          </div>

          {/* Content */}
          <div className="p-4 pb-20 md:p-6 md:pb-6">
            {children}
          </div>
        </main>
      </div>

      {/* Bottom Nav - Mobile (5 items + More) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border bg-card md:hidden">
        {mobileBottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center gap-1 px-2 py-2',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
        {/* More button with sheet */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button className={cn(
              'flex flex-col items-center gap-1 px-2 py-2',
              mobileMoreItems.some(i => location.pathname === i.path) ? 'text-primary' : 'text-muted-foreground'
            )}>
              <Menu className="h-5 w-5" />
              <span className="text-[10px] font-medium">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
            <nav className="flex flex-col gap-1 pt-2">
              {mobileMoreItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
      </nav>

      <ConfirmDialog
        open={showSignOutConfirm}
        onOpenChange={setShowSignOutConfirm}
        title="Sign Out?"
        description="Are you sure you want to sign out of your account?"
        confirmText="Sign Out"
        variant="destructive"
        onConfirm={handleSignOut}
      />
    </div>
  );
}
