import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import Workspace from './pages/Workspace';
import JobApplications from './pages/JobApplications';
import Settings from './pages/Settings';
import { Route, SimpleResumeData } from './types';
import { loadResumeData, saveResumeData, StorageError } from './utils/storage';

const initialResumeData: SimpleResumeData = {
  name: "Alex Rivera",
  email: "alex.rivera@example.com",
  phone: "+1 (555) 012-3456",
  location: "San Francisco, CA",
  role: "Senior Product Designer",
  experience: [
    {
      id: '1',
      company: 'TechCorp Solutions',
      role: 'Senior Software Engineer',
      startDate: 'Jan 2020',
      endDate: 'Present',
      current: true,
      description: 'Led the migration of legacy monolithic architecture to microservices using AWS and Node.js, improving system scalability by 40%.',
      tags: ['AWS', 'Microservices']
    },
    {
      id: '2',
      company: 'StartupHub Inc',
      role: 'Software Developer',
      startDate: 'Jun 2017',
      endDate: 'Dec 2019',
      current: false,
      description: 'Mentored a team of 5 junior developers and implemented CI/CD pipelines reducing deployment time by 50%.',
      tags: ['Mentorship', 'CI/CD']
    }
  ]
};

function App() {
  const [currentRoute, setCurrentRoute] = useState<Route>(Route.DASHBOARD);
  const [resumeData, setResumeData] = useState<SimpleResumeData>(initialResumeData);
  const [isLoaded, setIsLoaded] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  // Load resume data from localStorage on mount
  useEffect(() => {
    try {
      const savedData = loadResumeData();
      if (savedData) {
        setResumeData(savedData);
        console.log('Resume data loaded from localStorage');
      } else {
        console.log('No saved resume data found, using initial data');
      }
    } catch (error) {
      if (error instanceof StorageError) {
        console.error('Storage error:', error.message, error.type);
        // Show a user-friendly error message
        const errorMessage = getErrorMessage(error);
        setStorageError(errorMessage);

        // Auto-dismiss error after 5 seconds
        setTimeout(() => setStorageError(null), 5000);
      } else {
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

    try {
      saveResumeData(resumeData);
      console.log('Resume data saved to localStorage');
    } catch (error) {
      if (error instanceof StorageError) {
        console.error('Storage error:', error.message, error.type);
        const errorMessage = getErrorMessage(error);
        setStorageError(errorMessage);

        // Auto-dismiss error after 5 seconds
        setTimeout(() => setStorageError(null), 5000);
      } else {
        console.error('Unexpected error saving resume data:', error);
      }
    }
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
        return 'Storage access denied. Changes won\'t be saved.';
      case 'NOT_AVAILABLE':
        return 'Storage not available. Changes won\'t be saved.';
      default:
        return 'Failed to save data. Please try again.';
    }
  };

  /**
   * Wrapper for setResumeData that can be used externally
   * This is mainly for type consistency, but could be extended
   * with additional logic in the future.
   */
  const handleUpdateResumeData = useCallback((newData: SimpleResumeData | ((prev: SimpleResumeData) => SimpleResumeData)) => {
    setResumeData(newData);
  }, []);

  const renderContent = () => {
    switch (currentRoute) {
      case Route.DASHBOARD:
        return (
            <div className="flex min-h-screen bg-[#f6f6f8]">
                <Sidebar currentRoute={currentRoute} onNavigate={setCurrentRoute} />
                <Dashboard />
            </div>
        );
      case Route.APPLICATIONS:
        return (
            <div className="flex min-h-screen bg-[#f6f6f8]">
                <Sidebar currentRoute={currentRoute} onNavigate={setCurrentRoute} />
                <JobApplications />
            </div>
        );
      case Route.EDITOR:
        return (
          <Editor
            resumeData={resumeData}
            onUpdate={handleUpdateResumeData}
            onBack={() => setCurrentRoute(Route.DASHBOARD)}
          />
        );
      case Route.WORKSPACE:
        return (
          <Workspace
            resumeData={resumeData}
            onNavigate={setCurrentRoute}
          />
        );
      case Route.SETTINGS:
        return (
            <div className="flex min-h-screen bg-[#f6f6f8]">
                <Sidebar currentRoute={currentRoute} onNavigate={setCurrentRoute} />
                <Settings />
            </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="font-sans text-slate-900">
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
      {!isLoaded ? (
        <div className="min-h-screen flex items-center justify-center bg-[#f6f6f8]">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="text-slate-600 font-medium">Loading...</span>
          </div>
        </div>
      ) : (
        renderContent()
      )}
    </div>
  );
}

export default App;