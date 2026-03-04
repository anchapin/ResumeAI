import { useRef, useCallback, useEffect } from 'react';

/**
 * Options for useFocus hook
 */
interface UseFocusOptions {
  /** Automatically focus the element on mount */
  autoFocus?: boolean;
  /** Restore focus when element unmounts */
  returnFocus?: boolean;
  /** Whether to restore focus on unmount (default: true) */
  restoreFocusOnUnmount?: boolean;
}

/**
 * Custom hook for managing focus on an element.
 * Provides methods to set, save, restore, and blur focus.
 * @param options - Configuration options for focus behavior
 * @returns Object containing ref and focus control methods
 */
export function useFocus(options: UseFocusOptions = {}) {
  const { autoFocus = false, returnFocus = false, restoreFocusOnUnmount = true } = options;
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const currentRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (autoFocus && currentRef.current) {
      currentRef.current.focus();
    }
  }, [autoFocus]);

  const setFocus = useCallback(() => {
    if (currentRef.current) {
      currentRef.current.focus();
    }
  }, []);

  const saveFocus = useCallback(() => {
    previousActiveElement.current = document.activeElement as HTMLElement;
  }, []);

  const restoreFocus = useCallback(() => {
    if (restoreFocusOnUnmount && previousActiveElement.current) {
      previousActiveElement.current.focus();
    }
  }, [restoreFocusOnUnmount]);

  const blur = useCallback(() => {
    currentRef.current?.blur();
  }, []);

  return {
    ref: currentRef,
    setFocus,
    saveFocus,
    restoreFocus,
    blur,
  };
}
