import React from 'react';
import { useStore } from '../store/store';

/**
 * ManualSaveButton - Appears when auto-save fails to allow manual save
 * Only visible when autoSaveFailed is true in the store
 */
const ManualSaveButton: React.FC = () => {
  const autoSaveFailed = useStore((state) => state.autoSaveFailed);
  const manualSave = useStore((state) => state.manualSave);
  const saveStatus = useStore((state) => state.saveStatus);

  if (!autoSaveFailed) {
    return null;
  }

  const handleManualSave = async () => {
    await manualSave();
  };

  const isSaving = saveStatus === 'saving';

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={handleManualSave}
        disabled={isSaving}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-medium shadow-lg
          transition-all duration-200
          ${
            isSaving
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-amber-500 hover:bg-amber-600 text-white'
          }
        `}
        aria-label={isSaving ? 'Saving manually...' : 'Manually save resume'}
      >
        <span className="material-symbols-outlined text-lg">
          {isSaving ? 'hourglass_empty' : 'save'}
        </span>
        {isSaving ? 'Saving...' : 'Manual Save'}
      </button>
    </div>
  );
};

export default ManualSaveButton;
