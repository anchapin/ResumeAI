import type { Comment, ResumeMetadata, ShareLink } from '../types';

/**
 * Mock API responses for testing
 */

/**
 * Mock successful API response wrapper
 */
export interface MockApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

/**
 * Mock API error response
 */
export interface MockApiError {
  status: number;
  message: string;
  code?: string;
}

/**
 * Mock comments list response
 */
export const mockCommentsResponse: Comment[] = [
  {
    id: 1,
    resumeId: 1,
    authorName: 'Jane Smith',
    authorEmail: 'jane@example.com',
    content: 'Great summary! Consider adding more details about your leadership experience.',
    section: 'summary',
    isResolved: false,
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 2,
    resumeId: 1,
    authorName: 'Bob Wilson',
    authorEmail: 'bob@example.com',
    content: 'The skills section looks good. Maybe add some more modern frameworks?',
    section: 'skills',
    isResolved: true,
    createdAt: '2024-01-14T14:20:00Z',
    updatedAt: '2024-01-14T16:45:00Z',
  },
];

/**
 * Mock resume metadata
 */
export const mockResumeMetadata: ResumeMetadata = {
  id: 1,
  title: 'Software Engineer Resume',
  tags: ['tech', 'software'],
  isPublic: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T12:00:00Z',
  versionCount: 5,
};

/**
 * Mock resume metadata list
 */
export const mockResumeMetadataList: ResumeMetadata[] = [
  mockResumeMetadata,
  {
    id: 2,
    title: 'Senior Engineer Resume',
    tags: ['senior', 'lead'],
    isPublic: true,
    createdAt: '2023-12-01T00:00:00Z',
    updatedAt: '2024-01-10T08:30:00Z',
    versionCount: 3,
  },
];

/**
 * Mock share link response
 */
export const mockShareLink: ShareLink = {
  shareToken: 'abc123xyz',
  shareUrl: 'https://resumeai.app/share/abc123xyz',
  permissions: 'view',
  expiresAt: null,
  maxViews: null,
};

/**
 * Mock PDF generation response
 */
export const mockPdfGenerationResponse = {
  success: true,
  pdfUrl: '/api/resumes/1/download',
  variant: 'modern',
};

/**
 * Mock API success response helper
 */
export const createMockSuccessResponse = <T>(data: T): MockApiResponse<T> => ({
  data,
  status: 200,
  message: 'Success',
});

/**
 * Mock API error response helper
 */
export const createMockErrorResponse = (message: string, code?: string): MockApiError => ({
  status: 400,
  message,
  code,
});

/**
 * Mock variant list response
 */
export const mockVariantsResponse = [
  { id: 'modern', name: 'Modern', thumbnail: '/variants/modern.png' },
  { id: 'classic', name: 'Classic', thumbnail: '/variants/classic.png' },
  { id: 'creative', name: 'Creative', thumbnail: '/variants/creative.png' },
  { id: 'minimal', name: 'Minimal', thumbnail: '/variants/minimal.png' },
];

/**
 * Mock version history list
 */
export const mockVersionHistoryResponse = [
  {
    id: 5,
    resumeId: 1,
    version: '1.5',
    description: 'Updated skills section',
    createdAt: '2024-01-15T12:00:00Z',
    createdBy: 'John Doe',
  },
  {
    id: 4,
    resumeId: 1,
    version: '1.4',
    description: 'Added new project',
    createdAt: '2024-01-10T09:30:00Z',
    createdBy: 'John Doe',
  },
];
