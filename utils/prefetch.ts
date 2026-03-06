/**
 * Generic type for any module/component
 */
type AnyModule = unknown;

/**
 * Utility for prefetching lazy-loaded components
 */

const prefetchMap: Record<string, () => Promise<AnyModule>> = {};

/**
 * Register a component for prefetching
 * @param name Unique name for the component
 * @param importFn The dynamic import function
 */
export function registerPrefetch(name: string, importFn: () => Promise<AnyModule>) {
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
      if (import.meta.env.DEV) {
        console.log(`Prefetched component: ${name}`);
      }
    } catch (error) {
      console.error(`Failed to prefetch component: ${name}`, error);
    }
  }
}
