import React from 'react';
import Skeleton from '../Skeleton';

/**
 * @component
 * @description Editor page skeleton loader
 * @returns {JSX.Element} The rendered editor skeleton
 */
const EditorSkeleton: React.FC = () => {
  return (
    <div className="flex-1 min-h-screen bg-[#f6f6f8] pl-72">
      <header className="h-16 flex items-center justify-between px-8 bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-200">
        <Skeleton width={250} height={28} variant="text" />
        <div className="flex items-center gap-4">
          <Skeleton width={100} height={40} variant="rounded" />
          <Skeleton width={100} height={40} variant="rounded" />
          <Skeleton width={40} height={40} variant="circular" />
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Left sidebar editor panel */}
        <div className="w-1/3 border-r border-slate-200 bg-white p-8 space-y-6">
          <div>
            <Skeleton width={120} height={16} variant="text" className="mb-3" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton width="100%" height={14} variant="text" />
                  <Skeleton width="90%" height={14} variant="text" />
                </div>
              ))}
            </div>
          </div>

          <div>
            <Skeleton width={150} height={16} variant="text" className="mb-3" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton width={40} height={40} variant="rounded" />
                  <Skeleton width="100%" height={14} variant="text" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center editor area */}
        <div className="flex-1 border-r border-slate-200 bg-white p-8 space-y-4">
          <Skeleton width={300} height={24} variant="text" className="mb-6" />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton width="80%" height={16} variant="text" />
                <Skeleton width="100%" height={16} variant="text" />
                <Skeleton width="90%" height={16} variant="text" />
              </div>
            ))}
          </div>
        </div>

        {/* Right preview panel */}
        <div className="w-1/4 bg-white p-8 space-y-4">
          <Skeleton width={150} height={20} variant="text" className="mb-4" />
          <div className="border border-slate-200 rounded-lg p-6 space-y-4">
            <Skeleton width="100%" height={200} variant="rounded" className="mb-4" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} width="100%" height={14} variant="text" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorSkeleton;
