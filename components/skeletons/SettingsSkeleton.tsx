import React from 'react';
import Skeleton from '../Skeleton';

/**
 * @component
 * @description Settings page skeleton loader
 * @returns {JSX.Element} The rendered settings skeleton
 */
const SettingsSkeleton: React.FC = () => {
  return (
    <div className="flex-1 min-h-screen bg-[#f6f6f8] pl-72">
      <header className="h-16 flex items-center justify-between px-8 bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-200">
        <Skeleton width={150} height={28} variant="text" />
        <div className="flex items-center gap-4">
          <Skeleton width={40} height={40} variant="circular" />
        </div>
      </header>

      <div className="p-8 max-w-[1000px] mx-auto space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <Skeleton width={200} height={24} variant="text" className="mb-2" />
                <Skeleton width={300} height={16} variant="text" />
              </div>
              <Skeleton width={80} height={20} variant="text" />
            </div>

            <div className="space-y-4">
              {[1, 2, 3].map((j) => (
                <div
                  key={j}
                  className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0"
                >
                  <div>
                    <Skeleton width={150} height={16} variant="text" className="mb-2" />
                    <Skeleton width={250} height={14} variant="text" />
                  </div>
                  <Skeleton width={60} height={36} variant="rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SettingsSkeleton;
