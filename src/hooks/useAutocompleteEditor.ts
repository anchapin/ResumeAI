/**
 * useAutocompleteEditor Hook
 * 
 * Integrates auto-complete with text editor.
 * Manages triggering, positioning, and acceptance.
 * 
 * @example
 * const {
 *   showPopup,
 *   showInline,
 *   completions,
 *   handleKeyDown,
 *   handleChange,
 * } = useAutocompleteEditor();
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import { useAutocomplete } from './useAutocomplete';
import { useCompletionKeyboard } from './useCompletionKeyboard';
import type { CompletionSuggestion } from '../../types/autocomplete';

export interface UseAutocompleteEditorOptions {
  enabled?: boolean;
  debounceMs?: number;
  triggerOnTyping?: boolean;
  minCharsForTrigger?: number;
}

export interface UseAutocompleteEditorReturn {
  showPopup: boolean;
  showInline: boolean;
  completions: CompletionSuggestion[];
  inlineCompletion: CompletionSuggestion | null;
  popupPosition: { top: number; left: number; width: number } | null;
  inlinePosition: { top: number; left: number } | null;
  selectedIndex: number;
  handleKeyDown: (event: React.KeyboardEvent) => void;
  handleChange: (value: string, cursorPosition: number) => void;
  handleBlur: () => void;
  acceptCompletion: () => void;
  dismissCompletions: () => void;
}

export function useAutocompleteEditor(
  options: UseAutocompleteEditorOptions = {}
): UseAutocompleteEditorReturn {
  const {
    enabled = true,
    debounceMs = 150,
    triggerOnTyping = true,
    minCharsForTrigger = 3,
  } = options;

  const [showPopup, setShowPopup] = useState(false);
  const [showInline, setShowInline] = useState(false);
  const [popupPosition, setPopupPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [inlinePosition, setInlinePosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [currentText, setCurrentText] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Use autocomplete hook
  const {
    completions,
    isLoading,
    getCompletions,
    getBulletCompletions,
    acceptCompletion: acceptCompletionApi,
    dismissCompletions: dismissCompletionsApi,
  } = useAutocomplete();

  // Use keyboard hook
  const { onKeyDown, selectedIndex, setSelectedIndex } = useCompletionKeyboard(
    completions,
    handleAccept,
    handleDismiss
  );

  /**
   * Handle accepting completion.
   */
  function handleAccept(completion?: CompletionSuggestion) {
    const completionToAccept =
      completion || completions[selectedIndex];
    if (completionToAccept) {
      acceptCompletionApi(completionToAccept.id);
      // Would insert text into editor here
      setShowPopup(false);
      setShowInline(false);
    }
  }

  /**
   * Handle dismissing completions.
   */
  function handleDismiss() {
    dismissCompletionsApi();
    setShowPopup(false);
    setShowInline(false);
  }

  /**
   * Trigger completions.
   */
  const triggerCompletions = useCallback(
    (text: string, cursorPos: number) => {
      if (!enabled || !triggerOnTyping) return;

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Debounce
      debounceTimerRef.current = setTimeout(() => {
        const currentLine = getCurrentLine(text, cursorPos);
        
        if (currentLine.length >= minCharsForTrigger) {
          getCompletions({
            text: currentLine,
            cursorPosition: cursorPos,
          });
          setShowPopup(true);
        } else {
          setShowPopup(false);
          setShowInline(false);
        }
      }, debounceMs);
    },
    [enabled, triggerOnTyping, debounceMs, minCharsForTrigger, getCompletions]
  );

  /**
   * Get current line from text.
   */
  function getCurrentLine(text: string, cursorPos: number): string {
    const beforeCursor = text.substring(0, cursorPos);
    const lastNewline = beforeCursor.lastIndexOf('\n');
    return beforeCursor.substring(lastNewline + 1);
  }

  /**
   * Handle key down.
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (showPopup || showInline) {
        onKeyDown(event);
      }

      // Trigger on Ctrl+Space
      if (event.ctrlKey && event.code === 'Space') {
        event.preventDefault();
        triggerCompletions(currentText, cursorPosition);
      }
    },
    [showPopup, showInline, onKeyDown, currentText, cursorPosition, triggerCompletions]
  );

  /**
   * Handle text change.
   */
  const handleChange = useCallback(
    (value: string, cursorPos: number) => {
      setCurrentText(value);
      setCursorPosition(cursorPos);
      triggerCompletions(value, cursorPos);
    },
    [triggerCompletions]
  );

  /**
   * Handle blur.
   */
  const handleBlur = useCallback(() => {
    // Delay to allow click on completion
    setTimeout(() => {
      handleDismiss();
    }, 200);
  }, []);

  /**
   * Accept completion wrapper.
   */
  const handleAcceptWrapper = useCallback(() => {
    handleAccept();
  }, [handleAccept]);

  /**
   * Dismiss completions wrapper.
   */
  const handleDismissWrapper = useCallback(() => {
    handleDismiss();
  }, [handleDismiss]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    showPopup,
    showInline,
    completions,
    inlineCompletion: completions.length > 0 ? completions[0] : null,
    popupPosition,
    inlinePosition,
    selectedIndex,
    handleKeyDown,
    handleChange,
    handleBlur,
    acceptCompletion: handleAcceptWrapper,
    dismissCompletions: handleDismissWrapper,
  };
}

export default useAutocompleteEditor;
