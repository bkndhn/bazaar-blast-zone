import { useLocation, useParams } from 'react-router-dom';

/**
 * Hook to generate store-aware paths.
 * When on a store route (/s/store-slug), it prefixes paths with the store slug.
 * On regular routes, it returns paths as-is.
 */
export function useStorePath() {
    const location = useLocation();
    const { storeSlug } = useParams<{ storeSlug?: string }>();

    // Check if we're on a store route
    const isStoreRoute = location.pathname.startsWith('/s/');

    // Extract store slug from path if we're on a store route
    const currentStoreSlug = storeSlug || (isStoreRoute ? location.pathname.split('/')[2] : null);

    /**
     * Get a store-aware path
     * @param basePath - The base path (e.g., '/account', '/orders')
     * @returns The path prefixed with store slug if on a store route
     */
    const getPath = (basePath: string): string => {
        if (currentStoreSlug) {
            // For home, link to store front
            if (basePath === '/') {
                return `/s/${currentStoreSlug}`;
            }
            return `/s/${currentStoreSlug}${basePath}`;
        }
        return basePath;
    };

    return {
        getPath,
        storeSlug: currentStoreSlug,
        isStoreRoute: !!currentStoreSlug,
    };
}
