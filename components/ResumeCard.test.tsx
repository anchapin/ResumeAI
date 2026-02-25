import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ResumeCard from './ResumeCard';
import { ResumeMetadata } from '../types';

const mockResume: ResumeMetadata = {
  id: 1,
  title: 'Software Engineer Resume',
  tags: ['Software', 'Engineering', 'Senior'],
  is_public: true,
  created_at: '2024-01-15T10:00:00',
  updated_at: '2024-01-20T10:00:00',
  version_count: 3,
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
      />
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
      />
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
      />
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
      />
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
      />
    );

    const duplicateButton = screen.getByTitle('Duplicate Resume');
    fireEvent.click(duplicateButton);

    expect(onDuplicate).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when delete button is clicked', () => {
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
      />
    );

    const deleteButton = screen.getByTitle('Delete Resume');
    fireEvent.click(deleteButton);

    expect(onDelete).toHaveBeenCalledTimes(1);
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
      />
    );

    const shareButton = screen.getByTitle('Share Resume');
    fireEvent.click(shareButton);

    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it('shows private badge when is_public is false', () => {
    const privateResume: ResumeMetadata = {
      ...mockResume,
      is_public: false,
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
      />
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
      />
    );

    expect(screen.getByText('Tag1')).toBeInTheDocument();
    expect(screen.getByText('Tag2')).toBeInTheDocument();
    expect(screen.getByText('Tag3')).toBeInTheDocument();
    expect(screen.getByText('Tag4')).toBeInTheDocument();
    expect(screen.getByText('+2 more')).toBeInTheDocument();
    expect(screen.queryByText('Tag5')).not.toBeInTheDocument();
  });
});
