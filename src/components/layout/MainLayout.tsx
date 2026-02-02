import { ReactNode } from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';

interface MainLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showBottomNav?: boolean;
}

export function MainLayout({ 
  children, 
  showHeader = true, 
  showBottomNav = true 
}: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {showHeader && <Header />}
      <main className={showBottomNav ? 'mb-bottom-nav' : ''}>
        {children}
      </main>
      {showBottomNav && <BottomNav />}
    </div>
  );
}
