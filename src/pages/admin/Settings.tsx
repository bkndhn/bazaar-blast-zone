import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Store, Truck, Clock, Link as LinkIcon, Copy, Check, CreditCard, FileText, UtensilsCrossed, ShoppingBag, MapPin } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/ui/image-upload';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useImageUpload } from '@/hooks/useImageUpload';
import { compressImage } from '@/lib/imageCompression';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
    razorpay_key_id: '',
    razorpay_key_secret: '',
    is_payment_enabled: false,
    phonepe_merchant_id: '',
    phonepe_salt_key: '',
    phonepe_salt_index: '1',
    phonepe_enabled: false,
    cod_enabled: true,
    online_payment_enabled: false,
    shiprocket_email: '',
    shiprocket_password: '',
    is_shipping_integration_enabled: false,
    terms_conditions: '',
    theme_color_hsl: '217 91% 60%',
    shop_type: 'general',
    self_pickup_enabled: false,
    cutting_charges: 0,
    extra_delivery_charges: 0,
    service_area_enabled: false,
    service_area_lat: 0,
    service_area_lng: 0,
    service_area_radius_km: 10,
  });

  // Helper to convert Hex to HSL (approximate)
  const hexToHsl = (hex: string) => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
      r = parseInt("0x" + hex[1] + hex[1]);
      g = parseInt("0x" + hex[2] + hex[2]);
      b = parseInt("0x" + hex[3] + hex[3]);
    } else if (hex.length === 7) {
      r = parseInt("0x" + hex[1] + hex[2]);
      g = parseInt("0x" + hex[3] + hex[4]);
      b = parseInt("0x" + hex[5] + hex[6]);
    }
    r /= 255; g /= 255; b /= 255;
    const cmin = Math.min(r, g, b), cmax = Math.max(r, g, b), delta = cmax - cmin;
    let h = 0, s = 0, l = 0;
    if (delta === 0) h = 0;
    else if (cmax === r) h = ((g - b) / delta) % 6;
    else if (cmax === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
    l = (cmax + cmin) / 2;
    s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);
    return `${h} ${s}% ${l}%`;
  };

  // Helper to convert HSL to Hex (for input value)
  const hslToHex = (hsl: string): string => {
    try {
      const parts = hsl.match(/[\d.]+/g);
      if (!parts || parts.length < 3) return '#3b82f6'; // Default blue

      let h = parseFloat(parts[0]);
      let s = parseFloat(parts[1]) / 100;
      let l = parseFloat(parts[2]) / 100;

      const c = (1 - Math.abs(2 * l - 1)) * s;
      const x = c * (1 - Math.abs((h / 60) % 2 - 1));
      const m = l - c / 2;
      let r = 0, g = 0, b = 0;

      if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
      else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
      else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
      else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
      else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
      else { r = c; g = 0; b = x; }

      const toHex = (n: number) => {
        const hex = Math.round((n + m) * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      };

      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    } catch {
      return '#3b82f6';
    }
  };


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
        razorpay_key_id: adminSettings.razorpay_key_id || '',
        razorpay_key_secret: adminSettings.razorpay_key_secret || '',
        is_payment_enabled: adminSettings.is_payment_enabled || false,
        phonepe_merchant_id: adminSettings.phonepe_merchant_id || '',
        phonepe_salt_key: (adminSettings as any).phonepe_salt_key || '',
        phonepe_salt_index: (adminSettings as any).phonepe_salt_index || '1',
        phonepe_enabled: (adminSettings as any).phonepe_enabled || false,
        cod_enabled: adminSettings.cod_enabled ?? true,
        online_payment_enabled: adminSettings.online_payment_enabled ?? false,
        shiprocket_email: adminSettings.shiprocket_email || '',
        shiprocket_password: adminSettings.shiprocket_password || '',
        is_shipping_integration_enabled: adminSettings.is_shipping_integration_enabled || false,
        terms_conditions: adminSettings.terms_conditions || '',
        theme_color_hsl: (adminSettings as any).theme_color_hsl || '217 91% 60%',
        shop_type: (adminSettings as any).shop_type || 'general',
        self_pickup_enabled: (adminSettings as any).self_pickup_enabled || false,
        cutting_charges: (adminSettings as any).cutting_charges || 0,
        extra_delivery_charges: (adminSettings as any).extra_delivery_charges || 0,
        service_area_enabled: (adminSettings as any).service_area_enabled || false,
        service_area_lat: (adminSettings as any).service_area_lat || 0,
        service_area_lng: (adminSettings as any).service_area_lng || 0,
        service_area_radius_km: (adminSettings as any).service_area_radius_km || 10,
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

      // Separate delivery and payment settings if needed, but here we save all to admin_settings
      const { error } = await supabase
        .from('admin_settings')
        .upsert({
          admin_id: user.id,
          delivery_within_tamilnadu_days: deliverySettings.delivery_within_tamilnadu_days,
          delivery_outside_tamilnadu_days: deliverySettings.delivery_outside_tamilnadu_days,
          shipping_cost_within_tamilnadu: deliverySettings.shipping_cost_within_tamilnadu,
          shipping_cost_outside_tamilnadu: deliverySettings.shipping_cost_outside_tamilnadu,
          razorpay_key_id: deliverySettings.razorpay_key_id,
          razorpay_key_secret: deliverySettings.razorpay_key_secret,
          is_payment_enabled: deliverySettings.is_payment_enabled,
          phonepe_merchant_id: deliverySettings.phonepe_merchant_id,
          phonepe_salt_key: deliverySettings.phonepe_salt_key,
          phonepe_salt_index: deliverySettings.phonepe_salt_index,
          phonepe_enabled: deliverySettings.phonepe_enabled,
          cod_enabled: deliverySettings.cod_enabled,
          online_payment_enabled: deliverySettings.online_payment_enabled,
          shiprocket_email: deliverySettings.shiprocket_email,
          shiprocket_password: deliverySettings.shiprocket_password,
          is_shipping_integration_enabled: deliverySettings.is_shipping_integration_enabled,
          terms_conditions: deliverySettings.terms_conditions,
          theme_color_hsl: deliverySettings.theme_color_hsl,
          shop_type: deliverySettings.shop_type,
          self_pickup_enabled: deliverySettings.self_pickup_enabled,
          cutting_charges: deliverySettings.cutting_charges,
          extra_delivery_charges: deliverySettings.extra_delivery_charges,
          service_area_enabled: deliverySettings.service_area_enabled,
          service_area_lat: deliverySettings.service_area_lat,
          service_area_lng: deliverySettings.service_area_lng,
          service_area_radius_km: deliverySettings.service_area_radius_km,
        } as any, { onConflict: 'admin_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      toast({ title: 'Settings saved successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });


  const handleLogoUpload = async (file: File) => {
    try {
      const compressedFile = await compressImage(file, 0.1); // Max 0.1 MB = 100KB
      const url = await uploadLogo(compressedFile);
      if (url) {
        setFormData({ ...formData, logo_url: url });
      }
      return url;
    } catch (error) {
      console.error('Compression failed:', error);
      toast({ title: 'Image compression failed', variant: 'destructive' });
      return null;
    }
  };

  const handleBannerUpload = async (file: File) => {
    try {
      const compressedFile = await compressImage(file, 0.1); // Max 0.1 MB = 100KB
      const url = await uploadBanner(compressedFile);
      if (url) {
        setFormData({ ...formData, banner_url: url });
      }
      return url;
    } catch (error) {
      console.error('Compression failed:', error);
      toast({ title: 'Image compression failed', variant: 'destructive' });
      return null;
    }
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

        {/* Shop Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Shop Type
            </CardTitle>
            <CardDescription>
              Choose your business type to customize the order flow for your customers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); saveDeliverySettings.mutate(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'general', label: 'General Store', desc: 'E-commerce, retail, clothing etc.', icon: ShoppingBag },
                  { value: 'food', label: 'Food / Restaurant', desc: 'Meat shop, hotel, fish shop etc.', icon: UtensilsCrossed },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = deliverySettings.shop_type === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDeliverySettings({ ...deliverySettings, shop_type: opt.value })}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors text-center',
                        isSelected ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'
                      )}
                    >
                      <Icon className={cn('h-6 w-6', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                      <span className={cn('text-sm font-medium', isSelected ? 'text-primary' : 'text-muted-foreground')}>{opt.label}</span>
                      <span className="text-xs text-muted-foreground">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">Self Pickup</Label>
                    <p className="text-sm text-muted-foreground">Allow customers to pick up orders themselves</p>
                  </div>
                  <Switch
                    checked={deliverySettings.self_pickup_enabled}
                    onCheckedChange={(checked) => setDeliverySettings({ ...deliverySettings, self_pickup_enabled: checked })}
                  />
                </div>

                {deliverySettings.shop_type === 'food' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Cutting / Processing Charges (₹)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={deliverySettings.cutting_charges}
                          onChange={(e) => setDeliverySettings({ ...deliverySettings, cutting_charges: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Extra Delivery Charges (₹)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={deliverySettings.extra_delivery_charges}
                          onChange={(e) => setDeliverySettings({ ...deliverySettings, extra_delivery_charges: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      These charges will be applied per order for food/meat shop orders.
                    </p>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={saveDeliverySettings.isPending}>
                {saveDeliverySettings.isPending ? 'Saving...' : 'Save Shop Settings'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Style & Theme */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full border shadow-sm" style={{ background: `hsl(${deliverySettings.theme_color_hsl})` }} />
              Store Appearance
            </CardTitle>
            <CardDescription>
              Customize your store's primary brand color.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Primary Brand Color</Label>
                <div className="flex flex-wrap gap-3">
                  {/* Presets */}
                  {[
                    { name: 'Default Blue', val: '217 91% 60%', hex: '#3b82f6' },
                    { name: 'Emerald', val: '142 76% 36%', hex: '#10b981' },
                    { name: 'Violet', val: '262 83% 58%', hex: '#8b5cf6' },
                    { name: 'Rose', val: '343 89% 56%', hex: '#f43f5e' },
                    { name: 'Orange', val: '24 95% 53%', hex: '#f97316' },
                  ].map((color) => (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => {
                        setDeliverySettings({ ...deliverySettings, theme_color_hsl: color.val });
                        saveDeliverySettings.mutate(); // Auto-save on click for instant feedback feel? Or wait for form submit. Let's wait.
                      }}
                      className={`h-10 w-10 rounded-full border-2 transition-all hover:scale-110 ${deliverySettings.theme_color_hsl === color.val ? 'border-primary ring-2 ring-primary/20' : 'border-transparent'
                        }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}

                  {/* Custom Picker */}
                  <div className="relative flex items-center justify-center">
                    <Label htmlFor="custom-color" className="sr-only">Custom Color</Label>
                    <Input
                      id="custom-color"
                      type="color"
                      value={hslToHex(deliverySettings.theme_color_hsl)}
                      className="h-10 w-10 cursor-pointer overflow-hidden rounded-full border-0 p-0"
                      onChange={(e) => setDeliverySettings({
                        ...deliverySettings,
                        theme_color_hsl: hexToHsl(e.target.value)
                      })}
                    />
                  </div>
                </div>

                {/* Hex Code Input */}
                <div className="flex items-center gap-2 pt-2">
                  <Label htmlFor="hex-input" className="text-sm whitespace-nowrap">Hex Code:</Label>
                  <Input
                    id="hex-input"
                    type="text"
                    placeholder="#3b82f6"
                    value={hslToHex(deliverySettings.theme_color_hsl)}
                    onChange={(e) => {
                      const hex = e.target.value;
                      if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                        setDeliverySettings({
                          ...deliverySettings,
                          theme_color_hsl: hexToHsl(hex)
                        });
                      }
                    }}
                    className="w-28 font-mono text-sm"
                  />
                  <span className="text-xs text-muted-foreground">(e.g., #ff5500)</span>
                </div>

                <p className="text-xs text-muted-foreground pt-2">
                  Select a preset, use the color wheel, or enter a hex code directly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

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
                    <span className={`rounded-full px-3 py-1 text-sm font-medium ${store.is_active
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

        {/* Payment Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Settings
            </CardTitle>
            <CardDescription>
              Configure payment methods for your store.
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
              {/* COD Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Cash on Delivery</Label>
                  <p className="text-sm text-muted-foreground">Allow COD payments</p>
                </div>
                <Switch
                  checked={deliverySettings.cod_enabled}
                  onCheckedChange={(checked) => setDeliverySettings({ ...deliverySettings, cod_enabled: checked })}
                />
              </div>

              {/* Online Payment Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Enable Online Payments</Label>
                  <p className="text-sm text-muted-foreground">Allow customers to pay online</p>
                </div>
                <Switch
                  checked={deliverySettings.is_payment_enabled}
                  onCheckedChange={(checked) => setDeliverySettings({ ...deliverySettings, is_payment_enabled: checked })}
                />
              </div>

              {deliverySettings.is_payment_enabled && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                  {/* Razorpay Section */}
                  <div className="rounded-lg border p-4 space-y-4">
                    <h4 className="font-medium text-sm">Razorpay</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="key_id">Key ID</Label>
                        <Input
                          id="key_id"
                          value={deliverySettings.razorpay_key_id}
                          onChange={(e) => setDeliverySettings({ ...deliverySettings, razorpay_key_id: e.target.value })}
                          placeholder="rzp_test_..."
                          type="password"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="key_secret">Key Secret</Label>
                        <Input
                          id="key_secret"
                          value={deliverySettings.razorpay_key_secret}
                          onChange={(e) => setDeliverySettings({ ...deliverySettings, razorpay_key_secret: e.target.value })}
                          placeholder="Secret key..."
                          type="password"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Get keys from <a href="https://dashboard.razorpay.com/app/keys" target="_blank" rel="noreferrer" className="underline hover:text-primary">Razorpay Dashboard</a>.
                    </p>
                  </div>

                  {/* PhonePe Section */}
                  <div className="rounded-lg border p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">PhonePe Business UPI</h4>
                      <Switch
                        checked={deliverySettings.phonepe_enabled}
                        onCheckedChange={(checked) => setDeliverySettings({ ...deliverySettings, phonepe_enabled: checked })}
                      />
                    </div>
                    {deliverySettings.phonepe_enabled && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-2">
                          <Label htmlFor="phonepe_merchant_id">Merchant ID</Label>
                          <Input
                            id="phonepe_merchant_id"
                            value={deliverySettings.phonepe_merchant_id}
                            onChange={(e) => setDeliverySettings({ ...deliverySettings, phonepe_merchant_id: e.target.value })}
                            placeholder="MERCHANTID..."
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="phonepe_salt_key">Salt Key</Label>
                            <Input
                              id="phonepe_salt_key"
                              value={deliverySettings.phonepe_salt_key}
                              onChange={(e) => setDeliverySettings({ ...deliverySettings, phonepe_salt_key: e.target.value })}
                              placeholder="Salt key..."
                              type="password"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phonepe_salt_index">Salt Index</Label>
                            <Input
                              id="phonepe_salt_index"
                              value={deliverySettings.phonepe_salt_index}
                              onChange={(e) => setDeliverySettings({ ...deliverySettings, phonepe_salt_index: e.target.value })}
                              placeholder="1"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Get credentials from <a href="https://www.phonepe.com/business/" target="_blank" rel="noreferrer" className="underline hover:text-primary">PhonePe Business Dashboard</a>.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={saveDeliverySettings.isPending}
              >
                {saveDeliverySettings.isPending ? 'Saving...' : 'Save Payment Settings'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Shipping Integration Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Shipping Integration (Shiprocket)
            </CardTitle>
            <CardDescription>
              Configure Shiprocket for automated order status updates.
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
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Enable Shipping Integration</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync order status from Shiprocket
                  </p>
                </div>
                <Switch
                  checked={deliverySettings.is_shipping_integration_enabled}
                  onCheckedChange={(checked) => setDeliverySettings({
                    ...deliverySettings,
                    is_shipping_integration_enabled: checked,
                  })}
                />
              </div>

              {deliverySettings.is_shipping_integration_enabled && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="shiprocket_email">Shiprocket Email</Label>
                      <Input
                        id="shiprocket_email"
                        value={deliverySettings.shiprocket_email}
                        onChange={(e) => setDeliverySettings({
                          ...deliverySettings,
                          shiprocket_email: e.target.value,
                        })}
                        placeholder="email@example.com"
                        type="email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shiprocket_password">Shiprocket Password</Label>
                      <Input
                        id="shiprocket_password"
                        value={deliverySettings.shiprocket_password}
                        onChange={(e) => setDeliverySettings({
                          ...deliverySettings,
                          shiprocket_password: e.target.value,
                        })}
                        placeholder="Password"
                        type="password"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter your Shiprocket login credentials used to access the API.
                  </p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={saveDeliverySettings.isPending}
              >
                {saveDeliverySettings.isPending ? 'Saving...' : 'Save Shipping Settings'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Service Area Restriction */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Service Area
            </CardTitle>
            <CardDescription>
              Restrict orders to customers within a specific area. Customers outside this area won't be able to place orders.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); saveDeliverySettings.mutate(); }} className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Enable Service Area</Label>
                  <p className="text-sm text-muted-foreground">Only serve customers within your delivery radius</p>
                </div>
                <Switch
                  checked={deliverySettings.service_area_enabled}
                  onCheckedChange={(checked) => setDeliverySettings({ ...deliverySettings, service_area_enabled: checked })}
                />
              </div>

              {deliverySettings.service_area_enabled && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Latitude</Label>
                      <Input
                        type="number"
                        step="0.000001"
                        value={deliverySettings.service_area_lat}
                        onChange={(e) => setDeliverySettings({ ...deliverySettings, service_area_lat: parseFloat(e.target.value) || 0 })}
                        placeholder="e.g., 13.0827"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Longitude</Label>
                      <Input
                        type="number"
                        step="0.000001"
                        value={deliverySettings.service_area_lng}
                        onChange={(e) => setDeliverySettings({ ...deliverySettings, service_area_lng: parseFloat(e.target.value) || 0 })}
                        placeholder="e.g., 80.2707"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Service Radius (km)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="500"
                      value={deliverySettings.service_area_radius_km}
                      onChange={(e) => setDeliverySettings({ ...deliverySettings, service_area_radius_km: parseFloat(e.target.value) || 10 })}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            setDeliverySettings({
                              ...deliverySettings,
                              service_area_lat: parseFloat(pos.coords.latitude.toFixed(6)),
                              service_area_lng: parseFloat(pos.coords.longitude.toFixed(6)),
                            });
                            toast({ title: 'Location captured!', description: `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}` });
                          },
                          () => toast({ title: 'Location access denied', variant: 'destructive' })
                        );
                      }
                    }}
                  >
                    <MapPin className="h-4 w-4" />
                    Use My Current Location
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Set your shop's location and delivery radius. Customers outside this area will see a "Not available" message.
                  </p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={saveDeliverySettings.isPending}>
                {saveDeliverySettings.isPending ? 'Saving...' : 'Save Service Area Settings'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Terms and Conditions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Terms and Conditions
            </CardTitle>
            <CardDescription>
              Set the terms and conditions for your store. These will be visible to customers.
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
              <div className="space-y-2">
                <Label htmlFor="terms">Terms & Conditions Content</Label>
                <Textarea
                  id="terms"
                  value={deliverySettings.terms_conditions}
                  onChange={(e) => setDeliverySettings({
                    ...deliverySettings,
                    terms_conditions: e.target.value,
                  })}
                  placeholder="Enter your terms and conditions here..."
                  rows={10}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={saveDeliverySettings.isPending}
              >
                {saveDeliverySettings.isPending ? 'Saving...' : 'Save Terms'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
