import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { useFocus } from './useFocus';

describe('useFocus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should return ref and control functions', () => {
    const { result } = renderHook(() => useFocus());

    expect(result.current).toHaveProperty('ref');
    expect(result.current).toHaveProperty('setFocus');
    expect(result.current).toHaveProperty('saveFocus');
    expect(result.current).toHaveProperty('restoreFocus');
    expect(result.current).toHaveProperty('blur');
  });

  it('should set focus when setFocus is called', () => {
    const { result } = renderHook(() => useFocus());
    const mockElement = document.createElement('button');
    const focusSpy = vi.spyOn(mockElement, 'focus');

    result.current.ref.current = mockElement as any;
    result.current.setFocus();

    expect(focusSpy).toHaveBeenCalled();
  });

  it('should blur element when blur is called', () => {
    const { result } = renderHook(() => useFocus());
    const mockElement = document.createElement('button');
    const blurSpy = vi.spyOn(mockElement, 'blur');

    result.current.ref.current = mockElement as any;
    result.current.blur();

    expect(blurSpy).toHaveBeenCalled();
  });

  it('should save current active element', () => {
    const { result } = renderHook(() => useFocus());
    const mockElement = document.createElement('button');
    document.body.appendChild(mockElement);
    mockElement.focus();

    result.current.saveFocus();

    expect(document.activeElement).toBe(mockElement);

    document.body.removeChild(mockElement);
  });
});
