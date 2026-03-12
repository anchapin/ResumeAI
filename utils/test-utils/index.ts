/**
 * Central export for all type-safe mock utilities
 * Simplifies imports in test files
 */

// Mock factory functions
export {
  createMockFn,
  createMockFnWithDefault,
  createAsyncMock,
  createFailingMock,
  createMockObject,
  createMethodSpy,
  createMockResponse,
  expectCalledWith,
  expectCallCount,
  resetAllMocks,
  createHookMock,
} from './mock-factory';

// Mock builders
export {
  ApiClientMockBuilder,
  PropsMockBuilder,
  ResponseMockBuilder,
  ErrorMockBuilder,
  apiClientBuilder,
  propsBuilder,
  responseBuilder,
  errorBuilder,
} from './mock-builders';

// Mock data generators
export {
  mockUserData,
  mockResumeData,
  mockApiResponse,
  mockJobApplicationData,
  mockErrorData,
  mockStatsData,
  mockNavigationData,
  mockStorageData,
} from './mock-data';
