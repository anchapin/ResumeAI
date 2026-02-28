import { useRef, useCallback, useEffect } from 'react';

interface UseFocusOptions {
  autoFocus?: boolean;
  returnFocus?: boolean;
  restoreFocusOnUnmount?: boolean;
}

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
