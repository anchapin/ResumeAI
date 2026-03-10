import { useState, useCallback, useMemo } from 'react';

export interface UseHistoryOptions<T> {
  /** Maximum number of history entries to keep. Default: 50 */
  maxHistory?: number;
  /** Whether to track initial state. Default: true */
  trackInitialState?: boolean;
}

export interface UseHistoryReturn<T> {
  /** The current state */
  state: T;
  /** Array of history states */
  history: T[];
  /** Current index in history */
  historyIndex: number;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Function to add state to history */
  addToHistory: (newState: T) => void;
  /** Undo to previous state */
  undo: () => void;
  /** Redo to next state */
  redo: () => void;
  /** Clear all history */
  clearHistory: () => void;
  /** Reset history to initial state */
  reset: (initialState: T) => void;
}

// Internal state type
interface HistoryState<T> {
  history: T[];
  index: number;
}

/**
 * Custom hook for managing undo/redo history
 * This hook manages history state separately from the actual application state,
 * making it compatible with external state management (like Zustand)
 * @param initialState - The initial state value (used only for initialization)
 * @param options - Configuration options for the history management
 * @returns Object containing history data and control functions
 */
export function useHistory<T>(
  initialState: T,
  options: UseHistoryOptions<T> = {},
): UseHistoryReturn<T> {
  const {
    maxHistory = 50,
    trackInitialState = true,
  } = options;

  const [historyState, setHistoryState] = useState<HistoryState<T>>(() => {
    if (trackInitialState) {
      return { history: [initialState], index: 0 };
    }
    return { history: [], index: -1 };
  });

  const { history, index: historyIndex } = historyState;

  // Current state derived from history
  const state = history[historyIndex] ?? initialState;

  /**
   * Add a new state to history
   */
  const addToHistory = useCallback((newState: T) => {
    setHistoryState((prev) => {
      const currentIndex = prev.index;
      const newIndex = currentIndex + 1;
      
      // Remove any future states if we're not at the end (branching)
      const trimmed = prev.history.slice(0, newIndex);
      const updated = [...trimmed, newState];
      
      // Keep only the last maxHistory entries
      const finalHistory = updated.slice(-maxHistory);
      const finalIndex = Math.min(newIndex, maxHistory - 1);
      
      // Adjust index if we sliced off the beginning
      const adjustedIndex = finalHistory.length > maxHistory 
        ? finalIndex - (updated.length - finalHistory.length)
        : finalIndex;
      
      return { history: finalHistory, index: Math.max(0, adjustedIndex) };
    });
  }, [maxHistory]);

  /**
   * Undo to previous state
   */
  const undo = useCallback(() => {
    setHistoryState((prev) => {
      if (prev.index > 0) {
        return { ...prev, index: prev.index - 1 };
      }
      return prev;
    });
  }, []);

  /**
   * Redo to next state
   */
  const redo = useCallback(() => {
    setHistoryState((prev) => {
      if (prev.index < prev.history.length - 1) {
        return { ...prev, index: prev.index + 1 };
      }
      return prev;
    });
  }, []);

  /**
   * Clear all history except current state
   */
  const clearHistory = useCallback(() => {
    setHistoryState((prev) => {
      const currentState = prev.history[prev.index];
      return { history: [currentState], index: 0 };
    });
  }, []);

  /**
   * Reset to a new initial state
   */
  const reset = useCallback(
    (newInitialState: T) => {
      setHistoryState({ history: [newInitialState], index: 0 });
    },
    [],
  );

  // Computed values
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return useMemo(() => ({
    state,
    history,
    historyIndex,
    canUndo,
    canRedo,
    addToHistory,
    undo,
    redo,
    clearHistory,
    reset,
  }), [state, history, historyIndex, canUndo, canRedo, addToHistory, undo, redo, clearHistory, reset]);
}

export default useHistory;
