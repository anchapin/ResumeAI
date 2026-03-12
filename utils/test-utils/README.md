# Type-Safe Mock Utilities

Comprehensive mock utilities for testing with full TypeScript support, improving test reliability and maintainability.

## Overview

This utility library provides three main categories of helpers:

1. **Mock Factory** - Core functions for creating type-safe mocks
2. **Mock Builders** - Fluent API for building complex mock objects
3. **Mock Data** - Pre-built data generators for common test scenarios

## Quick Start

### Basic Mock Function

```typescript
import { createMockFn } from '@/utils/test-utils';

const mockFetch = createMockFn<typeof fetch>();
mockFetch.mockResolvedValue({ ok: true } as Response);
```

### Mock with Default Value

```typescript
import { createMockFnWithDefault } from '@/utils/test-utils';

const mockApi = createMockFnWithDefault<() => Promise<User>>(defaultUser);
const result = await mockApi(); // Returns defaultUser
```

### Using Mock Builders

```typescript
import { apiClientBuilder, responseBuilder } from '@/utils/test-utils';

const client = apiClientBuilder()
  .withResolvedMethod('getUser', { id: 1, name: 'John' })
  .withRejectedMethod('createUser', new Error('Invalid'))
  .build();

const response = responseBuilder()
  .status(200)
  .json({ success: true })
  .header('Content-Type', 'application/json')
  .build();
```

### Using Mock Data

```typescript
import { mockUserData, mockApiResponse } from '@/utils/test-utils';

const user = mockUserData.base();
const response = mockApiResponse.success(user);
```

## API Reference

### Mock Factory Functions

#### `createMockFn<T>()`

Creates a strongly-typed mock function.

```typescript
const mockFetch = createMockFn<typeof fetch>();
mockFetch.mockResolvedValue({ ok: true } as Response);
expect(mockFetch).toHaveBeenCalledWith(url);
```

#### `createMockFnWithDefault<T>(value)`

Creates a mock function with a default resolved value.

```typescript
const mockApi = createMockFnWithDefault<() => Promise<Data>>(defaultData);
await mockApi(); // Returns defaultData
```

#### `createAsyncMock<T>(value)`

Creates an async mock that resolves to a specific value.

```typescript
const mockData = createAsyncMock({ id: 1 });
await mockData(); // Resolves to { id: 1 }
```

#### `createFailingMock<T>(error)`

Creates a mock that rejects with an error.

```typescript
const mockFail = createFailingMock<() => Promise<void>>(
  new Error('Network error')
);
await expect(mockFail()).rejects.toThrow('Network error');
```

#### `createMockObject<T>(overrides)`

Creates a partial mock object with type safety.

```typescript
const mockUser = createMockObject<User>({
  name: 'Test',
  email: 'test@example.com',
});
```

#### `createMethodSpy<T, K>(obj, method)`

Creates a spy on an object method.

```typescript
const spy = createMethodSpy(storage, 'setItem');
storage.setItem('key', 'value');
expect(spy).toHaveBeenCalledWith('key', 'value');
```

#### `expectCallCount<T>(mock, count)`

Helper to verify mock call count with type safety.

```typescript
expectCallCount(mockFn, 3);
```

#### `resetAllMocks(mocks)`

Resets multiple mocks at once.

```typescript
resetAllMocks([mock1, mock2, mock3]);
```

### Mock Builders

#### `ApiClientMockBuilder`

Fluent builder for API client mocks.

```typescript
const client = apiClientBuilder()
  .withMethod('fetch')
  .withResolvedMethod('getUser', userData)
  .withRejectedMethod('createUser', error)
  .build();
```

Methods:
- `withMethod(name, impl?)` - Add a mock method
- `withResolvedMethod(name, value)` - Add async method that resolves
- `withRejectedMethod(name, error)` - Add async method that rejects
- `reset()` - Clear all mocks
- `build()` - Return the built object

#### `PropsMockBuilder<T>`

Fluent builder for component props.

```typescript
const props = propsBuilder<MyComponentProps>()
  .withValue('title', 'Test Title')
  .withCallback('onSubmit', mockFn)
  .build();
```

Methods:
- `withValue(key, value)` - Set a prop value
- `withCallback(key, callback)` - Set a prop callback
- `build()` - Return the built props object

#### `ResponseMockBuilder`

Fluent builder for HTTP responses.

```typescript
const response = responseBuilder()
  .status(200)
  .json({ data: 'test' })
  .header('Content-Type', 'application/json')
  .build();
```

Methods:
- `status(code)` - Set HTTP status code
- `json(data)` - Set JSON response body
- `text(text)` - Set text response body
- `header(key, value)` - Add response header
- `build()` - Return the built response

#### `ErrorMockBuilder`

Fluent builder for error objects.

