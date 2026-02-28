import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { useFocusTrap } from './useFocusTrap';

describe('useFocusTrap', () => {
  let mockContainer: HTMLDivElement;
  let mockElement1: HTMLButtonElement;
  let mockElement2: HTMLButtonElement;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContainer = document.createElement('div');
    mockElement1 = document.createElement('button');
    mockElement2 = document.createElement('button');
    mockContainer.appendChild(mockElement1);
    mockContainer.appendChild(mockElement2);
    document.body.appendChild(mockContainer);
  });

  afterEach(() => {
    cleanup();
    document.body.removeChild(mockContainer);
  });

  it('should return ref and control functions', () => {
    const { result } = renderHook(() => useFocusTrap());

    expect(result.current).toHaveProperty('ref');
    expect(result.current).toHaveProperty('activate');
    expect(result.current).toHaveProperty('deactivate');
  });

  it('should activate focus trap and focus first element', () => {
    const { result } = renderHook(() => useFocusTrap());

    result.current.ref.current = mockContainer as any;
    result.current.activate();

    expect(document.activeElement).toBe(mockElement1);
  });

  it('should return focus to previous element on deactivate', () => {
    const { result } = renderHook(() => useFocusTrap({ returnFocusOnDeactivate: true }));

    const initialFocus = document.createElement('button');
    document.body.appendChild(initialFocus);
    initialFocus.focus();

    result.current.ref.current = mockContainer as any;
    result.current.activate();

    expect(document.activeElement).toBe(mockElement1);

    result.current.deactivate();

    expect(document.activeElement).toBe(initialFocus);

    document.body.removeChild(initialFocus);
  });

  it('should not return focus when returnFocusOnDeactivate is false', () => {
    const { result } = renderHook(() => useFocusTrap({ returnFocusOnDeactivate: false }));

    const initialFocus = document.createElement('button');
    document.body.appendChild(initialFocus);
    initialFocus.focus();

    result.current.ref.current = mockContainer as any;
    result.current.activate();
    result.current.deactivate();

    expect(document.activeElement).not.toBe(initialFocus);

    document.body.removeChild(initialFocus);
  });

  it('should filter disabled elements from focusable elements', () => {
    const disabledButton = document.createElement('button');
    disabledButton.disabled = true;
    mockContainer.appendChild(disabledButton);

    const { result } = renderHook(() => useFocusTrap());

    result.current.ref.current = mockContainer as any;
    result.current.activate();

    expect(document.activeElement).toBe(mockElement1);
  });

  it('should filter aria-hidden elements from focusable elements', () => {
    const hiddenButton = document.createElement('button');
    hiddenButton.setAttribute('aria-hidden', 'true');
    mockContainer.appendChild(hiddenButton);

    const { result } = renderHook(() => useFocusTrap());

    result.current.ref.current = mockContainer as any;
    result.current.activate();

    expect(document.activeElement).toBe(mockElement1);
  });
});
