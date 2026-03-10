import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHistory } from '../../src/hooks/useHistory';

describe('useHistory Hook', () => {
  describe('Basic functionality', () => {
    it('should initialize with initial state', () => {
      const initialState = { count: 0 };
      const { result } = renderHook(() => useHistory(initialState));

      expect(result.current.state).toEqual({ count: 0 });
      expect(result.current.history).toEqual([initialState]);
      expect(result.current.historyIndex).toBe(0);
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });

    it('should add new state to history when addToHistory is called', () => {
      const initialState = { count: 0 };
      const { result } = renderHook(() => useHistory(initialState));

      act(() => {
        result.current.addToHistory({ count: 1 });
      });

      expect(result.current.history).toEqual([
        { count: 0 },
        { count: 1 },
      ]);
      expect(result.current.historyIndex).toBe(1);
      expect(result.current.state).toEqual({ count: 1 });
      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(false);
    });

    it('should update state when undo is called', () => {
      const initialState = { count: 0 };
      const { result } = renderHook(() => useHistory(initialState));

      act(() => {
        result.current.addToHistory({ count: 1 });
        result.current.addToHistory({ count: 2 });
      });

      expect(result.current.canUndo).toBe(true);

      act(() => {
        result.current.undo();
      });

      expect(result.current.state).toEqual({ count: 1 });
      expect(result.current.historyIndex).toBe(1);
      expect(result.current.canRedo).toBe(true);
    });

    it('should update state when redo is called', () => {
      const initialState = { count: 0 };
      const { result } = renderHook(() => useHistory(initialState));

      act(() => {
        result.current.addToHistory({ count: 1 });
        result.current.addToHistory({ count: 2 });
      });

      // First undo to go back
      act(() => {
        result.current.undo();
      });

      expect(result.current.canRedo).toBe(true);

      act(() => {
        result.current.redo();
      });

      expect(result.current.state).toEqual({ count: 2 });
      expect(result.current.historyIndex).toBe(2);
    });
  });

  describe('History limit', () => {
    it('should limit history to maxHistory entries', () => {
      const initialState = { count: 0 };
      const { result } = renderHook(() => 
        useHistory(initialState, { maxHistory: 3 })
      );

      act(() => {
        result.current.addToHistory({ count: 1 });
        result.current.addToHistory({ count: 2 });
        result.current.addToHistory({ count: 3 });
        result.current.addToHistory({ count: 4 });
        result.current.addToHistory({ count: 5 });
      });

      // Should only keep last 3 entries
      expect(result.current.history.length).toBe(3);
      expect(result.current.history).toEqual([
        { count: 3 },
        { count: 4 },
        { count: 5 },
      ]);
      expect(result.current.historyIndex).toBe(2);
      expect(result.current.state).toEqual({ count: 5 });
    });
  });

  describe('trackInitialState option', () => {
    it('should not track initial state when trackInitialState is false', () => {
      const initialState = { count: 0 };
      const { result } = renderHook(() => 
        useHistory(initialState, { trackInitialState: false })
      );

      expect(result.current.history).toEqual([]);
      expect(result.current.historyIndex).toBe(-1);
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
      // State should still be the initial state
      expect(result.current.state).toEqual({ count: 0 });

      act(() => {
        result.current.addToHistory({ count: 1 });
      });

      expect(result.current.history).toEqual([{ count: 1 }]);
      expect(result.current.historyIndex).toBe(0);
      expect(result.current.canUndo).toBe(false);
    });
  });

  describe('clearHistory', () => {
    it('should clear history but keep current state', () => {
      const initialState = { count: 0 };
      const { result } = renderHook(() => useHistory(initialState));

      act(() => {
        result.current.addToHistory({ count: 1 });
        result.current.addToHistory({ count: 2 });
      });

      act(() => {
        result.current.clearHistory();
      });

      expect(result.current.history.length).toBe(1);
      expect(result.current.state).toEqual({ count: 2 });
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset history to new initial state', () => {
      const initialState = { count: 0 };
      const { result } = renderHook(() => useHistory(initialState));

      act(() => {
        result.current.addToHistory({ count: 1 });
        result.current.addToHistory({ count: 2 });
      });

      act(() => {
        result.current.reset({ count: 100 });
      });

      expect(result.current.history).toEqual([{ count: 100 }]);
      expect(result.current.historyIndex).toBe(0);
      expect(result.current.state).toEqual({ count: 100 });
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });
  });

  describe('Branching history', () => {
    it('should handle branching when adding new state after undo', () => {
      const initialState = { count: 0 };
      const { result } = renderHook(() => useHistory(initialState));

      act(() => {
        result.current.addToHistory({ count: 1 });
        result.current.addToHistory({ count: 2 });
      });

      // Undo twice
      act(() => {
        result.current.undo();
        result.current.undo();
      });

      // Add new state - this should replace the future history
      act(() => {
        result.current.addToHistory({ count: 10 });
      });

      expect(result.current.history).toEqual([
        { count: 0 },
        { count: 10 },
      ]);
      expect(result.current.historyIndex).toBe(1);
      expect(result.current.state).toEqual({ count: 10 });
      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(false);
    });
  });

  describe('Undo at boundaries', () => {
    it('should not go below index 0 when undo is called', () => {
      const initialState = { count: 0 };
      const { result } = renderHook(() => useHistory(initialState));

      // Try to undo at the beginning
      act(() => {
        result.current.undo();
      });

      expect(result.current.historyIndex).toBe(0);
      expect(result.current.state).toEqual({ count: 0 });
    });
  });

  describe('Redo at boundaries', () => {
    it('should not go beyond last index when redo is called', () => {
      const initialState = { count: 0 };
      const { result } = renderHook(() => useHistory(initialState));

      act(() => {
        result.current.addToHistory({ count: 1 });
      });

      // Try to redo at the end
      act(() => {
        result.current.redo();
      });

      expect(result.current.historyIndex).toBe(1);
      expect(result.current.state).toEqual({ count: 1 });
    });
  });
});
