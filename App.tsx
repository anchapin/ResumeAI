import React, { useEffect, useRef, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { registerPrefetch } from './utils/prefetch';
import './i18n';

// Lazy load page components for better code splitting
const dashboardImport = () => import('./pages/Dashboard');
const editorImport = () => import('./pages/Editor');
const workspaceImport = () => import('./pages/Workspace');
const appsImport = () => import('./pages/JobApplications');
const settingsImport = () => import('./pages/Settings');
const bulkImport = () => import('./pages/ResumeManagement');
const salaryImport = () =>
  import('./pages/SalaryResearch').then((m) => ({ default: m.SalaryResearch }));
const interviewImport = () => import('./pages/InterviewPractice');
const loginImport = () => import('./pages/Login');
const registerImport = () => import('./pages/Register');

const Dashboard = lazy(dashboardImport);
const Editor = lazy(editorImport);
const Workspace = lazy(workspaceImport);
const JobApplications = lazy(appsImport);
const Settings = lazy(settingsImport);
const ResumeManagement = lazy(bulkImport);
const SalaryResearch = lazy(salaryImport);
const InterviewPractice = lazy(interviewImport);
const Login = lazy(loginImport);
const Register = lazy(registerImport);

// Register prefetches
registerPrefetch('dashboard', dashboardImport);
registerPrefetch('editor', editorImport);
registerPrefetch('workspace', workspaceImport);
registerPrefetch('applications', appsImport);
registerPrefetch('settings', settingsImport);
registerPrefetch('bulk', bulkImport);
registerPrefetch('salary', salaryImport);
registerPrefetch('interview', interviewImport);
registerPrefetch('login', loginImport);
registerPrefetch('register', registerImport);

const NotFound = lazy(() => import('./pages/NotFound'));
const Billing = lazy(() => import('./pages/Billing'));
const Plans = lazy(() => import('./pages/Plans'));
const PaymentMethods = lazy(() => import('./pages/PaymentMethods'));
const Invoices = lazy(() => import('./pages/Invoices'));
const Webhooks = lazy(() => import('./pages/Webhooks'));

import { saveResumeData, StorageError, getStorageErrorMessage } from './utils/storage';
import ErrorBoundary from './components/ErrorBoundary';
import ErrorDisplay from './components/ErrorDisplay';
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
import OfflineIndicator from './components/OfflineIndicator';
import { errorHandler, ErrorType } from './utils/errorHandler';
import { initSentry, setUserContext } from './src/lib/sentry';
import { isMetricsEnabled, setMetricsEnabled, initWebVitals, trackPageLoad, trackSessionMetrics } from './src/lib/metrics';

// Initialize Sentry error tracking
initSentry();

// Enable metrics collection by default in production
if (import.meta.env.PROD) {
  setMetricsEnabled(true);
}

// Initialize Web Vitals collection if metrics are enabled
if (typeof window !== 'undefined' && isMetricsEnabled()) {
  initWebVitals();
  trackSessionMetrics();
}

// Timing constants for auto-save and status display
const SAVE_STATUS_DISPLAY_DURATION = 3000;
const ERROR_STATUS_DISPLAY_DURATION = 5000;
const AUTO_SAVE_DEBOUNCE_MS = 1000;

// Skeleton components
import AppSkeleton from './components/skeletons/AppSkeleton';
import DashboardSkeleton from './components/skeletons/DashboardSkeleton';
import EditorSkeleton from './components/skeletons/EditorSkeleton';
import WorkspaceSkeleton from './components/skeletons/WorkspaceSkeleton';
import JobApplicationsSkeleton from './components/skeletons/JobApplicationsSkeleton';
import SettingsSkeleton from './components/skeletons/SettingsSkeleton';
import ResumeManagementSkeleton from './components/skeletons/ResumeManagementSkeleton';

/**
 * Loading fallback for code-split chunks - Uses generic app shell skeleton
 */
const PageLoader = () => <AppSkeleton />;

/** Save status enum for tracking auto-save state */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function App() {
  const resumeData = useStore((state) => state.resumeData);
  const isLoaded = useStore((state) => state.isResumeLoaded);
  const loadResume = useStore((state) => state.loadResume);
  const setSaveStatus = useStore((state) => state.setSaveStatus);
  const saveStatus = useStore((state) => state.saveStatus);
  const setResumeError = useStore((state) => state.setResumeError);
  const resumeError = useStore((state) => state.resumeError);
  const showShortcuts = useStore((state) => state.showShortcuts);
  const setShowShortcuts = useStore((state) => state.setShowShortcuts);
  const globalLoading = useStore((state) => state.globalLoading);

  const { isAuthenticated } = useAuth();

  // Set Sentry user context when auth state changes
  const user = useStore((state) => state.user);
  useEffect(() => {
    if (user) {
      setUserContext({
        id: String(user.id),
        email: user.email,
        username: user.username,
      });
    } else {
      setUserContext(null);
    }
  }, [user]);

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

  // Warn users about unsaved changes when saving is in progress
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'saving') {
        e.preventDefault();
        e.returnValue = ''; // Standard way to trigger the browser confirmation dialog
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

  // Track page views on route change
  const location = useLocation();
  useEffect(() => {
    if (isMetricsEnabled()) {
      trackPageLoad(location.pathname.replace('/', '') || 'dashboard');
    }
  }, [location.pathname]);

  // Sync store-level resumeError to global errorHandler
  useEffect(() => {
    if (resumeError) {
      errorHandler.handleError(new Error(resumeError), { type: ErrorType.STORAGE });
      setResumeError(null);
    }
  }, [resumeError, setResumeError]);

  // Load resume data from localStorage on mount and check security
  useEffect(() => {
    loadResume().catch((error) => {
      errorHandler.handleError(error, {
        context: 'initial_load',
        type: error instanceof StorageError ? ErrorType.STORAGE : ErrorType.UNKNOWN,
      });
    });
  }, [loadResume]);

  // Save resume data to localStorage whenever it changes
  // Use refs to properly track timeouts for cleanup
  const innerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    setSaveStatus('saving');

    const handler = setTimeout(async () => {
      try {
        await saveResumeData(resumeData);
        setSaveStatus('saved');
        if (import.meta.env.DEV) {
          console.log('Resume data saved to localStorage');
        }

        innerTimeoutRef.current = setTimeout(
          () => setSaveStatus('idle'),
          SAVE_STATUS_DISPLAY_DURATION,
        );
      } catch (error) {
        setSaveStatus('error');
        const storageError = error instanceof StorageError ? error : null;
        const message = storageError ? getStorageErrorMessage(storageError) : 'Failed to save data';

        errorHandler.handleError(new Error(message), {
          context: 'auto_save',
          type: ErrorType.STORAGE,
        });

        innerTimeoutRef.current = setTimeout(
          () => setSaveStatus('idle'),
          ERROR_STATUS_DISPLAY_DURATION,
        );
      }
    }, AUTO_SAVE_DEBOUNCE_MS);

    return () => {
      clearTimeout(handler);
      if (innerTimeoutRef.current) {
        clearTimeout(innerTimeoutRef.current);
      }
    };
  }, [resumeData, isLoaded, setSaveStatus]);

  return (
    <ErrorBoundary>
      <SkipNavigation />

      {/* Global loading indicator */}
      {globalLoading && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-top-4">
          <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-primary-100 flex items-center gap-3">
            <div className="w-4 h-4 rounded-full border-2 border-primary-600 border-t-transparent animate-spin"></div>
            <span className="text-sm font-semibold text-slate-700">Processing...</span>
          </div>
        </div>
      )}

      {/* Global error display - handles all errors unified */}
      <ErrorDisplay error={currentError} onDismiss={dismissError} />

      {showShortcuts && <KeyboardShortcutsHelp onClose={() => setShowShortcuts(false)} />}
      <StorageWarning />
      <OfflineIndicator />
      {!isLoaded ? (
        <AppSkeleton />
      ) : (
        <Routes>
          <Route
            path="/login"
            element={
              <Suspense fallback={<PageLoader />}>
                <main id="main-content">
                  <Login />
                </main>
              </Suspense>
            }
          />
          <Route
            path="/register"
            element={
              <Suspense fallback={<PageLoader />}>
                <main id="main-content">
                  <Register />
                </main>
              </Suspense>
            }
          />
          <Route
            path="/dashboard"
            element={
              isAuthenticated ? (
                <Suspense fallback={<DashboardSkeleton />}>
                  <div className="flex min-h-screen bg-[#f6f6f8]">
                    <nav id="main-nav">
                      <Sidebar onShowShortcuts={setShowShortcuts} />
                    </nav>
                    <main id="main-content" tabIndex={-1}>
                      <Dashboard />
                    </main>
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
                <Suspense fallback={<JobApplicationsSkeleton />}>
                  <div className="flex min-h-screen bg-[#f6f6f8]">
                    <Sidebar onShowShortcuts={setShowShortcuts} />
                    <main id="main-content" tabIndex={-1} className="flex-1">
                      <JobApplications />
                    </main>
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
                <Suspense fallback={<EditorSkeleton />}>
                  <main id="main-content" tabIndex={-1}>
                    <Editor />
                  </main>
                </Suspense>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route path="/workspace" element={<Navigate to="/my-resumes" replace />} />
          <Route path="/bulk" element={<Navigate to="/bulk-operations" replace />} />
          <Route
            path="/my-resumes"
            element={
              isAuthenticated ? (
                <Suspense fallback={<WorkspaceSkeleton />}>
                  <main id="main-content" tabIndex={-1}>
                    <Workspace />
                  </main>
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
                    <Sidebar onShowShortcuts={setShowShortcuts} />
                    <main id="main-content" tabIndex={-1} className="flex-1">
                      <SalaryResearch />
                    </main>
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
                  <main id="main-content" tabIndex={-1}>
                    <InterviewPractice />
                  </main>
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
                <Suspense fallback={<SettingsSkeleton />}>
                  <div className="flex min-h-screen bg-[#f6f6f8]">
                    <Sidebar onShowShortcuts={setShowShortcuts} />
                    <main id="main-content" tabIndex={-1} className="flex-1">
                      <Settings />
                    </main>
                  </div>
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
                    <Sidebar onShowShortcuts={setShowShortcuts} />
                    <main id="main-content" tabIndex={-1} className="flex-1">
                      <Billing />
                    </main>
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
                    <Sidebar onShowShortcuts={setShowShortcuts} />
                    <main id="main-content" tabIndex={-1} className="flex-1">
                      <Plans />
                    </main>
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
                    <Sidebar onShowShortcuts={setShowShortcuts} />
                    <main id="main-content" tabIndex={-1} className="flex-1">
                      <PaymentMethods />
                    </main>
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
                    <Sidebar onShowShortcuts={setShowShortcuts} />
                    <main id="main-content" tabIndex={-1} className="flex-1">
                      <Invoices />
                    </main>
                  </div>
                </Suspense>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/webhooks"
            element={
              isAuthenticated ? (
                <Suspense fallback={<PageLoader />}>
                  <div className="flex min-h-screen bg-[#f6f6f8]">
                    <Sidebar onShowShortcuts={setShowShortcuts} />
                    <main id="main-content" tabIndex={-1} className="flex-1">
                      <Webhooks />
                    </main>
                  </div>
                </Suspense>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/bulk-operations"
            element={
              isAuthenticated ? (
                <Suspense fallback={<ResumeManagementSkeleton />}>
                  <div className="flex min-h-screen bg-[#f6f6f8]">
                    <Sidebar onShowShortcuts={setShowShortcuts} />
                    <main id="main-content" tabIndex={-1} className="flex-1">
                      <ResumeManagement />
                    </main>
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
                <main id="main-content">
                  <NotFound />
                </main>
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
