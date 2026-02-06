import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface AdminSupportSettings {
  id: string;
  admin_id: string;
  chat_enabled: boolean;
  chat_url: string | null;
  phone_enabled: boolean;
  phone_number: string | null;
  email_enabled: boolean;
  email_address: string | null;
  whatsapp_enabled: boolean;
  whatsapp_number: string | null;
  created_at: string;
  updated_at: string;
}

export function useAdminSupportSettings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-support-settings', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('admin_support_settings')
        .select('*')
        .eq('admin_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as AdminSupportSettings | null;
    },
    enabled: !!user,
  });
}

// For public use - fetch by admin_id
export function useSupportSettings(adminId: string | undefined) {
  return useQuery({
    queryKey: ['support-settings', adminId],
    queryFn: async () => {
      if (!adminId) return null;
      
      const { data, error } = await supabase
        .from('admin_support_settings')
        .select('*')
        .eq('admin_id', adminId)
        .maybeSingle();

      if (error) throw error;
      return data as AdminSupportSettings | null;
    },
    enabled: !!adminId,
  });
}

export function useUpdateSupportSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<AdminSupportSettings>) => {
      if (!user) throw new Error('Not authenticated');

      // Try to update first, if no rows affected, insert
      const { data: existing } = await supabase
        .from('admin_support_settings')
        .select('id')
        .eq('admin_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('admin_support_settings')
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq('admin_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('admin_support_settings')
          .insert({ admin_id: user.id, ...data });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-support-settings'] });
      toast({ title: 'Support settings saved' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
