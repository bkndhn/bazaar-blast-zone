 import { useState } from 'react';
 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { Plus, Edit2, Trash2, GripVertical, Eye, EyeOff, Image as ImageIcon, Type } from 'lucide-react';
 import { AdminLayout } from '@/components/layout/AdminLayout';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Switch } from '@/components/ui/switch';
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
 import { ConfirmDialog } from '@/components/ui/confirm-dialog';
 import { ImageUpload } from '@/components/ui/image-upload';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/contexts/AuthContext';
 import { useImageUpload } from '@/hooks/useImageUpload';
 import { toast } from '@/hooks/use-toast';
 import { Skeleton } from '@/components/ui/skeleton';
 
 interface Banner {
   id: string;
   title: string | null;
   text_content: string | null;
   image_url: string | null;
   link_url: string | null;
   type: string | null;
   background_color: string | null;
   text_color: string | null;
   is_active: boolean;
   sort_order: number;
 }
 
 export default function AdminBanners() {
   const { user } = useAuth();
   const queryClient = useQueryClient();
   const [isOpen, setIsOpen] = useState(false);
   const [editBanner, setEditBanner] = useState<Banner | null>(null);
   const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null; title: string }>({
     open: false,
     id: null,
     title: '',
   });
 
   const { data: banners, isLoading } = useQuery({
     queryKey: ['admin-banners', user?.id],
     queryFn: async () => {
       if (!user) return [];
       const { data, error } = await supabase
         .from('banner_ads')
         .select('*')
         .eq('admin_id', user.id)
         .order('sort_order', { ascending: true });
 
       if (error) throw error;
       return data as Banner[];
     },
     enabled: !!user,
   });
 
   const toggleActive = useMutation({
     mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
       const { error } = await supabase
         .from('banner_ads')
         .update({ is_active })
         .eq('id', id);
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
       queryClient.invalidateQueries({ queryKey: ['active-banners'] });
     },
   });
 
   const deleteBanner = useMutation({
     mutationFn: async (id: string) => {
       const { error } = await supabase
         .from('banner_ads')
         .delete()
         .eq('id', id);
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
       queryClient.invalidateQueries({ queryKey: ['active-banners'] });
       toast({ title: 'Banner deleted' });
       setDeleteConfirm({ open: false, id: null, title: '' });
     },
   });
 
   return (
     <AdminLayout title="Banners">
       <div className="mb-4 flex items-center justify-between">
         <p className="text-muted-foreground">
           {banners?.length || 0} banners
         </p>
         <Dialog open={isOpen} onOpenChange={(open) => {
           setIsOpen(open);
           if (!open) setEditBanner(null);
         }}>
           <DialogTrigger asChild>
             <Button className="gap-2">
               <Plus className="h-4 w-4" />
               Add Banner
             </Button>
           </DialogTrigger>
           <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
             <DialogHeader>
               <DialogTitle>
                 {editBanner ? 'Edit Banner' : 'Add New Banner'}
               </DialogTitle>
             </DialogHeader>
             <BannerForm
               banner={editBanner}
               onSuccess={() => {
                 setIsOpen(false);
                 setEditBanner(null);
                 queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
                 queryClient.invalidateQueries({ queryKey: ['active-banners'] });
               }}
             />
           </DialogContent>
         </Dialog>
       </div>
 
       {isLoading ? (
         <div className="space-y-3">
           {Array.from({ length: 3 }).map((_, i) => (
             <Skeleton key={i} className="h-20 w-full" />
           ))}
         </div>
       ) : !banners?.length ? (
         <div className="rounded-lg border border-dashed border-border p-12 text-center">
           <p className="text-lg font-medium">No banners yet</p>
           <p className="mt-1 text-muted-foreground">
             Create banners to promote your products
           </p>
         </div>
       ) : (
         <div className="space-y-2">
           {banners.map((banner) => (
             <div
               key={banner.id}
               className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
             >
               <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
               
               {banner.type === 'image' && banner.image_url ? (
                 <img
                   src={banner.image_url}
                   alt={banner.title || 'Banner'}
                   className="h-12 w-20 rounded object-cover"
                 />
               ) : (
                 <div 
                   className="flex h-12 w-20 items-center justify-center rounded text-white text-xs font-medium"
                   style={{ backgroundColor: banner.background_color || '#3b82f6' }}
                 >
                   <Type className="h-4 w-4" />
                 </div>
               )}
 
               <div className="flex-1">
                 <p className="font-medium">{banner.title || 'Untitled Banner'}</p>
                 <p className="text-xs text-muted-foreground">
                   {banner.type === 'image' ? 'Image Banner' : 'Text Banner'}
                   {banner.link_url && ` • Links to ${banner.link_url}`}
                 </p>
               </div>
 
               <div className="flex items-center gap-2">
                 <Button
                   variant="ghost"
                   size="icon"
                   className="h-8 w-8"
                   onClick={() => toggleActive.mutate({ 
                     id: banner.id, 
                     is_active: !banner.is_active 
                   })}
                 >
                   {banner.is_active ? (
                     <Eye className="h-4 w-4 text-success" />
                   ) : (
                     <EyeOff className="h-4 w-4 text-muted-foreground" />
                   )}
                 </Button>
                 <Button
                   variant="ghost"
                   size="icon"
                   className="h-8 w-8"
                   onClick={() => {
                     setEditBanner(banner);
                     setIsOpen(true);
                   }}
                 >
                   <Edit2 className="h-4 w-4" />
                 </Button>
                 <Button
                   variant="ghost"
                   size="icon"
                   className="h-8 w-8 text-destructive hover:text-destructive"
                   onClick={() => setDeleteConfirm({ 
                     open: true, 
                     id: banner.id, 
                     title: banner.title || 'this banner'
                   })}
                 >
                   <Trash2 className="h-4 w-4" />
                 </Button>
               </div>
             </div>
           ))}
         </div>
       )}
 
       <ConfirmDialog
         open={deleteConfirm.open}
         onOpenChange={(open) => setDeleteConfirm({ ...deleteConfirm, open })}
         title="Delete Banner?"
         description={`Are you sure you want to delete "${deleteConfirm.title}"?`}
         confirmText="Delete"
         variant="destructive"
         onConfirm={() => deleteConfirm.id && deleteBanner.mutate(deleteConfirm.id)}
         loading={deleteBanner.isPending}
       />
     </AdminLayout>
   );
 }
 
 interface BannerFormProps {
   banner?: Banner | null;
   onSuccess: () => void;
 }
 
 function BannerForm({ banner, onSuccess }: BannerFormProps) {
   const { user } = useAuth();
   const { upload, uploading } = useImageUpload({ bucket: 'store-assets', maxSizeKB: 200 });
   const [loading, setLoading] = useState(false);
   const [bannerType, setBannerType] = useState(banner?.type || 'text');
   const [imageUrl, setImageUrl] = useState(banner?.image_url || '');
   const [formData, setFormData] = useState({
     title: banner?.title || '',
     text_content: banner?.text_content || '',
     link_url: banner?.link_url || '',
     background_color: banner?.background_color || '#3b82f6',
     text_color: banner?.text_color || '#ffffff',
   });
 
   const handleImageUpload = async (file: File) => {
     const url = await upload(file);
     if (url) {
       setImageUrl(url);
       return url;
     }
     return null;
   };
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!user) return;
 
     setLoading(true);
     try {
       const bannerData = {
         admin_id: user.id,
         type: bannerType,
         title: formData.title || null,
         text_content: formData.text_content || null,
         link_url: formData.link_url || null,
         image_url: bannerType === 'image' ? imageUrl || null : null,
         background_color: bannerType === 'text' ? formData.background_color : null,
         text_color: bannerType === 'text' ? formData.text_color : null,
       };
 
       if (banner) {
         const { error } = await supabase
           .from('banner_ads')
           .update(bannerData)
           .eq('id', banner.id);
         if (error) throw error;
       } else {
         const { error } = await supabase
           .from('banner_ads')
           .insert(bannerData);
         if (error) throw error;
       }
 
       toast({ title: banner ? 'Banner updated' : 'Banner created' });
       onSuccess();
     } catch (error: any) {
       toast({ title: 'Error', description: error.message, variant: 'destructive' });
     } finally {
       setLoading(false);
     }
   };
 
   return (
     <form onSubmit={handleSubmit} className="space-y-4">
       <Tabs value={bannerType} onValueChange={setBannerType}>
         <TabsList className="grid w-full grid-cols-2">
           <TabsTrigger value="text" className="gap-2">
             <Type className="h-4 w-4" />
             Text Banner
           </TabsTrigger>
           <TabsTrigger value="image" className="gap-2">
             <ImageIcon className="h-4 w-4" />
             Image Banner
           </TabsTrigger>
         </TabsList>
 
         <TabsContent value="text" className="space-y-4 pt-4">
           <div className="space-y-2">
             <Label htmlFor="title">Title</Label>
             <Input
               id="title"
               value={formData.title}
               onChange={(e) => setFormData({ ...formData, title: e.target.value })}
               placeholder="Banner Title"
             />
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="text_content">Subtitle / Description</Label>
             <Input
               id="text_content"
               value={formData.text_content}
               onChange={(e) => setFormData({ ...formData, text_content: e.target.value })}
               placeholder="Additional text"
             />
           </div>
 
           <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <Label htmlFor="bg_color">Background Color</Label>
               <div className="flex gap-2">
                 <input
                   type="color"
                   id="bg_color"
                   value={formData.background_color}
                   onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                   className="h-9 w-12 cursor-pointer rounded border"
                 />
                 <Input
                   value={formData.background_color}
                   onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                   className="flex-1"
                 />
               </div>
             </div>
             <div className="space-y-2">
               <Label htmlFor="text_color">Text Color</Label>
               <div className="flex gap-2">
                 <input
                   type="color"
                   id="text_color"
                   value={formData.text_color}
                   onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                   className="h-9 w-12 cursor-pointer rounded border"
                 />
                 <Input
                   value={formData.text_color}
                   onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                   className="flex-1"
                 />
               </div>
             </div>
           </div>
 
           {/* Preview */}
           <div className="space-y-2">
             <Label>Preview</Label>
             <div 
               className="flex min-h-24 flex-col items-center justify-center rounded-lg p-4 text-center"
               style={{ backgroundColor: formData.background_color }}
             >
               <h3 
                 className="text-lg font-bold"
                 style={{ color: formData.text_color }}
               >
                 {formData.title || 'Banner Title'}
               </h3>
               <p 
                 className="text-sm opacity-90"
                 style={{ color: formData.text_color }}
               >
                 {formData.text_content || 'Subtitle text'}
               </p>
             </div>
           </div>
         </TabsContent>
 
         <TabsContent value="image" className="space-y-4 pt-4">
           <div className="space-y-2">
             <Label>Banner Image</Label>
             <ImageUpload
               value={imageUrl}
               onChange={setImageUrl}
               onUpload={handleImageUpload}
               uploading={uploading}
             />
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="title_img">Title (for accessibility)</Label>
             <Input
               id="title_img"
               value={formData.title}
               onChange={(e) => setFormData({ ...formData, title: e.target.value })}
               placeholder="Banner description"
             />
           </div>
         </TabsContent>
       </Tabs>
 
       <div className="space-y-2">
         <Label htmlFor="link_url">Link URL (Optional)</Label>
         <Input
           id="link_url"
           value={formData.link_url}
           onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
           placeholder="/products or https://..."
         />
       </div>
 
       <Button type="submit" className="w-full" disabled={loading || uploading}>
         {loading ? 'Saving...' : banner ? 'Update Banner' : 'Create Banner'}
       </Button>
     </form>
   );
 }