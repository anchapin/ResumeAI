import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ResumeCard from './ResumeCard';
import { ResumeMetadata } from '../types';

const mockResume: ResumeMetadata = {
  id: 1,
  title: 'Software Engineer Resume',
  tags: ['Software', 'Engineering', 'Senior'],
  isPublic: true,
  createdAt: '2024-01-15T10:00:00',
  updatedAt: '2024-01-20T10:00:00',
  versionCount: 3,
};

describe('ResumeCard', () => {
  it('renders resume information correctly', () => {
    const onSelect = vi.fn();
    const onEdit = vi.fn();
    const onDuplicate = vi.fn();
    const onDelete = vi.fn();
    const onShare = vi.fn();

    render(
      <ResumeCard
        resume={mockResume}
        isSelected={false}
        onSelect={onSelect}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onShare={onShare}
      />,
    );

    expect(screen.getByText('Software Engineer Resume')).toBeInTheDocument();
    expect(screen.getByText('Software')).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('Senior')).toBeInTheDocument();
    expect(screen.getByText('3 versions')).toBeInTheDocument();
    expect(screen.getByText('Public')).toBeInTheDocument();
  });

  it('shows selected state when isSelected is true', () => {
    const onSelect = vi.fn();
    render(
      <ResumeCard
        resume={mockResume}
        isSelected={true}
        onSelect={onSelect}
        onEdit={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        onShare={vi.fn()}
      />,
    );

    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('calls onSelect when checkbox is clicked', () => {
    const onSelect = vi.fn();
    render(
      <ResumeCard
        resume={mockResume}
        isSelected={false}
        onSelect={onSelect}
        onEdit={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        onShare={vi.fn()}
      />,
    );

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(onSelect).toHaveBeenCalledWith(true);
  });

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = vi.fn();
    render(
      <ResumeCard
        resume={mockResume}
        isSelected={false}
        onSelect={vi.fn()}
        onEdit={onEdit}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        onShare={vi.fn()}
      />,
    );

    const editButton = screen.getByTitle('Edit Resume');
    fireEvent.click(editButton);

    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('calls onDuplicate when duplicate button is clicked', () => {
    const onDuplicate = vi.fn();
    render(
      <ResumeCard
        resume={mockResume}
        isSelected={false}
        onSelect={vi.fn()}
        onEdit={vi.fn()}
        onDuplicate={onDuplicate}
        onDelete={vi.fn()}
        onShare={vi.fn()}
      />,
    );

    const duplicateButton = screen.getByTitle('Duplicate Resume');
    fireEvent.click(duplicateButton);

    expect(onDuplicate).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when delete button is clicked and confirmed', () => {
    const onDelete = vi.fn();
    render(
      <ResumeCard
        resume={mockResume}
        isSelected={false}
        onSelect={vi.fn()}
        onEdit={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={onDelete}
        onShare={vi.fn()}
      />,
    );

    const deleteButton = screen.getByTitle('Delete Resume');
    fireEvent.click(deleteButton);

    expect(onDelete).not.toHaveBeenCalled();

    const confirmButton = screen.getByTitle('Confirm Delete');
    fireEvent.click(confirmButton);

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('cancels deletion when cancel button is clicked', () => {
    const onDelete = vi.fn();
    render(
      <ResumeCard
        resume={mockResume}
        isSelected={false}
        onSelect={vi.fn()}
        onEdit={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={onDelete}
        onShare={vi.fn()}
      />,
    );

    const deleteButton = screen.getByTitle('Delete Resume');
    fireEvent.click(deleteButton);

    const cancelButton = screen.getByTitle('Cancel Delete');
    fireEvent.click(cancelButton);

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByTitle('Delete Resume')).toBeInTheDocument();
  });

  it('manages focus between delete and confirm buttons', () => {
    render(
      <ResumeCard
        resume={mockResume}
        isSelected={false}
        onSelect={vi.fn()}
        onEdit={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        onShare={vi.fn()}
      />,
    );

    const deleteButton = screen.getByTitle('Delete Resume');
    fireEvent.click(deleteButton);

    const confirmButton = screen.getByTitle('Confirm Delete');
    expect(document.activeElement).toBe(confirmButton);

    const cancelButton = screen.getByTitle('Cancel Delete');
    fireEvent.click(cancelButton);

    const restoredDeleteButton = screen.getByTitle('Delete Resume');
    expect(document.activeElement).toBe(restoredDeleteButton);
  });

  it('calls onShare when share button is clicked', () => {
    const onShare = vi.fn();
    render(
      <ResumeCard
        resume={mockResume}
        isSelected={false}
        onSelect={vi.fn()}
        onEdit={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        onShare={onShare}
      />,
    );

    const shareButton = screen.getByTitle('Share Resume');
    fireEvent.click(shareButton);

    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it('shows private badge when isPublic is false', () => {
    const privateResume: ResumeMetadata = {
      ...mockResume,
      isPublic: false,
    };

    render(
      <ResumeCard
        resume={privateResume}
        isSelected={false}
        onSelect={vi.fn()}
        onEdit={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        onShare={vi.fn()}
      />,
    );

    expect(screen.getByText('Private')).toBeInTheDocument();
  });

  it('limits tags display to 4 and shows more count', () => {
    const resumeWithManyTags: ResumeMetadata = {
      ...mockResume,
      tags: ['Tag1', 'Tag2', 'Tag3', 'Tag4', 'Tag5', 'Tag6'],
    };

    render(
      <ResumeCard
        resume={resumeWithManyTags}
        isSelected={false}
        onSelect={vi.fn()}
        onEdit={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        onShare={vi.fn()}
      />,
    );

    expect(screen.getByText('Tag1')).toBeInTheDocument();
    expect(screen.getByText('Tag2')).toBeInTheDocument();
    expect(screen.getByText('Tag3')).toBeInTheDocument();
    expect(screen.getByText('Tag4')).toBeInTheDocument();
    expect(screen.getByText('+2 more')).toBeInTheDocument();
    expect(screen.queryByText('Tag5')).not.toBeInTheDocument();
  });
});
