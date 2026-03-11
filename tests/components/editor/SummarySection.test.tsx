/**
 * Tests for SummarySection component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { SummarySection } from '../../../components/editor/SummarySection';

// Mock RichTextEditor to avoid TipTap/JSDOM issues
vi.mock('../../../components/editor/RichTextEditor', () => ({
  RichTextEditor: ({ content, onChange, placeholder }: any) => (
    <div data-testid="mock-rich-editor">
      <div data-testid="editor-content">{content}</div>
      <div data-testid="editor-placeholder">{placeholder}</div>
      <textarea 
        data-testid="editor-textarea"
        value={content}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  ),
  __esModule: true,
  default: ({ content, onChange, placeholder }: any) => (
    <div data-testid="mock-rich-editor">
      <div data-testid="editor-content">{content}</div>
      <div data-testid="editor-placeholder">{placeholder}</div>
      <textarea 
        data-testid="editor-textarea"
        value={content}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  ),
}));

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

    it('renders editor with correct value', () => {
      render(<SummarySection {...defaultProps} />);

      const content = screen.getByTestId('editor-content');
      expect(content.textContent).toBe(defaultProps.summary);
    });

    it('renders editor with placeholder', () => {
      render(<SummarySection {...defaultProps} />);

      const placeholder = screen.getByTestId('editor-placeholder');
      expect(placeholder).toBeInTheDocument();
    });

    it('renders tip text', () => {
      render(<SummarySection {...defaultProps} />);

      expect(screen.getByText(/Keep your summary concise/)).toBeInTheDocument();
    });

    it('renders label for editor', () => {
      render(<SummarySection {...defaultProps} />);

      expect(screen.getByText('Summary')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onUpdate when editor value changes', async () => {
      const onUpdate = vi.fn();
      render(<SummarySection {...defaultProps} onUpdate={onUpdate} />);

      const textarea = screen.getByTestId('editor-textarea');
      fireEvent.change(textarea, { target: { value: 'Updated text' } });

      expect(onUpdate).toHaveBeenCalledWith('Updated text');
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

      const content = screen.getByTestId('editor-content');
      expect(content.textContent).toBe('');
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
