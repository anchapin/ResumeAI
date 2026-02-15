import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  DEFAULT_SHORTCUTS, 
  matchesShortcut, 
  getShortcutForAction, 
  formatShortcutForDisplay,
  registerShortcuts 
} from './shortcuts';

describe('shortcuts utilities', () => {
  describe('DEFAULT_SHORTCUTS', () => {
    it('contains File category shortcuts', () => {
      const fileShortcuts = DEFAULT_SHORTCUTS.filter(s => s.category === 'File');
      expect(fileShortcuts.length).toBeGreaterThan(0);
      expect(fileShortcuts.some(s => s.action === 'Save resume')).toBe(true);
    });

    it('contains Edit category shortcuts', () => {
      const editShortcuts = DEFAULT_SHORTCUTS.filter(s => s.category === 'Edit');
      expect(editShortcuts.length).toBeGreaterThan(0);
    });

    it('contains Navigation category shortcuts', () => {
      const navShortcuts = DEFAULT_SHORTCUTS.filter(s => s.category === 'Navigation');
      expect(navShortcuts.length).toBeGreaterThan(0);
    });

    it('has all required keyboard shortcut properties', () => {
      DEFAULT_SHORTCUTS.forEach(shortcut => {
        expect(shortcut).toHaveProperty('key');
        expect(shortcut).toHaveProperty('action');
        expect(shortcut).toHaveProperty('category');
        expect(typeof shortcut.key).toBe('string');
        expect(typeof shortcut.action).toBe('string');
        expect(typeof shortcut.category).toBe('string');
      });
    });
  });

  describe('matchesShortcut', () => {
    it('matches Ctrl+S shortcut', () => {
      const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
      expect(matchesShortcut(event, 'Ctrl+S')).toBe(true);
    });

    it('does not match when ctrlKey is missing', () => {
      const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: false });
      expect(matchesShortcut(event, 'Ctrl+S')).toBe(false);
    });

    it('matches Ctrl+Shift+Z shortcut', () => {
      const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true });
      expect(matchesShortcut(event, 'Ctrl+Shift+Z')).toBe(true);
    });

    it('matches case-insensitive key', () => {
      const event = new KeyboardEvent('keydown', { key: 'S', ctrlKey: true });
      expect(matchesShortcut(event, 'Ctrl+S')).toBe(true);
    });

    it('does not match when shiftKey is missing for Ctrl+Shift', () => {
      const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: false });
      expect(matchesShortcut(event, 'Ctrl+Shift+Z')).toBe(false);
    });

    it('matches single key shortcut', () => {
      const event = new KeyboardEvent('keydown', { key: 'Tab' });
      expect(matchesShortcut(event, 'Tab')).toBe(true);
    });

    it('matches with Meta key for Mac', () => {
      const event = new KeyboardEvent('keydown', { key: 's', metaKey: true });
      expect(matchesShortcut(event, 'Meta+S')).toBe(true);
    });
  });

  describe('getShortcutForAction', () => {
    it('finds shortcut for Save resume', () => {
      const shortcut = getShortcutForAction('Save resume');
      expect(shortcut).toBe('Ctrl+S');
    });

    it('finds shortcut for Export resume', () => {
      const shortcut = getShortcutForAction('Export resume');
      expect(shortcut).toBe('Ctrl+E');
    });

    it('returns null for unknown action', () => {
      const shortcut = getShortcutForAction('Unknown Action');
      expect(shortcut).toBeNull();
    });

    it('returns null for empty action', () => {
      const shortcut = getShortcutForAction('');
      expect(shortcut).toBeNull();
    });
  });

  describe('formatShortcutForDisplay', () => {
    it('replaces Ctrl with symbol on Mac', () => {
      // Mock Mac navigator
      const originalPlatform = Object.getOwnPropertyDescriptor(navigator, 'platform');
      Object.defineProperty(navigator, 'platform', { value: 'MacIntel', configurable: true });
      
      expect(formatShortcutForDisplay('Ctrl+S')).toBe('⌘S');
      
      // Restore
      if (originalPlatform) {
        Object.defineProperty(navigator, 'platform', originalPlatform);
      }
    });

    it('keeps Ctrl on non-Mac', () => {
      // Mock non-Mac navigator
      const originalPlatform = Object.getOwnPropertyDescriptor(navigator, 'platform');
      Object.defineProperty(navigator, 'platform', { value: 'Win32', configurable: true });
      
      expect(formatShortcutForDisplay('Ctrl+S')).toBe('Ctrl+S');
      
      // Restore
      if (originalPlatform) {
        Object.defineProperty(navigator, 'platform', originalPlatform);
      }
    });

    it('replaces multiple modifiers', () => {
      const originalPlatform = Object.getOwnPropertyDescriptor(navigator, 'platform');
      Object.defineProperty(navigator, 'platform', { value: 'MacIntel', configurable: true });
      
      expect(formatShortcutForDisplay('Ctrl+Shift+Z')).toBe('⌘⇧Z');
      
      if (originalPlatform) {
        Object.defineProperty(navigator, 'platform', originalPlatform);
      }
    });
  });

  describe('registerShortcuts', () => {
    let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
    let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('registers keydown event listener', () => {
      const callback = vi.fn();
      registerShortcuts(DEFAULT_SHORTCUTS, callback);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('returns cleanup function', () => {
      const callback = vi.fn();
      const cleanup = registerShortcuts(DEFAULT_SHORTCUTS, callback);
      
      expect(typeof cleanup).toBe('function');
      
      cleanup();
      expect(removeEventListenerSpy).toHaveBeenCalled();
    });

    it('triggers callback when shortcut is matched', () => {
      const callback = vi.fn();
      const testShortcuts = [{ key: 'Ctrl+S', action: 'Save', category: 'Test' }];
      
      registerShortcuts(testShortcuts, callback);
      
      // Get the registered handler
      const handler = addEventListenerSpy.mock.calls[0][1] as (e: KeyboardEvent) => void;
      
      // Simulate keydown
      const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true });
      handler(event);
      
      expect(callback).toHaveBeenCalledWith('Save', expect.any(KeyboardEvent));
    });

    it('does not trigger callback when typing in input', () => {
      const callback = vi.fn();
      const testShortcuts = [{ key: 'Ctrl+S', action: 'Save', category: 'Test' }];
      
      registerShortcuts(testShortcuts, callback);
      
      const handler = addEventListenerSpy.mock.calls[0][1] as (e: KeyboardEvent) => void;
      
      // Create event from input element
      const input = document.createElement('input');
      const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true });
      Object.defineProperty(event, 'target', { value: input });
      
      handler(event);
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('does not trigger callback when typing in textarea', () => {
      const callback = vi.fn();
      const testShortcuts = [{ key: 'Ctrl+S', action: 'Save', category: 'Test' }];
      
      registerShortcuts(testShortcuts, callback);
      
      const handler = addEventListenerSpy.mock.calls[0][1] as (e: KeyboardEvent) => void;
      
      const textarea = document.createElement('textarea');
      const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true });
      Object.defineProperty(event, 'target', { value: textarea });
      
      handler(event);
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('prevents default on matched shortcut', () => {
      const callback = vi.fn();
      const testShortcuts = [{ key: 'Ctrl+S', action: 'Save', category: 'Test' }];
      
      registerShortcuts(testShortcuts, callback);
      
      const handler = addEventListenerSpy.mock.calls[0][1] as (e: KeyboardEvent) => void;
      
      const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      
      handler(event);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });
});
