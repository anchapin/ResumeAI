import React from 'react';

/**
 * @component
 * @description 404 Not Found page component
 * @returns {JSX.Element} The rendered 404 page
 */
const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f6f6f8] p-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-100 rounded-full mb-6">
          <span className="material-symbols-outlined text-4xl text-primary-600">error_outline</span>
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-slate-700 mb-4">Page Not Found</h2>
        <p className="text-slate-500 mb-8 max-w-md">
          The page you're looking for doesn't exist or has been moved. Please check the URL or
          navigate to another page.
        </p>
        <a
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-bold text-sm hover:bg-primary-700 transition-all shadow-md shadow-primary-600/20"
        >
          <span className="material-symbols-outlined">home</span>
          Go to Dashboard
        </a>
      </div>
    </div>
  );
};

export default NotFound;
