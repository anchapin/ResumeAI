import { useCallback } from 'react';
import { useStore } from '../store/store';

/**
 * Hook to manage global loading state for async operations
 *
 * @example
 * const { isLoading, wrapLoading } = useLoading();
 *
 * const handleAction = async () => {
 *   await wrapLoading(async () => {
 *     await someAsyncCall();
 *   });
 * };
 */
export const useLoading = () => {
  const isLoading = useStore((state) => state.globalLoading);
  const setGlobalLoading = useStore((state) => state.setGlobalLoading);

  const wrapLoading = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T> => {
      setGlobalLoading(true);
      try {
        return await fn();
      } finally {
        setGlobalLoading(false);
      }
    },
    [setGlobalLoading],
  );

  return {
    isLoading,
    setGlobalLoading,
    wrapLoading,
  };
};

export default useLoading;
