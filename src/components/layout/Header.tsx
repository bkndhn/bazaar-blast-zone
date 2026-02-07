import { Bell, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card">
      <div className="flex h-nav-height items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <ShoppingBag className="h-7 w-7 text-primary" />
          <span className="text-lg font-bold text-foreground">Store</span>
        </Link>

        <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0">
          <Bell className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
