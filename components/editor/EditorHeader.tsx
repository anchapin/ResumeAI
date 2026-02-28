import React from 'react';

interface EditorHeaderProps {
  onNavigate: () => void;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({ onNavigate }) => {
  const NAV_ITEMS = ['Dashboard', 'My Resumes', 'Templates', 'Settings'];

  return (
    <header className="flex items-center justify-between px-10 py-3 bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-4 cursor-pointer" onClick={onNavigate}>
        <div className="bg-primary-600 size-8 rounded-lg flex items-center justify-center text-white">
          <span className="material-symbols-outlined text-[18px]">description</span>
        </div>
        <h2 className="text-slate-900 text-lg font-bold">ResumeBuilder SaaS</h2>
      </div>
      <div className="flex items-center gap-8">
        <nav className="flex gap-6">
          {NAV_ITEMS.map((item) => (
            <button
              key={item}
              onClick={onNavigate}
              className="text-sm font-semibold text-slate-500 hover:text-primary-600 transition-colors"
            >
              {item}
            </button>
          ))}
        </nav>
        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border border-slate-200">
          <img src="https://picsum.photos/100/100" alt="Profile" />
        </div>
      </div>
    </header>
  );
};
