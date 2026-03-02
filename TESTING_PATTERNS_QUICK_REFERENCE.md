# Testing Patterns & Examples - Quick Reference

## Hook Testing Pattern

### Basic Hook Test Template
```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMyHook } from './useMyHook';

describe('useMyHook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns expected initial state', () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current.value).toBe(initialValue);
  });

  it('handles async operations', async () => {
    const { result } = renderHook(() => useMyHook());
    
    await act(async () => {
      await result.current.asyncMethod();
    });

    expect(result.current.state).toEqual(expectedState);
  });

  it('updates state correctly', () => {
    const { result } = renderHook(() => useMyHook());
    
    act(() => {
      result.current.updateMethod(newValue);
    });

    expect(result.current.value).toBe(newValue);
  });
});
```

## Component Testing Pattern

### Page Component Test Template
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import MyPage from './MyPage';

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('MyPage Component', () => {
  it('renders without crashing', () => {
    renderWithRouter(<MyPage />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interactions', async () => {
    const user = userEvent.setup();
    renderWithRouter(<MyPage />);
    
    const button = screen.getByRole('button', { name: /Click me/i });
    await user.click(button);
    
    expect(screen.getByText('Result')).toBeInTheDocument();
  });

  it('handles form submission', async () => {
    const user = userEvent.setup();
    renderWithRouter(<MyPage />);
    
    const input = screen.getByPlaceholderText('Enter text');
    await user.type(input, 'test value');
    
    const button = screen.getByRole('button', { name: /Submit/i });
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Success')).toBeInTheDocument();
    });
  });
});
```

## Mock Patterns

### Mock Zustand Store
```typescript
vi.mock('../store/store', () => ({
  useStore: vi.fn(),
}));

const mockStoreState = {
  user: null,
  setUser: vi.fn(),
};

beforeEach(() => {
  (useStore as any).mockImplementation((selector) => 
    selector(mockStoreState)
  );
});
```

### Mock Fetch
```typescript
global.fetch = vi.fn();

beforeEach(() => {
  (global.fetch as any).mockClear();
});

// Success response
(global.fetch as any).mockResolvedValueOnce(
  new Response(JSON.stringify({ data: 'success' }), { status: 200 })
);

// Error response
(global.fetch as any).mockResolvedValueOnce(
  new Response(JSON.stringify({ detail: 'Error' }), { status: 400 })
);

// Network error
(global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
```

### Mock React Router
```typescript
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});
```

### Mock Hooks with Partial Export
```typescript
vi.mock('./useMyHook', async () => {
  const actual = await vi.importActual('./useMyHook');
  return {
    ...actual,
    useMyHook: () => ({
      // Mock implementation
    }),
  };
});
```

## Common Assertions

### State Assertions
```typescript
expect(result.current.value).toBe(expectedValue);
expect(result.current.isLoading).toBe(false);
expect(result.current.error).toBeNull();
expect(result.current.data).toEqual(expectedData);
```

### DOM Assertions
```typescript
expect(element).toBeInTheDocument();
expect(element).toBeVisible();
expect(element).toHaveClass('class-name');
expect(element).toHaveAttribute('href', '/path');
expect(element).toHaveValue('value');
expect(element).toBeDisabled();
```

### Array/Object Assertions
```typescript
expect(array).toHaveLength(3);
expect(array).toEqual([1, 2, 3]);
expect(object).toHaveProperty('key');
expect(object.key).toBe('value');
```

### Mock Assertions
```typescript
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith('arg');
expect(mockFn).toHaveBeenCalledTimes(1);
expect(mockFn).toHaveReturnedWith(value);
```

## Async Testing Patterns

### Using waitFor
```typescript
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});

// With timeout
await waitFor(() => {
  expect(result.current.loaded).toBe(true);
}, { timeout: 5000 });
```

### Using act
```typescript
// Wrap state updates
act(() => {
  fireEvent.click(button);
});

// Wrap async operations
await act(async () => {
  await result.current.fetchData();
});
```

### Combining act and waitFor
```typescript
await act(async () => {
  await result.current.fetchData();
});

