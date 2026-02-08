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

  // Fetch store AND theme settings
  const { data: storeData, isLoading } = useQuery({
    queryKey: ['store-by-slug', storeSlug],
    queryFn: async () => {
      if (!storeSlug) return null;

      // First get the store
      const { data: store, error } = await supabase
        .from('stores')
        .select('*')
        .eq('slug', storeSlug)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      if (!store) return null;

      // Then get the admin settings for this store's admin
      let theme = null;
      try {
        const { data: settings, error: settingsError } = await supabase
          .from('admin_settings')
          .select('theme_color_hsl')
          .eq('admin_id', store.admin_id)
          .maybeSingle();

        if (!settingsError && settings) {
          theme = (settings as any).theme_color_hsl;
        }
      } catch (err) {
        console.warn('Failed to fetch theme settings:', err);
        // Continue without theme
      }

      return { store, theme };
    },
    enabled: !!storeSlug,
    staleTime: 5 * 60 * 1000,
  });

  const store = storeData?.store ?? null;
  const themeColor = storeData?.theme;

  // Apply Theme
  React.useEffect(() => {
    const root = document.documentElement;
    if (themeColor) {
      root.style.setProperty('--primary', themeColor);
      root.style.setProperty('--ring', themeColor);

      // Update status bar meta tag
      const hexColor = hslToHex(themeColor);
      let metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.setAttribute('name', 'theme-color');
        document.head.appendChild(metaThemeColor);
      }
      metaThemeColor.setAttribute('content', hexColor);
    } else {
      // Reset to default if no store or no theme (e.g. main landing page)
      // Default Blue: 217 91% 60%
      root.style.setProperty('--primary', '217 91% 60%');
      root.style.setProperty('--ring', '217 91% 60%');
    }

    return () => {
      // Cleanup on unmount/change? 
      // We probably want to keep it if we are still in the app, 
      // but if we navigated to a different store it would update.
      // If we leave store context completely?
    };
  }, [themeColor]);

  // Helper to convert HSL to Hex for meta tag
  function hslToHex(hsl: string): string {
    try {
      const parts = hsl.match(/[\d.]+/g);
      if (!parts || parts.length < 3) return '#3b82f6';

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
  }

  const value = useMemo(() => ({
    store: store,
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
