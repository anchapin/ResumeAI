import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme } from './useTheme';

const mockStore = {
  theme: 'light',
  setTheme: vi.fn(),
  toggleTheme: vi.fn(),
};

vi.mock('../store/store', () => ({
  useStore: vi.fn((selector) => selector(mockStore)),
}));

describe('useTheme Hook', () => {
  let storageMock: any;
  let getItemSpy: any;
  let setItemSpy: any;
  let classListSpy: any;

  beforeEach(() => {
    storageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    };

    // Spy on Storage prototype to delegate to our mock
    getItemSpy = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation((key: string) => storageMock.getItem(key));
    setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation((key: string, value: string) => storageMock.setItem(key, value));

    classListSpy = {
      add: vi.fn(),
      remove: vi.fn(),
    };
    vi.spyOn(document.documentElement, 'classList', 'get').mockReturnValue(classListSpy);

    mockStore.setTheme.mockClear();
    mockStore.toggleTheme.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns theme and helper functions', () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current).toHaveProperty('theme');
    expect(result.current).toHaveProperty('isDark');
    expect(result.current).toHaveProperty('toggleTheme');
    expect(result.current).toHaveProperty('setTheme');
  });

  it('correctly determines isDark', () => {
    mockStore.theme = 'dark';
    const { result } = renderHook(() => useTheme());

    expect(result.current.isDark).toBe(true);
  });

  it('correctly determines isLight', () => {
    mockStore.theme = 'light';
    const { result } = renderHook(() => useTheme());

    expect(result.current.isDark).toBe(false);
  });

  it('adds dark class when theme is dark', () => {
    mockStore.theme = 'dark';
    renderHook(() => useTheme());

    expect(classListSpy.add).toHaveBeenCalledWith('dark');
  });

  it('removes dark class when theme is light', () => {
    mockStore.theme = 'light';
    renderHook(() => useTheme());

    expect(classListSpy.remove).toHaveBeenCalledWith('dark');
  });

  it('saves theme to localStorage', () => {
    mockStore.theme = 'dark';
    renderHook(() => useTheme());

    expect(storageMock.setItem).toHaveBeenCalledWith('resumeai_theme', 'dark');
  });

  it('loads theme from localStorage on mount', () => {
    storageMock.getItem.mockReturnValue('dark');
    renderHook(() => useTheme());

    expect(mockStore.setTheme).toHaveBeenCalledWith('dark');
  });

  it('does not load invalid theme from localStorage', () => {
    storageMock.getItem.mockReturnValue('invalid');
    renderHook(() => useTheme());

    expect(mockStore.setTheme).not.toHaveBeenCalledWith('invalid');
  });

  it('prefers system dark mode when no stored theme', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any);

    storageMock.getItem.mockReturnValue(null);
    renderHook(() => useTheme());

    expect(mockStore.setTheme).toHaveBeenCalledWith('dark');
  });

  it('prefers system light mode when no stored theme', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any);

    storageMock.getItem.mockReturnValue(null);
    renderHook(() => useTheme());

    expect(mockStore.setTheme).toHaveBeenCalledWith('light');
  });

  it('listens to system theme changes when no stored theme', () => {
    const mediaQueryMock = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    vi.spyOn(window, 'matchMedia').mockReturnValue(mediaQueryMock as any);
    storageMock.getItem.mockReturnValue(null);

    const { unmount } = renderHook(() => useTheme());

    expect(mediaQueryMock.addEventListener).toHaveBeenCalled();
    unmount();
    expect(mediaQueryMock.removeEventListener).toHaveBeenCalled();
  });

  it('does not listen to system theme changes when theme is stored', () => {
    const mediaQueryMock = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    vi.spyOn(window, 'matchMedia').mockReturnValue(mediaQueryMock as any);
    storageMock.getItem.mockReturnValue('dark');

    const { unmount } = renderHook(() => useTheme());

    expect(mediaQueryMock.addEventListener).not.toHaveBeenCalled();
  });

  it('calls toggleTheme when toggleTheme is called', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.toggleTheme();
    });

    expect(mockStore.toggleTheme).toHaveBeenCalled();
  });

  it('calls setTheme when setTheme is called', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme('dark');
    });

    expect(mockStore.setTheme).toHaveBeenCalledWith('dark');
  });

  it('updates DOM class when theme changes', () => {
    const { rerender } = renderHook(() => useTheme());

    mockStore.theme = 'light';
    act(() => {
      rerender();
    });
    expect(classListSpy.remove).toHaveBeenCalledWith('dark');

    mockStore.theme = 'dark';
    act(() => {
      rerender();
    });
    expect(classListSpy.add).toHaveBeenCalledWith('dark');
  });

  it('updates localStorage when theme changes', () => {
    const { rerender } = renderHook(() => useTheme());

    mockStore.theme = 'dark';
    act(() => {
      rerender();
    });
    expect(storageMock.setItem).toHaveBeenCalledWith('resumeai_theme', 'dark');
  });
});
