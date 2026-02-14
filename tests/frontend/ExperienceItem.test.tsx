import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
});
