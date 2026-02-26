import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Sidebar from '../../components/Sidebar';
import { Route } from '../../types';

describe('Sidebar', () => {
  it('renders navigation items', () => {
    const onNavigate = vi.fn();
    const onShowShortcuts = vi.fn();
    render(
      <Sidebar
        currentRoute={Route.DASHBOARD}
        onNavigate={onNavigate}
        onShowShortcuts={onShowShortcuts}
      />,
    );

    expect(screen.getByText('Dashboard')).toBeDefined();
    expect(screen.getByText('My Master Profile')).toBeDefined();
    expect(screen.getByText('Job Applications')).toBeDefined();
    expect(screen.getByText('Settings')).toBeDefined();
  });

  it('highlights current route', () => {
    const onNavigate = vi.fn();
    const onShowShortcuts = vi.fn();
    render(
      <Sidebar
        currentRoute={Route.DASHBOARD}
        onNavigate={onNavigate}
        onShowShortcuts={onShowShortcuts}
      />,
    );

    const dashboardButton = screen.getByText('Dashboard').closest('button');
    expect(dashboardButton?.getAttribute('aria-current')).toBe('page');

    const settingsButton = screen.getByText('Settings').closest('button');
    expect(settingsButton?.getAttribute('aria-current')).toBeNull();
  });

  it('calls onNavigate when clicked', () => {
    const onNavigate = vi.fn();
    const onShowShortcuts = vi.fn();
    render(
      <Sidebar
        currentRoute={Route.DASHBOARD}
        onNavigate={onNavigate}
        onShowShortcuts={onShowShortcuts}
      />,
    );

    fireEvent.click(screen.getByText('Settings'));
    expect(onNavigate).toHaveBeenCalledWith(Route.SETTINGS);
  });

  it('calls onShowShortcuts when keyboard shortcuts button is clicked', () => {
    const onNavigate = vi.fn();
    const onShowShortcuts = vi.fn();
    render(
      <Sidebar
        currentRoute={Route.DASHBOARD}
        onNavigate={onNavigate}
        onShowShortcuts={onShowShortcuts}
      />,
    );

    fireEvent.click(screen.getByText('Keyboard Shortcuts'));
    expect(onShowShortcuts).toHaveBeenCalled();
  });
});
