/**
 * Central export point for all mock data
 */

// Resume mocks
export {
  mockResumeData,
  mockWorkExperience,
  mockEducationEntry,
  mockProjectEntry,
  emptyResumeData,
  createMockResume,
} from './resume';

// User mocks
export {
  mockCurrentUser,
  mockUserSettings,
  mockTeamMember,
  mockUserList,
  createMockUser,
  type MockUser,
} from './user';

// API response mocks
export {
  mockCommentsResponse,
  mockResumeMetadata,
  mockResumeMetadataList,
  mockShareLink,
  mockPdfGenerationResponse,
  mockVariantsResponse,
  mockVersionHistoryResponse,
  createMockSuccessResponse,
  createMockErrorResponse,
  type MockApiResponse,
  type MockApiError,
} from './api';
