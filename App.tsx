import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';

// Lazy load page components for better code splitting
const Editor = lazy(() => import('./pages/Editor'));
const Workspace = lazy(() => import('./pages/Workspace'));
const JobApplications = lazy(() => import('./pages/JobApplications'));
const Settings = lazy(() => import('./pages/Settings'));
const ResumeManagement = lazy(() => import('./pages/ResumeManagement'));
const SalaryResearch = lazy(() =>
  import('./pages/SalaryResearch').then((m) => ({ default: m.SalaryResearch })),
);
const InterviewPractice = lazy(() => import('./pages/InterviewPractice'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const NotFound = lazy(() => import('./pages/NotFound'));
import { Route as RouteEnum, SimpleResumeData } from './types';
import { loadResumeData, saveResumeData, StorageError } from './utils/storage';
import ErrorBoundary from './components/ErrorBoundary';
import ErrorDisplay from './components/ErrorDisplay';
import { TokenManager } from './utils/security';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { useGlobalErrors } from './hooks/useGlobalErrors';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './components/toast-styles.css';
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp';
import { DEFAULT_SHORTCUTS, registerShortcuts } from './utils/shortcuts';
import StorageWarning from './components/StorageWarning';
import SkipNavigation from './components/SkipNavigation';

/**
 * Loading fallback for code-split chunks
 */
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-[#f6f6f8]">
    <div className="flex items-center gap-3">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      <span className="text-slate-600 font-medium">Loading page...</span>
    </div>
  </div>
);

const initialResumeData: SimpleResumeData = {
  name: 'Alex Rivera',
  email: 'alex.rivera@example.com',
  phone: '+1 (555) 012-3456',
  location: 'San Francisco, CA',
  role: 'Senior Product Designer',
  summary:
    'Passionate and detail-oriented Senior Product Designer with 8+ years of experience creating user-centered digital experiences. Expertise in UX research, interaction design, and design systems. Proven track record of delivering products that drive business growth and user satisfaction.',
  skills: [
    'Figma',
    'Sketch',
    'Adobe XD',
    'User Research',
    'Prototyping',
    'Design Systems',
    'React',
    'TypeScript',
    'HTML/CSS',
  ],
  experience: [
    {
      id: '1',
      company: 'TechCorp Solutions',
      role: 'Senior Software Engineer',
      startDate: 'Jan 2020',
      endDate: 'Present',
      current: true,
      description:
        'Led the migration of legacy monolithic architecture to microservices using AWS and Node.js, improving system scalability by 40%.',
      tags: ['AWS', 'Microservices'],
    },
    {
      id: '2',
      company: 'StartupHub Inc',
      role: 'Software Developer',
      startDate: 'Jun 2017',
      endDate: 'Dec 2019',
      current: false,
      description:
        'Mentored a team of 5 junior developers and implemented CI/CD pipelines reducing deployment time by 50%.',
      tags: ['Mentorship', 'CI/CD'],
    },
  ],
  education: [
    {
      id: '1',
      institution: 'Stanford University',
      area: 'Computer Science',
      studyType: 'Bachelor of Science',
      startDate: '2013',
      endDate: '2017',
      courses: ['Data Structures', 'Algorithms', 'Machine Learning', 'Human-Computer Interaction'],
    },
  ],
  projects: [
    {
      id: '1',
      name: 'E-commerce Platform Redesign',
      description:
        'Led a complete UX overhaul of a major e-commerce platform, resulting in a 35% increase in conversion rates.',
      url: 'https://github.com/alexrivera/ecommerce-redesign',
      roles: ['Lead Designer', 'UX Researcher'],
      startDate: '2022',
      endDate: '2023',
      highlights: [
        'User interviews with 50+ customers',
        'A/B testing of new designs',
        'Design system creation',
      ],
    },
  ],
};

/** Save status enum for tracking auto-save state */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [resumeData, setResumeData] = useState<SimpleResumeData>(initialResumeData);
  const [isLoaded, setIsLoaded] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  // Authentication
  const {
    user,
    isAuthenticated,
    isLoading: authLoading,
    error: authError,
    login,
    register,
    logout,
    clearError: clearAuthError,
  } = useAuth();

  // Initialize theme (dark mode support)
  const { theme } = useTheme();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Setup global error handling
  const { currentError, dismissError } = useGlobalErrors();

  // Register global keyboard shortcuts
  useEffect(() => {
    return registerShortcuts(DEFAULT_SHORTCUTS, (action) => {
      if (action === 'Show keyboard shortcuts') {
        setShowShortcuts((prev) => !prev);
      }
    });
  }, []);

  // Load resume data from localStorage on mount and check security
  useEffect(() => {
    // Check if authentication token is still valid
    const token = TokenManager.getToken();
    if (token && TokenManager.isTokenExpired(token)) {
      // Token is expired, remove it
      TokenManager.removeToken();
      if (import.meta.env.DEV) {
        console.warn('Authentication token expired, please log in again');
      }
      // In a real app, you might show a notification or redirect to login
    }

    try {
      const savedData = loadResumeData();
      if (savedData) {
        // Defensive mapping to ensure all arrays exist
        const validatedData: SimpleResumeData = {
          ...savedData,
          skills: Array.isArray(savedData.skills) ? savedData.skills : [],
          experience: Array.isArray(savedData.experience) ? savedData.experience : [],
          education: Array.isArray(savedData.education) ? savedData.education : [],
          projects: Array.isArray(savedData.projects) ? savedData.projects : [],
        };
        setResumeData(validatedData);
        if (import.meta.env.DEV) {
          console.log('Resume data loaded and validated:', {
            skills: validatedData.skills.length,
            education: validatedData.education.length,
            experience: validatedData.experience.length,
          });
        }
      } else if (import.meta.env.DEV) {
        console.log('No saved resume data found, using initial data');
      }
    } catch (error) {
      if (error instanceof StorageError) {
        if (import.meta.env.DEV) {
          console.error('Storage error:', error.message, error.type);
        }
        // Show a user-friendly error message
        const errorMessage = getErrorMessage(error);
        setStorageError(errorMessage);

        // Auto-dismiss error after 5 seconds
        setTimeout(() => setStorageError(null), 5000);
      } else if (import.meta.env.DEV) {
        console.error('Unexpected error loading resume data:', error);
      }
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save resume data to localStorage whenever it changes
  useEffect(() => {
    // Only save after initial load is complete to avoid overwriting with initial data
    if (!isLoaded) return;

    // Set saving status when data changes
    setSaveStatus('saving');

    // Debounce save to avoid performance issues on rapid updates
    const handler = setTimeout(() => {
      try {
        saveResumeData(resumeData);
        setSaveStatus('saved');
        if (import.meta.env.DEV) {
          console.log('Resume data saved to localStorage');
        }

        // Reset to idle after 3 seconds
        setTimeout(() => setSaveStatus('idle'), 3000);
      } catch (error) {
        setSaveStatus('error');
        if (error instanceof StorageError) {
          if (import.meta.env.DEV) {
            console.error('Storage error:', error.message, error.type);
          }
          const errorMessage = getErrorMessage(error);
          setStorageError(errorMessage);

          // Auto-dismiss error after 5 seconds
          setTimeout(() => setStorageError(null), 5000);
        } else if (import.meta.env.DEV) {
          console.error('Unexpected error saving resume data:', error);
        }

        // Reset to idle after 5 seconds
        setTimeout(() => setSaveStatus('idle'), 5000);
      }
    }, 1000);

    return () => clearTimeout(handler);
  }, [resumeData, isLoaded]);

  /**
   * Helper function to get user-friendly error messages
   */
  const getErrorMessage = (error: StorageError): string => {
    switch (error.type) {
      case 'QUOTA_EXCEEDED':
        return 'Storage full. Please clear some browser data.';
      case 'PARSE_ERROR':
        return 'Data corrupted. Using default resume.';
      case 'ACCESS_DENIED':
        return "Storage access denied. Changes won't be saved.";
      case 'NOT_AVAILABLE':
        return "Storage not available. Changes won't be saved.";
      default:
        return 'Failed to save data. Please try again.';
    }
  };

  /**
   * Wrapper for setResumeData that can be used externally
   * This is mainly for type consistency, but could be extended
   * with additional logic in the future.
   */
  const handleUpdateResumeData = useCallback(
    (newData: SimpleResumeData | ((prev: SimpleResumeData) => SimpleResumeData)) => {
      setResumeData(newData);
    },
    [],
  );

  const handleLogin = async (email: string, password: string) => {
    clearAuthError();
    const result = await login(email, password);
    if (result) {
      navigate('/dashboard');
    }
    return result;
  };

  const handleRegister = async (
    email: string,
    username: string,
    password: string,
    fullName?: string,
  ) => {
    clearAuthError();
    return register(email, username, password, fullName);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getCurrentRouteFromPath = (): RouteEnum => {
    const path = location.pathname;
    switch (path) {
      case '/dashboard':
        return RouteEnum.DASHBOARD;
      case '/applications':
        return RouteEnum.APPLICATIONS;
      case '/editor':
        return RouteEnum.EDITOR;
      case '/workspace':
        return RouteEnum.WORKSPACE;
      case '/salary-research':
        return RouteEnum.SALARY_RESEARCH;
      case '/interview-practice':
        return RouteEnum.INTERVIEW_PRACTICE;
      case '/settings':
        return RouteEnum.SETTINGS;
      case '/bulk':
        return RouteEnum.BULK;
      case '/login':
        return RouteEnum.LOGIN;
      case '/register':
        return RouteEnum.REGISTER;
      default:
        return RouteEnum.DASHBOARD;
    }
  };

  return (
    <ErrorBoundary>
      <SkipNavigation />

      {/* Global error display */}
      <ErrorDisplay error={currentError} onDismiss={dismissError} />

      {showShortcuts && <KeyboardShortcutsHelp onClose={() => setShowShortcuts(false)} />}
      {storageError && (
        <div className="fixed top-4 right-4 z-50 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top-2 fade-in">
          <span className="material-symbols-outlined text-red-500">error</span>
          <span className="text-sm font-semibold">{storageError}</span>
          <button
            onClick={() => setStorageError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
      )}
      <StorageWarning />
      {!isLoaded ? (
        <div className="min-h-screen flex items-center justify-center bg-[#f6f6f8]">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="text-slate-600 font-medium">Loading...</span>
          </div>
        </div>
      ) : (
        <Routes>
          <Route
            path="/login"
            element={
              <Suspense fallback={<PageLoader />}>
                <Login onLogin={handleLogin} error={authError} isLoading={authLoading} />
              </Suspense>
            }
          />
          <Route
            path="/register"
            element={
              <Suspense fallback={<PageLoader />}>
                <Register onRegister={handleRegister} error={authError} isLoading={authLoading} />
              </Suspense>
            }
          />
          <Route
            path="/dashboard"
            element={
              isAuthenticated ? (
                <div className="flex min-h-screen bg-[#f6f6f8]">
                  <nav id="main-nav">
                    <Sidebar
                      currentRoute={getCurrentRouteFromPath()}
                      onShowShortcuts={() => setShowShortcuts(true)}
                      isAuthenticated={isAuthenticated}
                      username={user?.username}
                      onLogout={handleLogout}
                    />
                  </nav>
                  <main id="main-content" tabIndex={-1}>
                    <Dashboard />
                  </main>
                </div>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/applications"
            element={
              isAuthenticated ? (
                <Suspense fallback={<PageLoader />}>
                  <div className="flex min-h-screen bg-[#f6f6f8]">
                    <Sidebar
                      currentRoute={getCurrentRouteFromPath()}
                      onShowShortcuts={() => setShowShortcuts(true)}
                      isAuthenticated={isAuthenticated}
                      username={user?.username}
                      onLogout={handleLogout}
                    />
                    <JobApplications />
                  </div>
                </Suspense>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/editor"
            element={
              isAuthenticated ? (
                <Suspense fallback={<PageLoader />}>
                  <Editor
                    resumeData={resumeData}
                    onUpdate={handleUpdateResumeData}
                    saveStatus={saveStatus}
                  />
                </Suspense>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/workspace"
            element={
              isAuthenticated ? (
                <Suspense fallback={<PageLoader />}>
                  <Workspace resumeData={resumeData} />
                </Suspense>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/salary-research"
            element={
              isAuthenticated ? (
                <Suspense fallback={<PageLoader />}>
                  <div className="flex min-h-screen bg-[#f6f6f8]">
                    <Sidebar
                      currentRoute={getCurrentRouteFromPath()}
                      onShowShortcuts={() => setShowShortcuts(true)}
                      isAuthenticated={isAuthenticated}
                      username={user?.username}
                      onLogout={handleLogout}
                    />
                    <SalaryResearch />
                  </div>
                </Suspense>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/interview-practice"
            element={
              isAuthenticated ? (
                <Suspense fallback={<PageLoader />}>
                  <InterviewPractice />
                </Suspense>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/settings"
            element={
              isAuthenticated ? (
                <Suspense fallback={<PageLoader />}>
                  <div className="flex min-h-screen bg-[#f6f6f8]">
                    <Sidebar
                      currentRoute={getCurrentRouteFromPath()}
                      onShowShortcuts={() => setShowShortcuts(true)}
                      isAuthenticated={isAuthenticated}
                      username={user?.username}
                      onLogout={handleLogout}
                    />
                    <Settings />
                  </div>
                </Suspense>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/bulk"
            element={
              isAuthenticated ? (
                <Suspense fallback={<PageLoader />}>
                  <div className="flex min-h-screen bg-[#f6f6f8]">
                    <Sidebar
                      currentRoute={getCurrentRouteFromPath()}
                      onShowShortcuts={() => setShowShortcuts(true)}
                      isAuthenticated={isAuthenticated}
                      username={user?.username}
                      onLogout={handleLogout}
                    />
                    <ResumeManagement />
                  </div>
                </Suspense>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="*"
            element={
              <Suspense fallback={<PageLoader />}>
                <NotFound />
              </Suspense>
            }
          />
        </Routes>
      )}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={true}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </ErrorBoundary>
  );
}

export default App;
