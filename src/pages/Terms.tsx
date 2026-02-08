import { useQuery } from '@tanstack/react-query';
import { FileText, ArrowLeft } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Terms() {
    // Logic to determine WHICH admin's terms to show.
    // For now, if we are in a store context (via slug elsewhere) we might check that.
    // Or, we list the terms of the "primary" store if it's a single-vendor app feel.
    // Since we don't have a global "current store" context easily accessible here without a slug,
    // we will fetch the terms of the *first* admin found OR all admins if multiple.
    // Ideally, this should be context-aware. 
    // Given user request "each admin isolated", let's try to fetch terms for the admin 
    // associated with the products the user is viewing, but here we are in Account page.

    // Let's fetch ALL admins' terms for now and list them if multiple, or just show if one.
    // A better approach for "Bazaar" is to show the terms of the platform OR require user to select store.

    // Assuming single-store usage for most end-customers:
    const { data: termsList, isLoading } = useQuery({
        queryKey: ['terms-conditions'],
        queryFn: async () => {
            // Fetch settings that have terms defined
            const { data, error } = await supabase
                .from('admin_settings')
                .select(`
          terms_conditions,
          admin_id,
          stores:stores(name)
        `)
                .not('terms_conditions', 'is', null)
                .neq('terms_conditions', '');

            if (error) throw error;
            return data;
        },
    });

    return (
        <MainLayout>
            <div className="container max-w-4xl py-8">
                <Button variant="ghost" className="mb-6 gap-2" asChild>
                    <Link to="/account">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Account
                    </Link>
                </Button>

                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-primary" />
                        <h1 className="text-3xl font-bold">Terms & Conditions</h1>
                    </div>

                    {isLoading ? (
                        <div className="space-y-4">
                            <div className="h-40 animate-pulse rounded-lg bg-muted" />
                        </div>
                    ) : termsList && termsList.length > 0 ? (
                        <div className="grid gap-6">
                            {termsList.map((item: any, index: number) => (
                                <Card key={item.admin_id || index}>
                                    <CardHeader>
                                        <CardTitle>{item.stores?.name || 'Store'} Policy</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="prose max-w-none whitespace-pre-wrap text-muted-foreground">
                                            {item.terms_conditions}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                            No terms and conditions found.
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
