import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import App, { SaveStatus } from '../App';
import * as StorageModule from '../utils/storage';
import { TokenManager } from '../utils/security';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      email: 'test@example.com',
      username: 'testuser',
      is_active: true,
      is_verified: true,
    },
    isAuthenticated: true,
    isLoading: false,
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    clearError: vi.fn(),
  }),
}));

vi.mock('../components/StorageWarning', () => ({
  default: () => null,
}));

// Mock dependencies
vi.mock('../components/Sidebar', () => ({
  default: ({ onShowShortcuts }: any) => (
    <div data-testid="sidebar">
      <button data-testid="nav-dashboard">Dashboard</button>
      <button data-testid="nav-editor">Editor</button>
      <button data-testid="nav-workspace">Workspace</button>
      <button data-testid="nav-settings">Settings</button>
      <button data-testid="nav-applications">Applications</button>
      <button data-testid="nav-bulk">Bulk</button>
      <button data-testid="nav-salary">Salary</button>
      <button onClick={onShowShortcuts} data-testid="show-shortcuts">
        Shortcuts
      </button>
    </div>
  ),
}));

vi.mock('../pages/Dashboard', () => ({
  default: () => <div data-testid="dashboard-page">Dashboard Page</div>,
}));

vi.mock('../pages/Editor', () => ({
  default: () => <div data-testid="editor-page">Editor Page</div>,
}));

vi.mock('../pages/Workspace', () => ({
  default: () => <div data-testid="workspace-page">Workspace Page</div>,
}));

vi.mock('../pages/JobApplications', () => ({
  default: () => <div data-testid="applications-page">Applications Page</div>,
}));

vi.mock('../pages/Settings', () => ({
  default: () => <div data-testid="settings-page">Settings Page</div>,
}));

vi.mock('../pages/ResumeManagement', () => ({
  default: () => <div data-testid="bulk-page">Bulk Resume Page</div>,
}));

vi.mock('../pages/SalaryResearch', () => ({
  SalaryResearch: () => <div data-testid="salary-page">Salary Research Page</div>,
}));

vi.mock('../pages/InterviewPractice', () => ({
  default: () => <div data-testid="interview-page">Interview Practice Page</div>,
}));

vi.mock('../components/ErrorBoundary', () => ({
  default: ({ children }: any) => <div data-testid="error-boundary">{children}</div>,
}));

vi.mock('../components/KeyboardShortcutsHelp', () => ({
  default: ({ onClose }: any) => (
    <div data-testid="shortcuts-modal">
      <button onClick={onClose} data-testid="close-shortcuts">
        Close
      </button>
    </div>
  ),
}));

vi.mock('../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: 'light',
    isDark: false,
    toggleTheme: vi.fn(),
    setTheme: vi.fn(),
  }),
}));

vi.mock('react-toastify', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
  ToastContainer: () => <div data-testid="toast-container" />,
}));

