/**
 * ATSCheckerCard Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ATSCheckerCard from '../../components/analytics/ATSCheckerCard';
import ATSOptimizerCard from '../../components/analytics/ATSOptimizerCard';

// Mock the useATSCheck hook - use hoisted mock for proper typing
const { useATSCheck: mockUseATSCheck } = vi.hoisted(() => ({
  useATSCheck: () => ({
    result: null,
    isLoading: false,
    error: null,
    checkResume: vi.fn(),
    clearResult: vi.fn(),
  }),
}));

// Type mocks for ATSCheckResult and ATSIssue
vi.mock('../../src/hooks/useATSCheck', () => ({
  useATSCheck: mockUseATSCheck,
  ATSCheckResult: {},
  ATSIssue: {},
}));

describe('ATSCheckerCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the card title', () => {
    render(<ATSCheckerCard />);
    expect(screen.getByText('📋 ATS Compatibility Check')).toBeInTheDocument();
  });

  it('should render file upload area initially', () => {
    render(<ATSCheckerCard />);
    expect(screen.getByText('Drop your resume here or click to browse')).toBeInTheDocument();
  });

  it('should show supported file types', () => {
    render(<ATSCheckerCard />);
    expect(screen.getByText('Supports PDF, DOCX, and TXT files')).toBeInTheDocument();
  });

  it('should have hidden file input', () => {
    render(<ATSCheckerCard />);
    // Find the file input by its id
    const input = document.getElementById('resume-file-input');
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute('accept', '.pdf,.docx,.doc,.txt');
  });
});


/**
 * ATSOptimizerCard Component Tests
 */

describe('ATSOptimizerCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the card title', () => {
    render(<ATSOptimizerCard />);
    expect(screen.getByText('🎯 ATS-Aware Job Match Optimizer')).toBeInTheDocument();
  });

  it('should render job description textarea', () => {
    render(<ATSOptimizerCard />);
    expect(screen.getByPlaceholderText('Paste the job description here...')).toBeInTheDocument();
  });

  it('should render ATS score input', () => {
    render(<ATSOptimizerCard />);
    expect(screen.getByLabelText('Current ATS Score (0-100)')).toBeInTheDocument();
  });

  it('should render base match score input', () => {
    render(<ATSOptimizerCard />);
    expect(screen.getByLabelText('Base Job Match Score (0-100)')).toBeInTheDocument();
  });

  it('should render optimize button', () => {
    render(<ATSOptimizerCard />);
    expect(screen.getByText('🚀 Optimize for Job')).toBeInTheDocument();
  });

  it('should show error when trying to optimize without job description', async () => {
    const user = userEvent.setup();
    render(<ATSOptimizerCard />);

    // Click the button
    const button = screen.getByRole('button', { name: /optimize for job/i });
    await user.click(button);

    // Wait for the async state update and check error appears (regex for flexible matching)
    expect(await screen.findByText(/Please enter a job description/)).toBeInTheDocument();
  });

  it('should update job description state', async () => {
    const user = userEvent.setup();
    render(<ATSOptimizerCard />);

    const textarea = screen.getByPlaceholderText('Paste the job description here...');
    await user.type(textarea, 'Looking for a Python developer');

    expect(textarea).toHaveValue('Looking for a Python developer');
  });

  it('should update ATS score state', async () => {
    const user = userEvent.setup();
    render(<ATSOptimizerCard />);

    const atsInput = screen.getByLabelText('Current ATS Score (0-100)');
    await user.clear(atsInput);
    await user.type(atsInput, '75');

    expect(atsInput).toHaveValue(75);
  });
});
