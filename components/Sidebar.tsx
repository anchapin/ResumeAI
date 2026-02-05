import React from 'react';
import { Route } from '../types';

interface SidebarProps {
  currentRoute: Route;
  onNavigate: (route: Route) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentRoute, onNavigate }) => {
  const navItems = [
    { id: Route.DASHBOARD, label: 'Dashboard', icon: 'dashboard' },
    { id: Route.EDITOR, label: 'My Master Profile', icon: 'account_circle' },
    { id: Route.APPLICATIONS, label: 'Job Applications', icon: 'work' },
    { id: 'settings', label: 'Settings', icon: 'settings' }, // Placeholder
  ];

  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col justify-between p-6 fixed h-full z-20">
      <div className="flex flex-col gap-8">
        {/* Brand */}
        <div className="flex items-center gap-3 px-2 cursor-pointer" onClick={() => onNavigate(Route.DASHBOARD)}>
          <div className="bg-primary-600 size-10 rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary-600/20">
            <span className="material-symbols-outlined">description</span>
          </div>
          <div>
            <h1 className="text-slate-900 text-lg font-bold leading-none">ResumeAI</h1>
            <p className="text-slate-500 text-xs mt-1 font-medium">Pro Plan</p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = currentRoute === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                    if (item.id === Route.DASHBOARD || item.id === Route.EDITOR || item.id === Route.APPLICATIONS) {
                        onNavigate(item.id as Route);
                    }
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-50 text-primary-600 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                }`}
              >
                <span className={`material-symbols-outlined ${isActive ? 'filled' : ''}`}>
                  {item.icon}
                </span>
                <span className="text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Actions */}
      <div className="flex flex-col gap-4">
        <button 
          onClick={() => onNavigate(Route.WORKSPACE)}
          className="flex w-full items-center justify-center gap-2 rounded-xl h-12 bg-primary-600 text-white text-sm font-bold shadow-lg shadow-primary-600/30 hover:bg-primary-700 hover:shadow-primary-600/40 transition-all transform active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">add_circle</span>
          <span>New Application</span>
        </button>
        <div className="border-t border-slate-100 pt-4">
          <button className="flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-primary-600 transition-colors w-full text-left">
            <span className="material-symbols-outlined">help</span>
            <span className="text-sm font-medium">Help Center</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;