/**
 * Type-safe mock factory utilities for testing
 * Provides reusable, typed mock generators for common data structures
 */

import React from 'react';
import type { WorkItem, EducationItem, Project, Skill } from '@/types';

// ============================================
// Base Mock Types
// ============================================

export interface MockOptions<T> {
  overrides?: Partial<T>;
  omit?: (keyof T)[];
}

/**
 * Creates a partial mock with optional overrides
 */
export function createMock<T>(defaults: T, options?: MockOptions<T>): Partial<T> {
  const { overrides = {}, omit = [] } = options || {};
  
  const result: Partial<T> = {};
  
  // Apply defaults for non-omitted keys
  (Object.keys(defaults) as (keyof T)[])
    .filter(key => !omit.includes(key))
    .forEach(key => {
      result[key] = defaults[key];
    });
  
  // Apply overrides
  Object.assign(result, overrides);
  
  return result;
}

// ============================================
// Resume Data Mocks
// ============================================

export function createMockWorkItem(overrides?: Partial<WorkItem>): WorkItem {
  const now = new Date().toISOString();
  
  return {
    name: 'Software Engineer',
    description: 'Built awesome things',
    startDate: '2020-01',
    endDate: now,
    highlights: ['Achievement 1', 'Achievement 2'],
    ...overrides,
  };
}

export function createMockEducationItem(overrides?: Partial<EducationItem>): EducationItem {
  return {
    name: 'University of Technology',
    description: 'Bachelor of Science in Computer Science',
    startDate: '2016-09',
    endDate: '2020-05',
    ...overrides,
  };
}

export function createMockProject(overrides?: Partial<Project>): Project {
  return {
    name: 'Awesome Project',
    description: 'A really cool project',
    highlights: ['Built from scratch', 'Used modern tech'],
    keywords: ['React', 'TypeScript'],
    ...overrides,
  };
}

export function createMockSkill(overrides?: Partial<Skill>): Skill {
  return {
    name: 'TypeScript',
    keywords: ['JavaScript', 'TypeScript'],
    ...overrides,
  };
}

// ============================================
// API Response Mocks
// ============================================

export interface MockApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export function createMockApiSuccess<T>(
  data: T,
  status = 200,
  message?: string
): MockApiResponse<T> {
  return { data, status, message };
}

export function createMockApiError(
  message: string,
  status = 500,
  errorCode?: string
): MockApiResponse<null> {
  return {
    data: null,
    status,
    message: errorCode ? `${errorCode}: ${message}` : message,
  };
}

// ============================================
// React Component Mocks
// ============================================

/**
 * Creates a type-safe mock for React.FC
 */
export function createMockComponent<T extends object>(
  componentName: string
): React.FC<T> {
  // eslint-disable-next-line react/display-name
  return ((props: T) => {
    const propsString = JSON.stringify(props, null, 2);
    return (
      <div data-testid={componentName}>
        Mock {componentName}
        <pre data-testid={`${componentName}-props`}>{propsString}</pre>
      </div>
    );
  }) as React.FC<T>;
}

/**
 * Creates a type-safe mock for useState
 */
export function createMockUseState<T>(initialValue: T): [
  T,
  (value: T | ((prev: T) => T)) => void
] {
  let value = initialValue;
  
  const setter = (newValue: T | ((prev: T) => T)) => {
    if (typeof newValue === 'function') {
      value = (newValue as (prev: T) => T)(value);
    } else {
      value = newValue;
    }
  };
  
  return [value, setter];
}

/**
 * Creates a type-safe mock for useEffect
 */
export function createMockUseEffect(): (
  effect: () => void | (() => void),
  deps?: unknown[]
) => void {
  return (effect, deps) => {
    // In tests, effects run immediately
    const cleanup = effect();
    return cleanup;
  };
}

// ============================================
// Store Mocks
// ============================================

/**
 * Type-safe mock for zustand store
 */
export function createMockStore<T extends Record<string, unknown>>(
  initialState: T
): {
  getState: () => T;
  setState: (partial: Partial<T> | ((prev: T) => Partial<T>)) => void;
  subscribe: (listener: (state: T) => void) => () => void;
} {
  let state = { ...initialState };
  const listeners = new Set<(state: T) => void>();
  
  return {
    getState: () => state,
    setState: (partial) => {
      const nextState = typeof partial === 'function' 
        ? partial(state) 
        : partial;
      state = { ...state, ...nextState };
      listeners.forEach(listener => listener(state));
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

// ============================================
// Event Handler Mocks
// ============================================

/**
 * Creates a type-safe mock event handler
 */
export function createMockEventHandler<T = unknown>(): {
  handler: (data: T) => void;
  calls: { args: [T] }[];
  mock: ReturnType<typeof vi.fn>;
} {
  const calls: { args: [T] }[] = [];
  const mock = vi.fn((data: T) => {
    calls.push({ args: [data] });
  });
  
  return {
    handler: mock,
    calls,
    mock,
  };
}

/**
 * Creates a type-safe mock for FormEvent
 */
export function createMockFormEvent<T = Record<string, unknown>>(
  overrides?: Partial<React.FormEvent<T>>
): React.FormEvent<T> {
  return {
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    currentTarget: null as unknown as T,
    target: null as unknown as EventTarget & T,
    bubbles: false,
    cancelable: false,
    defaultPrevented: false,
    eventPhase: 0,
    isTrusted: false,
    timeStamp: 0,
    type: 'submit',
    ...overrides,
  } as unknown as React.FormEvent<T>;
}

/**
 * Creates a type-safe mock for ChangeEvent
 */
export function createMockChangeEvent<T = HTMLInputElement>(
  value: string,
  overrides?: Partial<React.ChangeEvent<T>>
): React.ChangeEvent<T> {
  return {
    ...createMockFormEvent(overrides),
    target: {
      ...(overrides?.target || {}),
      value,
      name: overrides?.target?.name,
      type: 'text',
    } as T,
  } as unknown as React.ChangeEvent<T>;
}

// ============================================
// Async/Mock Function Utilities
// ============================================

/**
 * Creates a resolved promise with typed value
 */
export function resolvedPromise<T>(value: T): Promise<T> {
  return Promise.resolve(value);
}

/**
 * Creates a rejected promise with typed error
 */
export function rejectedPromise<E extends Error = Error>(error: E): Promise<never> {
  return Promise.reject(error);
}

/**
 * Delays execution by specified milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// Test Data Arrays
// ============================================

/**
 * Generates multiple mock work items for list testing
 */
export function generateMockWorkItems(count: number): WorkItem[] {
  return Array.from({ length: count }, (_, i) => 
    createMockWorkItem({
      name: `Position ${i + 1}`,
      description: `Description ${i + 1}`,
    })
  );
}

/**
 * Generates multiple mock education items
 */
export function generateMockEducationItems(count: number): EducationItem[] {
  return Array.from({ length: count }, (_, i) => 
    createMockEducationItem({
      name: `School ${i + 1}`,
      description: `Degree ${i + 1}`,
    })
  );
}

