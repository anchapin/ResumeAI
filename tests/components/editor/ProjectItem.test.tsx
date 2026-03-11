import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import ProjectItem from '../../../components/editor/ProjectItem';
import { ProjectEntry } from '../../../types';

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

describe('ProjectItem Component', () => {
  const mockProject: ProjectEntry = {
    id: 'proj-1',
    name: 'E-Commerce Platform',
    description: 'Built a scalable e-commerce platform using React and Node.js',
    startDate: '2021-01',
    endDate: '2021-12',
    highlights: ['React', 'Node.js', 'PostgreSQL', 'Docker'],
  };

  const defaultProps = {
    project: mockProject,
    isExpanded: false,
    onToggleExpand: vi.fn(),
    onDelete: vi.fn(),
    onUpdate: vi.fn(),
    onAddHighlight: vi.fn(),
    onRemoveHighlight: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render collapsed state correctly', () => {
      render(<ProjectItem {...defaultProps} />);

      expect(screen.getByText('E-Commerce Platform')).toBeInTheDocument();
      expect(screen.getByText('2021-01 - 2021-12')).toBeInTheDocument();
      expect(screen.queryAllByDisplayValue('E-Commerce Platform')).toHaveLength(0);
    });

    it('should render expanded state with all form fields', () => {
      render(<ProjectItem {...defaultProps} isExpanded={true} />);

      const inputs = screen.getAllByDisplayValue('E-Commerce Platform');
      expect(inputs.length).toBeGreaterThan(0);
      expect(screen.getByDisplayValue('2021-01')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2021-12')).toBeInTheDocument();
    });

    it('should render delete button in collapsed state', () => {
      render(<ProjectItem {...defaultProps} />);

      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('should render all fields when expanded', () => {
      render(<ProjectItem {...defaultProps} isExpanded={true} />);

      expect(screen.getByText('Project Name')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Start Date')).toBeInTheDocument();
      expect(screen.getByText('End Date')).toBeInTheDocument();
    });

    it('should render highlights when expanded', () => {
      render(<ProjectItem {...defaultProps} isExpanded={true} />);

      mockProject.highlights?.forEach((highlight) => {
        expect(screen.getByText(highlight)).toBeInTheDocument();
      });
    });

    it('should render description editor', () => {
      render(<ProjectItem {...defaultProps} isExpanded={true} />);

      const content = screen.getByTestId('editor-content');
      expect(content.textContent).toBe(mockProject.description);
    });
  });

  describe('Toggle Expand', () => {
    it('should call onToggleExpand when card header is clicked', async () => {
      const onToggleExpand = vi.fn();
      const user = userEvent.setup();
      render(<ProjectItem {...defaultProps} onToggleExpand={onToggleExpand} />);

      const card = screen.getByText('E-Commerce Platform').closest('div');
      if (card?.parentElement) {
        await user.click(card.parentElement);
      }

      expect(onToggleExpand).toHaveBeenCalledWith('proj-1');
    });

    it('should toggle expand state on rerender', () => {
      const { rerender } = render(<ProjectItem {...defaultProps} isExpanded={false} />);

      expect(screen.queryAllByDisplayValue('E-Commerce Platform')).toHaveLength(0);

      rerender(<ProjectItem {...defaultProps} isExpanded={true} />);

      expect(screen.getAllByDisplayValue('E-Commerce Platform').length).toBeGreaterThan(0);
    });

    it('should show form fields only when expanded', () => {
      const { rerender } = render(<ProjectItem {...defaultProps} isExpanded={false} />);

      expect(screen.queryByText('Project Name')).not.toBeInTheDocument();

      rerender(<ProjectItem {...defaultProps} isExpanded={true} />);

      expect(screen.getByText('Project Name')).toBeInTheDocument();
    });
  });

  describe('Delete Operations', () => {
    it('should call onDelete when delete button is clicked', async () => {
      const onDelete = vi.fn();
      const user = userEvent.setup();
      render(<ProjectItem {...defaultProps} onDelete={onDelete} />);

      const deleteBtn = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteBtn);

      // Delete has confirmation pattern - need to click confirm button
      const confirmBtn = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmBtn);

      expect(onDelete).toHaveBeenCalledWith('proj-1');
    });

    it('should stop event propagation on delete button click', async () => {
      const onToggleExpand = vi.fn();
      const user = userEvent.setup();
      render(<ProjectItem {...defaultProps} onToggleExpand={onToggleExpand} />);

      const deleteBtn = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteBtn);

      expect(onToggleExpand).not.toHaveBeenCalled();
    });
  });

  describe('Field Updates', () => {
    it('should update project name when input changes', async () => {
      const onUpdate = vi.fn();
      const user = userEvent.setup();
      render(<ProjectItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

      const nameInputs = screen.getAllByDisplayValue('E-Commerce Platform');
      await user.type(nameInputs[0], ' v2.0');

      expect(onUpdate).toHaveBeenCalledWith('proj-1', 'name', expect.any(String));
    });

    it('should update description when editor changes', async () => {
      const onUpdate = vi.fn();
      render(<ProjectItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

      const textarea = screen.getByTestId('editor-textarea');
      fireEvent.change(textarea, { target: { value: 'Updated description' } });

      expect(onUpdate).toHaveBeenCalledWith('proj-1', 'description', 'Updated description');
    });

    it('should update start date when input changes', async () => {
      const onUpdate = vi.fn();
      const user = userEvent.setup();
      render(<ProjectItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

      const startInputs = screen.getAllByDisplayValue('2021-01');
      await user.type(startInputs[0], '-15');

      expect(onUpdate).toHaveBeenCalledWith('proj-1', 'startDate', expect.any(String));
    });

    it('should update end date when input changes', async () => {
      const onUpdate = vi.fn();
      const user = userEvent.setup();
      render(<ProjectItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

      const endInputs = screen.getAllByDisplayValue('2021-12');
      await user.type(endInputs[0], '-25');

      expect(onUpdate).toHaveBeenCalledWith('proj-1', 'endDate', expect.any(String));
    });
  });

  describe('Highlight Management', () => {
    it('should render all highlights', () => {
      render(<ProjectItem {...defaultProps} isExpanded={true} />);

      mockProject.highlights?.forEach((highlight) => {
        expect(screen.getByText(highlight)).toBeInTheDocument();
      });
    });

    it('should clear input after adding highlight', async () => {
      const user = userEvent.setup();
      render(<ProjectItem {...defaultProps} isExpanded={true} />);

      const highlightInput = screen.getByPlaceholderText('+ Add Highlight') as HTMLInputElement;
      await user.type(highlightInput, 'Docker{Enter}');

      expect(highlightInput.value).toBe('');
    });

    it('should render highlight input field', () => {
      render(<ProjectItem {...defaultProps} isExpanded={true} />);

      expect(screen.getByPlaceholderText('+ Add Highlight')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should render label text for all form fields', () => {
      render(<ProjectItem {...defaultProps} isExpanded={true} />);

      expect(screen.getByText('Project Name')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Start Date')).toBeInTheDocument();
      expect(screen.getByText('End Date')).toBeInTheDocument();
    });

    it('should have accessible form inputs', () => {
      render(<ProjectItem {...defaultProps} isExpanded={true} />);

      const inputs = screen.getAllByRole('textbox');
      expect(inputs.length).toBeGreaterThan(0);
    });

    it('should have accessible delete button', () => {
      render(<ProjectItem {...defaultProps} />);

      const deleteBtn = screen.getByRole('button', { name: /delete/i });
      expect(deleteBtn).toBeInTheDocument();
    });
  });
});
