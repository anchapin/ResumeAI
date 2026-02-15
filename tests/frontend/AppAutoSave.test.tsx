import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import App from '../../App';
import * as storage from '../../utils/storage';
import { Route, SimpleResumeData } from '../../types';

vi.mock('../../components/Sidebar', () => ({
  default: ({ onNavigate }: { onNavigate: (route: Route) => void }) => (
    <div data-testid="sidebar">
      <button onClick={() => onNavigate(Route.EDITOR)}>Go to Editor</button>
    </div>
  )
}));

vi.mock('../../pages/Dashboard', () => ({
  default: () => <div data-testid="dashboard">Dashboard</div>
}));

vi.mock('../../pages/Editor', () => ({
  default: ({ onUpdate, resumeData }: { onUpdate: (data: SimpleResumeData) => void, resumeData: SimpleResumeData }) => (
    <div data-testid="editor">
      <button onClick={() => onUpdate({ ...resumeData, name: 'Updated Name' })}>
        Update Resume
      </button>
    </div>
  )
}));

vi.mock('react-toastify', () => ({
  ToastContainer: () => <div data-testid="toast-container" />
}));

describe('App AutoSave', () => {
  beforeEach(() => {
    vi.spyOn(storage, 'loadResumeData').mockReturnValue({
      name: 'Test User',
      email: 'test@example.com',
      phone: '123',
      location: 'Test',
      role: 'Role',
      experience: [],
      education: [],
      skills: [],
      projects: [],
      summary: ''
    });
    vi.spyOn(storage, 'saveResumeData').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should debounce saveResumeData', async () => {
    vi.useRealTimers();
    render(<App />);

    await screen.findByTestId('dashboard');

    await act(async () => {
        screen.getByText('Go to Editor').click();
    });

    // Now switch to fake timers
    vi.useFakeTimers();

    // Reset mock to clear any previous calls
    vi.mocked(storage.saveResumeData).mockClear();

    // Trigger update
    await act(async () => {
        screen.getByText('Update Resume').click();
    });

    // Should NOT be called immediately (due to debounce)
    expect(storage.saveResumeData).not.toHaveBeenCalled();

    // Advance time by 1000ms
    await act(async () => {
        vi.advanceTimersByTime(1000);
    });

    // Should be called now
    expect(storage.saveResumeData).toHaveBeenCalledTimes(1);
  });
});
