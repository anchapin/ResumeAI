/**
 * Utility for prefetching lazy-loaded components
 */

const prefetchMap: Record<string, () => Promise<any>> = {};

/**
 * Register a component for prefetching
 * @param name Unique name for the component
 * @param importFn The dynamic import function
 */
export function registerPrefetch(name: string, importFn: () => Promise<any>) {
  prefetchMap[name] = importFn;
}

/**
 * Prefetch a registered component
 * @param name The name of the component to prefetch
 */
export async function prefetch(name: string) {
  if (prefetchMap[name]) {
    try {
      await prefetchMap[name]();
    } catch (error) {
      console.error(`Failed to prefetch component: ${name}`, error);
    }
  }
}
