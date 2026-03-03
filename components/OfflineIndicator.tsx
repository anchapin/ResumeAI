import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] animate-bounce-in">
      <div className="bg-red-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border-2 border-red-500/20 backdrop-blur-md bg-opacity-95">
        <div className="bg-red-500/20 p-2 rounded-xl flex items-center justify-center">
          <span className="material-symbols-outlined text-[20px] animate-pulse">wifi_off</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold leading-none">You're Offline</span>
          <span className="text-[11px] font-medium opacity-80 mt-1">Changes will sync later</span>
        </div>
      </div>
    </div>
  );
};

export default OfflineIndicator;
