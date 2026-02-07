import { useState } from 'react';
import { Search, Bell, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function Header() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    } else {
      navigate('/search');
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card">
      <div className="flex h-nav-height items-center gap-3 px-4">
        <Link to="/" className="flex-shrink-0">
          <ShoppingBag className="h-7 w-7 text-primary" />
        </Link>

        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search products..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClick={() => navigate('/search')}
            className="h-9 w-full rounded-full border-muted bg-muted pl-9 text-sm placeholder:text-muted-foreground"
          />
        </form>

        <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0">
          <Bell className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
