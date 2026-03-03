import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Route } from '../types';
import { prefetch } from '../utils/prefetch';

/**
 * @interface SidebarProps
 * @description Props for the Sidebar component
 * @property {Route} currentRoute - The currently selected route
 * @property {Function} onShowShortcuts - Callback function to show keyboard shortcuts help
 */
interface SidebarProps {
  /** The currently selected route */
  currentRoute: Route;
  /** Callback function to show keyboard shortcuts help */
  onShowShortcuts: () => void;
  /** Whether the user is authenticated */
  isAuthenticated?: boolean;
  /** Username of the authenticated user */
  username?: string;
  /** Callback function to handle logout */
  onLogout?: () => void;
}

const NAV_ITEMS = [
  { id: Route.DASHBOARD, label: 'Dashboard', icon: 'dashboard' },
  { id: Route.BULK, label: 'My Resumes', icon: 'description' },
  { id: Route.EDITOR, label: 'My Master Profile', icon: 'account_circle' },
  { id: Route.APPLICATIONS, label: 'Job Applications', icon: 'work' },
  { id: Route.INTERVIEW_PRACTICE, label: 'Interview Practice', icon: 'psychology' },
  { id: Route.SALARY_RESEARCH, label: 'Salary Research', icon: 'payments' },
  { id: Route.BILLING, label: 'Billing', icon: 'credit_card' },
  { id: Route.SETTINGS, label: 'Settings', icon: 'settings' },
] as const;

/**
 * @component
 * @description Sidebar component that provides navigation links for the application
 * @param {SidebarProps} props - Component properties
 * @param {Route} props.currentRoute - The currently selected route
 * @param {Function} props.onShowShortcuts - Callback function to show keyboard shortcuts help
 * @returns {JSX.Element} The rendered sidebar component
 *
 * @example
 * ```tsx
 * <Sidebar
 *   currentRoute={Route.DASHBOARD}
 *   onShowShortcuts={() => console.log('Show shortcuts')}
 * />
 * ```
 */
const Sidebar: React.FC<SidebarProps> = React.memo(
  ({ currentRoute, onShowShortcuts, isAuthenticated, username, onLogout }) => {
    const navigate = useNavigate();
    return (
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col justify-between p-6 fixed h-full z-20">
        <div className="flex flex-col gap-8">
          {/* Brand */}
          <Link
            to="/dashboard"
            aria-label="Go to Dashboard"
            className="flex items-center gap-3 px-2 cursor-pointer w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg"
          >
            <div className="bg-primary-600 size-10 rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary-600/20">
              <span className="material-symbols-outlined" aria-hidden="true">
                description
              </span>
            </div>
            <div>
              <h1 className="text-slate-900 text-lg font-bold leading-none">ResumeAI</h1>
              <p className="text-slate-500 text-xs mt-1 font-medium">Pro Plan</p>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = currentRoute === item.id;
              return (
                <Link
                  key={item.id}
                  to={`/${item.id}`}
                  onMouseEnter={() => prefetch(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                    isActive
                      ? 'bg-primary-50 text-primary-600 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined ${isActive ? 'filled' : ''}`}
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                  <span className="text-sm">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => navigate('/workspace')}
            onMouseEnter={() => prefetch('workspace')}
            data-testid="nav-workspace"
            className="flex w-full items-center justify-center gap-2 rounded-xl h-12 bg-primary-600 text-white text-sm font-bold shadow-lg shadow-primary-600/30 hover:bg-primary-700 hover:shadow-primary-600/40 transition-all transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-600"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              add_circle
            </span>
            <span>New Application</span>
          </button>
          <div className="border-t border-slate-100 pt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={onShowShortcuts}
              className="flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-primary-600 transition-colors w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg group"
            >
              <span
                className="material-symbols-outlined group-hover:animate-pulse"
                aria-hidden="true"
              >
                keyboard
              </span>
              <span className="text-sm font-medium">Keyboard Shortcuts</span>
            </button>
            {isAuthenticated && username ? (
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-400" aria-hidden="true">
                    account_circle
                  </span>
                  <span className="text-sm font-medium text-slate-600 truncate max-w-[120px]">
                    {username}
                  </span>
                </div>
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                    title="Sign out"
                  >
                    <span className="material-symbols-outlined text-[20px]">logout</span>
                  </button>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-primary-600 transition-colors w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg"
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  login
                </span>
                <span className="text-sm font-medium">Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </aside>
    );
  },
);

export default Sidebar;
