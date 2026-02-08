import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  const { signOut, isAdmin, isSuperAdmin } = useAuth();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

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
