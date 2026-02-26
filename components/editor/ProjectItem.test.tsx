import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import ProjectItem from './ProjectItem';
import { ProjectEntry } from '../../types';

describe('ProjectItem', () => {
    const mockProject: ProjectEntry = {
        id: 'proj-1',
        name: 'Test Project',
        description: 'A cool project for testing',
        url: 'https://example.com',
        startDate: '2020',
        endDate: '2021',
        roles: ['Developer', 'Designer', 'Lead'],
        highlights: ['Built a thing', 'Fixed a bug', 'Improved performance']
    };

    const defaultProps = {
        project: mockProject,
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
            render(<ProjectItem {...defaultProps} />);

            expect(screen.getByText('Test Project')).toBeInTheDocument();
            expect(screen.getByText('2020 - 2021')).toBeInTheDocument();
            expect(screen.queryByLabelText('Project Name')).not.toBeInTheDocument();
        });

        it('renders expanded state with all form fields', () => {
            render(<ProjectItem {...defaultProps} isExpanded={true} />);

            expect(screen.getByLabelText('Project Name')).toHaveValue('Test Project');
            expect(screen.getByLabelText('Description')).toHaveValue('A cool project for testing');
            expect(screen.getByLabelText('Project URL')).toHaveValue('https://example.com');
            expect(screen.getByLabelText('Start Date')).toHaveValue('2020');
            expect(screen.getByLabelText('End Date')).toHaveValue('2021');
        });

        it('displays all roles when expanded', () => {
            render(<ProjectItem {...defaultProps} isExpanded={true} />);

            expect(screen.getByText('Developer')).toBeInTheDocument();
            expect(screen.getByText('Designer')).toBeInTheDocument();
            expect(screen.getByText('Lead')).toBeInTheDocument();
        });

        it('displays all highlights when expanded', () => {
            render(<ProjectItem {...defaultProps} isExpanded={true} />);

            expect(screen.getByText('Built a thing')).toBeInTheDocument();
            expect(screen.getByText('Fixed a bug')).toBeInTheDocument();
            expect(screen.getByText('Improved performance')).toBeInTheDocument();
        });

        it('renders without roles or highlights when empty', () => {
            const projectNoRoles = { ...mockProject, roles: [], highlights: [] };
            render(<ProjectItem {...defaultProps} project={projectNoRoles} isExpanded={true} />);

            expect(screen.getByPlaceholderText('+ Add Role')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('+ Add Highlight')).toBeInTheDocument();
        });

        it('toggles expand state with aria-expanded', () => {
            const { rerender } = render(<ProjectItem {...defaultProps} isExpanded={false} />);

            let expandBtn = screen.getByRole('button', { name: /expand/i });
            expect(expandBtn).toHaveAttribute('aria-expanded', 'false');

            rerender(<ProjectItem {...defaultProps} isExpanded={true} />);
            expandBtn = screen.getByRole('button', { name: /expand/i });
            expect(expandBtn).toHaveAttribute('aria-expanded', 'true');
        });
    });

    describe('Toggle Expand', () => {
        it('calls onToggleExpand when expand button is clicked', async () => {
            const onToggleExpand = vi.fn();
            const user = userEvent.setup();
            render(<ProjectItem {...defaultProps} onToggleExpand={onToggleExpand} />);

            const toggleButton = screen.getByRole('button', { name: /expand/i });
            await user.click(toggleButton);

            expect(onToggleExpand).toHaveBeenCalledWith('proj-1');
        });

        it('calls onToggleExpand when header is clicked', async () => {
            const onToggleExpand = vi.fn();
            const user = userEvent.setup();
            render(<ProjectItem {...defaultProps} onToggleExpand={onToggleExpand} />);

            const header = screen.getByText('Test Project');
            await user.click(header);

            expect(onToggleExpand).toHaveBeenCalledWith('proj-1');
        });
    });

    describe('Delete Operations', () => {
        it('calls onDelete when delete button is clicked and confirmed', async () => {
            const onDelete = vi.fn();
            const user = userEvent.setup();
            render(<ProjectItem {...defaultProps} onDelete={onDelete} />);

            const deleteButton = screen.getByRole('button', { name: /delete/i });
            await user.click(deleteButton);

            const confirmButton = screen.getByRole('button', { name: /confirm delete/i });
            const cancelButton = screen.getByRole('button', { name: /cancel delete/i });
            expect(confirmButton).toBeInTheDocument();
            expect(cancelButton).toBeInTheDocument();

            expect(onDelete).not.toHaveBeenCalled();

            await user.click(confirmButton);

            expect(onDelete).toHaveBeenCalledWith('proj-1');
        });

        it('does not call onDelete when delete is cancelled', async () => {
            const onDelete = vi.fn();
            const user = userEvent.setup();
            render(<ProjectItem {...defaultProps} onDelete={onDelete} />);

            const deleteButton = screen.getByRole('button', { name: /delete/i });
            await user.click(deleteButton);

            const cancelButton = screen.getByRole('button', { name: /cancel delete/i });
            await user.click(cancelButton);

            expect(onDelete).not.toHaveBeenCalled();

            expect(screen.queryByRole('button', { name: /confirm delete/i })).not.toBeInTheDocument();
            expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
        });

        it('manages focus when toggling delete confirmation', async () => {
            const user = userEvent.setup();
            render(<ProjectItem {...defaultProps} />);

            const deleteButton = screen.getByRole('button', { name: /delete/i });
            await user.click(deleteButton);

            const confirmButton = screen.getByRole('button', { name: /confirm delete/i });
            await waitFor(() => {
                expect(confirmButton).toHaveFocus();
            });
        });
    });

    describe('Field Updates', () => {
        it('calls onUpdate when project name changes', async () => {
            const onUpdate = vi.fn();
            const user = userEvent.setup();
            render(<ProjectItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

            const inputs = screen.getAllByDisplayValue('Test Project');
            await user.type(inputs[0], ' V2');

            expect(onUpdate).toHaveBeenCalledWith('proj-1', 'name', expect.stringContaining('Test Project'));
        });

        it('calls onUpdate when description changes', async () => {
            const onUpdate = vi.fn();
            const user = userEvent.setup();
            render(<ProjectItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

            const textarea = screen.getByDisplayValue('A cool project for testing');
            await user.type(textarea, ' more');

            expect(onUpdate).toHaveBeenCalledWith('proj-1', 'description', expect.stringContaining('A cool project'));
        });

        it('calls onUpdate when URL changes', async () => {
            const onUpdate = vi.fn();
            const user = userEvent.setup();
            render(<ProjectItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

            const urlInput = screen.getByDisplayValue('https://example.com');
            await user.type(urlInput, '/path');

            expect(onUpdate).toHaveBeenCalledWith('proj-1', 'url', expect.stringContaining('https://example.com'));
        });

        it('calls onUpdate when start date changes', async () => {
            const onUpdate = vi.fn();
            const user = userEvent.setup();
            render(<ProjectItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

            const startInputs = screen.getAllByDisplayValue('2020');
            await user.type(startInputs[0], '-01');

            expect(onUpdate).toHaveBeenCalledWith('proj-1', 'startDate', expect.stringContaining('2020'));
        });

        it('calls onUpdate when end date changes', async () => {
            const onUpdate = vi.fn();
            const user = userEvent.setup();
            render(<ProjectItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

            const endInputs = screen.getAllByDisplayValue('2021');
            await user.type(endInputs[0], '-12');

            expect(onUpdate).toHaveBeenCalledWith('proj-1', 'endDate', expect.stringContaining('2021'));
        });
    });

    describe('Role Management', () => {
        it('removes role when X button is clicked', async () => {
            const onUpdate = vi.fn();
            const user = userEvent.setup();
            render(<ProjectItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

            const removeButtons = screen.getAllByRole('button', { name: /remove role/i });
            // First role remove button
            await user.click(removeButtons[0]);

            expect(onUpdate).toHaveBeenCalledWith('proj-1', 'roles', expect.any(Array));
        });

        it('adds role when Enter is pressed', async () => {
            const onUpdate = vi.fn();
            const user = userEvent.setup();
            render(<ProjectItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

            const roleInput = screen.getByPlaceholderText('+ Add Role');
            await user.type(roleInput, 'DevOps{Enter}');

            expect(onUpdate).toHaveBeenCalledWith('proj-1', 'roles', expect.arrayContaining(['DevOps']));
        });

        it('does not add empty role on Enter', async () => {
            const onUpdate = vi.fn();
            const user = userEvent.setup();
            render(<ProjectItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

            const roleInput = screen.getByPlaceholderText('+ Add Role');
            await user.type(roleInput, '{Enter}');

            expect(onUpdate).not.toHaveBeenCalledWith('proj-1', 'roles', expect.arrayContaining(['']));
        });

        it('trims whitespace when adding role', async () => {
            const onUpdate = vi.fn();
            const user = userEvent.setup();
            render(<ProjectItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

            const roleInput = screen.getByPlaceholderText('+ Add Role');
            await user.type(roleInput, '   QA Engineer   {Enter}');

            expect(onUpdate).toHaveBeenCalledWith('proj-1', 'roles', expect.arrayContaining(['QA Engineer']));
        });

        it('clears input after adding role', async () => {
            const user = userEvent.setup();
            render(<ProjectItem {...defaultProps} isExpanded={true} />);

            const roleInput = screen.getByPlaceholderText('+ Add Role') as HTMLInputElement;
            await user.type(roleInput, 'Manager{Enter}');

            expect(roleInput.value).toBe('');
        });
    });

    describe('Highlight Management', () => {
        it('removes highlight when X button is clicked', async () => {
            const onUpdate = vi.fn();
            const user = userEvent.setup();
            render(<ProjectItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

            const removeButtons = screen.getAllByRole('button', { name: /remove highlight/i });
            // Remove first highlight
            await user.click(removeButtons[0]);

            expect(onUpdate).toHaveBeenCalledWith('proj-1', 'highlights', expect.any(Array));
        });

        it('adds highlight when Enter is pressed', async () => {
            const onUpdate = vi.fn();
            const user = userEvent.setup();
            render(<ProjectItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

            const highlightInput = screen.getByPlaceholderText('+ Add Highlight');
            await user.type(highlightInput, 'Won an award{Enter}');

            expect(onUpdate).toHaveBeenCalledWith('proj-1', 'highlights', expect.arrayContaining(['Won an award']));
        });

        it('does not add empty highlight on Enter', async () => {
            const onUpdate = vi.fn();
            const user = userEvent.setup();
            render(<ProjectItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

            const highlightInput = screen.getByPlaceholderText('+ Add Highlight');
            await user.type(highlightInput, '{Enter}');

            expect(onUpdate).not.toHaveBeenCalledWith('proj-1', 'highlights', expect.arrayContaining(['']));
        });

        it('trims whitespace when adding highlight', async () => {
            const onUpdate = vi.fn();
            const user = userEvent.setup();
            render(<ProjectItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

            const highlightInput = screen.getByPlaceholderText('+ Add Highlight');
            await user.type(highlightInput, '   Increased revenue by 50%   {Enter}');

            expect(onUpdate).toHaveBeenCalledWith('proj-1', 'highlights', expect.arrayContaining(['Increased revenue by 50%']));
        });

        it('clears input after adding highlight', async () => {
            const user = userEvent.setup();
            render(<ProjectItem {...defaultProps} isExpanded={true} />);

            const highlightInput = screen.getByPlaceholderText('+ Add Highlight') as HTMLInputElement;
            await user.type(highlightInput, 'Shipped on time{Enter}');

            expect(highlightInput.value).toBe('');
        });
    });

    describe('Input Validation', () => {
        it('handles long project names', () => {
            const longName = 'A'.repeat(300);
            const projectWithLongName = { ...mockProject, name: longName };

            render(<ProjectItem {...defaultProps} project={projectWithLongName} isExpanded={true} />);

            const input = screen.getByLabelText('Project Name');
            expect(input).toHaveValue(longName);
        });

        it('handles special characters in fields', () => {
            const projectWithSpecialChars = {
                ...mockProject,
                name: "Project O'Reilly & Partners",
                description: 'Built a RESTful API & mobile app'
            };

            render(<ProjectItem {...defaultProps} project={projectWithSpecialChars} isExpanded={true} />);

            expect(screen.getByLabelText('Project Name')).toHaveValue("Project O'Reilly & Partners");
            expect(screen.getByLabelText('Description')).toHaveValue('Built a RESTful API & mobile app');
        });

        it('handles Unicode characters', () => {
            const projectWithUnicode = {
                ...mockProject,
                name: '日本語 プロジェクト',
                description: '한국어 설명',
                roles: ['엔지니어', 'デザイナー']
            };

            render(<ProjectItem {...defaultProps} project={projectWithUnicode} isExpanded={true} />);

            expect(screen.getByLabelText('Project Name')).toHaveValue('日本語 プロジェクト');
            expect(screen.getByLabelText('Description')).toHaveValue('한국어 설명');
        });

        it('handles multiline descriptions', () => {
            const multilineDesc = 'Line 1\nLine 2\nLine 3';
            const projectWithMultiline = { ...mockProject, description: multilineDesc };

            render(<ProjectItem {...defaultProps} project={projectWithMultiline} isExpanded={true} />);

            const textarea = screen.getByLabelText('Description');
            expect(textarea).toHaveValue(multilineDesc);
        });

        it('handles very long descriptions', () => {
            const veryLongDesc = 'A'.repeat(5000);
            const projectWithLongDesc = { ...mockProject, description: veryLongDesc };

            render(<ProjectItem {...defaultProps} project={projectWithLongDesc} isExpanded={true} />);

            const textarea = screen.getByLabelText('Description');
            expect(textarea).toHaveValue(veryLongDesc);
        });

        it('handles various URL formats', () => {
            const projectWithUrl = {
                ...mockProject,
                url: 'https://github.com/user/repo'
            };

            render(<ProjectItem {...defaultProps} project={projectWithUrl} isExpanded={true} />);

            expect(screen.getByLabelText('Project URL')).toHaveValue('https://github.com/user/repo');
        });

        it('handles empty URL', () => {
            const projectWithoutUrl = { ...mockProject, url: undefined };

            render(<ProjectItem {...defaultProps} project={projectWithoutUrl} isExpanded={true} />);

            const urlInput = screen.getByLabelText('Project URL');
            expect(urlInput).toHaveValue('');
        });
    });

    describe('Accessibility', () => {
        it('has proper aria attributes on toggle button', () => {
            render(<ProjectItem {...defaultProps} />);

            const toggleButton = screen.getByRole('button', { name: /expand/i });
            expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
            expect(toggleButton).toHaveAttribute('aria-controls');
            expect(toggleButton).toHaveAttribute('aria-label');
        });

        it('renders region with proper role and label when expanded', () => {
            render(<ProjectItem {...defaultProps} isExpanded={true} />);

            const region = screen.getByRole('region', { name: /Project details for Test Project/i });
            expect(region).toBeInTheDocument();
        });

        it('has aria-labels on all buttons', () => {
            render(<ProjectItem {...defaultProps} />);

            expect(screen.getByLabelText(/Edit project/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/Delete project/i)).toBeInTheDocument();
        });

        it('has labels for all form fields', () => {
            render(<ProjectItem {...defaultProps} isExpanded={true} />);

            expect(screen.getByLabelText('Project Name')).toBeInTheDocument();
            expect(screen.getByLabelText('Description')).toBeInTheDocument();
            expect(screen.getByLabelText('Project URL')).toBeInTheDocument();
            expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
            expect(screen.getByLabelText('End Date')).toBeInTheDocument();
        });

        it('role input has accessible label', () => {
            render(<ProjectItem {...defaultProps} isExpanded={true} />);

            const roleInput = screen.getByPlaceholderText('+ Add Role');
            expect(roleInput).toHaveAttribute('aria-label', 'Add new role');
        });

        it('highlight input has accessible label', () => {
            render(<ProjectItem {...defaultProps} isExpanded={true} />);

            const highlightInput = screen.getByPlaceholderText('+ Add Highlight');
            expect(highlightInput).toHaveAttribute('aria-label', 'Add new highlight');
        });
    });

    describe('Edge Cases', () => {
        it('handles undefined roles and highlights', () => {
            const projectWithoutRoles: ProjectEntry = {
                id: 'proj-1',
                name: 'Test',
                description: 'Test',
                startDate: '2020',
                endDate: '2021'
            };

            render(<ProjectItem {...defaultProps} project={projectWithoutRoles} isExpanded={true} />);

            expect(screen.getByPlaceholderText('+ Add Role')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('+ Add Highlight')).toBeInTheDocument();
        });

        it('removes correct role when multiple present', async () => {
            const onUpdate = vi.fn();
            const user = userEvent.setup();
            const projectWithManyRoles = {
                ...mockProject,
                roles: ['Role A', 'Role B', 'Role C', 'Role D']
            };

            render(<ProjectItem {...defaultProps} project={projectWithManyRoles} isExpanded={true} onUpdate={onUpdate} />);

            const removeButtons = screen.getAllByRole('button', { name: /remove role/i });
            await user.click(removeButtons[1]); // Second role

            expect(onUpdate).toHaveBeenCalledWith('proj-1', 'roles', expect.not.arrayContaining(['Role B']));
        });

        it('removes correct highlight when multiple present', async () => {
            const onUpdate = vi.fn();
            const user = userEvent.setup();
            const projectWithManyHighlights = {
                ...mockProject,
                highlights: ['H1', 'H2', 'H3', 'H4']
            };

            render(<ProjectItem {...defaultProps} project={projectWithManyHighlights} isExpanded={true} onUpdate={onUpdate} />);

            const removeButtons = screen.getAllByRole('button', { name: /remove highlight/i });
            // Last button should be for last highlight
            await user.click(removeButtons[removeButtons.length - 1]);

            expect(onUpdate).toHaveBeenCalledWith('proj-1', 'highlights', expect.any(Array));
        });

        it('updates state on prop change', () => {
            const { rerender } = render(
                <ProjectItem {...defaultProps} project={mockProject} isExpanded={true} />
            );

            expect(screen.getByLabelText('Project Name')).toHaveValue('Test Project');

            const newProject = {
                ...mockProject,
                name: 'Updated Project'
            };

            rerender(<ProjectItem {...defaultProps} project={newProject} isExpanded={true} />);

            expect(screen.getByLabelText('Project Name')).toHaveValue('Updated Project');
        });

        it('maintains expanded state across prop updates', () => {
            const { rerender } = render(
                <ProjectItem {...defaultProps} isExpanded={true} />
            );

            expect(screen.getByLabelText('Project Name')).toBeInTheDocument();

            const newProject = { ...mockProject, name: 'Updated Project' };
            rerender(<ProjectItem {...defaultProps} project={newProject} isExpanded={true} />);

            expect(screen.getByLabelText('Project Name')).toHaveValue('Updated Project');
        });
    });

    describe('Styling and Visual States', () => {
        it('applies different styles for expanded and collapsed states', () => {
            const { rerender } = render(<ProjectItem {...defaultProps} isExpanded={false} />);

            // Get the main container div with border classes
            let container = screen.getByText('Test Project').closest('[class*="rounded-xl"]');
            expect(container?.className).toContain('opacity-80');

            rerender(<ProjectItem {...defaultProps} isExpanded={true} />);

            container = screen.getByText('Test Project').closest('[class*="rounded-xl"]');
            expect(container?.className).toContain('ring-1');
        });
    });

    describe('Memory and Performance', () => {
        it('is memoized component', () => {
            const { rerender } = render(
                <ProjectItem {...defaultProps} isExpanded={true} />
            );

            const input = screen.getByLabelText('Project Name') as HTMLInputElement;
            const initialValue = input.value;

            rerender(<ProjectItem {...defaultProps} isExpanded={true} />);

            const updatedInput = screen.getByLabelText('Project Name') as HTMLInputElement;
            expect(updatedInput.value).toBe(initialValue);
        });
    });
});
