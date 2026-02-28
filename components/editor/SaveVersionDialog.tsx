import React from 'react';

interface SaveVersionDialogProps {
  isOpen: boolean;
  description: string;
  onDescriptionChange: (desc: string) => void;
  onSave: () => void;
  onClose: () => void;
  isSaving: boolean;
}

export const SaveVersionDialog: React.FC<SaveVersionDialogProps> = ({
  isOpen,
  description,
  onDescriptionChange,
  onSave,
  onClose,
  isSaving,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary-600 text-2xl">save</span>
            <h2 className="text-xl font-bold text-slate-900">Save as Version</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="version-description"
                className="block text-sm font-bold text-slate-700 mb-2"
              >
                Version Description
              </label>
              <textarea
                id="version-description"
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
                placeholder="Describe the changes made in this version..."
                rows={4}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all resize-none"
              />
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-amber-600 text-xl mt-0.5">
                  info
                </span>
                <p className="text-sm text-amber-900">
                  Saving a version creates a snapshot of your current resume data. You can restore
                  any previous version later from the history.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={isSaving || !description.trim()}
            className="px-6 py-2.5 rounded-lg bg-primary-600 text-white font-bold text-sm hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">
                  progress_activity
                </span>
                <span>Saving...</span>
              </>
            ) : (
              'Save Version'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
