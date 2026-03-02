import React, { useEffect, lazy, Suspense } from 'react';
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
const Billing = lazy(() => import('./pages/Billing'));
const Plans = lazy(() => import('./pages/Plans'));
const PaymentMethods = lazy(() => import('./pages/PaymentMethods'));
const Invoices = lazy(() => import('./pages/Invoices'));
import { Route as RouteEnum, SimpleResumeData } from './types';
import { saveResumeData } from './utils/storage';
import ErrorBoundary from './components/ErrorBoundary';
import ErrorDisplay from './components/ErrorDisplay';
import { TokenManager } from './utils/security';
import { useAuth } from './hooks/useAuth';
import { useGlobalErrors } from './hooks/useGlobalErrors';
import { useStore } from './store/store';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './components/toast-styles.css';
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp';
import { DEFAULT_SHORTCUTS, registerShortcuts } from './utils/shortcuts';
import StorageWarning from './components/StorageWarning';
import SkipNavigation from './components/SkipNavigation';

/**
 * Loading fallback for code-split chunks - Uses skeleton instead of spinner
 */
const PageLoader = () => (
  <div className="flex-1 min-h-screen bg-[#f6f6f8] pl-72">
    <header className="h-16 flex items-center justify-between px-8 bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-200">
      <div className="h-7 w-48 bg-slate-200 rounded animate-pulse"></div>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 bg-slate-200 rounded-full animate-pulse"></div>
      </div>
    </header>
    <div className="p-8 space-y-6">
      <div className="h-32 bg-slate-200 rounded-xl animate-pulse"></div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-slate-200 rounded-lg animate-pulse"></div>
        ))}
      </div>
    </div>
  </div>
);

