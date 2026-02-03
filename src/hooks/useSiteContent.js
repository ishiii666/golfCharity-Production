import { useContext } from 'react';
import { SiteContentProvider as Provider } from '../context/SiteContentContext';
import SiteContentContext from '../context/SiteContentContext';

/**
 * Re-export the provider for App.jsx
 */
export const SiteContentProvider = Provider;

/**
 * Hook to access site content from the global provider
 */
export function useSiteContent() {
    const context = useContext(SiteContentContext);
    if (!context) {
        // Fallback for components mounted before the provider is ready or if provider is missing
        return {
            content: {},
            loading: false,
            getContent: (s, f, d = '') => d
        };
    }
    return context;
}
