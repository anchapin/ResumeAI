import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import ProjectItem from './ProjectItem';
import { ProjectEntry } from '../../types';

describe('ProjectItem', () => {
    const mockProject: ProjectEntry = {
        id: 'proj-1',
        name: 'Test Project',
        description: 'A cool project',
        url: 'https://example.com',
        startDate: '2020',
        endDate: '2021',
        roles: ['Developer', 'Designer'],
        highlights: ['Built a thing', 'Fixed a bug']
    };

    const defaultProps = {
        project: mockProject,
        isExpanded: false,
        onToggleExpand: vi.fn(),
        onDelete: vi.fn(),
        onUpdate: vi.fn()
    };

    it('renders collapsed state correctly', () => {
        render(<ProjectItem {...defaultProps} />);

        expect(screen.getByText('Test Project')).toBeInTheDocument();
        expect(screen.getByText('2020 - 2021')).toBeInTheDocument();
        // Should not show form fields
        expect(screen.queryByLabelText('Project Name')).not.toBeInTheDocument();
    });

    it('renders expanded state with form fields', () => {
        render(<ProjectItem {...defaultProps} isExpanded={true} />);

        expect(screen.getByLabelText('Project Name')).toHaveValue('Test Project');
        expect(screen.getByLabelText('Description')).toHaveValue('A cool project');
        expect(screen.getByLabelText('Project URL')).toHaveValue('https://example.com');
        expect(screen.getByLabelText('Start Date')).toHaveValue('2020');
        expect(screen.getByLabelText('End Date')).toHaveValue('2021');
    });

    it('calls onToggleExpand when header is clicked', async () => {
        const onToggleExpand = vi.fn();
        const user = userEvent.setup();
        render(<ProjectItem {...defaultProps} onToggleExpand={onToggleExpand} />);

        const toggleButton = screen.getByRole('button', { name: /expand/i });
        await user.click(toggleButton);

        expect(onToggleExpand).toHaveBeenCalledWith('proj-1');
    });

    it('calls onDelete when delete button is clicked and confirmed', async () => {
        const onDelete = vi.fn();
        const user = userEvent.setup();
        render(<ProjectItem {...defaultProps} onDelete={onDelete} />);

        // Click delete button (initiates confirmation)
        const deleteButton = screen.getByRole('button', { name: /delete/i });
        await user.click(deleteButton);

        // Check for confirmation buttons
        const confirmButton = screen.getByRole('button', { name: /confirm delete/i });
        const cancelButton = screen.getByRole('button', { name: /cancel delete/i });
        expect(confirmButton).toBeInTheDocument();
        expect(cancelButton).toBeInTheDocument();

        // onDelete should NOT have been called yet
        expect(onDelete).not.toHaveBeenCalled();

        // Click confirm
        await user.click(confirmButton);

        // Now onDelete should be called
        expect(onDelete).toHaveBeenCalledWith('proj-1');
    });

    it('does not call onDelete when delete is cancelled', async () => {
        const onDelete = vi.fn();
        const user = userEvent.setup();
        render(<ProjectItem {...defaultProps} onDelete={onDelete} />);

        // Click delete button
        const deleteButton = screen.getByRole('button', { name: /delete/i });
        await user.click(deleteButton);

        // Click cancel
        const cancelButton = screen.getByRole('button', { name: /cancel delete/i });
        await user.click(cancelButton);

        // onDelete should NOT have been called
        expect(onDelete).not.toHaveBeenCalled();

        // Confirmation buttons should be gone, delete button back
        expect(screen.queryByRole('button', { name: /confirm delete/i })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('calls onUpdate when input changes', async () => {
        const onUpdate = vi.fn();
        const user = userEvent.setup();
        render(<ProjectItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

        const nameInput = screen.getByLabelText('Project Name');
        await user.type(nameInput, ' Updated');

        expect(onUpdate).toHaveBeenCalled();
        expect(onUpdate).toHaveBeenCalledWith('proj-1', 'name', expect.stringContaining('Test Project'));
    });

    it('has accessible attributes', () => {
        render(<ProjectItem {...defaultProps} />);

        // Check for aria-expanded on the main toggle button
        const toggleButton = screen.getByRole('button', { name: /expand/i });
        expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

        // Check for accessible label on edit button
        expect(screen.getByLabelText('Edit project Test Project')).toBeInTheDocument();

        // Check for accessible label on delete button
        expect(screen.getByLabelText('Delete project Test Project')).toBeInTheDocument();
    });
});
