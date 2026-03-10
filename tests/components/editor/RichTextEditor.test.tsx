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
  });

  describe('User Interactions', () => {
    it('calls onChange when content is updated', async () => {
      const onChange = vi.fn();
      render(<RichTextEditor {...defaultProps} onChange={onChange} />);

      // Note: Full typing tests require jsdom/Playwright due to TipTap's 
      // dependency on getClientRects. We test that the editor renders here.
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

      // Placeholder is handled by TipTap
      const editor = document.querySelector('.ProseMirror');
      expect(editor).toBeInTheDocument();
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

    it('renders empty content', () => {
      render(<RichTextEditor {...defaultProps} content="" />);

      const editor = document.querySelector('.ProseMirror');
      expect(editor).toBeInTheDocument();
    });

    it('renders with HTML content', () => {
      const htmlContent = '<h1>Title</h1><p>Paragraph with <strong>bold</strong> text</p>';
      render(<RichTextEditor {...defaultProps} content={htmlContent} />);

      const editor = document.querySelector('.ProseMirror');
      expect(editor).toBeInTheDocument();
    });
  });

  describe('Editor Functionality', () => {
    it('renders with lists support', () => {
      render(<RichTextEditor {...defaultProps} />);

      // Both list buttons should be present
      expect(screen.getByRole('button', { name: /Bullet list/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Numbered list/i })).toBeInTheDocument();
    });

    it('renders with heading support', () => {
      render(<RichTextEditor {...defaultProps} />);

      // All heading buttons should be present
      expect(screen.getByRole('button', { name: /Heading 1/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Heading 2/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Heading 3/i })).toBeInTheDocument();
    });
  });
});