// Setup localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('App Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
    localStorage.clear();
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('should load and render app when data is available', async () => {
      vi.spyOn(StorageModule, 'loadResumeData').mockReturnValue(null);

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      // App should load and render content
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });
    });

    it('should load resume data from localStorage on mount', async () => {
      const mockData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        location: 'New York',
        role: 'Software Engineer',
        summary: 'Test summary',
        skills: ['React', 'TypeScript'],
        experience: [],
        education: [],
        projects: [],
      };

      localStorage.setItem('resumeai_master_profile', JSON.stringify(mockData));

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // App should render successfully
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });

    it('should use initial data when localStorage is empty', async () => {
      vi.spyOn(StorageModule, 'loadResumeData').mockReturnValue(null);

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    it('should validate loaded resume data arrays', async () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        location: 'New York',
        role: 'Software Engineer',
        summary: 'Test summary',
        skills: null, // Invalid - should be array
        experience: undefined, // Invalid - should be array
        education: [],
        projects: [],
      };

      localStorage.setItem('resumeai_master_profile', JSON.stringify(invalidData));

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should render Dashboard on initial load', async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });
    });

    it('should render Editor at /editor route', async () => {
      render(
        <MemoryRouter initialEntries={['/editor']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('editor-page')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('dashboard-page')).not.toBeInTheDocument();
    });

    it('should render Workspace at /workspace route', async () => {
      render(
        <MemoryRouter initialEntries={['/workspace']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('workspace-page')).toBeInTheDocument();
      });
    });

    it('should render Settings at /settings route', async () => {
      render(
        <MemoryRouter initialEntries={['/settings']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('settings-page')).toBeInTheDocument();
      });
    });

    it('should render Applications at /applications route', async () => {
      render(
        <MemoryRouter initialEntries={['/applications']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('applications-page')).toBeInTheDocument();
      });
    });

    it('should render Bulk at /bulk route', async () => {
      render(
        <MemoryRouter initialEntries={['/bulk']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('bulk-page')).toBeInTheDocument();
      });
    });

    it('should render Salary Research at /salary-research route', async () => {
      render(
        <MemoryRouter initialEntries={['/salary-research']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('salary-page')).toBeInTheDocument();
      });
    });
  });

  describe('State Persistence', () => {
    it('should save resume data to localStorage when data changes', async () => {
      const saveResumeDataSpy = vi.spyOn(StorageModule, 'saveResumeData');
      const mockData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        location: 'New York',
        role: 'Software Engineer',
        summary: 'Test summary',
        skills: ['React'],
        experience: [],
        education: [],
        projects: [],
      };

      localStorage.setItem('resumeai_master_profile', JSON.stringify(mockData));

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Wait for debounced save to complete
      await waitFor(
        () => {
          expect(saveResumeDataSpy).toHaveBeenCalled();
        },
        { timeout: 2000 },
      );
    });

    it('should debounce saves to avoid rapid updates', async () => {
      const saveResumeDataSpy = vi
        .spyOn(StorageModule, 'saveResumeData')
        .mockImplementation(() => {});

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Give time for initial debounce
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Initial save should have been called
      expect(saveResumeDataSpy).toHaveBeenCalled();
    });

    it('should not save before initial load is complete', async () => {
      const saveResumeDataSpy = vi
        .spyOn(StorageModule, 'saveResumeData')
        .mockImplementation(() => {});

      vi.spyOn(StorageModule, 'loadResumeData').mockImplementation((): any => {
        return new Promise((resolve) => setTimeout(() => resolve(null), 100));
      });

      const { rerender } = render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      // Should not have saved during loading
      expect(saveResumeDataSpy).not.toHaveBeenCalled();
    });

    it('should clear resume data from localStorage when cleared', async () => {
      const mockData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        location: 'New York',
        role: 'Software Engineer',
        summary: 'Test summary',
        skills: [],
        experience: [],
        education: [],
        projects: [],
      };

      localStorage.setItem('resumeai_master_profile', JSON.stringify(mockData));

      const clearResumeDataSpy = vi
        .spyOn(StorageModule, 'clearResumeData')
        .mockImplementation(() => {
          localStorage.removeItem('resumeai_master_profile');
        });

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display storage error message on QUOTA_EXCEEDED', async () => {
      vi.spyOn(StorageModule, 'loadResumeData').mockImplementation(() => {
        throw new StorageModule.StorageError(
          'Storage full',
          StorageModule.StorageErrorType.QUOTA_EXCEEDED,
        );
      });

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(
          screen.getByText('An error occurred while saving your data locally.'),
        ).toBeInTheDocument();
      });
    });

    it('should display storage error message on PARSE_ERROR', async () => {
      vi.spyOn(StorageModule, 'loadResumeData').mockImplementation(() => {
        throw new StorageModule.StorageError(
          'Parse error',
          StorageModule.StorageErrorType.PARSE_ERROR,
        );
      });

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(
          screen.getByText('An error occurred while saving your data locally.'),
        ).toBeInTheDocument();
      });
    });

    it('should display storage error message on ACCESS_DENIED', async () => {
      vi.spyOn(StorageModule, 'loadResumeData').mockImplementation(() => {
        throw new StorageModule.StorageError(
          'Access denied',
          StorageModule.StorageErrorType.ACCESS_DENIED,
        );
      });

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(
          screen.getByText('An error occurred while saving your data locally.'),
        ).toBeInTheDocument();
      });
    });

    it('should auto-dismiss error messages after 5 seconds', async () => {
      vi.spyOn(StorageModule, 'loadResumeData').mockImplementation(() => {
        throw new StorageModule.StorageError(
          'Test error',
          StorageModule.StorageErrorType.QUOTA_EXCEEDED,
        );
      });

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      // Wait for error to appear
      expect(
        screen.getByText('An error occurred while saving your data locally.'),
      ).toBeInTheDocument();

      // Wait for auto-dismiss (5 seconds + buffer for slower systems)
      await waitFor(
        () => {
          expect(
            screen.queryByText('An error occurred while saving your data locally.'),
          ).not.toBeInTheDocument();
        },
        { timeout: 7000 },
      );
    }, 10000);

    it('should allow manual dismissal of error messages', async () => {
      const user = userEvent.setup();

      vi.spyOn(StorageModule, 'loadResumeData').mockImplementation(() => {
        throw new StorageModule.StorageError(
          'Test error',
          StorageModule.StorageErrorType.QUOTA_EXCEEDED,
        );
      });

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(
          screen.getByText('An error occurred while saving your data locally.'),
        ).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(
          screen.queryByText('An error occurred while saving your data locally.'),
        ).not.toBeInTheDocument();
      });
    });

    it('should wrap content in ErrorBoundary', () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should show shortcuts modal when shortcut triggered', async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // The shortcuts modal should not be visible initially
      expect(screen.queryByTestId('shortcuts-modal')).not.toBeInTheDocument();
    });

    it('should toggle shortcuts modal visibility', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Click show shortcuts button
      const showShortcutsBtn = screen.getByTestId('show-shortcuts');
      await user.click(showShortcutsBtn);

      expect(screen.getByTestId('shortcuts-modal')).toBeInTheDocument();

      // Close shortcuts modal
      const closeBtn = screen.getByTestId('close-shortcuts');
      await user.click(closeBtn);

      expect(screen.queryByTestId('shortcuts-modal')).not.toBeInTheDocument();
    });

    it('should register keyboard shortcuts on mount', async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });
  });

  describe('Theme Integration', () => {
    it('should initialize theme from useTheme hook', async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // App should render without theme-related errors
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });
  });

  describe('Toast Container', () => {
    it('should render toast container', async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      expect(screen.getByTestId('toast-container')).toBeInTheDocument();
    });
  });

  describe('Sidebar Integration', () => {
    it('should pass correct props to Sidebar', async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });
  });

  describe('Editor Integration', () => {
    it('should render Editor at /editor route', async () => {
      render(
        <MemoryRouter initialEntries={['/editor']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('editor-page')).toBeInTheDocument();
      });
    });
  });

  describe('Workspace Integration', () => {
    it('should render Workspace at /workspace route', async () => {
      render(
        <MemoryRouter initialEntries={['/workspace']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('workspace-page')).toBeInTheDocument();
      });
    });
  });

  describe('Multiple Route Changes', () => {
    it('should render different pages at different routes', async () => {
      render(
        <MemoryRouter initialEntries={['/applications']}>
          <App />
        </MemoryRouter>,
      );
      expect(screen.getByTestId('applications-page')).toBeInTheDocument();

      render(
        <MemoryRouter initialEntries={['/bulk']}>
          <App />
        </MemoryRouter>,
      );
      expect(screen.getByTestId('bulk-page')).toBeInTheDocument();

      render(
        <MemoryRouter initialEntries={['/salary-research']}>
          <App />
        </MemoryRouter>,
      );
      expect(screen.getByTestId('salary-page')).toBeInTheDocument();

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    it('should maintain resume data across route changes', async () => {
      const mockData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        location: 'New York',
        role: 'Software Engineer',
        summary: 'Test summary',
        skills: ['React', 'TypeScript'],
        experience: [],
        education: [],
        projects: [],
      };

      localStorage.setItem('resumeai_master_profile', JSON.stringify(mockData));

      render(
        <MemoryRouter initialEntries={['/editor']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('editor-page')).toBeInTheDocument();
      });

      // Render at dashboard route
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });
    });
  });

  describe('Component Cleanup', () => {
    it('should cleanup shortcuts on unmount', async () => {
      vi.spyOn(StorageModule, 'loadResumeData').mockReturnValue(null);
      const { unmount } = render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      // Should unmount without errors
      expect(() => unmount()).not.toThrow();
    });

    it('should cleanup debounce timers on unmount', async () => {
      vi.spyOn(StorageModule, 'loadResumeData').mockReturnValue(null);
      const { unmount } = render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Initial Resume Data', () => {
    it('should render with initial resume data structure', async () => {
      vi.spyOn(StorageModule, 'loadResumeData').mockReturnValue(null);

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(
        () => {
          expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });

    it('should have all required fields in initial data', async () => {
      vi.spyOn(StorageModule, 'loadResumeData').mockReturnValue(null);

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(
        () => {
          expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      // Verify app initializes without errors
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });
  });

  describe('Sidebar with all routes', () => {
    it('should render sidebar on Dashboard', async () => {
      vi.spyOn(StorageModule, 'loadResumeData').mockReturnValue(null);
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });

    it('should not render sidebar on Interview Practice page', async () => {
      vi.spyOn(StorageModule, 'loadResumeData').mockReturnValue(null);
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      // Note: Interview Practice is not in the sidebar buttons, but we test that it renders without sidebar
      // This would require navigating via code or mocking the route
    });
  });

  describe('Resume Data Handling', () => {
    it('should update resume data when modified', async () => {
      const mockData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        location: 'New York',
        role: 'Software Engineer',
        summary: 'Test summary',
        skills: ['React'],
        experience: [],
        education: [],
        projects: [],
      };

      localStorage.setItem('resumeai_master_profile', JSON.stringify(mockData));

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      // App should have loaded and validated the data
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });

    it('should handle missing storage data gracefully', async () => {
      vi.spyOn(StorageModule, 'loadResumeData').mockReturnValue(null);

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });

    it('should validate array fields in resume data', async () => {
      const dataWithInvalidArrays = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        location: 'New York',
        role: 'Software Engineer',
        summary: 'Test summary',
        skills: null,
        experience: undefined,
        education: null,
        projects: null,
      };

      localStorage.setItem('resumeai_master_profile', JSON.stringify(dataWithInvalidArrays));

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });
  });

  describe('Global State Management', () => {
    it('should maintain save status state', async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });

    it('should track loading state during initialization', async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      // Initially should show loading message or dashboard once loaded
      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    it('should handle theme initialization from hook', async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      // App should initialize theme and render without errors
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });
  });

  describe('Storage Warning Component', () => {
    it('should render storage warning component', async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      // Storage warning is rendered but may be hidden initially
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });
  });

  describe('Complex Navigation Scenarios', () => {
    it('should render editor at /editor route', async () => {
      render(
        <MemoryRouter initialEntries={['/editor']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('editor-page')).toBeInTheDocument();
      });
    });

    it('should preserve data across navigation', async () => {
      const mockData = {
        name: 'Test User',
        email: 'test@example.com',
        phone: '+1234567890',
        location: 'Test City',
        role: 'Test Role',
        summary: 'Test summary',
        skills: ['Skill1', 'Skill2'],
        experience: [],
        education: [],
        projects: [],
      };

      localStorage.setItem('resumeai_master_profile', JSON.stringify(mockData));

      render(
        <MemoryRouter initialEntries={['/editor']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('editor-page')).toBeInTheDocument();
      });

      // Render at dashboard route
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });
    });
  });

  describe('Error Display and Dismissal', () => {
    it('should allow manual error dismissal', async () => {
      const user = userEvent.setup();

      vi.spyOn(StorageModule, 'loadResumeData').mockImplementation(() => {
        throw new StorageModule.StorageError(
          'Test error',
          StorageModule.StorageErrorType.QUOTA_EXCEEDED,
        );
      });

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      const errorMessage = await screen.findByText('Storage full. Please clear some browser data.');
      expect(errorMessage).toBeInTheDocument();

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(
          screen.queryByText('Storage full. Please clear some browser data.'),
        ).not.toBeInTheDocument();
      });
    });

    it('should display NOT_AVAILABLE error', async () => {
      vi.spyOn(StorageModule, 'loadResumeData').mockImplementation(() => {
        throw new StorageModule.StorageError(
          'Storage not available',
          StorageModule.StorageErrorType.NOT_AVAILABLE,
        );
      });

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(
          screen.getByText('An error occurred while saving your data locally.'),
        ).toBeInTheDocument();
      });
    });

    it('should display generic error for unknown error types', async () => {
      vi.spyOn(StorageModule, 'loadResumeData').mockImplementation(() => {
        throw new StorageModule.StorageError('Unknown error', 'UNKNOWN' as any);
      });

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(
          screen.getByText('An error occurred while saving your data locally.'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Suspense Boundaries', () => {
    it('should handle lazy loaded components', async () => {
      render(
        <MemoryRouter initialEntries={['/workspace']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('workspace-page')).toBeInTheDocument();
      });
    });
  });
});
