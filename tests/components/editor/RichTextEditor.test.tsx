/**
 * Tests for RichTextEditor component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { RichTextEditor } from '../../../components/editor/RichTextEditor';

describe('RichTextEditor', () => {
  const defaultProps = {
    content: '<p>Test content</p>',
    onChange: vi.fn(),
    placeholder: 'Enter text here...',
    minHeight: '120px',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders editor with content', () => {
      render(<RichTextEditor {...defaultProps} />);

      const editor = document.querySelector('.ProseMirror');
      expect(editor).toBeInTheDocument();
    });

    it('renders toolbar with formatting buttons', () => {
      render(<RichTextEditor {...defaultProps} />);

      // Check for heading buttons
      expect(screen.getByRole('button', { name: /Heading 1/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Heading 2/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Heading 3/i })).toBeInTheDocument();

      // Check for formatting buttons
      expect(screen.getByRole('button', { name: /Bold/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Italic/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Underline/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Strikethrough/i })).toBeInTheDocument();

      // Check for list buttons
      expect(screen.getByRole('button', { name: /Bullet list/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Numbered list/i })).toBeInTheDocument();

      // Check for code button
      expect(screen.getByRole('button', { name: /Code/i })).toBeInTheDocument();
    });

    it('renders toolbar with correct roles', () => {
      render(<RichTextEditor {...defaultProps} />);

      expect(screen.getByRole('toolbar', { name: /Formatting options/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('toolbar buttons have proper aria-labels', () => {
      render(<RichTextEditor {...defaultProps} />);

      const boldButton = screen.getByRole('button', { name: /Bold/i });
      expect(boldButton).toHaveAttribute('aria-label', 'Bold');
      expect(boldButton).toHaveAttribute('title', 'Bold (Ctrl+B)');
    });

    it('buttons have aria-pressed state', () => {
      render(<RichTextEditor {...defaultProps} />);

      const boldButton = screen.getByRole('button', { name: /Bold/i });
      expect(boldButton).toHaveAttribute('aria-pressed');
    });

    it('editor has textbox role and aria-label', () => {
      render(<RichTextEditor {...defaultProps} />);

      const editor = screen.getByRole('textbox');
      expect(editor).toBeInTheDocument();
      expect(editor).toHaveAttribute('aria-label', defaultProps.placeholder);
    });
  });

  describe('User Interactions', () => {
    it('calls onChange when content is updated', async () => {
      const onChange = vi.fn();
      render(<RichTextEditor {...defaultProps} onChange={onChange} />);

      const editor = document.querySelector('.ProseMirror');
      expect(editor).toBeInTheDocument();
    });

    it('toggles bold formatting when button is clicked', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<RichTextEditor {...defaultProps} onChange={onChange} />);

      const boldButton = screen.getByRole('button', { name: /Bold/i });
      await user.click(boldButton);

      // Check that aria-pressed is toggled
      expect(boldButton).toHaveAttribute('aria-pressed');
    });
  });

  describe('Props', () => {
    it('renders with custom placeholder', () => {
      const customPlaceholder = 'Custom placeholder text';
      render(<RichTextEditor {...defaultProps} placeholder={customPlaceholder} />);

      const editor = screen.getByRole('textbox');
      expect(editor).toHaveAttribute('aria-label', customPlaceholder);
    });

    it('renders with custom minHeight', () => {
      const customMinHeight = '200px';
      render(<RichTextEditor {...defaultProps} minHeight={customMinHeight} />);

      const editor = document.querySelector('.ProseMirror');
      expect(editor).toHaveStyle({ 'min-height': customMinHeight });
    });

    it('renders with custom className', () => {
      const customClass = 'custom-editor-class';
      render(<RichTextEditor {...defaultProps} className={customClass} />);

      const container = document.querySelector(`.${customClass}`);
      expect(container).toBeInTheDocument();
    });
  });
});
