import React, { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { registerPrefetch } from './utils/prefetch';

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
  const setResumeError = useStore((state) => state.setResumeError);
  const resumeError = useStore((state) => state.resumeError);
  const showShortcuts = useStore((state) => state.showShortcuts);
  const setShowShortcuts = useStore((state) => state.setShowShortcuts);
  const globalLoading = useStore((state) => state.globalLoading);

  const { isAuthenticated } = useAuth();

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

        setTimeout(() => setSaveStatus('idle'), 3000);
      } catch (error) {
        setSaveStatus('error');
        const storageError = error instanceof StorageError ? error : null;
        const message = storageError ? getStorageErrorMessage(storageError) : 'Failed to save data';

        errorHandler.handleError(new Error(message), {
          context: 'auto_save',
          type: ErrorType.STORAGE,
        });

        setTimeout(() => setSaveStatus('idle'), 5000);
      }
    }, 1000);

    return () => clearTimeout(handler);
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
                <Login />
              </Suspense>
            }
          />
          <Route
            path="/register"
            element={
              <Suspense fallback={<PageLoader />}>
                <Register />
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
                <Suspense fallback={<EditorSkeleton />}>
                  <Editor />
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
                <Suspense fallback={<WorkspaceSkeleton />}>
                  <Workspace />
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
                <Suspense fallback={<SettingsSkeleton />}>
                  <div className="flex min-h-screen bg-[#f6f6f8]">
                    <Sidebar onShowShortcuts={setShowShortcuts} />
                    <Settings />
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
                    <Sidebar onShowShortcuts={setShowShortcuts} />
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
                    <Sidebar onShowShortcuts={setShowShortcuts} />
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
                    <Sidebar onShowShortcuts={setShowShortcuts} />
                    <Invoices />
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
                <Suspense fallback={<ResumeManagementSkeleton />}>
                  <div className="flex min-h-screen bg-[#f6f6f8]">
                    <Sidebar onShowShortcuts={setShowShortcuts} />
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
