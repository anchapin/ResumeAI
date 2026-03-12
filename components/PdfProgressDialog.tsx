import React from 'react';
import { ExportStatus } from '../hooks/usePdfExport';

interface PdfProgressDialogProps {
  status: ExportStatus;
  progress: number;
  error: string | null;
  eta: number | null;
  onCancel: () => void;
  onClose: () => void;
}

export const PdfProgressDialog: React.FC<PdfProgressDialogProps> = ({
  status,
  progress,
  error,
  eta,
  onCancel,
  onClose,
}) => {
  if (status === 'idle') return null;

  const getStatusMessage = () => {
    switch (status) {
      case 'submitting':
        return 'Submitting job...';
      case 'processing':
        if (progress < 30) return 'Preparing document...';
        if (progress < 60) return 'Rendering resume layout...';
        if (progress < 90) return 'Generating final PDF...';
        return 'Finalizing...';
      case 'completed':
        return 'Download complete!';
      case 'failed':
        return 'Export failed';
      case 'cancelled':
        return 'Export cancelled';
      default:
        return 'Processing...';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-slate-400';
      default:
        return 'bg-primary-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-900">PDF Export</h3>
            {(status === 'completed' || status === 'failed' || status === 'cancelled') && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                aria-label="Close dialog"
              >
                <span className="material-symbols-outlined text-slate-400">close</span>
              </button>
            )}
          </div>

          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center py-4">
              {status === 'processing' || status === 'submitting' ? (
                <div className="relative w-20 h-20 mb-4">
                  <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                  <div 
                    className="absolute inset-0 border-4 border-primary-600 rounded-full border-t-transparent animate-spin"
                    style={{ animationDuration: '1.5s' }}
                  ></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary-700">{Math.round(progress)}%</span>
                  </div>
                </div>
              ) : (
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
                  status === 'completed' ? 'bg-green-100' : 'bg-slate-100'
                }`}>
                  <span className={`material-symbols-outlined text-4xl ${
                    status === 'completed' ? 'text-green-600' : 'text-slate-500'
                  }`}>
                    {status === 'completed' ? 'check_circle' : status === 'failed' ? 'error' : 'cancel'}
                  </span>
                </div>
              )}
              
              <p 
                className="text-lg font-semibold text-slate-800 text-center"
                role="status"
                aria-live="polite"
              >
                {getStatusMessage()}
              </p>
              
              {eta !== null && status === 'processing' && (
                <p className="text-sm text-slate-500 mt-1 italic">
                  Estimated time remaining: {eta}s
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ease-out ${getStatusColor()}`}
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 items-start animate-in slide-in-from-top-2">
                <span className="material-symbols-outlined text-red-600 text-[20px] mt-0.5">warning</span>
                <p className="text-sm text-red-800 font-medium leading-relaxed">{error}</p>
              </div>
            )}

            <div className="pt-4 flex gap-3">
              {(status === 'submitting' || status === 'processing') ? (
                <button
                  onClick={onCancel}
                  className="flex-1 h-12 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all active:scale-95"
                >
                  Cancel Export
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className={`flex-1 h-12 rounded-xl font-bold text-white transition-all active:scale-95 ${
                    status === 'completed' ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-800 hover:bg-slate-900'
                  }`}
                >
                  {status === 'completed' ? 'Done' : 'Close'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
