import { MainLayout } from '@/components/layout/MainLayout';
import { CreditCard } from 'lucide-react';

export default function Payments() {
  return (
    <MainLayout>
      <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
        <CreditCard className="h-16 w-16 text-muted-foreground/50" />
        <h2 className="mt-4 text-lg font-semibold">Payment Methods</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Payment methods management coming soon
        </p>
      </div>
    </MainLayout>
  );
}
