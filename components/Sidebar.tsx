import React from 'react';
import { Route } from '../types';

/**
 * @interface SidebarProps
 * @description Props for the Sidebar component
 * @property {Route} currentRoute - The currently selected route
 * @property {Function} onNavigate - Callback function to handle navigation
 * @property {Function} onShowShortcuts - Callback function to show keyboard shortcuts help
 */
interface SidebarProps {
  /** The currently selected route */
  currentRoute: Route;
  /** Callback function to handle navigation */
  onNavigate: (route: Route) => void;
  /** Callback function to show keyboard shortcuts help */
  onShowShortcuts: () => void;
}

const NAV_ITEMS = [
  { id: Route.DASHBOARD, label: 'Dashboard', icon: 'dashboard' },
  { id: Route.EDITOR, label: 'My Master Profile', icon: 'account_circle' },
  { id: Route.APPLICATIONS, label: 'Job Applications', icon: 'work' },
  { id: Route.SETTINGS, label: 'Settings', icon: 'settings' },
] as const;

/**
 * @component
 * @description Sidebar component that provides navigation links for the application
 * @param {SidebarProps} props - Component properties
 * @param {Route} props.currentRoute - The currently selected route
 * @param {Function} props.onNavigate - Callback function to handle navigation
 * @param {Function} props.onShowShortcuts - Callback function to show keyboard shortcuts help
 * @returns {JSX.Element} The rendered sidebar component
 * 
 * @example
 * ```tsx
 * <Sidebar 
 *   currentRoute={Route.DASHBOARD} 
 *   onNavigate={(route) => console.log(`Navigating to ${route}`)} 
 *   onShowShortcuts={() => console.log('Show shortcuts')}
 * />
 * ```
 */
const Sidebar: React.FC<SidebarProps> = React.memo(({ currentRoute, onNavigate, onShowShortcuts }) => {
  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col justify-between p-6 fixed h-full z-20">
      <div className="flex flex-col gap-8">
        {/* Brand */}
        <button
          type="button"
          aria-label="Go to Dashboard"
          className="flex items-center gap-3 px-2 cursor-pointer w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg"
          onClick={() => onNavigate(Route.DASHBOARD)}
        >
          <div className="bg-primary-600 size-10 rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary-600/20">
            <span className="material-symbols-outlined" aria-hidden="true">description</span>
          </div>
          <div>
            <h1 className="text-slate-900 text-lg font-bold leading-none">ResumeAI</h1>
            <p className="text-slate-500 text-xs mt-1 font-medium">Pro Plan</p>
          </div>
        </button>

        {/* Nav Links */}
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = currentRoute === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                    if (item.id === Route.DASHBOARD || item.id === Route.EDITOR || item.id === Route.APPLICATIONS || item.id === Route.SETTINGS) {
                        onNavigate(item.id as Route);
                    }
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                  isActive
                    ? 'bg-primary-50 text-primary-600 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                }`}
              >
                <span className={`material-symbols-outlined ${isActive ? 'filled' : ''}`} aria-hidden="true">
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
          type="button"
          onClick={() => onNavigate(Route.WORKSPACE)}
          className="flex w-full items-center justify-center gap-2 rounded-xl h-12 bg-primary-600 text-white text-sm font-bold shadow-lg shadow-primary-600/30 hover:bg-primary-700 hover:shadow-primary-600/40 transition-all transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-600"
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">add_circle</span>
          <span>New Application</span>
        </button>
        <div className="border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onShowShortcuts}
            className="flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-primary-600 transition-colors w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg group"
          >
            <span className="material-symbols-outlined group-hover:animate-pulse" aria-hidden="true">keyboard</span>
            <span className="text-sm font-medium">Keyboard Shortcuts</span>
          </button>
        </div>
      </div>
    </aside>
  );
});

export default Sidebar;
