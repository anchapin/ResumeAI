import React from 'react';
import { DEFAULT_SHORTCUTS, formatShortcutForDisplay } from '../utils/shortcuts';
import AccessibleDialog from './AccessibleDialog';

interface KeyboardShortcutsHelpProps {
  onClose: () => void;
}

/**
 * Keyboard shortcuts help modal component
 */
const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ onClose }) => {
  // Group shortcuts by category
  const groupedShortcuts = DEFAULT_SHORTCUTS.reduce(
    (acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = [];
      }
      acc[shortcut.category].push(shortcut);
      return acc;
    },
    {} as Record<string, typeof DEFAULT_SHORTCUTS>,
  );

  return (
    <AccessibleDialog
      isOpen={true}
      onClose={onClose}
      data-testid="shortcuts-modal"
      title={
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-600">keyboard</span>
          Keyboard Shortcuts
        </div>
      }
      className="max-w-2xl"
      footer={
        <p className="text-xs text-slate-500 flex items-center gap-2 w-full justify-center">
          Press{' '}
          <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-xs font-mono shadow-sm">
            Esc
          </kbd>{' '}
          to close
        </p>
      }
    >
      <div className="overflow-y-auto max-h-[60vh] scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent pr-2">
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
    </AccessibleDialog>
  );
};

export default KeyboardShortcutsHelp;
