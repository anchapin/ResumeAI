import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import EducationItem from '../../../components/editor/EducationItem';
import { EducationEntry } from '../../../types';

// Mock RichTextEditor
vi.mock('../../../components/editor/RichTextEditor', () => ({
  RichTextEditor: ({ content, onChange, placeholder, id }: any) => (
    <div data-testid="mock-rich-editor">
      <div data-testid="editor-content">{content}</div>
      <textarea 
        data-testid="editor-textarea"
        id={id}
        value={content}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  ),
  __esModule: true,
  default: ({ content, onChange, placeholder, id }: any) => (
    <div data-testid="mock-rich-editor">
      <div data-testid="editor-content">{content}</div>
      <textarea 
        data-testid="editor-textarea"
        id={id}
        value={content}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  ),
}));

describe('EducationItem Component', () => {
  const mockEducation: EducationEntry = {
    id: 'edu-1',
    institution: 'Harvard University',
    area: 'Computer Science',
    studyType: 'Master of Science',
    startDate: '2018-09',
    endDate: '2020-05',
    description: 'Focus on Distributed Systems',
  };

  const defaultProps = {
    edu: mockEducation,
    isExpanded: false,
    onToggleExpand: vi.fn(),
    onDelete: vi.fn(),
    onUpdate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render collapsed state correctly', () => {
      render(<EducationItem {...defaultProps} />);

      expect(screen.getByText('Harvard University')).toBeInTheDocument();
      expect(screen.getByText(/Master of Science in Computer Science/)).toBeInTheDocument();
      expect(screen.queryAllByDisplayValue('Harvard University')).toHaveLength(0);
    });

    it('should render expanded state with all form fields', () => {
      render(<EducationItem {...defaultProps} isExpanded={true} />);

      const inputs = screen.getAllByDisplayValue('Harvard University');
      expect(inputs.length).toBeGreaterThan(0);
      expect(screen.getByDisplayValue('Computer Science')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Master of Science')).toBeInTheDocument();
    });

    it('should render delete button in collapsed state', () => {
      render(<EducationItem {...defaultProps} />);

      expect(screen.getByLabelText('Delete education')).toBeInTheDocument();
    });

    it('should render expand icon in collapsed state', () => {
      render(<EducationItem {...defaultProps} />);

      const expandIcon = screen.getByLabelText('Expand details for Harvard University');
      expect(expandIcon).toBeInTheDocument();
    });

    it('should render all input fields when expanded', () => {
      render(<EducationItem {...defaultProps} isExpanded={true} />);

      expect(screen.getByText('Institution')).toBeInTheDocument();
      expect(screen.getByText('Field of Study')).toBeInTheDocument();
      expect(screen.getByText('Degree Type')).toBeInTheDocument();
      expect(screen.getByText('Start Date')).toBeInTheDocument();
      expect(screen.getByText('End Date')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    it('should render description editor', () => {
      render(<EducationItem {...defaultProps} isExpanded={true} />);

      const content = screen.getByTestId('editor-content');
      expect(content.textContent).toBe(mockEducation.description);
    });
  });

  describe('Toggle Expand', () => {
    it('should call onToggleExpand when card header is clicked', async () => {
      const onToggleExpand = vi.fn();
      const user = userEvent.setup();
      render(<EducationItem {...defaultProps} onToggleExpand={onToggleExpand} />);

      const card = screen.getByText('Harvard University').closest('button');
      if (card) {
        await user.click(card);
      }

      expect(onToggleExpand).toHaveBeenCalledWith('edu-1');
    });
  });

  describe('Field Updates', () => {
    it('should update institution when input changes', async () => {
      const onUpdate = vi.fn();
      const user = userEvent.setup();
      render(<EducationItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

      const institutionInputs = screen.getAllByDisplayValue('Harvard University');
      await user.type(institutionInputs[0], ' (Extended)');

      expect(onUpdate).toHaveBeenCalledWith('edu-1', 'institution', expect.any(String));
    });

    it('should update description when editor changes', async () => {
      const onUpdate = vi.fn();
      render(<EducationItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

      const textarea = screen.getByTestId('editor-textarea');
      fireEvent.change(textarea, { target: { value: 'Updated description' } });

      expect(onUpdate).toHaveBeenCalledWith('edu-1', 'description', 'Updated description');
    });
  });

  describe('Accessibility', () => {
    it('should render label text for all form fields', () => {
      render(<EducationItem {...defaultProps} isExpanded={true} />);

      expect(screen.getByText('Institution')).toBeInTheDocument();
      expect(screen.getByText('Field of Study')).toBeInTheDocument();
      expect(screen.getByText('Degree Type')).toBeInTheDocument();
      expect(screen.getByText('Start Date')).toBeInTheDocument();
      expect(screen.getByText('End Date')).toBeInTheDocument();
    });

    it('should have accessible form inputs', () => {
      render(<EducationItem {...defaultProps} isExpanded={true} />);

      const inputs = screen.getAllByRole('textbox');
      expect(inputs.length).toBeGreaterThan(0);
    });
  });
});
