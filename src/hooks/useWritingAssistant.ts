/**
 * useWritingAssistant Hook
 * 
 * Main hook for interacting with the AI-powered writing assistant.
 * Manages suggestions state, loading, errors, and user actions.
 * 
 * @param options - Configuration options
 * @returns Writing assistant state and actions
 * 
 * @example
 * const {
 *   suggestions,
 *   isActive,
 *   isLoading,
 *   acceptSuggestion,
 *   rejectSuggestion,
 * } = useWritingAssistant({
 *   enabled: true,
 *   debounceMs: 300,
 * });
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import {
  getWritingSuggestions,
  updateSuggestionStatus,
} from '../../utils/writing-assistant-api';
import type {
  Suggestion,
  SuggestionContext,
  UseWritingAssistantOptions,
  UseWritingAssistantReturn,
} from '../../types/writing-assistant';
import { useDebounce } from './useDebounce';

export function useWritingAssistant(
  options: UseWritingAssistantOptions = {}
): UseWritingAssistantReturn {
  const {
    enabled = true,
    debounceMs = 300,
    autoRefresh = true,
    context,
  } = options;

  // State
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isActive, setIsActive] = useState(enabled);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentText, setCurrentText] = useState('');

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounce text for suggestion fetching
  const debouncedText = useDebounce(currentText, debounceMs);

  /**
   * Fetch suggestions for text.
   */
  const fetchSuggestions = useCallback(
    async (text: string, ctx?: SuggestionContext) => {
      if (!isActive || !text || text.length < 10) {
        setSuggestions([]);
        return;
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      setError(null);

      try {
        const response = await getWritingSuggestions(
          {
            text,
            context: ctx || context,
          },
          abortControllerRef.current.signal
        );

        setSuggestions(response.suggestions || []);
      } catch (err) {
        const error = err as Error;
        if (error.name !== 'AbortError') {
          setError(error.message || 'Failed to get suggestions');
          console.error('Writing assistant error:', error);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [isActive, context]
  );

  /**
   * Refresh suggestions for current text.
   */
  const refreshSuggestions = useCallback(
    async (text: string, ctx?: SuggestionContext) => {
      setCurrentText(text);
      if (autoRefresh) {
        await fetchSuggestions(text, ctx);
      }
    },
    [autoRefresh, fetchSuggestions]
  );

  /**
   * Accept a suggestion.
   */
  const acceptSuggestion = useCallback(
    async (id: string, replacement: string) => {
      try {
        await updateSuggestionStatus({
          suggestion_id: id,
          status: 'accepted',
        });

        // Remove from local state
        setSuggestions((prev) => prev.filter((s) => s.id !== id));
      } catch (err) {
        const error = err as Error;
        console.error('Failed to accept suggestion:', error);
      }
    },
    []
  );

  /**
   * Reject a suggestion.
   */
  const rejectSuggestion = useCallback(async (id: string) => {
    try {
      await updateSuggestionStatus({
        suggestion_id: id,
        status: 'rejected',
      });

      // Remove from local state
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      const error = err as Error;
      console.error('Failed to reject suggestion:', error);
    }
  }, []);

  /**
   * Enable writing assistant.
   */
  const enable = useCallback(() => {
    setIsActive(true);
  }, []);

  /**
   * Disable writing assistant.
   */
  const disable = useCallback(() => {
    setIsActive(false);
    setSuggestions([]);
    setError(null);
  }, []);

  /**
   * Toggle writing assistant.
   */
  const toggle = useCallback(() => {
    setIsActive((prev) => !prev);
  }, []);

  /**
   * Clear all suggestions.
   */
  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setError(null);
  }, []);

  // Fetch suggestions when debounced text changes
  useEffect(() => {
    if (autoRefresh && debouncedText && isActive) {
      fetchSuggestions(debouncedText, context);
    }
  }, [debouncedText, autoRefresh, isActive, fetchSuggestions, context]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    suggestions,
    isActive,
    isLoading,
    error,
    enable,
    disable,
    toggle,
    acceptSuggestion,
    rejectSuggestion,
    refreshSuggestions,
    clearSuggestions,
  };
}