await waitFor(() => {
  expect(result.current.data).toBeDefined();
});
```

## Error Handling Patterns

### Testing Error States
```typescript
it('handles API errors', async () => {
  (global.fetch as any).mockResolvedValueOnce(
    new Response(
      JSON.stringify({ detail: 'Invalid credentials' }), 
      { status: 401 }
    )
  );

  await act(async () => {
    try {
      await result.current.login(email, password);
    } catch (err) {
      expect(err).toBeDefined();
    }
  });

  expect(result.current.error).toBeDefined();
});
```

### Testing Network Errors
```typescript
it('handles network errors', async () => {
  (global.fetch as any).mockRejectedValueOnce(
    new Error('Network error')
  );

  const { result } = renderHook(() => useMyHook());

  await waitFor(() => {
    expect(result.current.error).toBeDefined();
  });
});
```

## Best Practices

### 1. Test Organization
```typescript
describe('ComponentName', () => {
  describe('Feature Group 1', () => {
    it('does something', () => {});
    it('handles error case', () => {});
  });

  describe('Feature Group 2', () => {
    it('does something else', () => {});
  });
});
```

### 2. Test Naming
✓ **Good:** `it('disables submit button when form is invalid')`
✗ **Bad:** `it('test button')`

### 3. Isolation
- Clear mocks in beforeEach
- Reset state between tests
- Use unique test data

### 4. Assertions
- One logical concept per test
- Multiple assertions OK if related
- Clear assertion messages

### 5. Async Operations
- Always use async/await
- Always use waitFor for DOM updates
- Always use act for state updates

## Performance Tips

### 1. Mock Expensive Operations
```typescript
// Cache expensive mocks
const mockData = { /* ... */ };
(global.fetch as any).mockResolvedValue(
  new Response(JSON.stringify(mockData), { status: 200 })
);
```

### 2. Batch Tests
```typescript
// Group similar tests
describe('API Methods', () => {
  // All API-related tests here
});
```

### 3. Use Test Skip for WIP
```typescript
it.skip('feature in progress', () => {
  // This test won't run
});
```

## Debugging Tips

### 1. Debug Screen Output
```typescript
screen.debug(); // Print DOM tree
```

### 2. Debug Mock Calls
```typescript
console.log(mockFn.mock.calls); // See all calls
console.log(mockFn.mock.calls[0][0]); // See first argument
```

### 3. Debug Hook State
```typescript
const { result } = renderHook(() => useMyHook());
console.log(result.current); // See current state
```

### 4. Debug Async
```typescript
await waitFor(() => {
  console.log('Value:', result.current.value);
  expect(result.current.value).toBeDefined();
});
```

## Common Patterns from Code

### useAuth Pattern
```typescript
const { result } = renderHook(() => useAuth());

await act(async () => {
  await result.current.login(email, password);
});

expect(mockStoreState.setUser).toHaveBeenCalled();
```

### useTheme Pattern
```typescript
(useStore as any).mockImplementation((selector) =>
  selector({ ...mockStoreState, theme: 'dark' })
);

renderHook(() => useTheme());

expect(document.documentElement.classList.contains('dark')).toBe(true);
```

### API Client Pattern
```typescript
(global.fetch as any).mockResolvedValueOnce(
  new Response(JSON.stringify(mockData), { status: 200 })
);

const headers = getHeaders();

expect(headers['Authorization']).toBe(`Bearer ${token}`);
```

## Files With Comprehensive Tests

✓ hooks/useAuth.test.ts - 50+ tests
✓ hooks/useTheme.test.ts - 45+ tests
✓ hooks/useVariants.test.ts - 40+ tests
✓ hooks/useGeneratePackage.test.ts - 60+ tests
✓ utils/api-client.test.ts - 30 tests (ALL PASSING)
✓ tests/pages/Login.test.tsx - 40+ tests
✓ tests/pages/Workspace.test.tsx - 30+ tests

## Command Reference

```bash
# Run all tests
npm test

# Run specific test file
npm test -- --run utils/api-client.test.ts

# Run with coverage
npm run test:coverage

# Watch mode
npm test

# Update snapshots
npm test -- -u

# Run only failing tests
npm test -- --run --reporter=verbose
```
