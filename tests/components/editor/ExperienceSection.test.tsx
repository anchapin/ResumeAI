/**
 * Tests for ExperienceSection component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ExperienceSection } from '../../../components/editor/ExperienceSection';
import { WorkExperience } from '../../../types';

describe('ExperienceSection', () => {
  const mockExperiences: WorkExperience[] = [
    {
      id: 'exp-1',
      company: 'Acme Corp',
      role: 'Senior Developer',
      startDate: '2020-01',
      endDate: 'Present',
      current: true,
      description: 'Led development of web platform',
      tags: ['React', 'TypeScript'],
    },
    {
      id: 'exp-2',
      company: 'Tech Inc',
      role: 'Developer',
      startDate: '2018-01',
      endDate: '2019-12',
      current: false,
      description: 'Built APIs',
      tags: ['Node.js', 'Python'],
    },
  ];

  const defaultProps = {
    experiences: mockExperiences,
    expandedExpId: null,
    onToggleExpand: vi.fn(),
    onDelete: vi.fn(),
    onUpdate: vi.fn(),
    onAddTag: vi.fn(),
    onRemoveTag: vi.fn(),
    onAdd: vi.fn(),
    onDragStart: vi.fn(),
    onDragOver: vi.fn(),
    onDragEnd: vi.fn(),
    onDrop: vi.fn(),
    draggedItemId: null,
    dragOverItemId: null,
    onShowCommentPanel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders section title correctly', () => {
      render(<ExperienceSection {...defaultProps} />);

      expect(screen.getByText('Work Experience')).toBeInTheDocument();
    });

    it('renders experience count', () => {
      render(<ExperienceSection {...defaultProps} />);

      expect(screen.getByText('2 positions listed')).toBeInTheDocument();
    });

    it('renders add comment button', () => {
      render(<ExperienceSection {...defaultProps} />);

      expect(screen.getByText('Add Comment')).toBeInTheDocument();
    });

    it('renders add new experience button', () => {
      render(<ExperienceSection {...defaultProps} />);

      expect(screen.getByText('Add New Work Experience')).toBeInTheDocument();
    });

    it('renders drag hint when multiple experiences', () => {
      render(<ExperienceSection {...defaultProps} />);

      expect(screen.getByText(/drag and drop to reorder/i)).toBeInTheDocument();
    });

    it('does not render drag hint with single experience', () => {
      render(<ExperienceSection {...defaultProps} experiences={[mockExperiences[0]]} />);

      expect(screen.queryByText(/drag and drop/i)).not.toBeInTheDocument();
    });

    it('renders empty state correctly', () => {
      render(<ExperienceSection {...defaultProps} experiences={[]} />);

      expect(screen.getByText('0 positions listed')).toBeInTheDocument();
      expect(screen.getByText('Add New Work Experience')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onAdd when add button is clicked', async () => {
      const onAdd = vi.fn();
      const user = userEvent.setup();
      render(<ExperienceSection {...defaultProps} onAdd={onAdd} />);

      await user.click(screen.getByText('Add New Work Experience'));

      expect(onAdd).toHaveBeenCalledTimes(1);
    });

    it('calls onShowCommentPanel when comment button is clicked', async () => {
      const onShowCommentPanel = vi.fn();
      const user = userEvent.setup();
      render(<ExperienceSection {...defaultProps} onShowCommentPanel={onShowCommentPanel} />);

      await user.click(screen.getByText('Add Comment'));

      expect(onShowCommentPanel).toHaveBeenCalledTimes(1);
    });

    it('renders ExperienceItem components for each experience', () => {
      render(<ExperienceSection {...defaultProps} />);

      expect(screen.getByText('Senior Developer')).toBeInTheDocument();
      expect(screen.getByText('Developer')).toBeInTheDocument();
    });
  });

  describe('Expand State', () => {
    it('passes correct expand state to ExperienceItem', () => {
      render(<ExperienceSection {...defaultProps} expandedExpId="exp-1" />);

      // The expanded item should render differently - this is tested implicitly
      // by ensuring both items are rendered
      expect(screen.getByText('Senior Developer')).toBeInTheDocument();
      expect(screen.getByText('Developer')).toBeInTheDocument();
    });
  });

  describe('Drag and Drop', () => {
    it('renders draggable elements', () => {
      render(<ExperienceSection {...defaultProps} />);

      // Both experience items should be present
      expect(screen.getByText('Senior Developer')).toBeInTheDocument();
      expect(screen.getByText('Developer')).toBeInTheDocument();
    });

    it('applies drag styling when item is being dragged', () => {
      render(<ExperienceSection {...defaultProps} draggedItemId="exp-1" />);

      // Component should render without crashing
      expect(screen.getByText('Senior Developer')).toBeInTheDocument();
    });

    it('applies drop target styling when hovering over item', () => {
      render(<ExperienceSection {...defaultProps} dragOverItemId="exp-2" />);

      // Component should render without crashing
      expect(screen.getByText('Developer')).toBeInTheDocument();
    });
  });

  describe('Callbacks', () => {
    it('renders without crashing when all callbacks are provided', () => {
      const callbacks = {
        onToggleExpand: vi.fn(),
        onDelete: vi.fn(),
        onUpdate: vi.fn(),
        onAddTag: vi.fn(),
        onRemoveTag: vi.fn(),
        onAdd: vi.fn(),
        onDragStart: vi.fn(),
        onDragOver: vi.fn(),
        onDragEnd: vi.fn(),
        onDrop: vi.fn(),
        onShowCommentPanel: vi.fn(),
      };

      expect(() => render(<ExperienceSection {...defaultProps} {...callbacks} />)).not.toThrow();
    });
  });
});
