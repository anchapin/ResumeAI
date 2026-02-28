import React from 'react';
import Skeleton from '../Skeleton';

/**
 * @component
 * @description Dashboard skeleton loader
 * @returns {JSX.Element} The rendered dashboard skeleton
 */
const DashboardSkeleton: React.FC = () => {
  return (
    <div className="flex-1 min-h-screen bg-[#f6f6f8] pl-72">
      <header className="h-16 flex items-center justify-between px-8 bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-200">
        <Skeleton width={200} height={28} variant="text" />
        <div className="flex items-center gap-4">
          <Skeleton width={40} height={40} variant="circular" />
        </div>
      </header>

      <div className="p-8 max-w-[1200px] mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <Skeleton width={40} height={40} variant="rounded" className="mb-4" />
              <Skeleton width="100%" height={40} variant="text" className="mb-2" />
              <Skeleton width={120} height={20} variant="text" />
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <Skeleton width={200} height={24} variant="text" />
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton width={40} height={40} variant="circular" />
                  <div className="flex-1">
                    <Skeleton width="60%" height={16} variant="text" className="mb-2" />
                    <Skeleton width="40%" height={14} variant="text" />
                  </div>
                  <Skeleton width={100} height={20} variant="text" />
                  <Skeleton width={80} height={14} variant="text" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Skeleton width={250} height={24} variant="text" />
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <div className="h-64 flex items-center justify-center">
              <Skeleton width="100%" height="100%" variant="rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;
