import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FolderTree, 
  Store,
  LogOut,
  ChevronLeft,
  Shield,
  UserCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const superAdminNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/super-admin' },
  { icon: Users, label: 'Admins', path: '/super-admin/admins' },
  { icon: UserCircle, label: 'Users', path: '/super-admin/users' },
  { icon: Store, label: 'Stores', path: '/super-admin/stores' },
  { icon: FolderTree, label: 'Categories', path: '/super-admin/categories' },
];

interface SuperAdminLayoutProps {
  children: ReactNode;
  title: string;
}

export function SuperAdminLayout({ children, title }: SuperAdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, isSuperAdmin } = useAuth();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  // Redirect if not super admin
  if (!isSuperAdmin) {
    navigate('/');
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-primary px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="text-primary-foreground hover:bg-primary-foreground/20">
            <Link to="/">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-2 text-primary-foreground">
            <Shield className="h-5 w-5" />
            <span className="font-semibold">Super Admin</span>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowSignOutConfirm(true)} 
          className="gap-2 text-primary-foreground hover:bg-primary-foreground/20"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </header>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden w-56 border-r border-border bg-card md:block">
          <nav className="flex flex-col gap-1 p-4">
            {superAdminNavItems.map((item) => {
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

      {/* Bottom Nav - Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border bg-card md:hidden">
        {superAdminNavItems.slice(0, 5).map((item) => {
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
