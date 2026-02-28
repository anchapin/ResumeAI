import { useRef, useCallback, useEffect } from 'react';

interface UseFocusTrapOptions {
  isActive?: boolean;
  returnFocusOnDeactivate?: boolean;
}

export function useFocusTrap<T extends HTMLElement = HTMLElement>(
  options: UseFocusTrapOptions = {},
) {
  const { isActive = true, returnFocusOnDeactivate = true } = options;
  const trapRef = useRef<T>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const getFocusableElements = useCallback((container: HTMLElement): HTMLElement[] => {
    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
      (element) => {
        return (
          !element.hasAttribute('disabled') &&
          !element.getAttribute('aria-hidden') &&
          getComputedStyle(element).display !== 'none' &&
          getComputedStyle(element).visibility !== 'hidden'
        );
      },
    );
  }, []);

  const trapFocus = useCallback(
    (event: KeyboardEvent) => {
      if (!isActive || !trapRef.current) return;

      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements(trapRef.current);
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    },
    [isActive, getFocusableElements],
  );

  const activate = useCallback(() => {
    if (!trapRef.current) return;

    previousActiveElement.current = document.activeElement as HTMLElement;

    const focusableElements = getFocusableElements(trapRef.current);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    document.addEventListener('keydown', trapFocus);
  }, [getFocusableElements, trapFocus]);

  const deactivate = useCallback(() => {
    document.removeEventListener('keydown', trapFocus);

    if (returnFocusOnDeactivate && previousActiveElement.current) {
      previousActiveElement.current.focus();
    }
  }, [returnFocusOnDeactivate, trapFocus]);

  useEffect(() => {
    if (isActive) {
      activate();
      return () => deactivate();
    }
    return undefined;
  }, [isActive, activate, deactivate]);

  return {
    ref: trapRef,
    activate,
    deactivate,
  };
}
