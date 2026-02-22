import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
        courses: ['CS101', 'Algorithms']
    };

    const defaultProps = {
        edu: mockEdu,
        isExpanded: false,
        onToggleExpand: vi.fn(),
        onDelete: vi.fn(),
        onUpdate: vi.fn()
    };

    it('renders collapsed state correctly', () => {
        render(<EducationItem {...defaultProps} />);

        expect(screen.getByText('Test University')).toBeInTheDocument();
        expect(screen.getByText('Bachelor in Computer Science | 2015 - 2019')).toBeInTheDocument();
        // Should not show form fields
        expect(screen.queryByLabelText('Institution')).not.toBeInTheDocument();
    });

    it('renders expanded state with form fields', () => {
        render(<EducationItem {...defaultProps} isExpanded={true} />);

        expect(screen.getByLabelText('Institution')).toHaveValue('Test University');
        expect(screen.getByLabelText('Degree Type')).toHaveValue('Bachelor');
        expect(screen.getByLabelText('Field of Study')).toHaveValue('Computer Science');
        expect(screen.getByLabelText('Start Date')).toHaveValue('2015');
        expect(screen.getByLabelText('End Date')).toHaveValue('2019');
    });

    it('calls onToggleExpand when header is clicked', async () => {
        const onToggleExpand = vi.fn();
        const user = userEvent.setup();
        render(<EducationItem {...defaultProps} onToggleExpand={onToggleExpand} />);

        // Find the toggle button - anticipating semantic button implementation
        const toggleButton = screen.getByRole('button', { name: /expand/i });
        await user.click(toggleButton);

        expect(onToggleExpand).toHaveBeenCalledWith('edu-1');
    });

    it('calls onDelete when delete button is clicked', async () => {
        const onDelete = vi.fn();
        const user = userEvent.setup();
        render(<EducationItem {...defaultProps} onDelete={onDelete} />);

        const deleteButton = screen.getByRole('button', { name: /delete/i });
        await user.click(deleteButton);

        expect(onDelete).toHaveBeenCalledWith('edu-1');
    });

    it('calls onUpdate when input changes', async () => {
        const onUpdate = vi.fn();
        const user = userEvent.setup();
        render(<EducationItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

        const institutionInput = screen.getByLabelText('Institution');
        await user.type(institutionInput, ' New');

        // Check if onUpdate was called. Note: userEvent.type calls onChange for each character
        expect(onUpdate).toHaveBeenCalled();
        expect(onUpdate).toHaveBeenCalledWith('edu-1', 'institution', expect.stringContaining('Test University'));
    });

    it('has accessible attributes', () => {
        render(<EducationItem {...defaultProps} />);

        // Check for aria-expanded on the main toggle button
        const toggleButton = screen.getByRole('button', { name: /expand/i });
        expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

        // Check for accessible label on edit button
        expect(screen.getByLabelText('Edit education')).toBeInTheDocument();

        // Check for accessible label on delete button
        expect(screen.getByLabelText('Delete education')).toBeInTheDocument();
    });
});
