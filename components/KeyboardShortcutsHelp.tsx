import React, { useEffect, useRef } from 'react';
import { DEFAULT_SHORTCUTS, formatShortcutForDisplay } from '../utils/shortcuts';

interface KeyboardShortcutsHelpProps {
  onClose: () => void;
}

/**
 * Keyboard shortcuts help modal component
 */
const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus modal on mount and handle Escape key
  useEffect(() => {
    // Focus the modal content for accessibility
    if (modalRef.current) {
      modalRef.current.focus();
    }

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Prevent scrolling on body when modal is open
    document.body.style.overflow = 'hidden';

    window.addEventListener('keydown', handleEsc);

    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
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
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-labelledby="keyboard-shortcuts-title"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 m-4"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2
            id="keyboard-shortcuts-title"
            className="text-2xl font-bold text-slate-900 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-primary-600">keyboard</span>
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-500 hover:text-slate-700"
            aria-label="Close keyboard shortcuts help"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh] scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
          {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
            <div key={category} className="mb-8 last:mb-0">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                {category}
                <div className="h-px bg-slate-200 flex-1"></div>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.key}
                    className="flex items-center justify-between py-2 px-3 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                  >
                    <span className="text-slate-700 font-medium text-sm">{shortcut.action}</span>
                    <kbd className="px-2 py-1 bg-white border border-slate-200 shadow-sm rounded-md text-xs font-mono text-slate-600 min-w-[2rem] text-center">
                      {formatShortcutForDisplay(shortcut.key)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-center">
          <p className="text-xs text-slate-500 flex items-center gap-2">
            Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-xs font-mono shadow-sm">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsHelp;
