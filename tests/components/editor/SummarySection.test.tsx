/**
 * Tests for SummarySection component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { SummarySection } from '../../../components/editor/SummarySection';

describe('SummarySection', () => {
  const defaultProps = {
    summary:
      'Experienced software developer with 5+ years of experience in building scalable web applications.',
    onUpdate: vi.fn(),
    onShowCommentPanel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders section title correctly', () => {
      render(<SummarySection {...defaultProps} />);

      expect(screen.getByText('Professional Summary')).toBeInTheDocument();
    });

    it('renders description text', () => {
      render(<SummarySection {...defaultProps} />);

      expect(screen.getByText('Brief introduction')).toBeInTheDocument();
    });

    it('renders add comment button', () => {
      render(<SummarySection {...defaultProps} />);

      expect(screen.getByText('Add Comment')).toBeInTheDocument();
    });

    it('renders textarea with correct value', () => {
      render(<SummarySection {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue(defaultProps.summary);
    });

    it('renders textarea with placeholder', () => {
      render(<SummarySection {...defaultProps} />);

      const textarea = screen.getByPlaceholderText(/Write a brief professional summary/);
      expect(textarea).toBeInTheDocument();
    });

    it('renders tip text', () => {
      render(<SummarySection {...defaultProps} />);

      expect(screen.getByText(/Keep your summary concise/)).toBeInTheDocument();
    });

    it('renders label for textarea', () => {
      render(<SummarySection {...defaultProps} />);

      expect(screen.getByText('Summary')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onUpdate when textarea value changes', async () => {
      const onUpdate = vi.fn();
      const user = userEvent.setup();
      render(<SummarySection {...defaultProps} onUpdate={onUpdate} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, ' Updated text');

      expect(onUpdate).toHaveBeenCalled();
    });

    it('calls onShowCommentPanel when comment button is clicked', async () => {
      const onShowCommentPanel = vi.fn();
      const user = userEvent.setup();
      render(<SummarySection {...defaultProps} onShowCommentPanel={onShowCommentPanel} />);

      await user.click(screen.getByText('Add Comment'));

      expect(onShowCommentPanel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Empty State', () => {
    it('renders empty summary correctly', () => {
      render(<SummarySection {...defaultProps} summary="" />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue('');
    });
  });

  describe('Callbacks', () => {
    it('renders without crashing when all callbacks are provided', () => {
      const callbacks = {
        onUpdate: vi.fn(),
        onShowCommentPanel: vi.fn(),
      };

      expect(() => render(<SummarySection {...defaultProps} {...callbacks} />)).not.toThrow();
    });
  });
});
