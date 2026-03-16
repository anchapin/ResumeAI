/**
 * useAutocomplete Hook
 * 
 * Hook for managing auto-complete suggestions.
 * 
 * @example
 * const {
 *   completions,
 *   isLoading,
 *   getCompletions,
 *   acceptCompletion,
 * } = useAutocomplete();
 */

import { useCallback, useState, useRef } from 'react';
import type {
  CompletionSuggestion,
  CompletionContext,
  UseAutocompleteReturn,
} from '../../types/autocomplete';

// Mock API - would import from utils/autocomplete-api in production
const mockCompletions: CompletionSuggestion[] = [
  { id: '1', text: 'development of new features', type: 'inline', confidence: 0.9 },
  { id: '2', text: 'design and implementation', type: 'inline', confidence: 0.8 },
  { id: '3', text: 'collaboration with team members', type: 'inline', confidence: 0.7 },
];

const mockBullets = [
  'Led development of new features that improved user engagement by 25%',
  'Collaborated with cross-functional teams to deliver projects on time',
  'Optimized system performance, reducing latency by 40%',
];

export function useAutocomplete(): UseAutocompleteReturn {
  const [completions, setCompletions] = useState<CompletionSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Get completions for context.
   */
  const getCompletions = useCallback(async (context: CompletionContext) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);

    try {
      // Mock API call - would use actual API in production
      await new Promise((resolve) => setTimeout(resolve, 150));
      
      setCompletions(mockCompletions);
    } catch (err) {
      const error = err as Error;
      if (error.name !== 'AbortError') {
        setError(error.message || 'Failed to get completions');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get bullet completions.
   */
  const getBulletCompletions = useCallback(
    async (sectionType: string, role?: string): Promise<string[]> => {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 200));
      return mockBullets;
    },
    []
  );

  /**
   * Accept a completion.
   */
  const acceptCompletion = useCallback((id: string) => {
    setCompletions((prev) => prev.filter((c) => c.id !== id));
  }, []);

  /**
   * Dismiss all completions.
   */
  const dismissCompletions = useCallback(() => {
    setCompletions([]);
  }, []);

  return {
    completions,
    isLoading,
    error,
    getCompletions,
    getBulletCompletions,
    acceptCompletion,
    dismissCompletions,
  };
}

export default useAutocomplete;
