import { Link, useNavigate } from 'react-router-dom';
import { 
  User, 
  Package, 
  Heart, 
  MapPin, 
  CreditCard, 
  HelpCircle, 
  LogOut, 
  ChevronRight,
  Settings,
  Store,
  Shield
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const menuItems = [
  { icon: Package, label: 'My Orders', href: '/orders' },
  { icon: Heart, label: 'Wishlist', href: '/wishlist' },
  { icon: MapPin, label: 'Addresses', href: '/addresses' },
  { icon: CreditCard, label: 'Payment Methods', href: '/payments' },
  { icon: HelpCircle, label: 'Help & Support', href: '/support' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export default function Account() {
  const { user, signOut, isSuperAdmin, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
          <User className="h-16 w-16 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-semibold">Sign in to your account</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Access your orders, wishlist, and more
          </p>
          <Button asChild className="mt-6">
            <Link to="/auth">Sign In</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-4">
        {/* Profile Header */}
        <div className="flex items-center gap-4 rounded-lg bg-card p-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <User className="h-7 w-7 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold">{user.email}</h2>
            <p className="text-sm text-muted-foreground">
              {isSuperAdmin ? 'Super Admin' : isAdmin ? 'Store Admin' : 'Customer'}
            </p>
          </div>
          <Button variant="ghost" size="icon" asChild>
            <Link to="/profile/edit">
              <ChevronRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>

        {/* Admin/Super Admin Quick Access */}
        {(isSuperAdmin || isAdmin) && (
          <div className="mt-4 space-y-2">
            {isSuperAdmin && (
              <Link
                to="/super-admin"
                className="flex items-center gap-3 rounded-lg bg-primary/10 p-4 text-primary"
              >
                <Shield className="h-5 w-5" />
                <span className="flex-1 font-medium">Super Admin Dashboard</span>
                <ChevronRight className="h-5 w-5" />
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin"
                className="flex items-center gap-3 rounded-lg bg-accent/20 p-4 text-foreground"
              >
                <Store className="h-5 w-5" />
                <span className="flex-1 font-medium">Seller Dashboard</span>
                <ChevronRight className="h-5 w-5" />
              </Link>
            )}
          </div>
        )}

        {/* Menu Items */}
        <div className="mt-4 divide-y divide-border overflow-hidden rounded-lg bg-card">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/50"
              >
                <Icon className="h-5 w-5 text-muted-foreground" />
                <span className="flex-1">{item.label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            );
          })}
        </div>

        {/* Sign Out */}
        <Button
          variant="ghost"
          className="mt-4 w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </MainLayout>
  );
}
