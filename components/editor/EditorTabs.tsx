import React from 'react';

interface EditorTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TAB_ITEMS = ['Contact Info', 'Summary', 'Experience', 'Skills', 'Education', 'Projects'];

export const EditorTabs = React.memo<EditorTabsProps>(({ activeTab, onTabChange }) => {
  return (
    <div className="border-b border-slate-200 mb-8 overflow-x-auto">
      <div className="flex gap-8">
        {TAB_ITEMS.map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`pb-3 pt-2 text-sm font-bold border-b-[3px] transition-colors ${
                active
                  ? 'border-primary-600 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-primary-600 hover:border-slate-200'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>
    </div>
  );
});
