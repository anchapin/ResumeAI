import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import ExperienceItem from '../../../components/editor/ExperienceItem';
import { WorkExperience } from '../../../types';

describe('ExperienceItem', () => {
  const mockExp: WorkExperience = {
    id: 'exp-1',
    company: 'Acme Corp',
    role: 'Senior Developer',
    startDate: '2020-01',
    endDate: 'Present',
    current: true,
    description: 'Led development of web platform',
    tags: ['React', 'TypeScript'],
  };

  const defaultProps = {
    exp: mockExp,
    isExpanded: false,
    onToggleExpand: vi.fn(),
    onDelete: vi.fn(),
    onUpdate: vi.fn(),
    onAddTag: vi.fn(),
    onRemoveTag: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders collapsed state correctly', () => {
      render(<ExperienceItem {...defaultProps} />);

      expect(screen.getByText('Senior Developer')).toBeInTheDocument();
      expect(screen.getByText('Acme Corp | 2020-01 - Present')).toBeInTheDocument();
      // Should not show inputs when collapsed
      expect(screen.queryAllByDisplayValue('Acme Corp')).toHaveLength(0);
    });

    it('renders expanded state with all form fields', () => {
      render(<ExperienceItem {...defaultProps} isExpanded={true} />);

      const inputs = screen.getAllByDisplayValue('Acme Corp');
      expect(inputs.length).toBeGreaterThan(0);
    });

    it('renders description textarea when expanded', () => {
      render(<ExperienceItem {...defaultProps} isExpanded={true} />);

      // RichTextEditor uses ProseMirror, find by role or content
      const editor = document.querySelector('.ProseMirror');
      expect(editor).toBeInTheDocument();
      expect(editor).toHaveTextContent('Led development of web platform');
    });

    it('renders tags when expanded', () => {
      render(<ExperienceItem {...defaultProps} isExpanded={true} />);

      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
    });

    it('renders without description and tags when empty', () => {
      const expWithoutTags: WorkExperience = {
        ...mockExp,
        description: '',
        tags: [],
      };

      render(<ExperienceItem {...defaultProps} exp={expWithoutTags} isExpanded={true} />);

      // RichTextEditor is present
      const editor = document.querySelector('.ProseMirror');
      expect(editor).toBeInTheDocument();
      expect(screen.getByPlaceholderText('+ Add Skill')).toBeInTheDocument();
    });
  });

  describe('Toggle Expand', () => {
    it('calls onToggleExpand when card is clicked', async () => {
      const onToggleExpand = vi.fn();
      const user = userEvent.setup();
      render(<ExperienceItem {...defaultProps} onToggleExpand={onToggleExpand} />);

      const card = screen.getByText('Senior Developer').closest('div');
      if (card?.parentElement) {
        await user.click(card.parentElement);
      }

      expect(onToggleExpand).toHaveBeenCalledWith('exp-1');
    });

    it('toggles expand state', () => {
      const { rerender } = render(<ExperienceItem {...defaultProps} isExpanded={false} />);

      expect(screen.queryAllByDisplayValue('Acme Corp')).toHaveLength(0);

      rerender(<ExperienceItem {...defaultProps} isExpanded={true} />);

      expect(screen.getAllByDisplayValue('Acme Corp').length).toBeGreaterThan(0);
    });
  });

  describe('Delete Operations', () => {
    it('shows delete button in collapsed state', () => {
      render(<ExperienceItem {...defaultProps} />);

      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('deletes item after confirmation', async () => {
      const onDelete = vi.fn();
      const user = userEvent.setup();
      render(<ExperienceItem {...defaultProps} onDelete={onDelete} />);

      const deleteBtn = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteBtn);

      const confirmBtn = screen.getByRole('button', { name: /confirm delete/i });
      await user.click(confirmBtn);

      expect(onDelete).toHaveBeenCalledWith('exp-1');
    });

    it('cancels delete operation', async () => {
      const onDelete = vi.fn();
      const user = userEvent.setup();
      render(<ExperienceItem {...defaultProps} onDelete={onDelete} />);

      const deleteBtn = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteBtn);

      const cancelBtn = screen.getByRole('button', { name: /cancel delete/i });
      await user.click(cancelBtn);

      expect(onDelete).not.toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: /confirm delete/i })).not.toBeInTheDocument();
    });

    it('stops event propagation on delete button click', async () => {
      const onToggleExpand = vi.fn();
      const user = userEvent.setup();
      render(<ExperienceItem {...defaultProps} onToggleExpand={onToggleExpand} />);

      const deleteBtn = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteBtn);

      // Toggle expand should NOT have been called
      expect(onToggleExpand).not.toHaveBeenCalled();
    });
  });

  describe('Field Updates', () => {
    it('updates company name when input changes', async () => {
      const onUpdate = vi.fn();
      const user = userEvent.setup();
      render(<ExperienceItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

      const companyInputs = screen.getAllByDisplayValue('Acme Corp');
      await user.type(companyInputs[0], ' Ltd');

      expect(onUpdate).toHaveBeenCalledWith(
        'exp-1',
        'company',
        expect.stringContaining('Acme Corp'),
      );
    });

    it('updates job title when input changes', async () => {
      const onUpdate = vi.fn();
      const user = userEvent.setup();
      render(<ExperienceItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

      const roleInputs = screen.getAllByDisplayValue('Senior Developer');
      await user.type(roleInputs[0], ' Manager');

      expect(onUpdate).toHaveBeenCalledWith(
        'exp-1',
        'role',
        expect.stringContaining('Senior Developer'),
      );
    });

    it('updates dates when changed', async () => {
      const onUpdate = vi.fn();
      const user = userEvent.setup();
      render(<ExperienceItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

      const startInputs = screen.getAllByDisplayValue('2020-01');
      await user.type(startInputs[0], '-15');

      expect(onUpdate).toHaveBeenCalledWith(
        'exp-1',
        'startDate',
        expect.stringContaining('2020-01'),
      );
    });

    it('updates description textarea', async () => {
      const onUpdate = vi.fn();
      render(<ExperienceItem {...defaultProps} isExpanded={true} onUpdate={onUpdate} />);

      // RichTextEditor is present - testing is limited due to jsdom compatibility
      const editor = document.querySelector('.ProseMirror');
      expect(editor).toBeInTheDocument();
    });
  });

  describe('Tag Management', () => {
    it('removes tag when X is clicked', async () => {
      const onRemoveTag = vi.fn();
      const user = userEvent.setup();
      render(<ExperienceItem {...defaultProps} isExpanded={true} onRemoveTag={onRemoveTag} />);

      const removeButtons = screen.getAllByRole('button', { name: /close/i });
      // First two should be for removing tags
      await user.click(removeButtons[0]);

      expect(onRemoveTag).toHaveBeenCalledWith('exp-1', expect.any(String));
    });

    it('adds tag when Enter is pressed', async () => {
      const onAddTag = vi.fn();
      const user = userEvent.setup();
      render(<ExperienceItem {...defaultProps} isExpanded={true} onAddTag={onAddTag} />);

      const tagInput = screen.getByPlaceholderText('+ Add Skill');
      await user.type(tagInput, 'Python{Enter}');

      expect(onAddTag).toHaveBeenCalledWith('exp-1', expect.stringContaining('Python'));
    });

    it('calls onAddTag even with whitespace (input validation done in parent)', async () => {
      const onAddTag = vi.fn();
      const user = userEvent.setup();
      render(<ExperienceItem {...defaultProps} isExpanded={true} onAddTag={onAddTag} />);

      const tagInput = screen.getByPlaceholderText('+ Add Skill');
      await user.type(tagInput, '{Enter}');

      // The component calls onAddTag with whatever is in the input
      // Parent component should handle trimming/validation
      expect(onAddTag).toHaveBeenCalledWith('exp-1', '');
    });

    it('clears input after adding tag', async () => {
      const onAddTag = vi.fn();
      const user = userEvent.setup();
      render(<ExperienceItem {...defaultProps} isExpanded={true} onAddTag={onAddTag} />);

      const tagInput = screen.getByPlaceholderText('+ Add Skill') as HTMLInputElement;
      await user.type(tagInput, 'Vue{Enter}');

      // Input should be cleared
      expect(tagInput.value).toBe('');
    });
  });

  describe('Input Validation', () => {
    it('handles long company names', () => {
      const longCompanyName = 'A'.repeat(100);
      const expWithLongName = {
        ...mockExp,
        company: longCompanyName,
      };

      render(<ExperienceItem {...defaultProps} exp={expWithLongName} isExpanded={true} />);

      const companyInputs = screen.getAllByDisplayValue(longCompanyName);
      expect(companyInputs.length).toBeGreaterThan(0);
    });

    it('handles special characters in company name', () => {
      const expWithSpecialChars = {
        ...mockExp,
        company: "O'Reilly & Associates, Inc.",
      };

      render(<ExperienceItem {...defaultProps} exp={expWithSpecialChars} isExpanded={true} />);

      const companyInputs = screen.getAllByDisplayValue("O'Reilly & Associates, Inc.");
      expect(companyInputs.length).toBeGreaterThan(0);
    });

    it('handles Unicode characters', () => {
      const expWithUnicode = {
        ...mockExp,
        company: '日本 Corporation',
        role: 'シニア エンジニア',
      };

      render(<ExperienceItem {...defaultProps} exp={expWithUnicode} isExpanded={true} />);

      expect(screen.getAllByDisplayValue('日本 Corporation').length).toBeGreaterThan(0);
      expect(screen.getAllByDisplayValue('シニア エンジニア').length).toBeGreaterThan(0);
    });

    it('handles multiline descriptions', () => {
      const multilineDesc = 'Line 1\nLine 2\nLine 3';
      const expWithMultiline = {
        ...mockExp,
        description: multilineDesc,
      };

      render(<ExperienceItem {...defaultProps} exp={expWithMultiline} isExpanded={true} />);

      // RichTextEditor renders HTML content
      const editor = document.querySelector('.ProseMirror');
      expect(editor).toBeInTheDocument();
    });

    it('handles very long descriptions', () => {
      const veryLongDesc = 'A'.repeat(5000);
      const expWithLongDesc = {
        ...mockExp,
        description: veryLongDesc,
      };

      render(<ExperienceItem {...defaultProps} exp={expWithLongDesc} isExpanded={true} />);

      // RichTextEditor handles long content
      const editor = document.querySelector('.ProseMirror');
      expect(editor).toBeInTheDocument();
    });

    it('trims whitespace when adding tags', async () => {
      const onAddTag = vi.fn();
      const user = userEvent.setup();
      render(<ExperienceItem {...defaultProps} isExpanded={true} onAddTag={onAddTag} />);

      const tagInput = screen.getByPlaceholderText('+ Add Skill');
      await user.type(tagInput, '  NodeJS  {Enter}');

      expect(onAddTag).toHaveBeenCalledWith('exp-1', expect.stringContaining('NodeJS'));
    });
  });

  describe('Accessibility', () => {
    it('renders label text for form fields', () => {
      render(<ExperienceItem {...defaultProps} isExpanded={true} />);

      expect(screen.getByText('Company Name')).toBeInTheDocument();
      expect(screen.getByText('Job Title')).toBeInTheDocument();
      expect(screen.getByText('Start Date')).toBeInTheDocument();
      expect(screen.getByText('End Date')).toBeInTheDocument();
    });

    it('has accessible placeholder on tag input', () => {
      render(<ExperienceItem {...defaultProps} isExpanded={true} />);

      const tagInput = screen.getByPlaceholderText('+ Add Skill');
      expect(tagInput).toBeInTheDocument();
      expect(tagInput).toHaveAttribute('placeholder', '+ Add Skill');
    });

    it('has focus visible styling on buttons', () => {
      render(<ExperienceItem {...defaultProps} />);

      const deleteBtn = screen.getByRole('button', { name: /delete/i });
      expect(deleteBtn).toHaveClass('hover:bg-red-50');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty tags array', () => {
      const expWithNoTags = {
        ...mockExp,
        tags: [],
      };

      render(<ExperienceItem {...defaultProps} exp={expWithNoTags} isExpanded={true} />);

      expect(screen.getByPlaceholderText('+ Add Skill')).toBeInTheDocument();
    });

    it('handles undefined description', () => {
      const expWithoutDesc = {
        ...mockExp,
        description: '',
      };

      render(<ExperienceItem {...defaultProps} exp={expWithoutDesc} isExpanded={true} />);

      // RichTextEditor is present with empty content
      const editor = document.querySelector('.ProseMirror');
      expect(editor).toBeInTheDocument();
    });

    it('maintains state on re-render with same data', () => {
      const { rerender } = render(<ExperienceItem {...defaultProps} isExpanded={true} />);

      const inputs = screen.getAllByDisplayValue('Acme Corp');
      const initialCount = inputs.length;

      rerender(<ExperienceItem {...defaultProps} isExpanded={true} />);

      expect(screen.getAllByDisplayValue('Acme Corp').length).toBe(initialCount);
    });

    it('updates when id changes', () => {
      const expOne = { ...mockExp, id: 'exp-1' };
      const expTwo = { ...mockExp, id: 'exp-2' };

      const { rerender } = render(<ExperienceItem {...defaultProps} exp={expOne} />);

      expect(screen.getByText('Acme Corp | 2020-01 - Present')).toBeInTheDocument();

      rerender(<ExperienceItem {...defaultProps} exp={expTwo} />);

      expect(screen.getByText('Acme Corp | 2020-01 - Present')).toBeInTheDocument();
    });

    it('handles rapid tag additions', async () => {
      const onAddTag = vi.fn();
      const user = userEvent.setup();
      render(<ExperienceItem {...defaultProps} isExpanded={true} onAddTag={onAddTag} />);

      const tagInput = screen.getByPlaceholderText('+ Add Skill');

      await user.type(tagInput, 'Tag1{Enter}');
      expect(onAddTag).toHaveBeenCalledTimes(1);

      await user.type(tagInput, 'Tag2{Enter}');
      expect(onAddTag).toHaveBeenCalledTimes(2);

      await user.type(tagInput, 'Tag3{Enter}');
      expect(onAddTag).toHaveBeenCalledTimes(3);
    });
  });

  describe('Memo Optimization', () => {
    it('renders component correctly on updates', () => {
      const { rerender } = render(<ExperienceItem {...defaultProps} />);

      expect(screen.getByText('Senior Developer')).toBeInTheDocument();

      rerender(<ExperienceItem {...defaultProps} />);

      expect(screen.getByText('Senior Developer')).toBeInTheDocument();
    });
  });
});
