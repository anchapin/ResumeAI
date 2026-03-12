/**
 * Type-safe mock factory utilities for testing
 * Provides reusable, strongly-typed mock creation helpers
 */

import { vi, Mock, MockedFunction } from 'vitest';

/**
 * Creates a strongly-typed mock function with proper type inference
 * @example
 * const mockFetch = createMockFn<typeof fetch>();
 * mockFetch.mockResolvedValue({ ok: true } as Response);
 */
export function createMockFn<T extends (...args: any[]) => any>(): MockedFunction<T> {
  return vi.fn() as MockedFunction<T>;
}

/**
 * Creates a mock function with a default resolved value
 * @example
 * const mockFetch = createMockFnWithDefault<typeof fetch>(defaultResponse);
 */
export function createMockFnWithDefault<T extends (...args: any[]) => any>(
  defaultValue: Awaited<ReturnType<T>>,
): MockedFunction<T> {
  const mock = vi.fn(() => Promise.resolve(defaultValue)) as MockedFunction<T>;
  return mock;
}

/**
 * Creates a mock async function that resolves to a value
 * @example
 * const mockApi = createAsyncMock<string>(data);
 */
export function createAsyncMock<T>(value: T): Mock<() => Promise<T>> {
  return vi.fn(async () => value);
}

/**
 * Creates a mock that rejects with an error
 * @example
 * const mockFail = createFailingMock(new Error('Network error'));
 */
export function createFailingMock<T extends (...args: any[]) => any>(
  error: Error,
): MockedFunction<T> {
  const mock = vi.fn() as MockedFunction<T>;
  mock.mockRejectedValue(error);
  return mock;
}

/**
 * Creates a mock object with type-safe methods
 * @example
 * const mockObj = createMockObject<MyClass>({
 *   method: vi.fn().mockResolvedValue(result),
 * });
 */
export function createMockObject<T>(overrides: Partial<Record<keyof T, any>> = {}): Partial<T> {
  return overrides as Partial<T>;
}

/**
 * Creates a spy on an object method with type safety
 * @example
 * const spy = createMethodSpy(obj, 'methodName');
 */
export function createMethodSpy<T extends object, K extends keyof T>(
  obj: T,
  method: K,
): Mock {
  return vi.spyOn(obj, method as any) as unknown as Mock;
}

/**
 * Creates type-safe mock responses for API-like functions
 * @example
 * const mockResponse = createMockResponse({ data: {...}, status: 200 });
 */
export function createMockResponse<T>(data: T): T {
  return data;
}

/**
 * Helper to verify mock was called with expected arguments
 * @example
 * expectCalledWith(mockFn, [arg1, arg2]);
 */
export function expectCalledWith<T extends Mock>(
  mock: T,
  args: Parameters<T> extends [infer P] ? [P] : Parameters<T>,
): void {
  expect(mock).toHaveBeenCalledWith(...args);
}

/**
 * Helper to verify mock call count
 * @example
 * expectCallCount(mockFn, 3);
 */
export function expectCallCount<T extends Mock>(mock: T, count: number): void {
  expect(mock).toHaveBeenCalledTimes(count);
}

/**
 * Reset all mocks at once
 * @example
 * resetAllMocks([mock1, mock2, mock3]);
 */
export function resetAllMocks(mocks: Mock[]): void {
  mocks.forEach(mock => {
    mock.mockClear();
    mock.mockReset();
  });
}

/**
 * Creates a mock for React hooks with proper cleanup
 * @example
 * const mockHook = createHookMock(() => ({ data: null, loading: true }));
 */
export function createHookMock<T extends (...args: any[]) => any>(
  implementation: T,
): MockedFunction<T> {
  return vi.fn(implementation);
}
