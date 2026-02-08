import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Image as ImageIcon, Package, Eye, EyeOff } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MultiImageUpload } from '@/components/ui/multi-image-upload';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminCategories } from '@/hooks/useAdminCategories';
import { useImageUpload } from '@/hooks/useImageUpload';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface ProductImage {
  id: string;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  sku: string | null;
  stock_quantity: number;
  is_active: boolean;
  category_id: string | null;
  store_id: string;
  images: ProductImage[];
  unit_type?: string;
  unit_value?: number;
  unit_label?: string;
  usage_instructions?: string;
  storage_instructions?: string;
  extra_notes?: string;
  min_quantity?: number;
  max_quantity?: number;
}

const UNIT_TYPES = [
  { value: 'piece', label: 'Pieces', units: ['pc', 'pcs', 'unit', 'units'] },
  { value: 'weight', label: 'Weight', units: ['g', 'kg', '100g', '250g', '500g'] },
  { value: 'volume', label: 'Volume', units: ['ml', 'l', '100ml', '250ml', '500ml', '1L'] },
  { value: 'length', label: 'Length', units: ['cm', 'm', 'inch', 'ft'] },
  { value: 'custom', label: 'Custom', units: [] },
];

export default function AdminProducts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: categories } = useAdminCategories();
  const [isOpen, setIsOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; productId: string | null; productName: string }>({
    open: false,
    productId: null,
    productName: '',
  });

  const { data: store } = useQuery({
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

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-products', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          images:product_images(id, image_url, is_primary, sort_order)
        `)
        .eq('admin_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Product[];
    },
    enabled: !!user,
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      // Delete images first
      await supabase.from('product_images').delete().eq('product_id', id);
      // Then delete product
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast({ title: 'Product deleted' });
      setDeleteConfirm({ open: false, productId: null, productName: '' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const toggleVisibility = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast({ title: isActive ? 'Product hidden from customers' : 'Product visible to customers' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low_stock_asc' | 'low_stock_desc'>('all');

  // Filter and sort products
  const filteredProducts = (products || [])
    .filter((product) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        product.name.toLowerCase().includes(query) ||
        product.sku?.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      if (stockFilter === 'low_stock_asc') {
        return a.stock_quantity - b.stock_quantity;
      }
      if (stockFilter === 'low_stock_desc') {
        return b.stock_quantity - a.stock_quantity;
      }
      return 0; // Keep original order
    });

  if (!store) {
    return (
      <AdminLayout title="Products">
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            You need to set up your store first. Go to Settings to create your store.
          </p>
          <Button className="mt-4" asChild>
            <a href="/admin/settings">Go to Settings</a>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Products">
      {/* Search and Filter Section */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={stockFilter} onValueChange={(value: 'all' | 'low_stock_asc' | 'low_stock_desc') => setStockFilter(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort by stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Default</SelectItem>
                <SelectItem value="low_stock_asc">Stock: Low → High</SelectItem>
                <SelectItem value="low_stock_desc">Stock: High → Low</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={isOpen} onOpenChange={(open) => {
              setIsOpen(open);
              if (!open) setEditProduct(null);
            }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editProduct ? 'Edit Product' : 'Add New Product'}
                  </DialogTitle>
                </DialogHeader>
                <ProductForm
                  product={editProduct}
                  storeId={store.id}
                  categories={categories || []}
                  onSuccess={() => {
                    setIsOpen(false);
                    setEditProduct(null);
                    queryClient.invalidateQueries({ queryKey: ['admin-products'] });
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {filteredProducts.length} of {products?.length || 0} products
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : !filteredProducts.length ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-medium">{searchQuery ? 'No products found' : 'No products yet'}</p>
          <p className="mt-1 text-muted-foreground">
            {searchQuery ? 'Try a different search term' : 'Add your first product to start selling'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((product) => {
            const primaryImage = product.images?.find(img => img.is_primary)?.image_url
              || product.images?.[0]?.image_url
              || '/placeholder.svg';

            return (
              <div
                key={product.id}
                className="flex gap-4 rounded-lg border border-border bg-card p-4"
              >
                <img
                  src={primaryImage}
                  alt={product.name}
                  className="h-16 w-16 rounded-md object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        ₹{product.price.toLocaleString('en-IN')} • Stock: {product.stock_quantity}
                        {product.images?.length > 1 && ` • ${product.images.length} images`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`rounded px-2 py-0.5 text-xs ${product.stock_quantity === 0
                        ? 'bg-destructive/20 text-destructive'
                        : product.is_active
                          ? 'bg-success/20 text-success'
                          : 'bg-muted text-muted-foreground'
                        }`}>
                        {product.stock_quantity === 0 ? 'Out of Stock' : product.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditProduct(product);
                        setIsOpen(true);
                      }}
                    >
                      <Edit2 className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleVisibility.mutate({ id: product.id, isActive: product.is_active })}
                      disabled={toggleVisibility.isPending}
                    >
                      {product.is_active ? (
                        <><EyeOff className="mr-1 h-3 w-3" />Hide</>
                      ) : (
                        <><Eye className="mr-1 h-3 w-3" />Show</>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirm({
                        open: true,
                        productId: product.id,
                        productName: product.name
                      })}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ ...deleteConfirm, open })}
        title="Delete Product?"
        description={`Are you sure you want to delete "${deleteConfirm.productName}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={() => deleteConfirm.productId && deleteProduct.mutate(deleteConfirm.productId)}
        loading={deleteProduct.isPending}
      />
    </AdminLayout>
  );
}

