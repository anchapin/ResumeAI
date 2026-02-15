import React, { useEffect } from 'react';
import { DEFAULT_SHORTCUTS, formatShortcutForDisplay } from '../utils/shortcuts';

interface KeyboardShortcutsHelpProps {
  onClose: () => void;
}

/**
 * Keyboard shortcuts help modal component
 */
const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ onClose }) => {
  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Group shortcuts by category
  const groupedShortcuts = DEFAULT_SHORTCUTS.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, typeof DEFAULT_SHORTCUTS>);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
      role="dialog"
      aria-labelledby="keyboard-shortcuts-title"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <h2
            id="keyboard-shortcuts-title"
            className="text-2xl font-bold text-slate-900"
          >
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close keyboard shortcuts help"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
            <div key={category} className="mb-6">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.key}
                    className="flex items-center justify-between py-2 px-3 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    <span className="text-slate-700 font-medium">{shortcut.action}</span>
                    <kbd className="px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-md text-sm font-mono text-slate-600">
                      {formatShortcutForDisplay(shortcut.key)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <p className="text-sm text-slate-500 text-center">
            Press <kbd className="px-2 py-1 bg-white border border-slate-300 rounded mx-1">Escape</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsHelp;
