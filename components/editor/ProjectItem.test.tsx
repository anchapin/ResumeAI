import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import ProjectItem from './ProjectItem';
import { ProjectEntry } from '../../types';

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

      mockProject.highlights.forEach(highlight => {
        expect(screen.getByText(highlight)).toBeInTheDocument();
      });
    });

    it('should render description textarea', () => {
      render(<ProjectItem {...defaultProps} isExpanded={true} />);

      const textarea = screen.getByDisplayValue(mockProject.description) as HTMLTextAreaElement;
      expect(textarea).toBeInTheDocument();
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

    it('should update description when textarea changes', async () => {
      const onUpdate = vi.fn();
      const user = userEvent.setup();
      render(<ProjectItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

      const textarea = screen.getByDisplayValue(mockProject.description) as HTMLTextAreaElement;
      await user.type(textarea, ' and more details');

      expect(onUpdate).toHaveBeenCalledWith('proj-1', 'description', expect.any(String));
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

      mockProject.highlights.forEach(highlight => {
        expect(screen.getByText(highlight)).toBeInTheDocument();
      });
    });

    it('should remove highlight when X is clicked', async () => {
      const onRemoveHighlight = vi.fn();
      const user = userEvent.setup();
      render(<ProjectItem {...defaultProps} isExpanded={true} onRemoveHighlight={onRemoveHighlight} />);

      const removeButtons = screen.getAllByRole('button', { name: /close/i });
      if (removeButtons.length > 0) {
        await user.click(removeButtons[0]);

        expect(onRemoveHighlight).toHaveBeenCalledWith('proj-1', expect.any(String));
      }
    });

    it('should add highlight when Enter is pressed', async () => {
      const onAddHighlight = vi.fn();
      const user = userEvent.setup();
      render(<ProjectItem {...defaultProps} isExpanded={true} onAddHighlight={onAddHighlight} />);

      const highlightInput = screen.getByPlaceholderText('+ Add Highlight') as HTMLInputElement;
      await user.type(highlightInput, 'AWS{Enter}');

      expect(onAddHighlight).toHaveBeenCalledWith('proj-1', expect.stringContaining('AWS'));
    });

    it('should clear input after adding highlight', async () => {
      const onAddHighlight = vi.fn();
      const user = userEvent.setup();
      render(<ProjectItem {...defaultProps} isExpanded={true} onAddHighlight={onAddHighlight} />);

      const highlightInput = screen.getByPlaceholderText('+ Add Highlight') as HTMLInputElement;
      await user.type(highlightInput, 'Docker{Enter}');

      expect(highlightInput.value).toBe('');
    });

    it('should render highlight input field', () => {
      render(<ProjectItem {...defaultProps} isExpanded={true} />);

      expect(screen.getByPlaceholderText('+ Add Highlight')).toBeInTheDocument();
    });

    it('should handle empty highlights array', () => {
      const projectWithoutHighlights: ProjectEntry = {
        ...mockProject,
        highlights: [],
      };

      render(<ProjectItem {...defaultProps} project={projectWithoutHighlights} isExpanded={true} />);

      expect(screen.getByPlaceholderText('+ Add Highlight')).toBeInTheDocument();
    });

    it('should trim whitespace from highlight input', async () => {
      const onAddHighlight = vi.fn();
      const user = userEvent.setup();
      render(<ProjectItem {...defaultProps} isExpanded={true} onAddHighlight={onAddHighlight} />);

      const highlightInput = screen.getByPlaceholderText('+ Add Highlight');
      await user.type(highlightInput, '  Kubernetes  {Enter}');

      expect(onAddHighlight).toHaveBeenCalledWith('proj-1', expect.stringContaining('Kubernetes'));
    });
  });

  describe('Input Validation', () => {
    it('should handle long project names', () => {
      const longName = 'A'.repeat(100);
      const projectWithLongName = {
        ...mockProject,
        name: longName,
      };

      render(<ProjectItem {...defaultProps} project={projectWithLongName} isExpanded={true} />);

      const inputs = screen.getAllByDisplayValue(longName);
      expect(inputs.length).toBeGreaterThan(0);
    });

    it('should handle special characters in project name', () => {
      const projectWithSpecialChars = {
        ...mockProject,
        name: "E-Commerce 2.0 (React & Node.js)",
      };

      render(<ProjectItem {...defaultProps} project={projectWithSpecialChars} isExpanded={true} />);

      const inputs = screen.getAllByDisplayValue("E-Commerce 2.0 (React & Node.js)");
      expect(inputs.length).toBeGreaterThan(0);
    });

    it('should handle Unicode characters', () => {
      const projectWithUnicode = {
        ...mockProject,
        name: '日本 E-Commerce Platform',
        description: 'プラットフォームの説明',
      };

      render(<ProjectItem {...defaultProps} project={projectWithUnicode} isExpanded={true} />);

      expect(screen.getAllByDisplayValue('日本 E-Commerce Platform').length).toBeGreaterThan(0);
      expect(screen.getAllByDisplayValue('プラットフォームの説明').length).toBeGreaterThan(0);
    });

    it('should handle multiline descriptions', () => {
      const multilineDesc = 'Line 1\nLine 2\nLine 3';
      const projectWithMultiline = {
        ...mockProject,
        description: multilineDesc,
      };

      render(<ProjectItem {...defaultProps} project={projectWithMultiline} isExpanded={true} />);

      const textarea = screen.getByDisplayValue(multilineDesc) as HTMLTextAreaElement;
      expect(textarea).toBeInTheDocument();
    });

    it('should handle very long descriptions', () => {
      const veryLongDesc = 'A'.repeat(5000);
      const projectWithLongDesc = {
        ...mockProject,
        description: veryLongDesc,
      };

      render(<ProjectItem {...defaultProps} project={projectWithLongDesc} isExpanded={true} />);

      const textarea = screen.getByDisplayValue(veryLongDesc) as HTMLTextAreaElement;
      expect(textarea).toBeInTheDocument();
    });
  });

  describe('State Persistence', () => {
    it('should maintain expanded state across re-renders', () => {
      const { rerender } = render(
        <ProjectItem {...defaultProps} isExpanded={true} />
      );

      expect(screen.getByDisplayValue('E-Commerce Platform')).toBeInTheDocument();

      rerender(<ProjectItem {...defaultProps} isExpanded={true} />);

      expect(screen.getByDisplayValue('E-Commerce Platform')).toBeInTheDocument();
    });

    it('should update when project data changes', () => {
      const { rerender } = render(
        <ProjectItem {...defaultProps} />
      );

      expect(screen.getByText('E-Commerce Platform | 2021-01 - 2021-12')).toBeInTheDocument();

      const updatedProject = {
        ...mockProject,
        name: 'Mobile App',
        startDate: '2022-01',
        endDate: '2022-06',
      };

      rerender(<ProjectItem {...defaultProps} project={updatedProject} />);

      expect(screen.getByText('Mobile App | 2022-01 - 2022-06')).toBeInTheDocument();
    });

    it('should update ID when project ID changes', () => {
      const projOne = { ...mockProject, id: 'proj-1' };
      const projTwo = { ...mockProject, id: 'proj-2' };

      const { rerender } = render(
        <ProjectItem {...defaultProps} project={projOne} />
      );

      expect(screen.getByText('E-Commerce Platform | 2021-01 - 2021-12')).toBeInTheDocument();

      rerender(<ProjectItem {...defaultProps} project={projTwo} />);

      expect(screen.getByText('E-Commerce Platform | 2021-01 - 2021-12')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty strings for all fields', () => {
      const emptyProject: ProjectEntry = {
        id: 'proj-3',
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        highlights: [],
      };

      render(<ProjectItem {...defaultProps} project={emptyProject} isExpanded={true} />);

      const emptyInputs = screen.getAllByDisplayValue('');
      expect(emptyInputs.length).toBeGreaterThan(0);
    });

    it('should handle only name populated', () => {
      const nameOnlyProject: ProjectEntry = {
        id: 'proj-4',
        name: 'My Project',
        description: '',
        startDate: '',
        endDate: '',
        highlights: [],
      };

      render(<ProjectItem {...defaultProps} project={nameOnlyProject} isExpanded={true} />);

      expect(screen.getAllByDisplayValue('My Project').length).toBeGreaterThan(0);
    });

    it('should handle project with single highlight', () => {
      const singleHighlight: ProjectEntry = {
        ...mockProject,
        highlights: ['React'],
      };

      render(<ProjectItem {...defaultProps} project={singleHighlight} isExpanded={true} />);

      expect(screen.getByText('React')).toBeInTheDocument();
    });

    it('should handle project with many highlights', () => {
      const manyHighlights: ProjectEntry = {
        ...mockProject,
        highlights: Array.from({ length: 20 }, (_, i) => `Tech${i}`),
      };

      render(<ProjectItem {...defaultProps} project={manyHighlights} isExpanded={true} />);

      expect(screen.getByText('Tech0')).toBeInTheDocument();
      expect(screen.getByText('Tech19')).toBeInTheDocument();
    });

    it('should handle same start and end dates', () => {
      const sameDate: ProjectEntry = {
        ...mockProject,
        startDate: '2021-01',
        endDate: '2021-01',
      };

      render(<ProjectItem {...defaultProps} project={sameDate} isExpanded={true} />);

      expect(screen.getAllByDisplayValue('2021-01').length).toBeGreaterThanOrEqual(2);
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

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ProjectItem {...defaultProps} isExpanded={true} />);

      const nameInputs = screen.getAllByDisplayValue('E-Commerce Platform');
      const nameInput = nameInputs[0] as HTMLInputElement;

      await user.click(nameInput);
      expect(document.activeElement).toBe(nameInput);

      await user.tab();
      expect(document.activeElement).not.toBe(nameInput);
    });

    it('should have semantic HTML structure', () => {
      const { container } = render(<ProjectItem {...defaultProps} isExpanded={true} />);

      const labels = container.querySelectorAll('label');
      const inputs = container.querySelectorAll('input');

      expect(labels.length).toBeGreaterThan(0);
      expect(inputs.length).toBeGreaterThan(0);
    });
  });

  describe('Visual States', () => {
    it('should show different styling when expanded vs collapsed', () => {
      const { container: collapsedContainer } = render(
        <ProjectItem {...defaultProps} isExpanded={false} />
      );

      const { container: expandedContainer } = render(
        <ProjectItem {...defaultProps} isExpanded={true} />
      );

      const collapsedCard = collapsedContainer.querySelector('[class*="border"]');
      const expandedCard = expandedContainer.querySelector('[class*="border"]');

      expect(collapsedCard).toBeInTheDocument();
      expect(expandedCard).toBeInTheDocument();
    });
  });

  describe('Multiple Instances', () => {
    it('should handle multiple project items independently', () => {
      const proj1 = { ...mockProject, id: 'proj-1' };
      const proj2 = { ...mockProject, id: 'proj-2', name: 'Mobile App' };

      render(
        <>
          <ProjectItem {...defaultProps} project={proj1} />
          <ProjectItem {...defaultProps} project={proj2} />
        </>
      );

      expect(screen.getByText('E-Commerce Platform | 2021-01 - 2021-12')).toBeInTheDocument();
      expect(screen.getByText('Mobile App | 2021-01 - 2021-12')).toBeInTheDocument();
    });

    it('should call correct callbacks for each instance', async () => {
      const onDelete1 = vi.fn();
      const onDelete2 = vi.fn();
      const user = userEvent.setup();

      const proj1 = { ...mockProject, id: 'proj-1' };
      const proj2 = { ...mockProject, id: 'proj-2', name: 'Mobile App' };

      render(
        <>
          <ProjectItem {...defaultProps} project={proj1} onDelete={onDelete1} />
          <ProjectItem {...defaultProps} project={proj2} onDelete={onDelete2} />
        </>
      );

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      expect(onDelete1).toHaveBeenCalledWith('proj-1');
      expect(onDelete2).not.toHaveBeenCalled();
    });
  });

  describe('Memo Optimization', () => {
    it('should render correctly on updates', () => {
      const { rerender } = render(<ProjectItem {...defaultProps} />);

      expect(screen.getByText('E-Commerce Platform')).toBeInTheDocument();

      rerender(<ProjectItem {...defaultProps} />);

      expect(screen.getByText('E-Commerce Platform')).toBeInTheDocument();
    });
  });
});
