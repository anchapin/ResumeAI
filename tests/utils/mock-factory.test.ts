/**
 * Tests for type-safe mock factory utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockFn,
  createMockFnWithDefault,
  createAsyncMock,
  createFailingMock,
  createMockObject,
  createMethodSpy,
  resetAllMocks,
  expectCallCount,
} from '../../utils/test-utils/mock-factory';

describe('Mock Factory Utilities', () => {
  describe('createMockFn', () => {
    it('creates a mock function', () => {
      const mock = createMockFn<(x: number) => string>();
      expect(typeof mock).toBe('function');
      expect(vi.isMockFunction(mock)).toBe(true);
    });

    it('allows calling mock function', () => {
      const mock = createMockFn<(x: number) => string>();
      mock(42);
      expect(mock).toHaveBeenCalledWith(42);
    });

    it('allows setting return value', () => {
      const mock = createMockFn<(x: number) => string>();
      mock.mockReturnValue('test');
      expect(mock(42)).toBe('test');
    });
  });

  describe('createMockFnWithDefault', () => {
    it('creates a mock with default resolved value', async () => {
      const defaultValue = { success: true, data: 'test' };
      const mock = createMockFnWithDefault<() => Promise<typeof defaultValue>>(defaultValue);

      const result = await mock();
      expect(result).toEqual(defaultValue);
    });

    it('can override default value', async () => {
      const defaultValue = { success: true };
      const mock = createMockFnWithDefault<() => Promise<typeof defaultValue>>(defaultValue);
      const overrideValue = { success: false };

      mock.mockResolvedValueOnce(overrideValue);
      const result = await mock();
      expect(result).toEqual(overrideValue);
    });
  });

  describe('createAsyncMock', () => {
    it('creates an async mock that resolves', async () => {
      const testData = { id: 1, name: 'Test' };
      const mock = createAsyncMock(testData);

      const result = await mock();
      expect(result).toEqual(testData);
    });

    it('tracks calls to async mock', async () => {
      const mock = createAsyncMock({ value: 'test' });
      await mock();
      await mock();

      expectCallCount(mock, 2);
    });
  });

  describe('createFailingMock', () => {
    it('creates a mock that rejects with error', async () => {
      const error = new Error('Test error');
      const mock = createFailingMock<() => Promise<never>>(error);

      await expect(mock()).rejects.toThrow('Test error');
    });

    it('preserves error details', async () => {
      const error = new Error('Network failed');
      error.name = 'NetworkError';
      const mock = createFailingMock<() => Promise<never>>(error);

      try {
        await mock();
      } catch (e) {
        expect((e as Error).message).toBe('Network failed');
        expect((e as Error).name).toBe('NetworkError');
      }
    });
  });

  describe('createMockObject', () => {
    it('creates a partial mock object', () => {
      const mock = createMockObject<{ name: string; age: number }>({
        name: 'Test',
      });

      expect(mock.name).toBe('Test');
      expect(mock.age).toBeUndefined();
    });

    it('allows partial type definition', () => {
      const mockFn = vi.fn();
      const mock = createMockObject<{ onSubmit: (data: string) => void }>({
        onSubmit: mockFn,
      });

      mock.onSubmit?.('test');
      expect(mockFn).toHaveBeenCalledWith('test');
    });
  });

  describe('createMethodSpy', () => {
    it('spies on object methods', () => {
      const obj = {
        method: (x: number) => x * 2,
      };

      const spy = createMethodSpy(obj, 'method');
      obj.method(5);

      expect(spy).toHaveBeenCalledWith(5);
    });

    it('returns actual implementation result', () => {
      const obj = {
        method: (x: number) => x * 2,
      };

      createMethodSpy(obj, 'method');
      const result = obj.method(5);

      expect(result).toBe(10);
    });
  });

  describe('resetAllMocks', () => {
    it('clears all provided mocks', () => {
      const mock1 = vi.fn();
      const mock2 = vi.fn();
      const mock3 = vi.fn();

      mock1();
      mock2();
      mock3();

      expect(mock1).toHaveBeenCalledTimes(1);
      expect(mock2).toHaveBeenCalledTimes(1);
      expect(mock3).toHaveBeenCalledTimes(1);

      resetAllMocks([mock1, mock2, mock3]);

      expect(mock1).toHaveBeenCalledTimes(0);
      expect(mock2).toHaveBeenCalledTimes(0);
      expect(mock3).toHaveBeenCalledTimes(0);
    });

    it('resets mock implementations', () => {
      const mock = vi.fn().mockReturnValue('original');
      mock();
      resetAllMocks([mock]);

      mock.mockReturnValue('new');
      expect(mock()).toBe('new');
    });
  });
});