```typescript
const error = errorBuilder()
  .withCode('VALIDATION_ERROR')
  .withMessage('Invalid email')
  .withStatus('failed')
  .withDetails({ field: 'email' })
  .build();

const err = errorBuilder()
  .withMessage('Network error')
  .buildAsError(); // Returns Error instance
```

Methods:
- `withStatus(status)` - Set error status
- `withMessage(message)` - Set error message
- `withCode(code)` - Set error code
- `withDetails(details)` - Add error details
- `build()` - Return error object
- `buildAsError()` - Return Error instance

### Mock Data Generators

#### `mockUserData`

User data generator.

```typescript
const user = mockUserData.base();
const admin = mockUserData.admin();
const custom = mockUserData.withCustom({ role: 'user', active: true });
```

#### `mockResumeData`

Resume data generator.

```typescript
const resume = mockResumeData.base();
const withExp = mockResumeData.withExperience([...]);
const custom = mockResumeData.withCustom({ title: 'My Resume' });
```

#### `mockApiResponse`

API response data generator.

```typescript
const success = mockApiResponse.success(data);
const error = mockApiResponse.error('Not found', 'NOT_FOUND');
const paginated = mockApiResponse.paginated(items, page, total);
```

#### `mockJobApplicationData`

Job application data generator.

```typescript
const app = mockJobApplicationData.base();
const apps = mockJobApplicationData.batch(10);
const custom = mockJobApplicationData.withCustom({ company_name: 'Google' });
```

#### `mockErrorData`

Error data generator.

```typescript
const network = mockErrorData.network();
const timeout = mockErrorData.timeout();
const validation = mockErrorData.validation('email');
const unauthorized = mockErrorData.unauthorized();
const notFound = mockErrorData.notFound('User');
const server = mockErrorData.serverError();
const custom = mockErrorData.custom('CODE', 'Message', 400);
```

#### `mockStatsData`

Statistics data generator.

```typescript
const stats = mockStatsData.applicationStats();
const funnel = mockStatsData.applicationFunnel();
const custom = mockStatsData.custom(total, stages);
```

#### `mockStorageData`

Local storage data generator.

```typescript
const storage = mockStorageData.withItems({ key: 'value' });
const empty = mockStorageData.empty();
const withToken = mockStorageData.withToken('token');
```

## Common Test Patterns

### Testing a Component with Props

```typescript
import { propsBuilder } from '@/utils/test-utils';
import { render } from '@testing-library/react';

it('renders with custom props', () => {
  const mockOnSubmit = vi.fn();
  const props = propsBuilder<MyComponentProps>()
    .withValue('title', 'Test')
    .withCallback('onSubmit', mockOnSubmit)
    .build();

  render(<MyComponent {...props} />);
  // Test component behavior
});
```

### Testing API Integration

```typescript
import { apiClientBuilder, mockApiResponse } from '@/utils/test-utils';

it('handles API calls', async () => {
  const mockData = { id: 1, name: 'Test' };
  const client = apiClientBuilder()
    .withResolvedMethod('getUser', mockData)
    .build();

  const result = await client.getUser?.();
  expect(result).toEqual(mockData);
});
```

### Testing Error Handling

```typescript
import { errorBuilder } from '@/utils/test-utils';

it('handles errors', () => {
  const error = errorBuilder()
    .withCode('VALIDATION_ERROR')
    .withMessage('Invalid input')
    .build();

  // Test error handling
});
```

### Testing Async Operations

```typescript
import { createAsyncMock, createFailingMock } from '@/utils/test-utils';

it('handles async success', async () => {
  const mockFetch = createAsyncMock({ data: 'test' });
  const result = await mockFetch();
  expect(result.data).toBe('test');
});

it('handles async failure', async () => {
  const mockFetch = createFailingMock(new Error('Network error'));
  await expect(mockFetch()).rejects.toThrow('Network error');
});
```

## Best Practices

1. **Use builders for complex mocks** - Builders reduce boilerplate and improve readability
2. **Leverage mock data generators** - Use pre-built data for consistent test setup
3. **Combine with vi.fn()** - Use vitest's vi.fn() directly when builders aren't needed
4. **Reset mocks between tests** - Use resetAllMocks() or beforeEach() with vi.clearAllMocks()
5. **Type your mocks** - Always provide type parameters for createMockFn<T>()
6. **Avoid test interdependence** - Each test should set up its own mocks
7. **Organize mock setup** - Keep mocks near the test that uses them

## Migration Guide

### From Manual Mocking

**Before:**
```typescript
const mockFn = vi.fn().mockResolvedValue({ data: 'test' });
```

**After:**
```typescript
const mockFn = createMockFnWithDefault<typeof fetchData>({ data: 'test' });
```

### From Repeated Setup

**Before:**
```typescript
const response = {
  ok: true,
  status: 200,
  json: vi.fn().mockResolvedValue({ id: 1 }),
};
```

**After:**
```typescript
const response = responseBuilder()
  .status(200)
  .json({ id: 1 })
  .build();
```

## See Also

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
