import React from 'react';
import Skeleton from '../Skeleton';

/**
 * @component
 * @description Resume Management page skeleton loader
 * @returns {JSX.Element} The rendered resume management skeleton
 */
const ResumeManagementSkeleton: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-[#f6f6f8]">
      <div className="w-72 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <Skeleton width={120} height={28} variant="text" />
        </div>
        <div className="flex-1 p-4 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} width="100%" height={40} variant="rounded" />
          ))}
        </div>
      </div>

      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-6">
          <Skeleton width={200} height={32} variant="rounded" />
          <div className="flex gap-3">
            <Skeleton width={120} height={40} variant="rounded" />
            <Skeleton width={120} height={40} variant="rounded" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
              <Skeleton width="100%" height={180} variant="rounded" className="mb-3" />
              <Skeleton width="80%" height={16} variant="text" />
              <Skeleton width="60%" height={14} variant="text" className="mt-2" />
              <div className="flex gap-2 mt-3">
                <Skeleton width={60} height={24} variant="rounded" />
                <Skeleton width={60} height={24} variant="rounded" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default ResumeManagementSkeleton;
