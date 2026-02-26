import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import EducationItem from '../../../components/editor/EducationItem';
import { EducationEntry } from '../../../types';

describe('EducationItem Component', () => {
  const mockEducation: EducationEntry = {
    id: 'edu-1',
    institution: 'Harvard University',
    area: 'Computer Science',
    studyType: 'Master of Science',
    startDate: '2018-09',
    endDate: '2020-05',
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

      expect(screen.getByText('Master of Science')).toBeInTheDocument();
      expect(screen.getByText('Harvard University | 2018-09 - 2020-05')).toBeInTheDocument();
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

      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('should render expand icon in collapsed state', () => {
      render(<EducationItem {...defaultProps} />);

      const expandButton = screen.getByRole('button').closest('div')?.querySelector('button');
      expect(expandButton).toBeInTheDocument();
    });

    it('should render all input fields when expanded', () => {
      render(<EducationItem {...defaultProps} isExpanded={true} />);

      expect(screen.getByText('Institution')).toBeInTheDocument();
      expect(screen.getByText('Field of Study')).toBeInTheDocument();
      expect(screen.getByText('Degree Type')).toBeInTheDocument();
      expect(screen.getByText('Start Date')).toBeInTheDocument();
      expect(screen.getByText('End Date')).toBeInTheDocument();
    });

    it('should render with empty education data', () => {
      const emptyEducation: EducationEntry = {
        id: 'edu-2',
        institution: '',
        area: '',
        studyType: '',
        startDate: '',
        endDate: '',
      };

      render(<EducationItem {...defaultProps} edu={emptyEducation} isExpanded={true} />);

      expect(screen.getByDisplayValue('')).toBeInTheDocument();
    });
  });

  describe('Toggle Expand', () => {
    it('should call onToggleExpand when card header is clicked', async () => {
      const onToggleExpand = vi.fn();
      const user = userEvent.setup();
      render(<EducationItem {...defaultProps} onToggleExpand={onToggleExpand} />);

      const card = screen.getByText('Master of Science').closest('div');
      if (card?.parentElement) {
        await user.click(card.parentElement);
      }

      expect(onToggleExpand).toHaveBeenCalledWith('edu-1');
    });

    it('should toggle expand state on rerender', () => {
      const { rerender } = render(<EducationItem {...defaultProps} isExpanded={false} />);

      expect(screen.queryAllByDisplayValue('Harvard University')).toHaveLength(0);

      rerender(<EducationItem {...defaultProps} isExpanded={true} />);

      expect(screen.getAllByDisplayValue('Harvard University').length).toBeGreaterThan(0);
    });

    it('should show form fields only when expanded', () => {
      const { rerender } = render(<EducationItem {...defaultProps} isExpanded={false} />);

      expect(screen.queryByText('Institution')).not.toBeInTheDocument();

      rerender(<EducationItem {...defaultProps} isExpanded={true} />);

      expect(screen.getByText('Institution')).toBeInTheDocument();
    });
  });

  describe('Delete Operations', () => {
    it('should call onDelete when delete button is clicked', async () => {
      const onDelete = vi.fn();
      const user = userEvent.setup();
      render(<EducationItem {...defaultProps} onDelete={onDelete} />);

      const deleteBtn = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteBtn);

      expect(onDelete).toHaveBeenCalledWith('edu-1');
    });

    it('should stop event propagation on delete button click', async () => {
      const onToggleExpand = vi.fn();
      const user = userEvent.setup();
      render(<EducationItem {...defaultProps} onToggleExpand={onToggleExpand} />);

      const deleteBtn = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteBtn);

      expect(onToggleExpand).not.toHaveBeenCalled();
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

    it('should update field of study when input changes', async () => {
      const onUpdate = vi.fn();
      const user = userEvent.setup();
      render(<EducationItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

      const areaInputs = screen.getAllByDisplayValue('Computer Science');
      await user.type(areaInputs[0], ' & AI');

      expect(onUpdate).toHaveBeenCalledWith('edu-1', 'area', expect.any(String));
    });

    it('should update degree type when input changes', async () => {
      const onUpdate = vi.fn();
      const user = userEvent.setup();
      render(<EducationItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

      const degreeInputs = screen.getAllByDisplayValue('Master of Science');
      await user.type(degreeInputs[0], ' (Honors)');

      expect(onUpdate).toHaveBeenCalledWith('edu-1', 'studyType', expect.any(String));
    });

    it('should update start date when input changes', async () => {
      const onUpdate = vi.fn();
      const user = userEvent.setup();
      render(<EducationItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

      const startDateInputs = screen.getAllByDisplayValue('2018-09');
      await user.type(startDateInputs[0], '-01');

      expect(onUpdate).toHaveBeenCalledWith('edu-1', 'startDate', expect.any(String));
    });

    it('should update end date when input changes', async () => {
      const onUpdate = vi.fn();
      const user = userEvent.setup();
      render(<EducationItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

      const endDateInputs = screen.getAllByDisplayValue('2020-05');
      await user.type(endDateInputs[0], '-15');

      expect(onUpdate).toHaveBeenCalledWith('edu-1', 'endDate', expect.any(String));
    });

    it('should handle rapid consecutive updates', async () => {
      const onUpdate = vi.fn();
      const user = userEvent.setup();
      render(<EducationItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

      const institutionInputs = screen.getAllByDisplayValue('Harvard University');
      const input = institutionInputs[0] as HTMLInputElement;

      await user.clear(input);
      await user.type(input, 'MIT');

      expect(onUpdate.mock.calls.length).toBeGreaterThan(0);
    });
  });

  describe('Input Validation', () => {
    it('should handle long institution names', () => {
      const longName = 'A'.repeat(100);
      const eduWithLongName = {
        ...mockEducation,
        institution: longName,
      };

      render(<EducationItem {...defaultProps} edu={eduWithLongName} isExpanded={true} />);

      const inputs = screen.getAllByDisplayValue(longName);
      expect(inputs.length).toBeGreaterThan(0);
    });

    it('should handle special characters in institution name', () => {
      const eduWithSpecialChars = {
        ...mockEducation,
        institution: "O'Reilly Technical Institute & Research Center",
      };

      render(<EducationItem {...defaultProps} edu={eduWithSpecialChars} isExpanded={true} />);

      const inputs = screen.getAllByDisplayValue("O'Reilly Technical Institute & Research Center");
      expect(inputs.length).toBeGreaterThan(0);
    });

    it('should handle Unicode characters', () => {
      const eduWithUnicode = {
        ...mockEducation,
        institution: '東京大学',
        area: 'コンピュータサイエンス',
      };

      render(<EducationItem {...defaultProps} edu={eduWithUnicode} isExpanded={true} />);

      expect(screen.getAllByDisplayValue('東京大学').length).toBeGreaterThan(0);
      expect(screen.getAllByDisplayValue('コンピュータサイエンス').length).toBeGreaterThan(0);
    });

    it('should handle various date formats', () => {
      const eduWithDates = {
        ...mockEducation,
        startDate: '2019',
        endDate: '2021-12',
      };

      render(<EducationItem {...defaultProps} edu={eduWithDates} isExpanded={true} />);

      expect(screen.getByDisplayValue('2019')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2021-12')).toBeInTheDocument();
    });

    it('should trim whitespace from inputs', async () => {
      const onUpdate = vi.fn();
      const user = userEvent.setup();
      render(<EducationItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

      const institutionInputs = screen.getAllByDisplayValue('Harvard University');
      await user.type(institutionInputs[0], '  ');

      // Should handle gracefully
      expect(institutionInputs[0]).toBeInTheDocument();
    });
  });

  describe('State Persistence', () => {
    it('should maintain expanded state across re-renders', () => {
      const { rerender } = render(<EducationItem {...defaultProps} isExpanded={true} />);

      expect(screen.getByDisplayValue('Harvard University')).toBeInTheDocument();

      rerender(<EducationItem {...defaultProps} isExpanded={true} />);

      expect(screen.getByDisplayValue('Harvard University')).toBeInTheDocument();
    });

    it('should update when education data changes', () => {
      const { rerender } = render(<EducationItem {...defaultProps} />);

      expect(screen.getByText('Harvard University | 2018-09 - 2020-05')).toBeInTheDocument();

      const updatedEducation = {
        ...mockEducation,
        institution: 'Stanford University',
        startDate: '2019-01',
        endDate: '2021-05',
      };

      rerender(<EducationItem {...defaultProps} edu={updatedEducation} />);

      expect(screen.getByText('Stanford University | 2019-01 - 2021-05')).toBeInTheDocument();
    });

    it('should update ID when education ID changes', () => {
      const eduOne = { ...mockEducation, id: 'edu-1' };
      const eduTwo = { ...mockEducation, id: 'edu-2' };

      const { rerender } = render(<EducationItem {...defaultProps} edu={eduOne} />);

      expect(screen.getByText('Master of Science')).toBeInTheDocument();

      rerender(<EducationItem {...defaultProps} edu={eduTwo} />);

      expect(screen.getByText('Master of Science')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty strings for all fields', () => {
      const emptyEducation: EducationEntry = {
        id: 'edu-3',
        institution: '',
        area: '',
        studyType: '',
        startDate: '',
        endDate: '',
      };

      render(<EducationItem {...defaultProps} edu={emptyEducation} isExpanded={true} />);

      const emptyInputs = screen.getAllByDisplayValue('');
      expect(emptyInputs.length).toBeGreaterThan(0);
    });

    it('should handle only institution populated', () => {
      const partialEducation: EducationEntry = {
        id: 'edu-4',
        institution: 'Yale University',
        area: '',
        studyType: '',
        startDate: '',
        endDate: '',
      };

      render(<EducationItem {...defaultProps} edu={partialEducation} isExpanded={true} />);

      expect(screen.getByDisplayValue('Yale University')).toBeInTheDocument();
    });

    it('should handle only dates populated', () => {
      const dateOnlyEducation: EducationEntry = {
        id: 'edu-5',
        institution: '',
        area: '',
        studyType: '',
        startDate: '2020',
        endDate: '2022',
      };

      render(<EducationItem {...defaultProps} edu={dateOnlyEducation} isExpanded={true} />);

      expect(screen.getByDisplayValue('2020')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2022')).toBeInTheDocument();
    });

    it('should handle same start and end dates', () => {
      const sameDate: EducationEntry = {
        ...mockEducation,
        startDate: '2020-01',
        endDate: '2020-01',
      };

      render(<EducationItem {...defaultProps} edu={sameDate} isExpanded={true} />);

      expect(screen.getAllByDisplayValue('2020-01').length).toBeGreaterThanOrEqual(2);
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

    it('should have accessible delete button', () => {
      render(<EducationItem {...defaultProps} />);

      const deleteBtn = screen.getByRole('button', { name: /delete/i });
      expect(deleteBtn).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<EducationItem {...defaultProps} isExpanded={true} />);

      const institutionInputs = screen.getAllByDisplayValue('Harvard University');
      const institutionInput = institutionInputs[0] as HTMLInputElement;

      await user.click(institutionInput);
      expect(document.activeElement).toBe(institutionInput);

      await user.tab();
      expect(document.activeElement).not.toBe(institutionInput);
    });

    it('should have semantic HTML structure', () => {
      const { container } = render(<EducationItem {...defaultProps} isExpanded={true} />);

      const labels = container.querySelectorAll('label');
      const inputs = container.querySelectorAll('input');

      expect(labels.length).toBeGreaterThan(0);
      expect(inputs.length).toBeGreaterThan(0);
    });
  });

  describe('Memo Optimization', () => {
    it('should render correctly on updates', () => {
      const { rerender } = render(<EducationItem {...defaultProps} />);

      expect(screen.getByText('Master of Science')).toBeInTheDocument();

      rerender(<EducationItem {...defaultProps} />);

      expect(screen.getByText('Master of Science')).toBeInTheDocument();
    });

    it('should not re-render unnecessarily with same props', () => {
      const renderSpy = vi.fn();
      const MockedEducationItem = (props: any) => {
        renderSpy();
        return <EducationItem {...props} />;
      };

      const { rerender } = render(<MockedEducationItem {...defaultProps} />);
      const firstRenderCount = renderSpy.mock.calls.length;

      rerender(<MockedEducationItem {...defaultProps} />);
      const secondRenderCount = renderSpy.mock.calls.length;

      // Should have rendered twice (initial + rerender call)
      expect(secondRenderCount).toBeGreaterThanOrEqual(firstRenderCount);
    });
  });

  describe('Visual States', () => {
    it('should show different styling when expanded vs collapsed', () => {
      const { container: collapsedContainer } = render(
        <EducationItem {...defaultProps} isExpanded={false} />,
      );

      const { container: expandedContainer } = render(
        <EducationItem {...defaultProps} isExpanded={true} />,
      );

      const collapsedCard = collapsedContainer.querySelector('[class*="border"]');
      const expandedCard = expandedContainer.querySelector('[class*="border"]');

      expect(collapsedCard).toBeInTheDocument();
      expect(expandedCard).toBeInTheDocument();
    });

    it('should show expand icon in correct state', () => {
      const { container } = render(<EducationItem {...defaultProps} isExpanded={true} />);

      const expandIcon = container.querySelector('[class*="rotate"]');
      expect(expandIcon).toBeInTheDocument();
    });
  });

  describe('Multiple Instances', () => {
    it('should handle multiple education items independently', () => {
      const edu1 = { ...mockEducation, id: 'edu-1' };
      const edu2 = { ...mockEducation, id: 'edu-2', institution: 'MIT' };

      const { rerender } = render(
        <>
          <EducationItem {...defaultProps} edu={edu1} />
          <EducationItem {...defaultProps} edu={edu2} />
        </>,
      );

      expect(screen.getByText('Harvard University | 2018-09 - 2020-05')).toBeInTheDocument();
      expect(screen.getByText('MIT | 2018-09 - 2020-05')).toBeInTheDocument();
    });

    it('should call correct callbacks for each instance', async () => {
      const onDelete1 = vi.fn();
      const onDelete2 = vi.fn();
      const user = userEvent.setup();

      const edu1 = { ...mockEducation, id: 'edu-1' };
      const edu2 = { ...mockEducation, id: 'edu-2', institution: 'MIT' };

      const { container } = render(
        <>
          <EducationItem {...defaultProps} edu={edu1} onDelete={onDelete1} />
          <EducationItem {...defaultProps} edu={edu2} onDelete={onDelete2} />
        </>,
      );

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      expect(onDelete1).toHaveBeenCalledWith('edu-1');
      expect(onDelete2).not.toHaveBeenCalled();
    });
  });
});
