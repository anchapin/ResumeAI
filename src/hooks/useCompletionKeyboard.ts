/**
 * useCompletionKeyboard Hook
 * 
 * Handles keyboard navigation for completions.
 * 
 * Keyboard Shortcuts:
 * - Tab: Accept completion
 * - Arrow Up/Down: Navigate completions
 * - Escape: Dismiss completions
 * - Enter: Accept selected completion
 * 
 * @example
 * const { onKeyDown, selectedIndex } = useCompletionKeyboard(
 *   completions,
 *   handleAccept,
 *   handleDismiss
 * );
 */

import { useCallback, useState } from 'react';
import type { CompletionSuggestion, UseCompletionKeyboardReturn } from '../../types/autocomplete';

export function useCompletionKeyboard(
  completions: CompletionSuggestion[],
  onAccept: (completion: CompletionSuggestion) => void,
  onDismiss: () => void
): UseCompletionKeyboardReturn {
  const [selectedIndex, setSelectedIndex] = useState(0);

  /**
   * Handle keyboard events.
   */
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      // Don't handle if no completions
      if (!completions || completions.length === 0) return;

      switch (event.key) {
        case 'ArrowDown':
          // Navigate to next completion
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev < completions.length - 1 ? prev + 1 : 0
          );
          break;

        case 'ArrowUp':
          // Navigate to previous completion
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : completions.length - 1
          );
          break;

        case 'Tab':
          // Accept current completion
          event.preventDefault();
          if (completions[selectedIndex]) {
            onAccept(completions[selectedIndex]);
          }
          break;

        case 'Enter':
          // Accept current completion
          event.preventDefault();
          if (completions[selectedIndex]) {
            onAccept(completions[selectedIndex]);
          }
          break;

        case 'Escape':
          // Dismiss completions
          event.preventDefault();
          onDismiss();
          break;

        default:
          break;
      }
    },
    [completions, selectedIndex, onAccept, onDismiss]
  );

  return {
    onKeyDown,
    selectedIndex,
    setSelectedIndex,
  };
}

export default useCompletionKeyboard;
