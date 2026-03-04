/**
 * Mock user data for testing and development
 */

export interface MockUser {
  id: number;
  email: string;
  name: string;
  avatar?: string;
  plan?: 'free' | 'pro' | 'enterprise';
}

/**
 * Mock current user
 */
export const mockCurrentUser: MockUser = {
  id: 1,
  email: 'john@example.com',
  name: 'John Doe',
  avatar: 'https://example.com/avatar.jpg',
  plan: 'pro',
};

/**
 * Create a custom user with custom data
 */
export const createMockUser = (overrides: Partial<MockUser> = {}): MockUser => ({
  ...mockCurrentUser,
  ...overrides,
});

/**
 * Mock user settings
 */
export const mockUserSettings = {
  theme: 'light' as const,
  language: 'en',
  emailNotifications: true,
  marketingEmails: false,
  twoFactorEnabled: false,
};

/**
 * Mock team member
 */
export const mockTeamMember = {
  id: 2,
  email: 'jane@example.com',
  name: 'Jane Smith',
  role: 'member',
  avatar: 'https://example.com/avatar2.jpg',
};

/**
 * Mock list of users
 */
export const mockUserList: MockUser[] = [
  mockCurrentUser,
  {
    id: 2,
    email: 'jane@example.com',
    name: 'Jane Smith',
    plan: 'free',
  },
  {
    id: 3,
    email: 'bob@example.com',
    name: 'Bob Wilson',
    plan: 'enterprise',
  },
];
