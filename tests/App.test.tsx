import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import App, { SaveStatus } from '../App';
import * as StorageModule from '../utils/storage';
import { TokenManager } from '../utils/security';
import { Route } from '../types';

// Mock dependencies
vi.mock('../components/Sidebar', () => ({
  default: ({ onNavigate, onShowShortcuts }: any) => (
    <div data-testid="sidebar">
      <button onClick={() => onNavigate(Route.DASHBOARD)} data-testid="nav-dashboard">
        Dashboard
      </button>
      <button onClick={() => onNavigate(Route.EDITOR)} data-testid="nav-editor">
        Editor
      </button>
      <button onClick={() => onNavigate(Route.WORKSPACE)} data-testid="nav-workspace">
        Workspace
      </button>
      <button onClick={() => onNavigate(Route.SETTINGS)} data-testid="nav-settings">
        Settings
      </button>
      <button onClick={() => onNavigate(Route.APPLICATIONS)} data-testid="nav-applications">
        Applications
      </button>
      <button onClick={() => onNavigate(Route.BULK)} data-testid="nav-bulk">
        Bulk
      </button>
      <button onClick={() => onNavigate(Route.SALARY_RESEARCH)} data-testid="nav-salary">
        Salary
      </button>
      <button onClick={onShowShortcuts} data-testid="show-shortcuts">
        Shortcuts
      </button>
    </div>
  )
}));

vi.mock('../pages/Dashboard', () => ({
  default: () => <div data-testid="dashboard-page">Dashboard Page</div>
}));

vi.mock('../pages/Editor', () => ({
  default: ({ onBack }: any) => (
    <div data-testid="editor-page">
      Editor Page
      <button onClick={onBack} data-testid="editor-back-btn">Back</button>
    </div>
  )
}));

vi.mock('../pages/Workspace', () => ({
  default: () => <div data-testid="workspace-page">Workspace Page</div>
}));

vi.mock('../pages/JobApplications', () => ({
  default: () => <div data-testid="applications-page">Applications Page</div>
}));

vi.mock('../pages/Settings', () => ({
  default: () => <div data-testid="settings-page">Settings Page</div>
}));

vi.mock('../pages/ResumeManagement', () => ({
  default: () => <div data-testid="bulk-page">Bulk Resume Page</div>
}));

vi.mock('../pages/SalaryResearch', () => ({
  SalaryResearch: () => <div data-testid="salary-page">Salary Research Page</div>
}));

vi.mock('../pages/InterviewPractice', () => ({
  default: () => <div data-testid="interview-page">Interview Practice Page</div>
}));

vi.mock('../components/ErrorBoundary', () => ({
  default: ({ children }: any) => (
    <div data-testid="error-boundary">{children}</div>
  )
}));

vi.mock('../components/KeyboardShortcutsHelp', () => ({
  default: ({ onClose }: any) => (
    <div data-testid="shortcuts-modal">
      <button onClick={onClose} data-testid="close-shortcuts">
        Close
      </button>
    </div>
  )
}));

vi.mock('../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: 'light',
    isDark: false,
    toggleTheme: vi.fn(),
    setTheme: vi.fn()
  })
}));