interface ProductFormProps {
  product?: Product | null;
  storeId: string;
  categories: { id: string; name: string }[];
  onSuccess: () => void;
}

function ProductForm({ product, storeId, categories, onSuccess }: ProductFormProps) {
  const { user } = useAuth();
  const { uploadMultiple, uploading } = useImageUpload({ bucket: 'product-images', maxSizeKB: 100 });
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<{ url: string; is_primary?: boolean }[]>(
    product?.images?.map(img => ({ url: img.image_url, is_primary: img.is_primary })) || []
  );
  const [customUnit, setCustomUnit] = useState('');
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price?.toString() || '',
    compare_at_price: product?.compare_at_price?.toString() || '',
    sku: product?.sku || '',
    stock_quantity: product?.stock_quantity?.toString() || '0',
    category_id: product?.category_id || '',
    is_active: product?.is_active ?? true,
    unit_type: product?.unit_type || 'piece',
    unit_value: product?.unit_value?.toString() || '1',
    unit_label: product?.unit_label || 'pc',
    usage_instructions: product?.usage_instructions || '',
    storage_instructions: product?.storage_instructions || '',
    extra_notes: product?.extra_notes || '',
    min_quantity: product?.min_quantity?.toString() || '1',
    max_quantity: product?.max_quantity?.toString() || '10',
  });

  // Reset form when product changes
  useEffect(() => {
    if (product) {
      setImages(product.images?.map(img => ({ url: img.image_url, is_primary: img.is_primary })) || []);
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        compare_at_price: product.compare_at_price?.toString() || '',
        sku: product.sku || '',
        stock_quantity: product.stock_quantity?.toString() || '0',
        category_id: product.category_id || '',
        is_active: product.is_active ?? true,
        unit_type: product.unit_type || 'piece',
        unit_value: product.unit_value?.toString() || '1',
        unit_label: product.unit_label || 'pc',
        usage_instructions: product.usage_instructions || '',
        storage_instructions: product.storage_instructions || '',
        extra_notes: product.extra_notes || '',
        min_quantity: product.min_quantity?.toString() || '1',
        max_quantity: product.max_quantity?.toString() || '10',
      });
    } else {
      setImages([]);
      setFormData({
        name: '',
        description: '',
        price: '',
        compare_at_price: '',
        sku: '',
        stock_quantity: '0',
        category_id: '',
        is_active: true,
        unit_type: 'piece',
        unit_value: '1',
        unit_label: 'pc',
        usage_instructions: '',
        storage_instructions: '',
        extra_notes: '',
        min_quantity: '1',
        max_quantity: '10',
      });
    }
  }, [product]);

  const handleImageUpload = async (files: File[]) => {
    const urls = await uploadMultiple(files);
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const productData = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        compare_at_price: formData.compare_at_price ? parseFloat(formData.compare_at_price) : null,
        sku: formData.sku || null,
        stock_quantity: parseInt(formData.stock_quantity),
        category_id: formData.category_id || null,
        is_active: formData.is_active,
        admin_id: user.id,
        store_id: storeId,
        unit_type: formData.unit_type,
        unit_value: parseFloat(formData.unit_value) || 1,
        unit_label: formData.unit_label,
        usage_instructions: formData.usage_instructions || null,
        storage_instructions: formData.storage_instructions || null,
        extra_notes: formData.extra_notes || null,
        min_quantity: parseInt(formData.min_quantity) || 1,
        max_quantity: parseInt(formData.max_quantity) || 10,
      };

      let productId = product?.id;

      if (product) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id);
        if (error) throw error;
      } else {
        const { data: newProduct, error } = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single();
        if (error) throw error;
        productId = newProduct.id;
      }

      // Handle images - delete old ones and insert new ones
      if (productId) {
        await supabase.from('product_images').delete().eq('product_id', productId);

        if (images.length > 0) {
          const imageRecords = images.map((img, index) => ({
            product_id: productId,
            admin_id: user.id,
            image_url: img.url,
            is_primary: img.is_primary || index === 0,
            sort_order: index,
          }));

          const { error: imgError } = await supabase
            .from('product_images')
            .insert(imageRecords);

          if (imgError) throw imgError;
        }
      }

      toast({ title: product ? 'Product updated' : 'Product created' });
      onSuccess();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const selectedUnitType = UNIT_TYPES.find(u => u.value === formData.unit_type);
  const availableUnits = selectedUnitType?.units || [];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="pricing">Pricing & Stock</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4 pt-4">
          {/* Multi Image Upload */}
          <div className="space-y-2">
            <Label>Product Images (up to 10)</Label>
            <MultiImageUpload
              images={images}
              onChange={setImages}
              onUpload={handleImageUpload}
              uploading={uploading}
              maxImages={10}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Describe your product..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (₹) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="compare_at_price">Compare at Price</Label>
              <Input
                id="compare_at_price"
                type="number"
                step="0.01"
                value={formData.compare_at_price}
                onChange={(e) => setFormData({ ...formData, compare_at_price: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Unit Type</Label>
            <Select
              value={formData.unit_type}
              onValueChange={(value) => setFormData({ ...formData, unit_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select unit type" />
              </SelectTrigger>
              <SelectContent>
                {UNIT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit_value">Unit Value</Label>
              <Input
                id="unit_value"
                type="number"
                step="0.01"
                value={formData.unit_value}
                onChange={(e) => setFormData({ ...formData, unit_value: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Unit Label</Label>
              {availableUnits.length > 0 ? (
                <Select
                  value={formData.unit_label}
                  onValueChange={(value) => setFormData({ ...formData, unit_label: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUnits.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={formData.unit_label}
                  onChange={(e) => setFormData({ ...formData, unit_label: e.target.value })}
                  placeholder="e.g., dozen, box"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock_quantity">Stock Quantity *</Label>
              <Input
                id="stock_quantity"
                type="number"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min_quantity">Min Quantity</Label>
              <Input
                id="min_quantity"
                type="number"
                value={formData.min_quantity}
                onChange={(e) => setFormData({ ...formData, min_quantity: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_quantity">Max Quantity</Label>
              <Input
                id="max_quantity"
                type="number"
                value={formData.max_quantity}
                onChange={(e) => setFormData({ ...formData, max_quantity: e.target.value })}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="usage_instructions">Usage Instructions</Label>
            <Textarea
              id="usage_instructions"
              value={formData.usage_instructions}
              onChange={(e) => setFormData({ ...formData, usage_instructions: e.target.value })}
              rows={3}
              placeholder="How to use this product..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="storage_instructions">Storage Instructions</Label>
            <Textarea
              id="storage_instructions"
              value={formData.storage_instructions}
              onChange={(e) => setFormData({ ...formData, storage_instructions: e.target.value })}
              rows={3}
              placeholder="How to store this product..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="extra_notes">Extra Notes / Warnings</Label>
            <Textarea
              id="extra_notes"
              value={formData.extra_notes}
              onChange={(e) => setFormData({ ...formData, extra_notes: e.target.value })}
              rows={3}
              placeholder="Any important notes or warnings..."
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">Active (visible to customers)</Label>
          </div>
        </TabsContent>
      </Tabs>

      <Button type="submit" className="w-full" disabled={loading || uploading}>
        {loading ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
      </Button>
    </form>
  );
}
