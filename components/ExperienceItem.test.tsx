import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import ExperienceItem from './ExperienceItem';
import { WorkExperience } from '../types';

describe('ExperienceItem', () => {
  const mockExp: WorkExperience = {
    id: '1',
    company: 'Test Corp',
    role: 'Developer',
    startDate: '2020',
    endDate: 'Present',
    current: true,
    description: 'Test description',
    tags: ['Tag1', 'Tag2'],
  };

  const mockProps = {
    exp: mockExp,
    isExpanded: false,
    onToggleExpand: vi.fn(),
    onDelete: vi.fn(),
    onUpdate: vi.fn(),
    onAddTag: vi.fn(),
    onRemoveTag: vi.fn(),
  };

  it('manages focus when toggling delete confirmation', async () => {
    const user = userEvent.setup();
    render(<ExperienceItem {...mockProps} />);

    // 1. Find the initial delete button
    const deleteButton = screen.getByRole('button', { name: /delete experience/i });
    expect(deleteButton).toBeInTheDocument();

    // 2. Click it to show confirmation
    await user.click(deleteButton);

    // 3. Verify confirmation button appears and receives focus
    const confirmButton = await screen.findByRole('button', { name: /confirm delete/i });
    expect(confirmButton).toBeInTheDocument();

    await waitFor(() => {
        expect(confirmButton).toHaveFocus();
    }, { timeout: 1000 });

    // 4. Click cancel button
    const cancelButton = screen.getByRole('button', { name: /cancel delete/i });
    await user.click(cancelButton);

    // 5. Verify delete button reappears and receives focus
    const restoredDeleteButton = await screen.findByRole('button', { name: /delete experience/i });
    expect(restoredDeleteButton).toBeInTheDocument();

    await waitFor(() => {
        expect(restoredDeleteButton).toHaveFocus();
    }, { timeout: 1000 });
  });
});
