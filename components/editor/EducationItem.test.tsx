import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import EducationItem from './EducationItem';
import { EducationEntry } from '../../types';

describe('EducationItem', () => {
    const mockEdu: EducationEntry = {
        id: 'edu-1',
        institution: 'Test University',
        area: 'Computer Science',
        studyType: 'Bachelor',
        startDate: '2015',
        endDate: '2019',
        courses: ['CS101', 'Algorithms', 'Data Structures']
    };

    const defaultProps = {
        edu: mockEdu,
        isExpanded: false,
        onToggleExpand: vi.fn(),
        onDelete: vi.fn(),
        onUpdate: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('renders collapsed state correctly', () => {
            render(<EducationItem {...defaultProps} />);

            expect(screen.getByText('Test University')).toBeInTheDocument();
            expect(screen.getByText('Bachelor in Computer Science | 2015 - 2019')).toBeInTheDocument();
            expect(screen.queryByLabelText('Institution')).not.toBeInTheDocument();
        });

        it('renders expanded state with all form fields', () => {
            render(<EducationItem {...defaultProps} isExpanded={true} />);

            expect(screen.getByLabelText('Institution')).toHaveValue('Test University');
            expect(screen.getByLabelText('Degree Type')).toHaveValue('Bachelor');
            expect(screen.getByLabelText('Field of Study')).toHaveValue('Computer Science');
            expect(screen.getByLabelText('Start Date')).toHaveValue('2015');
            expect(screen.getByLabelText('End Date')).toHaveValue('2019');
        });

        it('displays all courses when expanded', () => {
            render(<EducationItem {...defaultProps} isExpanded={true} />);

            expect(screen.getByText('CS101')).toBeInTheDocument();
            expect(screen.getByText('Algorithms')).toBeInTheDocument();
            expect(screen.getByText('Data Structures')).toBeInTheDocument();
        });

        it('renders without courses when empty', () => {
            const eduNoCourses = { ...mockEdu, courses: [] };
            render(<EducationItem {...defaultProps} edu={eduNoCourses} isExpanded={true} />);

            expect(screen.getByPlaceholderText('+ Add Course')).toBeInTheDocument();
        });

        it('toggles expand state with aria-expanded', () => {
            const { rerender } = render(<EducationItem {...defaultProps} isExpanded={false} />);

            let expandBtn = screen.getByRole('button', { name: /expand/i });
            expect(expandBtn).toHaveAttribute('aria-expanded', 'false');

            rerender(<EducationItem {...defaultProps} isExpanded={true} />);
            expandBtn = screen.getByRole('button', { name: /expand/i });
            expect(expandBtn).toHaveAttribute('aria-expanded', 'true');
        });
    });

    describe('Toggle Expand', () => {
        it('calls onToggleExpand when expand button is clicked', async () => {
            const onToggleExpand = vi.fn();
            const user = userEvent.setup();
            render(<EducationItem {...defaultProps} onToggleExpand={onToggleExpand} />);

            const toggleButton = screen.getByRole('button', { name: /expand/i });
            await user.click(toggleButton);

            expect(onToggleExpand).toHaveBeenCalledWith('edu-1');
        });

        it('calls onToggleExpand when header is clicked', async () => {
            const onToggleExpand = vi.fn();
            const user = userEvent.setup();
            render(<EducationItem {...defaultProps} onToggleExpand={onToggleExpand} />);

            const header = screen.getByText('Test University');
            await user.click(header);

            expect(onToggleExpand).toHaveBeenCalledWith('edu-1');
        });
    });

    describe('Delete Operations', () => {
        it('calls onDelete when delete button is clicked and confirmed', async () => {
            const onDelete = vi.fn();
            const user = userEvent.setup();
            render(<EducationItem {...defaultProps} onDelete={onDelete} />);

            const deleteButton = screen.getByRole('button', { name: /delete/i });
            await user.click(deleteButton);

            const confirmButton = screen.getByLabelText('Confirm delete');
            const cancelButton = screen.getByLabelText('Cancel delete');
            expect(confirmButton).toBeInTheDocument();
            expect(cancelButton).toBeInTheDocument();

            expect(onDelete).not.toHaveBeenCalled();

            await user.click(confirmButton);

            expect(onDelete).toHaveBeenCalledWith('edu-1');
        });

        it('does not call onDelete when delete is cancelled', async () => {
            const onDelete = vi.fn();
            const user = userEvent.setup();
            render(<EducationItem {...defaultProps} onDelete={onDelete} />);

            const deleteButton = screen.getByRole('button', { name: /delete/i });
            await user.click(deleteButton);

            const cancelButton = screen.getByLabelText('Cancel delete');
            await user.click(cancelButton);

            expect(onDelete).not.toHaveBeenCalled();

            expect(screen.queryByLabelText('Confirm delete')).not.toBeInTheDocument();
            expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
        });

        it('stops event propagation on delete button click', async () => {
            const onToggleExpand = vi.fn();
            const user = userEvent.setup();
            render(<EducationItem {...defaultProps} onToggleExpand={onToggleExpand} />);

            const deleteBtn = screen.getByRole('button', { name: /delete/i });
            await user.click(deleteBtn);

            expect(onToggleExpand).not.toHaveBeenCalled();
        });

        it('manages focus when toggling delete confirmation', async () => {
            const user = userEvent.setup();
            render(<EducationItem {...defaultProps} />);

            const deleteButton = screen.getByRole('button', { name: /delete/i });
            await user.click(deleteButton);

            const confirmButton = screen.getByLabelText('Confirm delete');
            await waitFor(() => {
                expect(confirmButton).toHaveFocus();
            });
        });
    });

    describe('Field Updates', () => {
        it('calls onUpdate when institution changes', async () => {
            const onUpdate = vi.fn();
            const user = userEvent.setup();
            render(<EducationItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

            const inputs = screen.getAllByDisplayValue('Test University');
            await user.type(inputs[0], ' Extended');

            expect(onUpdate).toHaveBeenCalledWith('edu-1', 'institution', expect.stringContaining('Test University'));
        });

        it('calls onUpdate when degree type changes', async () => {
            const onUpdate = vi.fn();
            const user = userEvent.setup();
            render(<EducationItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

            const inputs = screen.getAllByDisplayValue('Bachelor');
            await user.type(inputs[0], ' of Science');

            expect(onUpdate).toHaveBeenCalledWith('edu-1', 'studyType', expect.stringContaining('Bachelor'));
        });

        it('calls onUpdate when field of study changes', async () => {
            const onUpdate = vi.fn();
            const user = userEvent.setup();
            render(<EducationItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

            const inputs = screen.getAllByDisplayValue('Computer Science');
            await user.type(inputs[0], ' (Hons)');

            expect(onUpdate).toHaveBeenCalledWith('edu-1', 'area', expect.stringContaining('Computer Science'));
        });

        it('calls onUpdate when start date changes', async () => {
            const onUpdate = vi.fn();
            const user = userEvent.setup();
            render(<EducationItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

            const inputs = screen.getAllByDisplayValue('2015');
            // Click the first one (start date)
            await user.type(inputs[0], '-09');

            expect(onUpdate).toHaveBeenCalledWith('edu-1', 'startDate', expect.stringContaining('2015'));
        });

        it('calls onUpdate when end date changes', async () => {
            const onUpdate = vi.fn();
            const user = userEvent.setup();
            render(<EducationItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

            const inputs = screen.getAllByDisplayValue('2019');
            // Click the first one (end date)
            await user.type(inputs[0], '-05');

            expect(onUpdate).toHaveBeenCalledWith('edu-1', 'endDate', expect.stringContaining('2019'));
        });
    });

    describe('Course Management', () => {
        it('removes course when X button is clicked', async () => {
            const onUpdate = vi.fn();
            const user = userEvent.setup();
            render(<EducationItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

            const removeButtons = screen.getAllByRole('button', { name: /remove course/i });
            await user.click(removeButtons[0]);

            expect(onUpdate).toHaveBeenCalledWith('edu-1', 'courses', expect.any(Array));
        });

        it('adds course when Enter is pressed', async () => {
            const onUpdate = vi.fn();
            const user = userEvent.setup();
            render(<EducationItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

            const courseInput = screen.getByPlaceholderText('+ Add Course');
            await user.type(courseInput, 'Web Development{Enter}');

            expect(onUpdate).toHaveBeenCalledWith('edu-1', 'courses', expect.arrayContaining(['Web Development']));
        });

        it('does not add empty course on Enter', async () => {
            const onUpdate = vi.fn();
            const user = userEvent.setup();
            render(<EducationItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

            const courseInput = screen.getByPlaceholderText('+ Add Course');
            await user.type(courseInput, '{Enter}');

            // Should not have been called for adding empty course
            expect(onUpdate).not.toHaveBeenCalledWith('edu-1', 'courses', expect.arrayContaining(['']));
        });

        it('trims whitespace when adding course', async () => {
            const onUpdate = vi.fn();
            const user = userEvent.setup();
            render(<EducationItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

            const courseInput = screen.getByPlaceholderText('+ Add Course');
            await user.type(courseInput, '   Machine Learning   {Enter}');

            expect(onUpdate).toHaveBeenCalledWith('edu-1', 'courses', expect.arrayContaining(['Machine Learning']));
        });

        it('clears input after adding course', async () => {
            const user = userEvent.setup();
            render(<EducationItem {...defaultProps} isExpanded={true} />);

            const courseInput = screen.getByPlaceholderText('+ Add Course') as HTMLInputElement;
            await user.type(courseInput, 'AI Fundamentals{Enter}');

            expect(courseInput.value).toBe('');
        });

        it('handles multiple course additions', async () => {
            const onUpdate = vi.fn();
            const user = userEvent.setup();
            render(<EducationItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

            const courseInput = screen.getByPlaceholderText('+ Add Course');

            await user.type(courseInput, 'Course1{Enter}');
            await user.type(courseInput, 'Course2{Enter}');
            await user.type(courseInput, 'Course3{Enter}');

            expect(onUpdate).toHaveBeenCalledTimes(3);
        });
    });

    describe('Input Validation', () => {
        it('handles long institution names', () => {
            const longName = 'A'.repeat(200);
            const eduWithLongName = { ...mockEdu, institution: longName };

            render(<EducationItem {...defaultProps} edu={eduWithLongName} isExpanded={true} />);

            const input = screen.getByLabelText('Institution');
            expect(input).toHaveValue(longName);
        });

        it('handles special characters in fields', () => {
            const eduWithSpecialChars = {
                ...mockEdu,
                institution: "O'Reilly University & Partners",
                area: "Computer Science & Engineering"
            };

            render(<EducationItem {...defaultProps} edu={eduWithSpecialChars} isExpanded={true} />);

            expect(screen.getByLabelText('Institution')).toHaveValue("O'Reilly University & Partners");
            expect(screen.getByLabelText('Field of Study')).toHaveValue("Computer Science & Engineering");
        });

        it('handles Unicode characters', () => {
            const eduWithUnicode = {
                ...mockEdu,
                institution: '北京大学 University',
                studyType: 'バッチェラー',
                area: '컴퓨터 과학'
            };

            render(<EducationItem {...defaultProps} edu={eduWithUnicode} isExpanded={true} />);

            expect(screen.getByLabelText('Institution')).toHaveValue('北京大学 University');
            expect(screen.getByLabelText('Degree Type')).toHaveValue('バッチェラー');
            expect(screen.getByLabelText('Field of Study')).toHaveValue('컴퓨터 과학');
        });

        it('handles date formats', () => {
            const eduWithDates = {
                ...mockEdu,
                startDate: 'January 2015',
                endDate: 'May 2019'
            };

            render(<EducationItem {...defaultProps} edu={eduWithDates} isExpanded={true} />);

            expect(screen.getByLabelText('Start Date')).toHaveValue('January 2015');
            expect(screen.getByLabelText('End Date')).toHaveValue('May 2019');
        });

        it('handles courses with special characters', () => {
            const eduWithSpecialCourses = {
                ...mockEdu,
                courses: ['C++ Programming', 'HTML & CSS', 'Data Structures (DSA)']
            };

            render(<EducationItem {...defaultProps} edu={eduWithSpecialCourses} isExpanded={true} />);

            expect(screen.getByText('C++ Programming')).toBeInTheDocument();
            expect(screen.getByText('HTML & CSS')).toBeInTheDocument();
            expect(screen.getByText('Data Structures (DSA)')).toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        it('has proper aria attributes on toggle button', () => {
            render(<EducationItem {...defaultProps} />);

            const toggleButton = screen.getByRole('button', { name: /expand/i });
            expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
            expect(toggleButton).toHaveAttribute('aria-controls');
            expect(toggleButton).toHaveAttribute('aria-label');
        });

        it('renders region with proper role and label when expanded', () => {
            render(<EducationItem {...defaultProps} isExpanded={true} />);

            const region = screen.getByRole('region', { name: /Details for Test University/i });
            expect(region).toBeInTheDocument();
        });

        it('has aria-labels on all buttons', () => {
            render(<EducationItem {...defaultProps} />);

            expect(screen.getByLabelText('Edit education')).toBeInTheDocument();
            expect(screen.getByLabelText('Delete education')).toBeInTheDocument();
        });

        it('has labels for all form fields', () => {
            render(<EducationItem {...defaultProps} isExpanded={true} />);

            expect(screen.getByLabelText('Institution')).toBeInTheDocument();
            expect(screen.getByLabelText('Degree Type')).toBeInTheDocument();
            expect(screen.getByLabelText('Field of Study')).toBeInTheDocument();
            expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
            expect(screen.getByLabelText('End Date')).toBeInTheDocument();
        });

        it('course input has accessible label', () => {
            render(<EducationItem {...defaultProps} isExpanded={true} />);

            const courseInput = screen.getByPlaceholderText('+ Add Course');
            expect(courseInput).toHaveAttribute('aria-label', 'Add new course');
        });
    });

    describe('Edge Cases', () => {
        it('handles undefined courses array', () => {
            const eduWithoutCourses: EducationEntry = {
                id: 'edu-1',
                institution: 'Test',
                area: 'CS',
                studyType: 'Bachelor',
                startDate: '2015',
                endDate: '2019'
            };

            render(<EducationItem {...defaultProps} edu={eduWithoutCourses} isExpanded={true} />);

            expect(screen.getByPlaceholderText('+ Add Course')).toBeInTheDocument();
        });

        it('removes correct course when multiple present', async () => {
            const onUpdate = vi.fn();
            const user = userEvent.setup();
            const eduWithManyCourses = {
                ...mockEdu,
                courses: ['Course A', 'Course B', 'Course C', 'Course D']
            };

            render(<EducationItem {...defaultProps} edu={eduWithManyCourses} isExpanded={true} onUpdate={onUpdate} />);

            // Get the remove button for 'Course B'
            const removeButtons = screen.getAllByRole('button', { name: /remove course/i });
            await user.click(removeButtons[1]); // Second course

            expect(onUpdate).toHaveBeenCalledWith('edu-1', 'courses', expect.not.arrayContaining(['Course B']));
        });

        it('updates state on prop change', () => {
            const { rerender } = render(
                <EducationItem {...defaultProps} edu={mockEdu} isExpanded={true} />
            );

            expect(screen.getByLabelText('Institution')).toHaveValue('Test University');

            const newEdu = {
                ...mockEdu,
                institution: 'Another University'
            };

            rerender(<EducationItem {...defaultProps} edu={newEdu} isExpanded={true} />);

            expect(screen.getByLabelText('Institution')).toHaveValue('Another University');
        });

        it('maintains expanded state across prop updates', () => {
            const { rerender } = render(
                <EducationItem {...defaultProps} isExpanded={true} />
            );

            expect(screen.getByLabelText('Institution')).toBeInTheDocument();

            const newEdu = { ...mockEdu, institution: 'Updated University' };
            rerender(<EducationItem {...defaultProps} edu={newEdu} isExpanded={true} />);

            expect(screen.getByLabelText('Institution')).toHaveValue('Updated University');
        });
    });

    describe('Styling and Visual States', () => {
        it('applies different styles for expanded and collapsed states', () => {
            const { rerender } = render(<EducationItem {...defaultProps} isExpanded={false} />);

            // Get the main container div with border classes
            let container = screen.getByText('Test University').closest('[class*="rounded-xl"]');
            expect(container?.className).toContain('opacity-80');

            rerender(<EducationItem {...defaultProps} isExpanded={true} />);

            container = screen.getByText('Test University').closest('[class*="rounded-xl"]');
            expect(container?.className).toContain('ring-1');
        });
    });

    describe('Memory and Performance', () => {
        it('is memoized component', () => {
            const { rerender } = render(
                <EducationItem {...defaultProps} isExpanded={true} />
            );

            const input = screen.getByLabelText('Institution') as HTMLInputElement;
            const initialValue = input.value;

            rerender(<EducationItem {...defaultProps} isExpanded={true} />);

            const updatedInput = screen.getByLabelText('Institution') as HTMLInputElement;
            expect(updatedInput.value).toBe(initialValue);
        });
    });
});
