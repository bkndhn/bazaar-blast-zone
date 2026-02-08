import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Store, Truck, Clock, Link as LinkIcon, Copy, Check } from 'lucide-react';
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

  const { data: adminSettings } = useQuery({
    queryKey: ['admin-settings', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('admin_settings')
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
    slug: '',
  });

  const [slugCopied, setSlugCopied] = useState(false);

  const [deliverySettings, setDeliverySettings] = useState({
    delivery_within_tamilnadu_days: 3,
    delivery_outside_tamilnadu_days: 7,
    shipping_cost_within_tamilnadu: 40,
    shipping_cost_outside_tamilnadu: 80,
  });

  // Update form when store data loads
  useEffect(() => {
    if (store) {
      setFormData({
        name: store.name || '',
        description: store.description || '',
        logo_url: store.logo_url || '',
        banner_url: store.banner_url || '',
        slug: (store as any).slug || '',
      });
    }
  }, [store]);

  // Update delivery settings when data loads
  useEffect(() => {
    if (adminSettings) {
      setDeliverySettings({
        delivery_within_tamilnadu_days: adminSettings.delivery_within_tamilnadu_days || 3,
        delivery_outside_tamilnadu_days: adminSettings.delivery_outside_tamilnadu_days || 7,
        shipping_cost_within_tamilnadu: adminSettings.shipping_cost_within_tamilnadu || 40,
        shipping_cost_outside_tamilnadu: adminSettings.shipping_cost_outside_tamilnadu || 80,
      });
    }
  }, [adminSettings]);

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
            slug: formData.slug || null,
          } as any)
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
            slug: formData.slug || null,
            is_active: false,
          } as any);
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

  const saveDeliverySettings = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('admin_settings')
        .upsert({
          admin_id: user.id,
          ...deliverySettings,
        }, { onConflict: 'admin_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      toast({ title: 'Delivery settings saved' });
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
        {/* Store Information */}
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

              {/* Store Slug / URL */}
              <div className="space-y-2">
                <Label htmlFor="slug">Store URL Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                  placeholder="my-store"
                />
                {formData.slug && (
                  <div className="flex items-center gap-2 rounded-md bg-muted p-2">
                    <LinkIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <code className="text-xs flex-1 truncate">
                      {window.location.origin}/s/{formData.slug}
                    </code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/s/${formData.slug}`);
                        setSlugCopied(true);
                        setTimeout(() => setSlugCopied(false), 2000);
                      }}
                    >
                      {slugCopied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Customers can visit your store at this unique URL. Only lowercase letters, numbers, and hyphens.
                </p>
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

        {/* Delivery Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Delivery Settings
            </CardTitle>
            <CardDescription>
              Configure estimated delivery times and shipping costs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveDeliverySettings.mutate();
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Within Tamil Nadu (days)
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    value={deliverySettings.delivery_within_tamilnadu_days}
                    onChange={(e) => setDeliverySettings({
                      ...deliverySettings,
                      delivery_within_tamilnadu_days: parseInt(e.target.value) || 3,
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Outside Tamil Nadu (days)
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    value={deliverySettings.delivery_outside_tamilnadu_days}
                    onChange={(e) => setDeliverySettings({
                      ...deliverySettings,
                      delivery_outside_tamilnadu_days: parseInt(e.target.value) || 7,
                    })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Shipping Cost - Tamil Nadu (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={deliverySettings.shipping_cost_within_tamilnadu}
                    onChange={(e) => setDeliverySettings({
                      ...deliverySettings,
                      shipping_cost_within_tamilnadu: parseFloat(e.target.value) || 0,
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Shipping Cost - Outside (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={deliverySettings.shipping_cost_outside_tamilnadu}
                    onChange={(e) => setDeliverySettings({
                      ...deliverySettings,
                      shipping_cost_outside_tamilnadu: parseFloat(e.target.value) || 0,
                    })}
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                These settings are used to calculate estimated delivery dates shown to customers.
              </p>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={saveDeliverySettings.isPending}
              >
                {saveDeliverySettings.isPending ? 'Saving...' : 'Save Delivery Settings'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
