import React from 'react';
import { useNavigate } from 'react-router-dom';

interface GuestPromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  ctaText?: string;
}

export const GuestPromptDialog: React.FC<GuestPromptDialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  ctaText = 'Create Free Account',
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 text-center">
          <div className="inline-flex items-center justify-center bg-primary-100 rounded-full size-16 mb-6">
            <span className="material-symbols-outlined text-primary-600 text-3xl">account_circle</span>
          </div>
          
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{title}</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            {description}
          </p>

          <div className="space-y-3">
            <button
              onClick={() => navigate('/register')}
              className="w-full py-3 bg-primary-600 text-white rounded-lg font-bold text-sm hover:bg-primary-700 transition-all shadow-md shadow-primary-600/20"
            >
              {ctaText}
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 bg-white text-slate-700 border border-slate-300 rounded-lg font-bold text-sm hover:bg-slate-50 transition-all"
            >
              Sign In to Existing Account
            </button>
            <button
              onClick={onClose}
              className="w-full py-2 text-slate-400 font-bold text-xs hover:text-slate-600 transition-colors pt-2"
            >
              Continue as Guest
            </button>
          </div>
        </div>

        <div className="bg-slate-50 px-8 py-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-500 text-lg">info</span>
            <p className="text-[11px] text-slate-500 leading-tight">
              Guest data is only saved in your browser&apos;s local storage and may be lost if you clear your cache.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
