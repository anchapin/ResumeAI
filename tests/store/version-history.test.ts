/**
 * Tests for version history functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStore } from '../../store/store';

describe('Version History', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    const { result } = renderHook(() => useStore());
    act(() => {
      result.current.clearVersionHistory();
    });
  });

  describe('takeSnapshot', () => {
    it('creates a manual snapshot with label', () => {
      const { result } = renderHook(() => useStore());

      act(() => {
        result.current.takeSnapshot('Test snapshot');
      });

      expect(result.current.versionHistory).toHaveLength(1);
      expect(result.current.versionHistory[0].label).toBe('Test snapshot');
      expect(result.current.versionHistory[0].type).toBe('manual');
    });

    it('creates an auto-before-ai snapshot', () => {
      const { result } = renderHook(() => useStore());

      act(() => {
        result.current.takeSnapshot('Before AI tailoring', 'auto-before-ai');
      });

      expect(result.current.versionHistory).toHaveLength(1);
      expect(result.current.versionHistory[0].type).toBe('auto-before-ai');
      expect(result.current.versionHistory[0].label).toBe('Before AI tailoring');
    });

    it('includes timestamp in snapshot', () => {
      const { result } = renderHook(() => useStore());
      const beforeTime = Date.now();

      act(() => {
        result.current.takeSnapshot('Test');
      });

      const afterTime = Date.now();
      const timestamp = result.current.versionHistory[0].timestamp;
      const snapshotTime = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp.getTime();

      expect(snapshotTime).toBeGreaterThanOrEqual(beforeTime);
      expect(snapshotTime).toBeLessThanOrEqual(afterTime);
    });

    it('includes unique ID in snapshot', () => {
      const { result } = renderHook(() => useStore());

      act(() => {
        result.current.takeSnapshot('Snapshot 1');
        result.current.takeSnapshot('Snapshot 2');
      });

      expect(result.current.versionHistory[0].id).not.toBe(
        result.current.versionHistory[1].id
      );
    });

    it('stores current resume data in snapshot', () => {
      const { result } = renderHook(() => useStore());

      // Modify resume data first
      act(() => {
        result.current.setResumeData({
          ...result.current.resumeData,
          name: 'Test User',
        });
        result.current.takeSnapshot('After name change');
      });

      expect(result.current.versionHistory[0].resumeData.name).toBe('Test User');
    });

    it('limits history to maxVersionHistory (20)', () => {
      const { result } = renderHook(() => useStore());

      act(() => {
        for (let i = 0; i < 25; i++) {
          result.current.takeSnapshot(`Snapshot ${i}`);
        }
      });

      expect(result.current.versionHistory).toHaveLength(20);
      expect(result.current.versionHistory[0].label).toBe('Snapshot 24');
    });

    it('adds new snapshots to beginning of array', () => {
      const { result } = renderHook(() => useStore());

      act(() => {
        result.current.takeSnapshot('First');
        result.current.takeSnapshot('Second');
        result.current.takeSnapshot('Third');
      });

      expect(result.current.versionHistory[0].label).toBe('Third');
      expect(result.current.versionHistory[1].label).toBe('Second');
      expect(result.current.versionHistory[2].label).toBe('First');
    });
  });

  describe('restoreSnapshot', () => {
    it('creates snapshot before restore', () => {
      const { result } = renderHook(() => useStore());

      act(() => {
        result.current.takeSnapshot('Original');
      });

      const originalSnapshotId = result.current.versionHistory[0].id;
      const originalName = result.current.versionHistory[0].resumeData.name;

      act(() => {
        result.current.restoreSnapshot(originalSnapshotId);
      });

      // Should have 2 snapshots now (original + before restore)
      expect(result.current.versionHistory).toHaveLength(2);
      expect(result.current.versionHistory[0].label).toContain('Before restore:');
    });

    it('handles non-existent snapshot gracefully', () => {
      const { result } = renderHook(() => useStore());

      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      act(() => {
        result.current.restoreSnapshot('non-existent-id');
      });

      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Snapshot non-existent-id not found')
      );

      consoleWarn.mockRestore();
    });
  });

  describe('clearVersionHistory', () => {
    it('clears all snapshots', () => {
      const { result } = renderHook(() => useStore());

      act(() => {
        result.current.takeSnapshot('Snapshot 1');
        result.current.takeSnapshot('Snapshot 2');
        result.current.takeSnapshot('Snapshot 3');
      });

      expect(result.current.versionHistory).toHaveLength(3);

      act(() => {
        result.current.clearVersionHistory();
      });

      expect(result.current.versionHistory).toHaveLength(0);
    });
  });

  describe('VersionSnapshot Interface', () => {
    it('snapshot has all required fields', () => {
      const { result } = renderHook(() => useStore());

      act(() => {
        result.current.takeSnapshot('Test', 'manual');
      });

      const snapshot = result.current.versionHistory[0];

      expect(snapshot).toHaveProperty('id');
      expect(snapshot).toHaveProperty('timestamp');
      expect(snapshot).toHaveProperty('resumeData');
      expect(snapshot).toHaveProperty('label');
      expect(snapshot).toHaveProperty('type');
    });

    it('snapshot type can be manual, auto-before-ai, or auto-periodic', () => {
      const { result } = renderHook(() => useStore());

      act(() => {
        result.current.takeSnapshot('Manual', 'manual');
        result.current.takeSnapshot('Before AI', 'auto-before-ai');
      });

      expect(result.current.versionHistory[0].type).toBe('auto-before-ai');
      expect(result.current.versionHistory[1].type).toBe('manual');
    });
  });

  describe('Integration', () => {
    it('maintains history across multiple operations', () => {
      const { result } = renderHook(() => useStore());

      act(() => {
        // Take initial snapshot
        result.current.takeSnapshot('Initial');

        // Modify and snapshot
        result.current.setResumeData({
          ...result.current.resumeData,
          name: 'Version 2',
        });
        result.current.takeSnapshot('Version 2');

        // Modify and snapshot
        result.current.setResumeData({
          ...result.current.resumeData,
          name: 'Version 3',
        });
        result.current.takeSnapshot('Version 3');
      });

      expect(result.current.versionHistory).toHaveLength(3);
      expect(result.current.resumeData.name).toBe('Version 3');

      // Restore to Version 2
      act(() => {
        result.current.restoreSnapshot(result.current.versionHistory[1].id);
      });

      expect(result.current.resumeData.name).toBe('Version 2');
      expect(result.current.versionHistory).toHaveLength(4); // Includes before-restore snapshot
    });
  });
});
