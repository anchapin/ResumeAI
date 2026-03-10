import React from 'react';

interface EditorActionsProps {
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  lastSaved: Date | null;
  canUndo: boolean;
  canRedo: boolean;
  unresolvedCommentCount: number;
  onUndo: () => void;
  onRedo: () => void;
  onShowCommentPanel: () => void;
  onShowVersionHistory: () => void;
  onShowSaveVersionDialog: () => void;
  onTogglePreview: () => void;
  showPreview: boolean;
  onGeneratePDF: () => void;
  isGeneratingPDF: boolean;
  onSaveProfile: () => void;
}

function getTimeSince(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}

export const EditorActions: React.FC<EditorActionsProps> = ({
  saveStatus,
  lastSaved,
  canUndo,
  canRedo,
  unresolvedCommentCount,
  onUndo,
  onRedo,
  onShowCommentPanel,
  onShowVersionHistory,
  onShowSaveVersionDialog,
  onTogglePreview,
  showPreview,
  onGeneratePDF,
  isGeneratingPDF,
  onSaveProfile,
}) => {
  return (
    <div className="flex gap-3">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="flex items-center gap-2 px-4 h-10 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        title="Undo (Ctrl+Z)"
      >
        <span className="material-symbols-outlined text-lg" aria-hidden="true">
          undo
        </span>
        <span className="hidden sm:inline">Undo</span>
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className="flex items-center gap-2 px-4 h-10 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
      >
        <span className="material-symbols-outlined text-lg" aria-hidden="true">
          redo
        </span>
        <span className="hidden sm:inline">Redo</span>
      </button>
      <button
        onClick={onShowCommentPanel}
        className="flex items-center gap-2 px-4 h-10 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors shadow-sm relative"
        title="View comments"
      >
        <span className="material-symbols-outlined text-lg" aria-hidden="true">
          chat_bubble_outline
        </span>
        <span className="hidden sm:inline">Comments</span>
        {unresolvedCommentCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unresolvedCommentCount}
          </span>
        )}
      </button>
      <button
        onClick={onShowVersionHistory}
        className="flex items-center gap-2 px-4 h-10 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors shadow-sm"
        title="View version history"
      >
        <span className="material-symbols-outlined text-lg" aria-hidden="true">
          history
        </span>
        <span className="hidden sm:inline">History</span>
      </button>
      <button
        onClick={onShowSaveVersionDialog}
        className="flex items-center gap-2 px-4 h-10 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors shadow-sm"
        title="Save as new version"
      >
        <span className="material-symbols-outlined text-lg" aria-hidden="true">
          save
        </span>
        <span className="hidden sm:inline">Save Version</span>
      </button>
      <button
        onClick={onTogglePreview}
        className={`flex items-center gap-2 px-4 h-10 rounded-lg border font-bold text-sm transition-colors shadow-sm ${
          showPreview
            ? 'bg-primary-600 text-white border-primary-600'
            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
        }`}
      >
        <span className="material-symbols-outlined text-lg" aria-hidden="true">
          {showPreview ? 'visibility_off' : 'visibility'}
        </span>
        {showPreview ? 'Hide Preview' : 'Preview'}
      </button>
      <button
        onClick={onGeneratePDF}
        disabled={isGeneratingPDF}
        className="flex items-center gap-2 px-6 h-10 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors shadow-sm"
      >
        {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
      </button>
      <button
        onClick={onSaveProfile}
        className="flex items-center gap-2 px-6 h-10 rounded-lg bg-primary-600 text-white font-bold text-sm hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20"
      >
        Save Profile
      </button>
    </div>
  );
};
