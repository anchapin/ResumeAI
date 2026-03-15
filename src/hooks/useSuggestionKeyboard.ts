/**
 * useSuggestionKeyboard Hook
 * 
 * Handles keyboard navigation for writing suggestions.
 * Implements industry-standard shortcuts for accept/reject.
 * 
 * Keyboard Shortcuts:
 * - Tab: Accept current suggestion
 * - Escape: Dismiss suggestion/popup
 * - Arrow Up/Down: Navigate suggestions
 * - Enter: Accept selected suggestion
 * - Delete: Reject selected suggestion
 * 
 * @param suggestions - List of suggestions
 * @param onAccept - Callback when suggestion is accepted
 * @param onReject - Callback when suggestion is rejected
 * @returns Keyboard handlers
 * 
 * @example
 * const { onKeyDown } = useSuggestionKeyboard(
 *   suggestions,
 *   acceptSuggestion,
 *   rejectSuggestion
 * );
 * 
 * <textarea onKeyDown={onKeyDown} />
 */

import { useCallback, useState, useEffect } from 'react';
import type { Suggestion } from '../../types/writing-assistant';

interface UseSuggestionKeyboardReturn {
  onKeyDown: (event: React.KeyboardEvent) => void;
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
}

export function useSuggestionKeyboard(
  suggestions: Suggestion[],
  onAccept: (id: string, replacement: string) => void | Promise<void>,
  onReject: (id: string) => void | Promise<void>
): UseSuggestionKeyboardReturn {
  const [selectedIndex, setSelectedIndex] = useState(0);

  /**
   * Handle keyboard events.
   */
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      // Don't handle if no suggestions
      if (suggestions.length === 0) return;

      switch (event.key) {
        case 'ArrowDown':
          // Navigate to next suggestion
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          break;

        case 'ArrowUp':
          // Navigate to previous suggestion
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          break;

        case 'Tab':
          // Accept current suggestion (if popup is open)
          if (suggestions[selectedIndex]) {
            event.preventDefault();
            const suggestion = suggestions[selectedIndex];
            const replacement = suggestion.replacements[0] || '';
            if (replacement) {
              onAccept(suggestion.id, replacement);
            }
          }
          break;

        case 'Enter':
          // Accept current suggestion
          if (suggestions[selectedIndex]) {
            event.preventDefault();
            const suggestion = suggestions[selectedIndex];
            const replacement = suggestion.replacements[0] || '';
            if (replacement) {
              onAccept(suggestion.id, replacement);
            }
          }
          break;

        case 'Delete':
        case 'Backspace':
          // Reject current suggestion (with modifier)
          if (event.metaKey || event.ctrlKey) {
            event.preventDefault();
            if (suggestions[selectedIndex]) {
              onReject(suggestions[selectedIndex].id);
            }
          }
          break;

        case 'Escape':
          // Clear selection / close popup
          event.preventDefault();
          setSelectedIndex(0);
          break;

        default:
          break;
      }
    },
    [suggestions, selectedIndex, onAccept, onReject]
  );

  return {
    onKeyDown,
    selectedIndex,
    setSelectedIndex,
  };
}

/**
 * useSuggestionShortcuts Hook
 * 
 * Global keyboard shortcuts for writing assistant.
 * 
 * Global Shortcuts:
 * - Ctrl+Shift+S: Toggle suggestion sidebar
 * - Ctrl+Space: Trigger suggestions at cursor
 * - Ctrl+Shift+A: Accept all suggestions
 * - Ctrl+Shift+R: Reject all suggestions
 * 
 * @param handlers - Handler functions
 * @returns Cleanup function
 * 
 * @example
 * useEffect(() => {
 *   return useSuggestionShortcuts({
 *     onToggleSidebar: () => setShowSidebar(!showSidebar),
 *     onAcceptAll: () => acceptAll(),
 *   });
 * }, []);
 */

interface ShortcutHandlers {
  onToggleSidebar?: () => void;
  onTriggerSuggestions?: () => void;
  onAcceptAll?: () => void;
  onRejectAll?: () => void;
}

export function useSuggestionShortcuts(
  handlers: ShortcutHandlers
) {
  const {
    onToggleSidebar,
    onTriggerSuggestions,
    onAcceptAll,
    onRejectAll,
  } = handlers;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for modifier keys
      const isCtrl = event.ctrlKey || event.metaKey;
      const isShift = event.shiftKey;

      if (!isCtrl) return;

      // Ctrl+Shift+S: Toggle sidebar
      if (isShift && event.key === 'S') {
        event.preventDefault();
        onToggleSidebar?.();
      }

      // Ctrl+Space: Trigger suggestions
      if (event.code === 'Space' && !isShift) {
        event.preventDefault();
        onTriggerSuggestions?.();
      }

      // Ctrl+Shift+A: Accept all
      if (isShift && event.key === 'A') {
        event.preventDefault();
        onAcceptAll?.();
      }

      // Ctrl+Shift+R: Reject all
      if (isShift && event.key === 'R') {
        event.preventDefault();
        onRejectAll?.();
      }
    };

    // Add global listener
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onToggleSidebar, onTriggerSuggestions, onAcceptAll, onRejectAll]);
}
