import React from 'react';
import VersionHistory from '../VersionHistory';
import { ResumeVersion } from '../../types';

interface VersionHistoryDialogProps {
  isOpen: boolean;
  resumeId: number;
  onRestore: (version: ResumeVersion) => void;
  onClose: () => void;
}

export const VersionHistoryDialog: React.FC<VersionHistoryDialogProps> = ({
  isOpen,
  resumeId,
  onRestore,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary-600 text-2xl">history</span>
            <h2 className="text-xl font-bold text-slate-900">Version History</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <VersionHistory resumeId={resumeId} onRestore={onRestore} />
        </div>
      </div>
    </div>
  );
};
