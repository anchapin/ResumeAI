import React, { useEffect, useState } from 'react';
import { useStore, selectSaveStatus, selectLastSaved } from '../../store/store';
import { getTimeSince } from '../../utils/date';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const SaveStatus: React.FC = () => {
  const saveStatus = useStore(selectSaveStatus);
  const lastSaved = useStore(selectLastSaved);
  const setSaveStatus = useStore((state) => state.setSaveStatus);
  const isOnline = useOnlineStatus();
  const [timeSince, setTimeSince] = useState<string>('');

  useEffect(() => {
    if (!isOnline) {
      setSaveStatus('offline');
    } else if (saveStatus === 'offline') {
      setSaveStatus('idle');
    }
  }, [isOnline, saveStatus, setSaveStatus]);

  useEffect(() => {
    if (lastSaved) {
      setTimeSince(getTimeSince(lastSaved));
      const interval = setInterval(() => {
        setTimeSince(getTimeSince(lastSaved));
      }, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [lastSaved]);

  const getStatusConfig = () => {
    switch (saveStatus) {
      case 'saving':
        return {
          icon: 'sync',
          text: 'Syncing...',
          className: 'text-amber-600',
          iconClassName: 'animate-spin',
        };
      case 'saved':
        return {
          icon: 'check_circle',
          text: 'Saved',
          className: 'text-green-600',
          iconClassName: '',
        };
      case 'error':
        return {
          icon: 'error',
          text: 'Save failed',
          className: 'text-red-600',
          iconClassName: '',
        };
      case 'offline':
        return {
          icon: 'cloud_off',
          text: 'Offline',
          className: 'text-slate-500',
          iconClassName: '',
        };
      case 'idle':
      default:
        if (lastSaved) {
          return {
            icon: 'check_circle',
            text: `Saved ${timeSince}`,
            className: 'text-slate-500',
            iconClassName: '',
          };
        }
        return {
          icon: 'edit',
          text: 'Changes not yet saved',
          className: 'text-slate-400',
          iconClassName: '',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-1.5 text-xs font-medium ${config.className} transition-colors duration-200`}
    >
      <span
        className={`material-symbols-outlined text-[16px] ${config.iconClassName}`}
        aria-hidden="true"
      >
        {config.icon}
      </span>
      <span>{config.text}</span>
    </div>
  );
};
