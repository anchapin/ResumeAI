import React from 'react';
import Skeleton from '../Skeleton';

/**
 * @component
 * @description Workspace page skeleton loader
 * @returns {JSX.Element} The rendered workspace skeleton
 */
const WorkspaceSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col h-screen bg-[#f6f6f8] relative">
      <header className="flex-none h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <Skeleton width={40} height={40} variant="rounded" />
          <div className="h-6 w-px bg-slate-200"></div>
          <div className="flex items-center gap-2">
            <Skeleton width={24} height={24} variant="circular" />
            <Skeleton width={250} height={24} variant="text" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton width={200} height={40} variant="rounded" />
          <Skeleton width={40} height={40} variant="rounded" />
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className="w-full lg:w-[480px] bg-white border-r border-slate-200 flex flex-col flex-shrink-0 z-10">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton width={100} height={14} variant="text" />
              <Skeleton width={16} height={16} variant="circular" />
              <Skeleton width={130} height={14} variant="text" />
            </div>
            <Skeleton width={200} height={32} variant="text" />
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-2">
              <Skeleton width={130} height={14} variant="text" />
              <Skeleton width="100%" height={48} variant="rounded" />
            </div>

            <div className="space-y-2">
              <Skeleton width={140} height={14} variant="text" />
              <Skeleton width="100%" height={48} variant="rounded" />
            </div>

            <div className="space-y-2">
              <Skeleton width={180} height={14} variant="text" />
              <Skeleton width="100%" height={200} variant="rounded" />
            </div>

            <div className="space-y-2">
              <Skeleton width={120} height={14} variant="text" />
              <Skeleton width="100%" height={48} variant="rounded" />
            </div>
          </div>
        </div>

        <div className="flex-1 bg-[#f6f6f8] flex flex-col relative overflow-hidden">
          <div className="flex items-center justify-between px-6 py-2 bg-white border-b border-slate-200 shadow-sm z-10">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} width={80} height={36} variant="rounded" />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Skeleton width={40} height={40} variant="rounded" />
              <Skeleton width={30} height={20} variant="text" />
              <Skeleton width={40} height={40} variant="rounded" />
              <Skeleton width={40} height={40} variant="rounded" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-12 flex justify-center bg-slate-100/50">
            <div className="w-full max-w-[800px] bg-white shadow-2xl rounded-sm p-12 min-h-[1000px]">
              <div className="space-y-4">
                <Skeleton width="60%" height={40} variant="text" className="mb-6" />
                <Skeleton width="40%" height={20} variant="text" className="mb-8" />

                {[1, 2, 3].map((i) => (
                  <div key={i} className="mb-6">
                    <Skeleton width="30%" height={24} variant="text" className="mb-3" />
                    {[1, 2, 3].map((j) => (
                      <Skeleton key={j} width="90%" height={16} variant="text" className="mb-2" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WorkspaceSkeleton;
