import React from 'react';
import Skeleton from '../Skeleton';

/**
 * @component
 * @description Job Applications page skeleton loader
 * @returns {JSX.Element} The rendered job applications skeleton
 */
const JobApplicationsSkeleton: React.FC = () => {
  return (
    <div className="flex-1 min-h-screen bg-[#f6f6f8] pl-72">
      <header className="h-16 flex items-center justify-between px-8 bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-200">
        <Skeleton width={200} height={28} variant="text" />
        <div className="flex items-center gap-4">
          <Skeleton width={120} height={40} variant="rounded" />
          <Skeleton width={120} height={40} variant="rounded" />
          <Skeleton width={140} height={40} variant="rounded" />
        </div>
      </header>

      <div className="p-8 max-w-[1200px] mx-auto space-y-6">
        <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Skeleton width="100%" height={40} variant="rounded" />
        </div>

        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <Skeleton width={40} height={40} variant="rounded" />
                <div className="flex-1">
                  <Skeleton width={120} height={14} variant="text" className="mb-2" />
                  <Skeleton width={60} height={24} variant="text" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <div className="flex gap-8">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} width={80} height={16} variant="text" />
              ))}
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="px-6 py-5">
                <div className="flex items-center gap-4">
                  <Skeleton width={40} height={40} variant="circular" />
                  <div className="flex-1">
                    <Skeleton width="50%" height={16} variant="text" className="mb-2" />
                    <Skeleton width="30%" height={14} variant="text" />
                  </div>
                  <Skeleton width={100} height={24} variant="rounded" />
                  <Skeleton width={80} height={14} variant="text" />
                  <Skeleton width={40} height={40} variant="rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobApplicationsSkeleton;