/** Save status enum for tracking auto-save state */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const resumeData = useStore((state) => state.resumeData);
  const setResumeData = useStore((state) => state.setResumeData);
  const isLoaded = useStore((state) => state.isResumeLoaded);
  const loadResume = useStore((state) => state.loadResume);
  const saveStatus = useStore((state) => state.saveStatus);
  const setSaveStatus = useStore((state) => state.setSaveStatus);
  const resumeError = useStore((state) => state.resumeError);
  const setResumeError = useStore((state) => state.setResumeError);
  const showShortcuts = useStore((state) => state.showShortcuts);
  const setShowShortcuts = useStore((state) => state.setShowShortcuts);
  const theme = useStore((state) => state.theme);
  const [storageError, setStorageError] = React.useState<string | null>(null);

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

  // Setup global error handling
  const { currentError, dismissError } = useGlobalErrors();

  // Register global keyboard shortcuts
  useEffect(() => {
    return registerShortcuts(DEFAULT_SHORTCUTS, (action) => {
      if (action === 'Show keyboard shortcuts') {
        setShowShortcuts(!showShortcuts);
      }
    });
  }, [showShortcuts, setShowShortcuts]);

  // Auto-dismiss resumeError after 5 seconds
  useEffect(() => {
    if (resumeError) {
      const timer = setTimeout(() => {
        setResumeError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [resumeError, setResumeError]);

  // Load resume data from localStorage on mount and check security
  useEffect(() => {
    // Check if authentication token is still valid
    const token = TokenManager.getToken();
    if (token && TokenManager.isTokenExpired(token)) {
      TokenManager.removeToken();
      if (import.meta.env.DEV) {
        console.warn('Authentication token expired, please log in again');
      }
    }

    loadResume().catch((error) => {
      if (import.meta.env.DEV) {
        console.error('Unexpected error loading resume data:', error);
      }
    });
  }, [loadResume]);

  const getStorageErrorMessage = (): string => {
    return 'Failed to save data. Please try again.';
  };

  // Save resume data to localStorage whenever it changes
  useEffect(() => {
    if (!isLoaded) return;

    setSaveStatus('saving');

    const handler = setTimeout(() => {
      try {
        saveResumeData(resumeData);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
        setSaveStatus('error');
        const errorMessage = getStorageErrorMessage();
        setStorageError(errorMessage);

        setTimeout(() => setStorageError(null), 5000);

        setTimeout(() => setSaveStatus('idle'), 5000);
      }
    }, 1000);

    return () => clearTimeout(handler);
  }, [resumeData, isLoaded, setSaveStatus]);

  const handleLogin = async (email: string, password: string) => {
    clearAuthError();
    const result = await login(email, password);
    if (result) {
      navigate('/dashboard');
    }
  };

  const handleRegister = async (email: string, password: string) => {
    clearAuthError();
    const result = await register(email, password);
    if (result) {
      navigate('/dashboard');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  /**
   * Determine the current route enum based on the pathname
   */
  const getCurrentRouteFromPath = (): RouteEnum => {
    const path = location.pathname;
    if (path === '/') return RouteEnum.DASHBOARD;
    if (path.startsWith('/editor')) return RouteEnum.EDITOR;
    if (path.startsWith('/workspace')) return RouteEnum.WORKSPACE;
    if (path.startsWith('/applications')) return RouteEnum.APPLICATIONS;
    if (path.startsWith('/settings')) return RouteEnum.SETTINGS;
    if (path.startsWith('/bulk')) return RouteEnum.BULK;
    if (path.startsWith('/salary')) return RouteEnum.SALARY_RESEARCH;
    if (path.startsWith('/interview')) return RouteEnum.INTERVIEW_PRACTICE;
    if (path.startsWith('/login')) return RouteEnum.LOGIN;
    if (path.startsWith('/register')) return RouteEnum.REGISTER;
    if (path.startsWith('/billing')) return RouteEnum.BILLING;
    return RouteEnum.DASHBOARD;
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
      {resumeError && (
        <div className="fixed top-20 right-4 z-50 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top-2 fade-in">
          <span className="material-symbols-outlined text-red-500">error</span>
          <span className="text-sm font-semibold">{resumeError}</span>
          <button
            onClick={() => setResumeError(null)}
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
            path="/"
            element={
              isAuthenticated ? (
                <div className="flex min-h-screen bg-[#f6f6f8]">
                  <Sidebar
                    currentRoute={getCurrentRouteFromPath()}
                    onShowShortcuts={() => setShowShortcuts(true)}
                    isAuthenticated={isAuthenticated}
                    username={user?.username}
                    onLogout={handleLogout}
                  />
                  <Dashboard />
                </div>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/dashboard"
            element={
              isAuthenticated ? (
                <div className="flex min-h-screen bg-[#f6f6f8]">
                  <Sidebar
                    currentRoute={getCurrentRouteFromPath()}
                    onShowShortcuts={() => setShowShortcuts(true)}
                    isAuthenticated={isAuthenticated}
                    username={user?.username}
                    onLogout={handleLogout}
                  />
                  <Dashboard />
                </div>
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
                  <div className="flex min-h-screen bg-[#f6f6f8]">
                    <Sidebar
                      currentRoute={getCurrentRouteFromPath()}
                      onShowShortcuts={() => setShowShortcuts(true)}
                      isAuthenticated={isAuthenticated}
                      username={user?.username}
                      onLogout={handleLogout}
                    />
                    <Editor />
                  </div>
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
                  <div className="flex min-h-screen bg-[#f6f6f8]">
                    <Sidebar
                      currentRoute={getCurrentRouteFromPath()}
                      onShowShortcuts={() => setShowShortcuts(true)}
                      isAuthenticated={isAuthenticated}
                      username={user?.username}
                      onLogout={handleLogout}
                    />
                    <Workspace />
                  </div>
                </Suspense>
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
            path="/billing"
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
                    <Billing />
                  </div>
                </Suspense>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/billing/plans"
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
                    <Plans />
                  </div>
                </Suspense>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/billing/payment-methods"
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
                    <PaymentMethods />
                  </div>
                </Suspense>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/billing/invoices"
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
                    <Invoices />
                  </div>
                </Suspense>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      )}
      <ToastContainer position="bottom-right" theme="colored" hideProgressBar={false} />
    </ErrorBoundary>
  );
}

export default App;
