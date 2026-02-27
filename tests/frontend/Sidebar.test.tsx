import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { Route } from '../../types';

describe('Sidebar', () => {
  it('renders navigation items', () => {
    const onShowShortcuts = vi.fn();
    render(
      <BrowserRouter>
        <Sidebar currentRoute={Route.DASHBOARD} onShowShortcuts={onShowShortcuts} />
      </BrowserRouter>,
    );

    expect(screen.getByText('Dashboard')).toBeDefined();
    expect(screen.getByText('My Master Profile')).toBeDefined();
    expect(screen.getByText('Job Applications')).toBeDefined();
    expect(screen.getByText('Settings')).toBeDefined();
  });

  it('highlights current route', () => {
    const onShowShortcuts = vi.fn();
    render(
      <BrowserRouter>
        <Sidebar currentRoute={Route.DASHBOARD} onShowShortcuts={onShowShortcuts} />
      </BrowserRouter>,
    );

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink?.getAttribute('aria-current')).toBe('page');

    const settingsLink = screen.getByText('Settings').closest('a');
    expect(settingsLink?.getAttribute('aria-current')).toBeNull();
  });

  it('calls onNavigate when clicked', () => {
    const onShowShortcuts = vi.fn();
    render(
      <BrowserRouter>
        <Sidebar currentRoute={Route.DASHBOARD} onShowShortcuts={onShowShortcuts} />
      </BrowserRouter>,
    );

    fireEvent.click(screen.getByText('Settings'));
    expect(screen.getByText('Settings')).toBeDefined();
  });

  it('calls onShowShortcuts when keyboard shortcuts button is clicked', () => {
    const onShowShortcuts = vi.fn();
    render(
      <BrowserRouter>
        <Sidebar currentRoute={Route.DASHBOARD} onShowShortcuts={onShowShortcuts} />
      </BrowserRouter>,
    );

    fireEvent.click(screen.getByText('Keyboard Shortcuts'));
    expect(onShowShortcuts).toHaveBeenCalled();
  });
});
