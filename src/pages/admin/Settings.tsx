import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Store } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/ui/image-upload';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useImageUpload } from '@/hooks/useImageUpload';
import { toast } from '@/hooks/use-toast';

export default function AdminSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { upload: uploadLogo, uploading: uploadingLogo } = useImageUpload({ bucket: 'store-assets', folder: 'logos' });
  const { upload: uploadBanner, uploading: uploadingBanner } = useImageUpload({ bucket: 'store-assets', folder: 'banners' });

  const { data: store, isLoading } = useQuery({
    queryKey: ['admin-store', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('stores')
        .select('*')
        .eq('admin_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logo_url: '',
    banner_url: '',
  });

  // Update form when store data loads
  useEffect(() => {
    if (store) {
      setFormData({
        name: store.name || '',
        description: store.description || '',
        logo_url: store.logo_url || '',
        banner_url: store.banner_url || '',
      });
    }
  }, [store]);

  const saveStore = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      if (store) {
        // Update existing store
        const { error } = await supabase
          .from('stores')
          .update({
            name: formData.name,
            description: formData.description,
            logo_url: formData.logo_url || null,
            banner_url: formData.banner_url || null,
          })
          .eq('id', store.id);
        if (error) throw error;
      } else {
        // Create new store
        const { error } = await supabase
          .from('stores')
          .insert({
            admin_id: user.id,
            name: formData.name,
            description: formData.description,
            logo_url: formData.logo_url || null,
            banner_url: formData.banner_url || null,
            is_active: false, // Will be activated by super admin
          });
        if (error) throw error;

        // Also create admin_accounts entry if not exists
        await supabase
          .from('admin_accounts')
          .upsert({
            user_id: user.id,
            store_name: formData.name,
            status: 'paused',
          }, { onConflict: 'user_id' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-store'] });
      toast({ title: store ? 'Store updated' : 'Store created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleLogoUpload = async (file: File) => {
    const url = await uploadLogo(file);
    if (url) {
      setFormData({ ...formData, logo_url: url });
    }
    return url;
  };

  const handleBannerUpload = async (file: File) => {
    const url = await uploadBanner(file);
    if (url) {
      setFormData({ ...formData, banner_url: url });
    }
    return url;
  };

  if (isLoading) {
    return (
      <AdminLayout title="Settings">
        <div className="animate-pulse space-y-4">
          <div className="h-40 rounded-lg bg-muted" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Settings">
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Store Information
            </CardTitle>
            <CardDescription>
              {store 
                ? 'Update your store details' 
                : 'Set up your store to start selling'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveStore.mutate();
              }}
              className="space-y-4"
            >
              {/* Logo Upload */}
              <div className="space-y-2">
                <Label>Store Logo</Label>
                <ImageUpload
                  value={formData.logo_url}
                  onChange={(url) => setFormData({ ...formData, logo_url: url })}
                  onUpload={handleLogoUpload}
                  uploading={uploadingLogo}
                  aspectRatio="square"
                  className="max-w-[200px]"
                />
              </div>

              {/* Banner Upload */}
              <div className="space-y-2">
                <Label>Store Banner</Label>
                <ImageUpload
                  value={formData.banner_url}
                  onChange={(url) => setFormData({ ...formData, banner_url: url })}
                  onUpload={handleBannerUpload}
                  uploading={uploadingBanner}
                  aspectRatio="banner"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Store Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Awesome Store"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Tell customers about your store..."
                  rows={3}
                />
              </div>

              {store && (
                <div className="rounded-lg bg-muted p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Store Status</p>
                      <p className="text-sm text-muted-foreground">
                        {store.is_active 
                          ? 'Your store is active and visible to customers' 
                          : 'Your store is pending approval from Super Admin'}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-sm font-medium ${
                      store.is_active 
                        ? 'bg-success/20 text-success' 
                        : 'bg-warning/20 text-warning'
                    }`}>
                      {store.is_active ? 'Active' : 'Pending'}
                    </span>
                  </div>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={saveStore.isPending || uploadingLogo || uploadingBanner}
              >
                {saveStore.isPending 
                  ? 'Saving...' 
                  : store ? 'Update Store' : 'Create Store'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
