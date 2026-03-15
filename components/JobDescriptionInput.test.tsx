import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import JobDescriptionInput from './JobDescriptionInput';

// Mock the store module completely with all required exports
vi.mock('../store/store', () => {
  const mockFn = vi.fn();
  return {
    useStore: vi.fn(() => ({
      currentJobDescription: '',
      jobDescriptionUrl: '',
      setCurrentJobDescription: mockFn,
      setJobDescriptionUrl: mockFn,
    })),
  };
});

// Mock fetch globally
beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ text: 'Mocked job description text', parsed: null }),
  });
});

describe('JobDescriptionInput', () => {
  const mockOnComplete = vi.fn();

  const renderComponent = (props = {}) => {
    return render(
      <BrowserRouter>
        <JobDescriptionInput {...props} />
      </BrowserRouter>
    );
  };

  it('renders textarea for job description input', async () => {
    renderComponent({ onComplete: mockOnComplete });
    
    // Wait for component to render
    expect(await screen.findByRole('textbox')).toBeInTheDocument();
  });

  it('renders URL input field', async () => {
    renderComponent({ onComplete: mockOnComplete });
    
    // Click on URL tab first to show URL input
    const urlTab = await screen.findByRole('button', { name: /fetch from url/i });
    await userEvent.click(urlTab);
    
    // Then check for URL input placeholder
    expect(await screen.findByPlaceholderText(/https:\/\/example\.com/i)).toBeInTheDocument();
  });

  it('displays character count', async () => {
    renderComponent({ onComplete: mockOnComplete });
    
    // Wait for character count to appear
    expect(await screen.findByText(/characters/i)).toBeInTheDocument();
  });

  it('renders tabs for switching between text and URL input', async () => {
    renderComponent({ onComplete: mockOnComplete });
    
    // Wait for tabs to appear - they use button elements with the tab names
    expect(await screen.findByRole('button', { name: /paste text/i })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /fetch from url/i })).toBeInTheDocument();
  });
});
