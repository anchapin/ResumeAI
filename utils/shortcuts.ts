/**
 * Keyboard shortcuts for power users
 */

import { KeyboardShortcut } from '../types';

/**
 * Default keyboard shortcuts configuration
 */
export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  // File operations
  { key: 'Ctrl+S', action: 'Save resume', category: 'File' },
  { key: 'Ctrl+Shift+S', action: 'Save as draft', category: 'File' },
  { key: 'Ctrl+N', action: 'New resume', category: 'File' },
  { key: 'Ctrl+E', action: 'Export resume', category: 'File' },
  { key: 'Ctrl+I', action: 'Import resume', category: 'File' },

  // Edit operations
  { key: 'Ctrl+Z', action: 'Undo', category: 'Edit' },
  { key: 'Ctrl+Shift+Z', action: 'Redo', category: 'Edit' },
  { key: 'Ctrl+F', action: 'Find', category: 'Edit' },
  { key: 'Ctrl+H', action: 'Replace', category: 'Edit' },
  { key: 'Ctrl+A', action: 'Select all', category: 'Edit' },

  // Navigation
  { key: 'Ctrl+/', action: 'Show keyboard shortcuts', category: 'Help' },
  { key: 'Ctrl+Home', action: 'Go to top', category: 'Navigation' },
  { key: 'Ctrl+End', action: 'Go to bottom', category: 'Navigation' },

  // View
  { key: 'Ctrl+P', action: 'Preview resume', category: 'View' },
  { key: 'Ctrl+Shift+P', action: 'Toggle fullscreen', category: 'View' },
  { key: 'Ctrl+1', action: 'Go to Dashboard', category: 'Navigation' },
  { key: 'Ctrl+2', action: 'Go to Editor', category: 'Navigation' },
  { key: 'Ctrl+3', action: 'Go to Workspace', category: 'Navigation' },

  // Actions
  { key: 'Ctrl+D', action: 'Duplicate current section', category: 'Edit' },
  { key: 'Ctrl+K', action: 'Add comment', category: 'Collaboration' },
  { key: 'Ctrl+Shift+C', action: 'Show version history', category: 'View' },
  { key: 'Ctrl+L', action: 'Share resume', category: 'File' },

  // Accessibility
  { key: 'Tab', action: 'Navigate to next field', category: 'Accessibility' },
  { key: 'Shift+Tab', action: 'Navigate to previous field', category: 'Accessibility' },
  { key: 'Esc', action: 'Close modal/dialog', category: 'Accessibility' },
  { key: 'Enter', action: 'Confirm action', category: 'Accessibility' },
];

/**
 * Check if a key combination matches a shortcut
 * @param event - Keyboard event
 * @param shortcut - Shortcut to check
 * @returns True if the event matches the shortcut
 */
export function matchesShortcut(
  event: KeyboardEvent,
  shortcut: string
): boolean {
  const parts = shortcut.split('+');
  const key = parts.pop()?.toLowerCase();

  const ctrl = parts.includes('Ctrl');
  const shift = parts.includes('Shift');
  const alt = parts.includes('Alt');
  const meta = parts.includes('Meta') || parts.includes('Cmd');

  return (
    event.key.toLowerCase() === key &&
    event.ctrlKey === ctrl &&
    event.shiftKey === shift &&
    event.altKey === alt &&
    event.metaKey === meta
  );
}

/**
 * Get shortcut for an action
 * @param action - Action to find
 * @returns Shortcut key or null
 */
export function getShortcutForAction(action: string): string | null {
  const shortcut = DEFAULT_SHORTCUTS.find(s => s.action === action);
  return shortcut ? shortcut.key : null;
}

/**
 * Format shortcut key for display
 * @param key - Shortcut key string
 * @returns Formatted shortcut (with special characters for Mac/Windows)
 */
export function formatShortcutForDisplay(key: string): string {
  if (typeof navigator !== 'undefined' && navigator.platform?.startsWith('Mac')) {
    return key
      .replace(/Ctrl/g, '⌘')
      .replace(/Alt/g, '⌥')
      .replace(/Shift/g, '⇧')
      .replace(/Meta/g, '⌘')
      .replace(/\+/g, '');
  }
  return key;
}

/**
 * Register keyboard shortcuts
 * @param shortcuts - Shortcuts to register
 * @param callback - Callback function when shortcut is triggered
 * @returns Cleanup function
 */
export function registerShortcuts(
  shortcuts: KeyboardShortcut[],
  callback: (action: string, event: KeyboardEvent) => void
): () => void {
  const handler = (e: KeyboardEvent) => {
    // Ignore if user is typing in an input field
    const target = e.target as HTMLElement | null;
    if (
      target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      )
    ) {
      return;
    }

    for (const shortcut of shortcuts) {
      if (matchesShortcut(e, shortcut.key)) {
        e.preventDefault();
        callback(shortcut.action, e);
        break;
      }
    }
  };

  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}
