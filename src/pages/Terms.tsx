import { useQuery } from '@tanstack/react-query';
import { FileText, ArrowLeft } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStore } from '@/contexts/StoreContext';

export default function Terms() {
  const [searchParams] = useSearchParams();
  const adminIdParam = searchParams.get('adminId');
  const { adminId: storeAdminId } = useStore();
  
  // Use store context admin ID if available, otherwise fall back to URL param
  const targetAdminId = storeAdminId || adminIdParam;

  const { data: termsList, isLoading } = useQuery({
    queryKey: ['terms-conditions', targetAdminId],
    queryFn: async () => {
      let query = supabase
        .from('admin_settings')
        .select('terms_conditions, admin_id')
        .not('terms_conditions', 'is', null)
        .neq('terms_conditions', '');

      if (targetAdminId) {
        query = query.eq('admin_id', targetAdminId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      if (!data?.length) return [];

      // Fetch store names separately
      const adminIds = data.map(d => d.admin_id);
      const { data: stores } = await supabase
        .from('stores')
        .select('admin_id, name')
        .in('admin_id', adminIds);
      
      return data.map(item => ({
        ...item,
        store_name: stores?.find(s => s.admin_id === item.admin_id)?.name || 'Store',
      }));
    },
  });

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Button variant="ghost" className="mb-4 gap-2" asChild>
          <Link to="/account">
            <ArrowLeft className="h-4 w-4" />
            Back to Account
          </Link>
        </Button>

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Terms & Conditions</h1>
          </div>

          {isLoading ? (
            <div className="h-40 animate-pulse rounded-lg bg-muted" />
          ) : termsList && termsList.length > 0 ? (
            <div className="grid gap-6">
              {termsList.map((item: any, index: number) => (
                <Card key={item.admin_id || index}>
                  <CardHeader>
                    <CardTitle>{item.store_name} Policy</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose max-w-none whitespace-pre-wrap text-foreground/80 text-sm leading-relaxed">
                      {item.terms_conditions}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              No terms and conditions available.
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
