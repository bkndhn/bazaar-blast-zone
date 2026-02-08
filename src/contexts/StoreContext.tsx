import React, { createContext, useContext, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Store {
  id: string;
  name: string;
  slug: string;
  admin_id: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  is_active: boolean;
}

interface StoreContextType {
  store: Store | null;
  storeSlug: string | null;
  adminId: string | null;
  isLoading: boolean;
  isStoreRoute: boolean;
}

const StoreContext = createContext<StoreContextType>({
  store: null,
  storeSlug: null,
  adminId: null,
  isLoading: false,
  isStoreRoute: false,
});

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { storeSlug } = useParams<{ storeSlug: string }>();

  const { data: store, isLoading } = useQuery({
    queryKey: ['store-by-slug', storeSlug],
    queryFn: async () => {
      if (!storeSlug) return null;
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('slug', storeSlug)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return data as Store | null;
    },
    enabled: !!storeSlug,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const value = useMemo(() => ({
    store: store ?? null,
    storeSlug: storeSlug ?? null,
    adminId: store?.admin_id ?? null,
    isLoading,
    isStoreRoute: !!storeSlug,
  }), [store, storeSlug, isLoading]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  return useContext(StoreContext);
}
