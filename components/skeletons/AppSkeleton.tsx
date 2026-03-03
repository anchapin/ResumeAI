import React from 'react';
import Skeleton from '../Skeleton';

/**
 * @component
 * @description Application shell skeleton loader (Sidebar + Header + Content)
 * @returns {JSX.Element} The rendered app shell skeleton
 */
const AppSkeleton: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-[#f6f6f8]">
      {/* Sidebar Skeleton */}
      <aside className="w-72 bg-slate-900 fixed h-full z-20 flex flex-col p-6 space-y-8">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton width={40} height={40} variant="rounded" className="bg-slate-800" />
          <Skeleton width={120} height={24} variant="text" className="bg-slate-800" />
        </div>

        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton width={24} height={24} variant="rounded" className="bg-slate-800" />
              <Skeleton width="70%" height={16} variant="text" className="bg-slate-800" />
            </div>
          ))}
        </div>

        <div className="mt-auto space-y-4">
          <div className="p-4 bg-slate-800/50 rounded-xl">
            <Skeleton width="100%" height={12} variant="text" className="bg-slate-700 mb-2" />
            <Skeleton width="80%" height={12} variant="text" className="bg-slate-700" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton width={32} height={32} variant="circular" className="bg-slate-800" />
            <Skeleton width={100} height={16} variant="text" className="bg-slate-800" />
          </div>
        </div>
      </aside>

      {/* Main Content Area Skeleton */}
      <div className="flex-1 pl-72">
        <header className="h-16 flex items-center justify-between px-8 bg-white border-b border-slate-200">
          <Skeleton width={150} height={24} variant="text" />
          <div className="flex items-center gap-4">
            <Skeleton width={32} height={32} variant="circular" />
            <Skeleton width={32} height={32} variant="circular" />
            <div className="w-px h-8 bg-slate-200 mx-2"></div>
            <Skeleton width={100} height={32} variant="rounded" />
            <Skeleton width={32} height={32} variant="circular" />
          </div>
        </header>

        <div className="p-8 max-w-[1200px] mx-auto space-y-6">
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <Skeleton width={40} height={40} variant="rounded" />
                  <div className="flex-1">
                    <Skeleton width="40%" height={12} variant="text" className="mb-2" />
                    <Skeleton width="60%" height={24} variant="text" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
            <div className="flex items-center justify-between">
              <Skeleton width={200} height={28} variant="text" />
              <Skeleton width={100} height={32} variant="rounded" />
            </div>

            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 py-3 border-b border-slate-50 last:border-0"
                >
                  <Skeleton width={40} height={40} variant="rounded" />
                  <div className="flex-1">
                    <Skeleton width="30%" height={16} variant="text" className="mb-2" />
                    <Skeleton width="20%" height={12} variant="text" />
                  </div>
                  <Skeleton width={80} height={24} variant="rounded" />
                  <Skeleton width={100} height={16} variant="text" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppSkeleton;
