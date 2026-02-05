 import { useState } from 'react';
 import { Plus, Edit2, Trash2, GripVertical, Eye, EyeOff, Home } from 'lucide-react';
 import { AdminLayout } from '@/components/layout/AdminLayout';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Switch } from '@/components/ui/switch';
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
 import { ConfirmDialog } from '@/components/ui/confirm-dialog';
 import { ImageUpload } from '@/components/ui/image-upload';
 import { useAdminCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, AdminCategory } from '@/hooks/useAdminCategories';
 import { useImageUpload } from '@/hooks/useImageUpload';
 import { Skeleton } from '@/components/ui/skeleton';
 import { cn } from '@/lib/utils';
 
 export default function AdminCategories() {
   const { data: categories, isLoading } = useAdminCategories();
   const createCategory = useCreateCategory();
   const updateCategory = useUpdateCategory();
   const deleteCategory = useDeleteCategory();
   const [isOpen, setIsOpen] = useState(false);
   const [editCategory, setEditCategory] = useState<AdminCategory | null>(null);
   const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null; name: string }>({
     open: false,
     id: null,
     name: '',
   });
 
   return (
     <AdminLayout title="Categories">
       <div className="mb-4 flex items-center justify-between">
         <p className="text-muted-foreground">
           {categories?.length || 0} categories
         </p>
         <Dialog open={isOpen} onOpenChange={(open) => {
           setIsOpen(open);
           if (!open) setEditCategory(null);
         }}>
           <DialogTrigger asChild>
             <Button className="gap-2">
               <Plus className="h-4 w-4" />
               Add Category
             </Button>
           </DialogTrigger>
           <DialogContent>
             <DialogHeader>
               <DialogTitle>
                 {editCategory ? 'Edit Category' : 'Add New Category'}
               </DialogTitle>
             </DialogHeader>
             <CategoryForm
               category={editCategory}
               onSuccess={() => {
                 setIsOpen(false);
                 setEditCategory(null);
               }}
             />
           </DialogContent>
         </Dialog>
       </div>
 
       {isLoading ? (
         <div className="space-y-3">
           {Array.from({ length: 4 }).map((_, i) => (
             <Skeleton key={i} className="h-16 w-full" />
           ))}
         </div>
       ) : !categories?.length ? (
         <div className="rounded-lg border border-dashed border-border p-12 text-center">
           <p className="text-lg font-medium">No categories yet</p>
           <p className="mt-1 text-muted-foreground">
             Create categories to organize your products
           </p>
         </div>
       ) : (
         <div className="space-y-2">
           {categories.map((category) => (
             <div
               key={category.id}
               className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
             >
               <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
               
               {category.image_url ? (
                 <img
                   src={category.image_url}
                   alt={category.name}
                   className="h-10 w-10 rounded-lg object-cover"
                 />
               ) : (
                 <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                   <span className="text-lg font-bold text-muted-foreground">
                     {category.name.charAt(0)}
                   </span>
                 </div>
               )}
 
               <div className="flex-1">
                 <p className="font-medium">{category.name}</p>
                 <p className="text-xs text-muted-foreground">/{category.slug}</p>
               </div>
 
               <div className="flex items-center gap-2">
                 {category.show_on_home && (
                   <span className="flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
                     <Home className="h-3 w-3" />
                     Home
                   </span>
                 )}
                 <Button
                   variant="ghost"
                   size="icon"
                   className="h-8 w-8"
                   onClick={() => updateCategory.mutate({ 
                     id: category.id, 
                     is_active: !category.is_active 
                   })}
                 >
                   {category.is_active ? (
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
                     setEditCategory(category);
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
                     id: category.id, 
                     name: category.name 
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
         title="Delete Category?"
         description={`Are you sure you want to delete "${deleteConfirm.name}"? Products in this category will become uncategorized.`}
         confirmText="Delete"
         variant="destructive"
         onConfirm={() => deleteConfirm.id && deleteCategory.mutate(deleteConfirm.id)}
         loading={deleteCategory.isPending}
       />
     </AdminLayout>
   );
 }
 
 interface CategoryFormProps {
   category?: AdminCategory | null;
   onSuccess: () => void;
 }
 
 function CategoryForm({ category, onSuccess }: CategoryFormProps) {
   const createCategory = useCreateCategory();
   const updateCategory = useUpdateCategory();
   const { upload, uploading } = useImageUpload({ bucket: 'store-assets', maxSizeKB: 50 });
   const [loading, setLoading] = useState(false);
   const [imageUrl, setImageUrl] = useState(category?.image_url || '');
   const [formData, setFormData] = useState({
     name: category?.name || '',
     slug: category?.slug || '',
     show_on_home: category?.show_on_home ?? true,
   });
 
   const generateSlug = (name: string) => {
     return name
       .toLowerCase()
       .replace(/[^a-z0-9]+/g, '-')
       .replace(/(^-|-$)/g, '');
   };
 
   const handleNameChange = (name: string) => {
     setFormData({
       ...formData,
       name,
       slug: category ? formData.slug : generateSlug(name),
     });
   };
 
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
     setLoading(true);
 
     try {
       if (category) {
         await updateCategory.mutateAsync({
           id: category.id,
           ...formData,
           image_url: imageUrl || null,
         });
       } else {
         await createCategory.mutateAsync({
           ...formData,
           image_url: imageUrl || undefined,
         });
       }
       onSuccess();
     } finally {
       setLoading(false);
     }
   };
 
   return (
     <form onSubmit={handleSubmit} className="space-y-4">
       <div className="space-y-2">
         <Label>Category Image</Label>
         <ImageUpload
           value={imageUrl}
           onChange={setImageUrl}
           onUpload={handleImageUpload}
           uploading={uploading}
         />
         <p className="text-xs text-muted-foreground">
           Image will be compressed to max 50KB
         </p>
       </div>
 
       <div className="space-y-2">
         <Label htmlFor="name">Category Name *</Label>
         <Input
           id="name"
           value={formData.name}
           onChange={(e) => handleNameChange(e.target.value)}
           required
         />
       </div>
 
       <div className="space-y-2">
         <Label htmlFor="slug">URL Slug *</Label>
         <Input
           id="slug"
           value={formData.slug}
           onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
           required
         />
       </div>
 
       <div className="flex items-center gap-2">
         <Switch
           id="show_on_home"
           checked={formData.show_on_home}
           onCheckedChange={(checked) => setFormData({ ...formData, show_on_home: checked })}
         />
         <Label htmlFor="show_on_home">Show on Home Page</Label>
       </div>
 
       <Button type="submit" className="w-full" disabled={loading || uploading}>
         {loading ? 'Saving...' : category ? 'Update Category' : 'Create Category'}
       </Button>
     </form>
   );
 }