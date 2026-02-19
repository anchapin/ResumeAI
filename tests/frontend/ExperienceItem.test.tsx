import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import ExperienceItem from '../../components/ExperienceItem';
import { WorkExperience } from '../../types';

describe('ExperienceItem', () => {
  const mockExp: WorkExperience = {
    id: '1',
    company: 'Test Company',
    role: 'Test Role',
    startDate: 'Jan 2020',
    endDate: 'Present',
    current: true,
    description: 'Test Description',
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

  it('renders correctly', () => {
    render(<ExperienceItem {...mockProps} />);
    expect(screen.getByText('Test Role')).toBeInTheDocument();
    expect(screen.getByText(/Test Company/)).toBeInTheDocument();
  });

  it('shows confirmation buttons when delete is clicked', () => {
    render(<ExperienceItem {...mockProps} />);

    // Find delete button
    const deleteButton = screen.getByLabelText('Delete experience');
    fireEvent.click(deleteButton);

    // Check for confirmation buttons
    expect(screen.getByLabelText('Confirm delete')).toBeInTheDocument();
    expect(screen.getByLabelText('Cancel delete')).toBeInTheDocument();

    // Original delete button should be gone
    expect(screen.queryByLabelText('Delete experience')).not.toBeInTheDocument();
  });

  it('cancels deletion when close button is clicked', () => {
    render(<ExperienceItem {...mockProps} />);

    // Click delete first
    const deleteButton = screen.getByLabelText('Delete experience');
    fireEvent.click(deleteButton);

    // Click cancel
    const cancelButton = screen.getByLabelText('Cancel delete');
    fireEvent.click(cancelButton);

    // Original delete button should be back
    expect(screen.getByLabelText('Delete experience')).toBeInTheDocument();
    expect(screen.queryByLabelText('Confirm delete')).not.toBeInTheDocument();
    expect(mockProps.onDelete).not.toHaveBeenCalled();
  });

  it('calls onDelete when confirm button is clicked', () => {
    render(<ExperienceItem {...mockProps} />);

    // Click delete first
    const deleteButton = screen.getByLabelText('Delete experience');
    fireEvent.click(deleteButton);

    // Click confirm
    const confirmButton = screen.getByLabelText('Confirm delete');
    fireEvent.click(confirmButton);

    // Check if onDelete was called
    expect(mockProps.onDelete).toHaveBeenCalledWith('1');
  });

  it('renders accessible form elements when expanded', () => {
    render(<ExperienceItem {...mockProps} isExpanded={true} />);

    // Check if inputs are associated with labels
    expect(screen.getByLabelText('Company Name')).toHaveAttribute('id', 'company-1');
    expect(screen.getByLabelText('Job Title')).toHaveAttribute('id', 'role-1');
    expect(screen.getByLabelText('Start Date')).toHaveAttribute('id', 'startDate-1');
    expect(screen.getByLabelText('End Date')).toHaveAttribute('id', 'endDate-1');
    expect(screen.getByLabelText('Achievements & Responsibilities')).toHaveAttribute('id', 'description-1');

    // Check tag remove buttons
    expect(screen.getByLabelText('Remove tag Tag1')).toBeInTheDocument();
    expect(screen.getByLabelText('Remove tag Tag2')).toBeInTheDocument();

    // Check add skill input
    expect(screen.getByLabelText('Add new skill')).toBeInTheDocument();
  });

  it('has correct accessibility attributes on header', () => {
    render(<ExperienceItem {...mockProps} />);
    const header = screen.getByTitle('Click to expand/collapse');
    expect(header.tagName).toBe('BUTTON');
    expect(header).toHaveAttribute('aria-expanded', 'false');
    expect(header).toHaveAttribute('aria-controls', 'exp-content-1');
  });

  it('toggles expansion on Enter key press', async () => {
    const user = userEvent.setup();
    render(<ExperienceItem {...mockProps} />);
    const header = screen.getByTitle('Click to expand/collapse');

    header.focus();
    await user.keyboard('{Enter}');
    expect(mockProps.onToggleExpand).toHaveBeenCalledWith('1');
  });

  it('toggles expansion on Space key press', async () => {
    const user = userEvent.setup();
    render(<ExperienceItem {...mockProps} />);
    const header = screen.getByTitle('Click to expand/collapse');

    header.focus();
    await user.keyboard(' ');
    expect(mockProps.onToggleExpand).toHaveBeenCalledWith('1');
  });
});
