/**
 * Tests for change tracking functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStore } from '../../store/store';
import type { TailoringChange } from '../../store/store';

describe('Change Tracking', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    const { result } = renderHook(() => useStore());
    act(() => {
      result.current.clearTailoring();
      result.current.clearVersionHistory();
    });
  });

  describe('TailoringChange Interface', () => {
    it('creates change with all required fields', () => {
      const change: TailoringChange = {
        id: 'test-change-1',
        type: 'modify',
        section: 'experience',
        field: '0',
        originalValue: 'Original description',
        newValue: 'Enhanced description with keywords',
        reason: 'Enhanced with job-relevant keywords',
        accepted: false,
        rejected: false,
        timestamp: new Date('2026-03-12'),
      };

      expect(change.id).toBe('test-change-1');
      expect(change.section).toBe('experience');
      expect(change.type).toBe('modify');
      expect(change.timestamp).toBeInstanceOf(Date);
    });

    it('supports both ai and manual authors', () => {
      const aiChange: TailoringChange = {
        id: 'ai-1',
        type: 'modify',
        section: 'summary',
        field: 'summary',
        originalValue: 'Original',
        newValue: 'Enhanced',
        reason: 'AI suggestion',
        accepted: false,
        rejected: false,
        author: 'ai',
        timestamp: new Date(),
      };

      const manualChange: TailoringChange = {
        id: 'manual-1',
        type: 'modify',
        section: 'summary',
        field: 'summary',
        originalValue: 'Original',
        newValue: 'Manually edited',
        reason: 'User edit',
        accepted: false,
        rejected: false,
        author: 'user',
        timestamp: new Date(),
      };

      expect(aiChange.author).toBe('ai');
      expect(manualChange.author).toBe('user');
    });
  });

  describe('Store Actions', () => {
    it('sets tailoring changes', () => {
      const { result } = renderHook(() => useStore());

      const changes: TailoringChange[] = [
        {
          id: 'change-1',
          type: 'modify',
          rejected: false,
          section: 'summary',
          field: 'summary',
          originalValue: 'Original summary',
          newValue: 'Enhanced summary',
          reason: 'Improve keywords',
          accepted: false,
          author: 'ai',
          timestamp: new Date(),
        },
      ];

      act(() => {
        result.current.setTailoringChanges(changes);
      });

      expect(result.current.tailoringChanges).toHaveLength(1);
      expect(result.current.tailoringChanges[0].id).toBe('change-1');
    });

    it('accepts tailoring change by index', () => {
      const { result } = renderHook(() => useStore());

      const changes: TailoringChange[] = [
        {
          id: 'change-1',
          type: 'modify',
          rejected: false,
          section: 'summary',
          field: 'summary',
          originalValue: 'Original',
          newValue: 'Enhanced',
          reason: 'Test',
          accepted: false,
          author: 'ai',
          timestamp: new Date(),
        },
      ];

      act(() => {
        result.current.setTailoringChanges(changes);
        result.current.acceptTailoringChange(0);
      });

      expect(result.current.tailoringChanges[0].accepted).toBe(true);
    });

    it('rejects tailoring change by index', () => {
      const { result } = renderHook(() => useStore());

      const changes: TailoringChange[] = [
        {
          id: 'change-1',
          type: 'modify',
          rejected: false,
          section: 'summary',
          field: 'summary',
          originalValue: 'Original',
          newValue: 'Enhanced',
          reason: 'Test',
          accepted: false,
          author: 'ai',
          timestamp: new Date(),
        },
      ];

      act(() => {
        result.current.setTailoringChanges(changes);
        result.current.rejectTailoringChange(0);
      });

      expect(result.current.tailoringChanges[0].accepted).toBe(false);
    });

    it('clears tailoring changes', () => {
      const { result } = renderHook(() => useStore());

      const changes: TailoringChange[] = [
        {
          id: 'change-1',
          type: 'modify',
          rejected: false,
          section: 'summary',
          field: 'summary',
          originalValue: 'Original',
          newValue: 'Enhanced',
          reason: 'Test',
          accepted: false,
          author: 'ai',
          timestamp: new Date(),
        },
      ];

      act(() => {
        result.current.setTailoringChanges(changes);
        result.current.clearTailoring();
      });

      expect(result.current.tailoringChanges).toHaveLength(0);
      expect(result.current.tailoredResume).toBeNull();
    });
  });

  describe('Show/Hide Suggestions Toggle', () => {
    it('initial state is true (showing suggestions)', () => {
      const { result } = renderHook(() => useStore());
      expect(result.current.showTailoringSuggestions).toBe(true);
    });

    it('toggles showTailoringSuggestions', () => {
      const { result } = renderHook(() => useStore());

      expect(result.current.showTailoringSuggestions).toBe(true);

      act(() => {
        result.current.toggleTailoringSuggestions();
      });

      expect(result.current.showTailoringSuggestions).toBe(false);

      act(() => {
        result.current.toggleTailoringSuggestions();
      });

      expect(result.current.showTailoringSuggestions).toBe(true);
    });

    it('sets showTailoringSuggestions explicitly', () => {
      const { result } = renderHook(() => useStore());

      act(() => {
        result.current.setShowTailoringSuggestions(false);
      });

      expect(result.current.showTailoringSuggestions).toBe(false);

      act(() => {
        result.current.setShowTailoringSuggestions(true);
      });

      expect(result.current.showTailoringSuggestions).toBe(true);
    });
  });

  describe('Change Filtering', () => {
    it('can filter changes by author', () => {
      const { result } = renderHook(() => useStore());

      const changes: TailoringChange[] = [
        {
          id: 'ai-1',
          type: 'modify',
          rejected: false,
          section: 'summary',
          field: 'summary',
          originalValue: 'Original',
          newValue: 'AI Enhanced',
          reason: 'AI suggestion',
          accepted: false,
          author: 'ai',
          timestamp: new Date(),
        },
        {
          id: 'manual-1',
          type: 'modify',
          rejected: false,
          section: 'experience',
          field: '0',
          originalValue: 'Original',
          newValue: 'Manual edit',
          reason: 'User edit',
          accepted: false,
          author: 'manual',
          timestamp: new Date(),
        },
      ];

      act(() => {
        result.current.setTailoringChanges(changes);
      });

      const aiChanges = result.current.tailoringChanges.filter((c) => c.author === 'ai');
      const manualChanges = result.current.tailoringChanges.filter((c) => c.author === 'manual');

      expect(aiChanges).toHaveLength(1);
      expect(manualChanges).toHaveLength(1);
    });

    it('can filter changes by acceptance status', () => {
      const { result } = renderHook(() => useStore());

      const changes: TailoringChange[] = [
        {
          id: 'change-1',
          type: 'modify',
          rejected: false,
          section: 'summary',
          field: 'summary',
          originalValue: 'Original',
          newValue: 'Enhanced',
          reason: 'Test',
          accepted: true,
          author: 'ai',
          timestamp: new Date(),
        },
        {
          id: 'change-2',
          type: 'modify',
          rejected: false,
          section: 'experience',
          field: '0',
          originalValue: 'Original',
          newValue: 'Enhanced',
          reason: 'Test',
          accepted: false,
          author: 'ai',
          timestamp: new Date(),
        },
      ];

      act(() => {
        result.current.setTailoringChanges(changes);
      });

      const acceptedChanges = result.current.tailoringChanges.filter((c) => c.accepted);
      const pendingChanges = result.current.tailoringChanges.filter((c) => !c.accepted);

      expect(acceptedChanges).toHaveLength(1);
      expect(pendingChanges).toHaveLength(1);
    });
  });
});