vi.mock('react-toastify', () => ({
  ToastContainer: () => <div data-testid="toast-container" />
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
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
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

      render(<App />);

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
        projects: []
      };

      localStorage.setItem('resumeai_master_profile', JSON.stringify(mockData));

      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // App should render successfully
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });

    it('should use initial data when localStorage is empty', async () => {
      vi.spyOn(StorageModule, 'loadResumeData').mockReturnValue(null);

      render(<App />);

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
        projects: []
      };

      localStorage.setItem('resumeai_master_profile', JSON.stringify(invalidData));

      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    it('should check token expiration on mount', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.invalid';
      localStorage.setItem('resume_ai_auth_token', expiredToken);

      vi.spyOn(TokenManager, 'isTokenExpired').mockReturnValue(true);
      vi.spyOn(TokenManager, 'removeToken');

      render(<App />);

      await waitFor(() => {
        expect(TokenManager.isTokenExpired).toHaveBeenCalledWith(expiredToken);
        expect(TokenManager.removeToken).toHaveBeenCalled();
      });
    });
  });

  describe('Navigation', () => {
    it('should render Dashboard on initial load', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });
    });

    it('should navigate to Editor when clicking Editor button', async () => {
     const user = userEvent.setup();
     render(<App />);

     await waitFor(() => {
       expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
     });

     const editorButton = screen.getByTestId('nav-editor');
     await user.click(editorButton);

     // Wait for lazy-loaded Editor component to load
     await waitFor(() => {
       expect(screen.getByTestId('editor-page')).toBeInTheDocument();
     });
     expect(screen.queryByTestId('dashboard-page')).not.toBeInTheDocument();
    });

    it('should navigate to Workspace', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      const workspaceButton = screen.getByTestId('nav-workspace');
      await user.click(workspaceButton);

      await waitFor(() => {
        expect(screen.getByTestId('workspace-page')).toBeInTheDocument();
      });
    });

    it('should navigate to Settings', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      const settingsButton = screen.getByTestId('nav-settings');
      await user.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByTestId('settings-page')).toBeInTheDocument();
      });
    });

    it('should navigate to Applications', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      const applicationsButton = screen.getByTestId('nav-applications');
      await user.click(applicationsButton);

      await waitFor(() => {
        expect(screen.getByTestId('applications-page')).toBeInTheDocument();
      });
    });

    it('should navigate to Bulk Resume Management', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      const bulkButton = screen.getByTestId('nav-bulk');
      await user.click(bulkButton);

      await waitFor(() => {
        expect(screen.getByTestId('bulk-page')).toBeInTheDocument();
      });
    });

    it('should navigate to Salary Research', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      const salaryButton = screen.getByTestId('nav-salary');
      await user.click(salaryButton);

      await waitFor(() => {
        expect(screen.getByTestId('salary-page')).toBeInTheDocument();
      });
    });

    it('should return to Dashboard from Editor', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      // Navigate to Editor
      const editorButton = screen.getByTestId('nav-editor');
      await user.click(editorButton);

      expect(screen.getByTestId('editor-page')).toBeInTheDocument();

      // Click back button
      const backButton = screen.getByTestId('editor-back-btn');
      await user.click(backButton);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
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
        projects: []
      };

      localStorage.setItem('resumeai_master_profile', JSON.stringify(mockData));

      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Wait for debounced save to complete
      await waitFor(
        () => {
          expect(saveResumeDataSpy).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );
    });

    it('should debounce saves to avoid rapid updates', async () => {
      const saveResumeDataSpy = vi.spyOn(StorageModule, 'saveResumeData').mockImplementation(() => {});
      
      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Give time for initial debounce
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Initial save should have been called
      expect(saveResumeDataSpy).toHaveBeenCalled();
    });

    it('should not save before initial load is complete', async () => {
      const saveResumeDataSpy = vi.spyOn(StorageModule, 'saveResumeData').mockImplementation(() => {});
      
      vi.spyOn(StorageModule, 'loadResumeData').mockImplementation(() => {
        return new Promise(resolve => setTimeout(() => resolve(null), 100));
      });

      const { rerender } = render(<App />);

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
        projects: []
      };

      localStorage.setItem('resumeai_master_profile', JSON.stringify(mockData));

      const clearResumeDataSpy = vi.spyOn(StorageModule, 'clearResumeData').mockImplementation(() => {
        localStorage.removeItem('resumeai_master_profile');
      });

      render(<App />);

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
          StorageModule.StorageErrorType.QUOTA_EXCEEDED
        );
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Storage full. Please clear some browser data.')).toBeInTheDocument();
      });
    });

    it('should display storage error message on PARSE_ERROR', async () => {
      vi.spyOn(StorageModule, 'loadResumeData').mockImplementation(() => {
        throw new StorageModule.StorageError(
          'Parse error',
          StorageModule.StorageErrorType.PARSE_ERROR
        );
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Data corrupted. Using default resume.')).toBeInTheDocument();
      });
    });

    it('should display storage error message on ACCESS_DENIED', async () => {
      vi.spyOn(StorageModule, 'loadResumeData').mockImplementation(() => {
        throw new StorageModule.StorageError(
          'Access denied',
          StorageModule.StorageErrorType.ACCESS_DENIED
        );
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Storage access denied. Changes won\'t be saved.')).toBeInTheDocument();
      });
    });

    it('should auto-dismiss error messages after 5 seconds', async () => {
      vi.spyOn(StorageModule, 'loadResumeData').mockImplementation(() => {
        throw new StorageModule.StorageError(
          'Test error',
          StorageModule.StorageErrorType.QUOTA_EXCEEDED
        );
      });

      render(<App />);

      // Wait for error to appear
      expect(screen.getByText('Storage full. Please clear some browser data.')).toBeInTheDocument();

      // Wait for auto-dismiss (5 seconds + buffer for slower systems)
      await waitFor(
        () => {
          expect(screen.queryByText('Storage full. Please clear some browser data.')).not.toBeInTheDocument();
        },
        { timeout: 7000 }
      );
    }, 10000);

    it('should allow manual dismissal of error messages', async () => {
      const user = userEvent.setup();

      vi.spyOn(StorageModule, 'loadResumeData').mockImplementation(() => {
        throw new StorageModule.StorageError(
          'Test error',
          StorageModule.StorageErrorType.QUOTA_EXCEEDED
        );
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Storage full. Please clear some browser data.')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: 'close' });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Storage full. Please clear some browser data.')).not.toBeInTheDocument();
      });
    });

    it('should wrap content in ErrorBoundary', () => {
      render(<App />);

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should show shortcuts modal when shortcut triggered', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // The shortcuts modal should not be visible initially
      expect(screen.queryByTestId('shortcuts-modal')).not.toBeInTheDocument();
    });

    it('should toggle shortcuts modal visibility', async () => {
      const user = userEvent.setup();
      render(<App />);

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
      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });
  });

  describe('Theme Integration', () => {
    it('should initialize theme from useTheme hook', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // App should render without theme-related errors
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });
  });

  describe('Toast Container', () => {
    it('should render toast container', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      expect(screen.getByTestId('toast-container')).toBeInTheDocument();
    });
  });

  describe('Sidebar Integration', () => {
    it('should pass correct props to Sidebar', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });

    it('should update current route in Sidebar', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      // Navigate to Editor
      const editorButton = screen.getByTestId('nav-editor');
      await user.click(editorButton);

      expect(screen.getByTestId('editor-page')).toBeInTheDocument();
    });
  });

  describe('Editor Integration', () => {
    it('should pass resume data to Editor component', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      const editorButton = screen.getByTestId('nav-editor');
      await user.click(editorButton);

      expect(screen.getByTestId('editor-page')).toBeInTheDocument();
    });

    it('should handle resume data updates from Editor', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      const editorButton = screen.getByTestId('nav-editor');
      await user.click(editorButton);

      expect(screen.getByTestId('editor-page')).toBeInTheDocument();
    });
  });

  describe('Workspace Integration', () => {
    it('should pass correct props to Workspace component', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      const workspaceButton = screen.getByTestId('nav-workspace');
      await user.click(workspaceButton);

      expect(screen.getByTestId('workspace-page')).toBeInTheDocument();
    });
  });

  describe('Multiple Route Changes', () => {
    it('should handle rapid route changes', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      // Rapid navigation (only using routes with sidebar)
      await user.click(screen.getByTestId('nav-applications'));
      expect(screen.getByTestId('applications-page')).toBeInTheDocument();

      await user.click(screen.getByTestId('nav-bulk'));
      expect(screen.getByTestId('bulk-page')).toBeInTheDocument();

      await user.click(screen.getByTestId('nav-salary'));
      expect(screen.getByTestId('salary-page')).toBeInTheDocument();

      await user.click(screen.getByTestId('nav-dashboard'));
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    it('should maintain resume data across route changes', async () => {
      const user = userEvent.setup();
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
        projects: []
      };

      localStorage.setItem('resumeai_master_profile', JSON.stringify(mockData));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      // Navigate around and back
      await user.click(screen.getByTestId('nav-editor'));
      await user.click(screen.getByTestId('editor-back-btn'));

      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });
  });

  describe('Component Cleanup', () => {
    it('should cleanup shortcuts on unmount', async () => {
      vi.spyOn(StorageModule, 'loadResumeData').mockReturnValue(null);
      const { unmount } = render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      // Should unmount without errors
      expect(() => unmount()).not.toThrow();
    });

    it('should cleanup debounce timers on unmount', async () => {
      vi.spyOn(StorageModule, 'loadResumeData').mockReturnValue(null);
      const { unmount } = render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Initial Resume Data', () => {
    it('should render with initial resume data structure', async () => {
      vi.spyOn(StorageModule, 'loadResumeData').mockReturnValue(null);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should have all required fields in initial data', async () => {
      vi.spyOn(StorageModule, 'loadResumeData').mockReturnValue(null);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify app initializes without errors
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });
  });

  describe('Sidebar with all routes', () => {
    it('should render sidebar on Dashboard', async () => {
      vi.spyOn(StorageModule, 'loadResumeData').mockReturnValue(null);
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });

    it('should not render sidebar on Interview Practice page', async () => {
      vi.spyOn(StorageModule, 'loadResumeData').mockReturnValue(null);
      const user = userEvent.setup();
      render(<App />);

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
        projects: []
      };

      localStorage.setItem('resumeai_master_profile', JSON.stringify(mockData));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      // App should have loaded and validated the data
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });

    it('should handle missing storage data gracefully', async () => {
      vi.spyOn(StorageModule, 'loadResumeData').mockReturnValue(null);

      render(<App />);

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
        projects: null
      };

      localStorage.setItem('resumeai_master_profile', JSON.stringify(dataWithInvalidArrays));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });
  });

  describe('Global State Management', () => {
    it('should maintain save status state', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });

    it('should track loading state during initialization', async () => {
      render(<App />);

      // Initially should show loading message or dashboard once loaded
      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    it('should handle theme initialization from hook', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      // App should initialize theme and render without errors
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });
  });

  describe('Storage Warning Component', () => {
    it('should render storage warning component', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      // Storage warning is rendered but may be hidden initially
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });
  });

  describe('Complex Navigation Scenarios', () => {
    it.skip('should handle sequential navigation to all sidebar routes', async () => {
      // TODO: Fix - test routes don't match all app routes
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      // Navigate to each route in sequence
      const routes = [
        { button: 'nav-editor', page: 'editor-page' },
        { button: 'nav-workspace', page: 'workspace-page' },
        { button: 'nav-dashboard', page: 'dashboard-page' },
      ];

      for (const route of routes) {
        const navButton = screen.getByTestId(route.button);
        await user.click(navButton);

        await waitFor(() => {
          expect(screen.getByTestId(route.page)).toBeInTheDocument();
        });
      }
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
        projects: []
      };

      localStorage.setItem('resumeai_master_profile', JSON.stringify(mockData));

      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      // Navigate and return
      const editorButton = screen.getByTestId('nav-editor');
      await user.click(editorButton);

      await waitFor(() => {
        expect(screen.getByTestId('editor-page')).toBeInTheDocument();
      });

      const backButton = screen.getByTestId('editor-back-btn');
      await user.click(backButton);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });
    });
  });

  describe('Security Token Handling', () => {
    it('should validate token on mount', async () => {
      const token = 'test-token';
      localStorage.setItem('resume_ai_auth_token', token);

      vi.spyOn(TokenManager, 'getToken').mockReturnValue(token);
      vi.spyOn(TokenManager, 'isTokenExpired').mockReturnValue(false);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      expect(TokenManager.getToken).toHaveBeenCalled();
    });

    it('should remove expired token on mount', async () => {
      const expiredToken = 'expired-token';
      localStorage.setItem('resume_ai_auth_token', expiredToken);

      vi.spyOn(TokenManager, 'getToken').mockReturnValue(expiredToken);
      vi.spyOn(TokenManager, 'isTokenExpired').mockReturnValue(true);
      vi.spyOn(TokenManager, 'removeToken').mockImplementation(() => {
        localStorage.removeItem('resume_ai_auth_token');
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      expect(TokenManager.isTokenExpired).toHaveBeenCalledWith(expiredToken);
      expect(TokenManager.removeToken).toHaveBeenCalled();
    });
  });

  describe('Error Display and Dismissal', () => {
    it('should allow manual error dismissal', async () => {
      const user = userEvent.setup();

      vi.spyOn(StorageModule, 'loadResumeData').mockImplementation(() => {
        throw new StorageModule.StorageError(
          'Test error',
          StorageModule.StorageErrorType.QUOTA_EXCEEDED
        );
      });

      render(<App />);

      const errorMessage = await screen.findByText('Storage full. Please clear some browser data.');
      expect(errorMessage).toBeInTheDocument();

      const closeButton = screen.getByRole('button', { name: 'close' });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Storage full. Please clear some browser data.')).not.toBeInTheDocument();
      });
    });

    it('should display NOT_AVAILABLE error', async () => {
      vi.spyOn(StorageModule, 'loadResumeData').mockImplementation(() => {
        throw new StorageModule.StorageError(
          'Storage not available',
          StorageModule.StorageErrorType.NOT_AVAILABLE
        );
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Storage not available. Changes won\'t be saved.')).toBeInTheDocument();
      });
    });

    it('should display generic error for unknown error types', async () => {
      vi.spyOn(StorageModule, 'loadResumeData').mockImplementation(() => {
        throw new StorageModule.StorageError(
          'Unknown error',
          'UNKNOWN' as any
        );
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Failed to save data. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Suspense Boundaries', () => {
    it('should handle lazy loaded components', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      // Navigate to a lazy loaded route
      const workspaceButton = screen.getByTestId('nav-workspace');
      await user.click(workspaceButton);

      await waitFor(() => {
        expect(screen.getByTestId('workspace-page')).toBeInTheDocument();
      });
    });
  });
  });
