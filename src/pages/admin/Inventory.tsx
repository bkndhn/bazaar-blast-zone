import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, AlertTriangle, Clock, TrendingUp, DollarSign, BarChart3, Edit2, Plus, Search, Filter } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, differenceInDays, isPast, addDays } from 'date-fns';

export default function AdminInventory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editDialog, setEditDialog] = useState<{ open: boolean; product: any | null }>({ open: false, product: null });
  const [adjustDialog, setAdjustDialog] = useState<{ open: boolean; product: any | null }>({ open: false, product: null });
  const [adjustForm, setAdjustForm] = useState({ quantity: '', type: 'restock' as string, notes: '' });

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<string>('all');

  // Fetch products with inventory details
  const { data: products } = useQuery({
    queryKey: ['admin-inventory', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: prods } = await supabase
        .from('products')
        .select('id, name, sku, price, stock_quantity, is_active, images:product_images(image_url, is_primary)')
        .eq('admin_id', user.id)
        .order('name');

      const { data: invDetails } = await supabase
        .from('inventory_details')
        .select('*')
        .eq('admin_id', user.id);

      const invMap = new Map((invDetails || []).map(d => [d.product_id, d]));
      return (prods || []).map(p => ({
        ...p,
        inventory: invMap.get(p.id) || null,
        primaryImage: p.images?.find((i: any) => i.is_primary)?.image_url || p.images?.[0]?.image_url || '/placeholder.svg',
      }));
    },
    enabled: !!user,
  });

  // Stock history
  const { data: stockHistory } = useQuery({
    queryKey: ['stock-history', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('stock_history')
        .select('*, product:products(name)')
        .eq('admin_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!user,
  });

  // Save inventory details
  const saveInventory = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('inventory_details').upsert({
        product_id: data.product_id,
        admin_id: user!.id,
        cost_price: data.cost_price || 0,
        purchase_supplier: data.purchase_supplier || null,
        purchase_date: data.purchase_date || null,
        expiry_date: data.expiry_date || null,
        low_stock_alert_level: data.low_stock_alert_level || 5,
      }, { onConflict: 'product_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      toast({ title: 'Inventory details saved' });
      setEditDialog({ open: false, product: null });
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  // Stock adjustment
  const adjustStock = useMutation({
    mutationFn: async (data: { productId: string; quantity: number; type: string; notes: string }) => {
      const { data: product } = await supabase.from('products').select('stock_quantity').eq('id', data.productId).single();
      if (!product) throw new Error('Product not found');

      const newStock = data.type === 'restock'
        ? product.stock_quantity + data.quantity
        : Math.max(0, product.stock_quantity + data.quantity);

      const { error: updateError } = await supabase.from('products').update({ stock_quantity: newStock }).eq('id', data.productId);
      if (updateError) throw updateError;

      const { error: histError } = await supabase.from('stock_history').insert({
        product_id: data.productId,
        admin_id: user!.id,
        quantity_change: data.quantity,
        type: data.type,
        notes: data.notes || null,
      });
      if (histError) throw histError;

      if (newStock <= 0) {
        await supabase.from('products').update({ is_active: false }).eq('id', data.productId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['stock-history'] });
      toast({ title: 'Stock adjusted' });
      setAdjustDialog({ open: false, product: null });
      setAdjustForm({ quantity: '', type: 'restock', notes: '' });
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  // Analytics calculations
  const totalStockValue = products?.reduce((sum, p) => {
    const cost = p.inventory?.cost_price || p.price;
    return sum + cost * p.stock_quantity;
  }, 0) || 0;

  const lowStockItems = products?.filter(p => {
    const threshold = p.inventory?.low_stock_alert_level || 5;
    return p.stock_quantity <= threshold && p.stock_quantity > 0;
  }) || [];

  const outOfStockItems = products?.filter(p => p.stock_quantity === 0) || [];

  const expiringItems = products?.filter(p => {
    if (!p.inventory?.expiry_date) return false;
    const daysLeft = differenceInDays(new Date(p.inventory.expiry_date), new Date());
    return daysLeft >= 0 && daysLeft <= 7;
  }) || [];

  const expiredItems = products?.filter(p => {
    if (!p.inventory?.expiry_date) return false;
    return isPast(new Date(p.inventory.expiry_date));
  }) || [];

  const profitData = products?.filter(p => p.inventory?.cost_price > 0).map(p => ({
    name: p.name,
    costPrice: p.inventory.cost_price,
    sellingPrice: p.price,
    margin: ((p.price - p.inventory.cost_price) / p.price * 100).toFixed(1),
  })) || [];

  // Filtered products for the Products tab
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    let filtered = products;

    // Search by name or SKU
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q))
      );
    }

    // Filter by stock status
    if (stockFilter === 'out_of_stock') {
      filtered = filtered.filter(p => p.stock_quantity === 0);
    } else if (stockFilter === 'low_stock') {
      filtered = filtered.filter(p => {
        const threshold = p.inventory?.low_stock_alert_level || 5;
        return p.stock_quantity > 0 && p.stock_quantity <= threshold;
      });
    } else if (stockFilter === 'in_stock') {
      filtered = filtered.filter(p => {
        const threshold = p.inventory?.low_stock_alert_level || 5;
        return p.stock_quantity > threshold;
      });
    } else if (stockFilter === 'expiring') {
      filtered = filtered.filter(p => {
        if (!p.inventory?.expiry_date) return false;
        const daysLeft = differenceInDays(new Date(p.inventory.expiry_date), new Date());
        return daysLeft >= 0 && daysLeft <= 7;
      });
    } else if (stockFilter === 'expired') {
      filtered = filtered.filter(p => {
        if (!p.inventory?.expiry_date) return false;
        return isPast(new Date(p.inventory.expiry_date));
      });
    }

    return filtered;
  }, [products, searchQuery, stockFilter]);

  return (
    <AdminLayout title="Inventory">
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="history">Stock History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-4">
                <DollarSign className="h-4 w-4 text-muted-foreground mb-1" />
                <p className="text-xl font-bold">₹{totalStockValue.toLocaleString('en-IN')}</p>
                <p className="text-xs text-muted-foreground">Total Stock Value</p>
              </CardContent>
            </Card>
            <Card className={lowStockItems.length > 0 ? 'border-warning/50' : ''}>
              <CardContent className="pt-4">
                <AlertTriangle className={cn('h-4 w-4 mb-1', lowStockItems.length > 0 ? 'text-warning' : 'text-muted-foreground')} />
                <p className="text-xl font-bold">{lowStockItems.length}</p>
                <p className="text-xs text-muted-foreground">Low Stock</p>
              </CardContent>
            </Card>
            <Card className={outOfStockItems.length > 0 ? 'border-destructive/50' : ''}>
              <CardContent className="pt-4">
                <Package className={cn('h-4 w-4 mb-1', outOfStockItems.length > 0 ? 'text-destructive' : 'text-muted-foreground')} />
                <p className="text-xl font-bold">{outOfStockItems.length}</p>
                <p className="text-xs text-muted-foreground">Out of Stock</p>
              </CardContent>
            </Card>
            <Card className={expiringItems.length > 0 ? 'border-orange-500/50' : ''}>
              <CardContent className="pt-4">
                <Clock className={cn('h-4 w-4 mb-1', expiringItems.length > 0 ? 'text-orange-500' : 'text-muted-foreground')} />
                <p className="text-xl font-bold">{expiringItems.length}</p>
                <p className="text-xs text-muted-foreground">Expiring Soon</p>
              </CardContent>
            </Card>
          </div>

          {/* Alerts */}
          {(lowStockItems.length > 0 || expiringItems.length > 0 || expiredItems.length > 0) && (
            <Card>
              <CardHeader><CardTitle className="text-base">⚠️ Alerts</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {expiredItems.map(p => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg bg-destructive/10 p-2 text-sm">
                    <span className="font-medium">{p.name}</span>
                    <Badge variant="destructive">EXPIRED</Badge>
                  </div>
                ))}
                {expiringItems.map(p => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg bg-orange-500/10 p-2 text-sm">
                    <span className="font-medium">{p.name}</span>
                    <Badge className="bg-orange-500">Expires {format(new Date(p.inventory.expiry_date), 'MMM d')}</Badge>
                  </div>
                ))}
                {lowStockItems.map(p => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg bg-warning/10 p-2 text-sm">
                    <span className="font-medium">{p.name}</span>
                    <Badge variant="outline" className="text-warning border-warning">Stock: {p.stock_quantity}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Products with Search & Filter */}
        <TabsContent value="products" className="space-y-3">
          {/* Search & Filter Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-[130px] h-9">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="in_stock">In Stock</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                <SelectItem value="expiring">Expiring Soon</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground">{filteredProducts.length} of {products?.length || 0} products</p>

          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
                {searchQuery || stockFilter !== 'all' ? 'No products match your filters' : 'No products yet'}
              </p>
            </div>
          ) : filteredProducts.map(p => (
            <div key={p.id} className="flex gap-3 rounded-lg border bg-card p-3">
              <img src={p.primaryImage} alt={p.name} className="h-12 w-12 rounded object-cover" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-sm">{p.name}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {p.sku && <span className="text-xs text-muted-foreground">SKU: {p.sku}</span>}
                  <span className="text-xs text-muted-foreground">₹{p.price}</span>
                  {p.inventory?.cost_price > 0 && <span className="text-xs text-muted-foreground">• Cost: ₹{p.inventory.cost_price}</span>}
                  <span className={cn('text-xs', p.stock_quantity === 0 ? 'text-destructive' : p.stock_quantity <= (p.inventory?.low_stock_alert_level || 5) ? 'text-warning' : 'text-success')}>
                    • Stock: {p.stock_quantity}
                  </span>
                  {p.inventory?.expiry_date && (
                    <span className={cn('text-xs', isPast(new Date(p.inventory.expiry_date)) ? 'text-destructive' : differenceInDays(new Date(p.inventory.expiry_date), new Date()) <= 7 ? 'text-orange-500' : 'text-muted-foreground')}>
                      • Exp: {format(new Date(p.inventory.expiry_date), 'MMM d')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => {
                  setAdjustForm({ quantity: '', type: 'restock', notes: '' });
                  setAdjustDialog({ open: true, product: p });
                }}>
                  <Plus className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => setEditDialog({ open: true, product: p })}>
                  <Edit2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </TabsContent>

        {/* Stock History */}
        <TabsContent value="history" className="space-y-2">
          {!stockHistory?.length ? (
            <p className="text-center text-muted-foreground py-8">No stock transactions yet</p>
          ) : stockHistory.map(h => (
            <div key={h.id} className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm">
              <div className={cn('h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold',
                h.type === 'restock' ? 'bg-success/20 text-success' :
                h.type === 'sale' ? 'bg-primary/20 text-primary' :
                h.type === 'cancellation' ? 'bg-warning/20 text-warning' :
                'bg-muted text-muted-foreground'
              )}>
                {h.quantity_change > 0 ? '+' : ''}{h.quantity_change}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{(h as any).product?.name || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground capitalize">{h.type} {h.notes && `• ${h.notes}`}</p>
              </div>
              <span className="text-xs text-muted-foreground">{format(new Date(h.created_at), 'MMM d, h:mm a')}</span>
            </div>
          ))}
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="space-y-4">
          {profitData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Profit Margins</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {profitData.sort((a, b) => parseFloat(b.margin) - parseFloat(a.margin)).map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="truncate flex-1">{p.name}</span>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-muted-foreground">₹{p.costPrice} → ₹{p.sellingPrice}</span>
                        <Badge variant="outline" className={cn(parseFloat(p.margin) > 30 ? 'text-success border-success' : parseFloat(p.margin) > 15 ? 'text-warning border-warning' : 'text-destructive border-destructive')}>
                          {p.margin}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Stock Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Total Products</span><span className="font-medium">{products?.length || 0}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">In Stock</span><span className="font-medium text-success">{(products?.length || 0) - outOfStockItems.length}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Out of Stock</span><span className="font-medium text-destructive">{outOfStockItems.length}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Low Stock</span><span className="font-medium text-warning">{lowStockItems.length}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total Stock Value</span><span className="font-medium">₹{totalStockValue.toLocaleString('en-IN')}</span></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Inventory Details Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(o) => setEditDialog({ open: o, product: o ? editDialog.product : null })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Inventory Details - {editDialog.product?.name}</DialogTitle></DialogHeader>
          {editDialog.product && (
            <InventoryEditForm
              product={editDialog.product}
              onSave={(data) => saveInventory.mutate(data)}
              loading={saveInventory.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment Dialog */}
      <Dialog open={adjustDialog.open} onOpenChange={(o) => setAdjustDialog({ open: o, product: o ? adjustDialog.product : null })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adjust Stock - {adjustDialog.product?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">Current stock: <span className="font-medium text-foreground">{adjustDialog.product?.stock_quantity}</span></div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={adjustForm.type} onValueChange={(v) => setAdjustForm({ ...adjustForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="restock">Restock (Add)</SelectItem>
                  <SelectItem value="adjustment">Adjustment (Set manually)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{adjustForm.type === 'restock' ? 'Quantity to Add' : 'Quantity Change (+/-)'}</Label>
              <Input type="number" value={adjustForm.quantity} onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea value={adjustForm.notes} onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })} rows={2} />
            </div>
            <Button className="w-full" onClick={() => {
              if (!adjustDialog.product || !adjustForm.quantity) return;
              adjustStock.mutate({
                productId: adjustDialog.product.id,
                quantity: parseInt(adjustForm.quantity),
                type: adjustForm.type,
                notes: adjustForm.notes,
              });
            }} disabled={adjustStock.isPending}>
              {adjustStock.isPending ? 'Saving...' : 'Adjust Stock'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function InventoryEditForm({ product, onSave, loading }: { product: any; onSave: (data: any) => void; loading: boolean }) {
  const inv = product.inventory;
  const [form, setForm] = useState({
    cost_price: inv?.cost_price?.toString() || '',
    purchase_supplier: inv?.purchase_supplier || '',
    purchase_date: inv?.purchase_date || '',
    expiry_date: inv?.expiry_date || '',
    low_stock_alert_level: inv?.low_stock_alert_level?.toString() || '5',
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Cost Price (₹)</Label>
          <Input type="number" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Low Stock Alert</Label>
          <Input type="number" value={form.low_stock_alert_level} onChange={(e) => setForm({ ...form, low_stock_alert_level: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Supplier</Label>
        <Input value={form.purchase_supplier} onChange={(e) => setForm({ ...form, purchase_supplier: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Purchase Date</Label>
          <Input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Expiry Date</Label>
          <Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
        </div>
      </div>
      <Button className="w-full" onClick={() => onSave({ product_id: product.id, ...form, cost_price: parseFloat(form.cost_price) || 0, low_stock_alert_level: parseInt(form.low_stock_alert_level) || 5 })} disabled={loading}>
        {loading ? 'Saving...' : 'Save Details'}
      </Button>
    </div>
  );
}
