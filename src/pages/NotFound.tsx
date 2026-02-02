import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Home, ShoppingBag, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="relative mb-8">
        <ShoppingBag className="h-24 w-24 text-muted-foreground/30" />
        <AlertCircle className="absolute -bottom-2 -right-2 h-10 w-10 text-destructive" />
      </div>
      
      <h1 className="text-6xl font-bold text-foreground">404</h1>
      <p className="mt-4 text-xl font-medium text-foreground">Page Not Found</p>
      <p className="mt-2 text-center text-muted-foreground">
        The page you're looking for doesn't exist or has been moved.
      </p>
      
      <div className="mt-8 flex gap-3">
        <Button asChild>
          <Link to="/">
            <Home className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/products">
            Browse Products
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
