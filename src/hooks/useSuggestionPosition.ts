/**
 * useSuggestionPosition Hook
 * 
 * Calculates the position for suggestion popup relative to text cursor.
 * Uses textarea caret position to place popup at the right location.
 * 
 * @param textareaRef - Reference to textarea element
 * @param offset - Character offset in text
 * @returns Position coordinates (top, left, width)
 * 
 * @example
 * const textareaRef = useRef<HTMLTextAreaElement>(null);
 * const { top, left, width } = useSuggestionPosition(textareaRef, offset);
 * 
 * <div style={{ top, left, width }} className="suggestion-popup">
 *   ...
 * </div>
 */

import { useState, useEffect, useCallback, RefObject } from 'react';
import type { SuggestionPosition } from '../../types/writing-assistant';

interface UseSuggestionPositionReturn extends SuggestionPosition {
  updatePosition: () => void;
}

export function useSuggestionPosition(
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  offset: number
): UseSuggestionPositionReturn {
  const [position, setPosition] = useState<SuggestionPosition>({
    top: 0,
    left: 0,
    width: 0,
  });

  /**
   * Calculate caret position in textarea.
   */
  const getCaretCoordinates = useCallback(
    (element: HTMLTextAreaElement, position: number): { top: number; left: number } => {
      // Create mirror div to calculate position
      const mirror = document.createElement('div');
      const style = getComputedStyle(element);

      // Copy styles from textarea to mirror
      mirror.style.position = 'absolute';
      mirror.style.visibility = 'hidden';
      mirror.style.whiteSpace = 'pre-wrap';
      mirror.style.width = style.width;
      mirror.style.font = style.font;
      mirror.style.padding = style.padding;
      mirror.style.border = style.border;
      mirror.style.boxSizing = style.boxSizing;
      mirror.style.overflow = style.overflow;
      mirror.style.wordWrap = style.wordWrap;

      // Get text up to position
      const text = element.value.substring(0, position);
      mirror.textContent = text;

      // Add caret marker
      const caret = document.createElement('span');
      caret.textContent = '|';
      mirror.appendChild(caret);

      // Add to document
      document.body.appendChild(mirror);

      // Get coordinates
      const caretRect = caret.getBoundingClientRect();
      const textareaRect = element.getBoundingClientRect();

      // Calculate relative position
      const top = caretRect.top - textareaRect.top + element.scrollTop;
      const left = caretRect.left - textareaRect.left;

      // Clean up
      document.body.removeChild(mirror);

      return { top, left };
    },
    []
  );

  /**
   * Update popup position.
   */
  const updatePosition = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    try {
      const coords = getCaretCoordinates(textarea, offset);

      // Get line height for positioning below text
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight, 10) || 20;

      setPosition({
        top: coords.top + lineHeight + 4, // Position below caret with small gap
        left: coords.left,
        width: Math.max(200, textarea.offsetWidth - coords.left), // Minimum width
      });
    } catch (error) {
      console.error('Failed to calculate suggestion position:', error);
      // Fallback to default position
      setPosition({ top: 0, left: 0, width: 0 });
    }
  }, [textareaRef, offset, getCaretCoordinates]);

  // Update position on mount and when dependencies change
  useEffect(() => {
    updatePosition();
  }, [updatePosition]);

  // Update position on window resize
  useEffect(() => {
    const handleResize = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updatePosition]);

  // Update position on scroll
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleScroll = () => {
      updatePosition();
    };

    textarea.addEventListener('scroll', handleScroll);
    return () => textarea.removeEventListener('scroll', handleScroll);
  }, [textareaRef, updatePosition]);

  return {
    ...position,
    updatePosition,
  };
}

/**
 * Get caret coordinates for a textarea.
 * 
 * Utility function for calculating caret position.
 * Can be used independently of the hook.
 * 
 * @param element - Textarea element
 * @param position - Character offset
 * @returns Coordinates { top, left }
 */
export function getCaretCoordinates(
  element: HTMLTextAreaElement,
  position: number
): { top: number; left: number } {
  // Implementation same as in hook
  const mirror = document.createElement('div');
  const style = getComputedStyle(element);

  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.width = style.width;
  mirror.style.font = style.font;
  mirror.style.padding = style.padding;
  mirror.style.border = style.border;
  mirror.style.boxSizing = style.boxSizing;

  const text = element.value.substring(0, position);
  mirror.textContent = text;

  const caret = document.createElement('span');
  caret.textContent = '|';
  mirror.appendChild(caret);

  document.body.appendChild(mirror);

  const caretRect = caret.getBoundingClientRect();
  const textareaRect = element.getBoundingClientRect();

  const top = caretRect.top - textareaRect.top + element.scrollTop;
  const left = caretRect.left - textareaRect.left;

  document.body.removeChild(mirror);

  return { top, left };
}
