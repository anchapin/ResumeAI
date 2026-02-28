import React from 'react';
import Skeleton from '../Skeleton';

/**
 * @component
 * @description Teams page skeleton loader
 * @returns {JSX.Element} The rendered teams skeleton
 */
const TeamsSkeleton: React.FC = () => {
  return (
    <div className="flex-1 min-h-screen bg-[#f6f6f8] pl-72">
      <header className="h-16 flex items-center justify-between px-8 bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-200">
        <Skeleton width={150} height={28} variant="text" />
        <div className="flex items-center gap-4">
          <Skeleton width={140} height={40} variant="rounded" />
        </div>
      </header>

      <div className="p-8 max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton width={120} height={14} variant="text" className="mb-2" />
                  <Skeleton width={50} height={32} variant="text" />
                </div>
                <Skeleton width={48} height={48} variant="rounded" />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-start gap-4 mb-4">
                <Skeleton width={64} height={64} variant="rounded" />
                <div className="flex-1">
                  <Skeleton width="70%" height={20} variant="text" className="mb-2" />
                  <Skeleton width="100%" height={14} variant="text" />
                  <Skeleton width="80%" height={14} variant="text" className="mb-2" />
                </div>
              </div>
              <div className="flex items-center gap-6 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <Skeleton width={20} height={20} variant="circular" />
                  <Skeleton width={80} height={14} variant="text" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton width={20} height={20} variant="circular" />
                  <Skeleton width={60} height={14} variant="text" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeamsSkeleton;
