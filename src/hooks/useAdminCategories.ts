 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/contexts/AuthContext';
 import { toast } from '@/hooks/use-toast';
 
 export interface AdminCategory {
   id: string;
   name: string;
   slug: string;
   image_url: string | null;
   admin_id: string | null;
   is_active: boolean;
   sort_order: number;
   show_on_home: boolean;
   created_at: string;
 }
 
 export function useAdminCategories() {
   const { user } = useAuth();
 
   return useQuery({
     queryKey: ['admin-categories', user?.id],
     queryFn: async () => {
       if (!user) return [];
       
       const { data, error } = await supabase
         .from('categories')
         .select('*')
         .eq('admin_id', user.id)
         .order('sort_order', { ascending: true });
 
       if (error) throw error;
       return data as AdminCategory[];
     },
     enabled: !!user,
   });
 }
 
 export function useCreateCategory() {
   const { user } = useAuth();
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async (data: {
       name: string;
       slug: string;
       image_url?: string;
       show_on_home?: boolean;
     }) => {
       if (!user) throw new Error('Not authenticated');
 
       const { error } = await supabase
         .from('categories')
         .insert({
           ...data,
           admin_id: user.id,
           is_active: true,
         });
 
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
       toast({ title: 'Category created' });
     },
     onError: (error) => {
       toast({ title: 'Error', description: error.message, variant: 'destructive' });
     },
   });
 }
 
 export function useUpdateCategory() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async ({ id, ...data }: { id: string } & Partial<AdminCategory>) => {
       const { error } = await supabase
         .from('categories')
         .update(data)
         .eq('id', id);
 
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
       queryClient.invalidateQueries({ queryKey: ['categories'] });
       toast({ title: 'Category updated' });
     },
     onError: (error) => {
       toast({ title: 'Error', description: error.message, variant: 'destructive' });
     },
   });
 }
 
 export function useDeleteCategory() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async (id: string) => {
       const { error } = await supabase
         .from('categories')
         .delete()
         .eq('id', id);
 
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
       queryClient.invalidateQueries({ queryKey: ['categories'] });
       toast({ title: 'Category deleted' });
     },
     onError: (error) => {
       toast({ title: 'Error', description: error.message, variant: 'destructive' });
     },
   });
 }
 
 export function useReorderCategories() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async (orderedIds: string[]) => {
       const updates = orderedIds.map((id, index) => 
         supabase
           .from('categories')
           .update({ sort_order: index })
           .eq('id', id)
       );
 
       await Promise.all(updates);
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
       toast({ title: 'Categories reordered' });
     },
   });
 }