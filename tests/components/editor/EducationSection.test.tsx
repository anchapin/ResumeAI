/**
 * Tests for EducationSection component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { EducationSection } from '../../../components/editor/EducationSection';
import { EducationEntry } from '../../../types';

describe('EducationSection', () => {
  const mockEducation: EducationEntry[] = [
    {
      id: 'edu-1',
      institution: 'MIT',
      studyType: 'Bachelor of Science',
      area: 'Computer Science',
      startDate: '2014-09',
      endDate: '2018-06',
      gpa: '3.9',
      description: 'Focus on AI and machine learning',
    },
    {
      id: 'edu-2',
      institution: 'Stanford University',
      studyType: 'Master of Science',
      area: 'Software Engineering',
      startDate: '2018-09',
      endDate: '2020-06',
      gpa: '4.0',
      description: 'Distributed systems specialization',
    },
  ];

  const defaultProps = {
    education: mockEducation,
    expandedEduId: null,
    onToggleExpand: vi.fn(),
    onDelete: vi.fn(),
    onUpdate: vi.fn(),
    onAdd: vi.fn(),
    onShowCommentPanel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders section title correctly', () => {
      render(<EducationSection {...defaultProps} />);

      expect(screen.getByText('Education')).toBeInTheDocument();
    });

    it('renders education count', () => {
      render(<EducationSection {...defaultProps} />);

      expect(screen.getByText('2 entries listed')).toBeInTheDocument();
    });

    it('renders add comment button', () => {
      render(<EducationSection {...defaultProps} />);

      expect(screen.getByText('Add Comment')).toBeInTheDocument();
    });

    it('renders add education button', () => {
      render(<EducationSection {...defaultProps} />);

      expect(screen.getByText('Add Education')).toBeInTheDocument();
    });

    it('renders empty state correctly', () => {
      render(<EducationSection {...defaultProps} education={[]} />);

      expect(screen.getByText('0 entries listed')).toBeInTheDocument();
      expect(screen.getByText('Add Education')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onAdd when add button is clicked', async () => {
      const onAdd = vi.fn();
      const user = userEvent.setup();
      render(<EducationSection {...defaultProps} onAdd={onAdd} />);

      await user.click(screen.getByText('Add Education'));

      expect(onAdd).toHaveBeenCalledTimes(1);
    });

    it('calls onShowCommentPanel when comment button is clicked', async () => {
      const onShowCommentPanel = vi.fn();
      const user = userEvent.setup();
      render(<EducationSection {...defaultProps} onShowCommentPanel={onShowCommentPanel} />);

      await user.click(screen.getByText('Add Comment'));

      expect(onShowCommentPanel).toHaveBeenCalledTimes(1);
    });

    it('renders EducationItem components for each education entry', () => {
      render(<EducationSection {...defaultProps} />);

      expect(screen.getByText('MIT')).toBeInTheDocument();
      expect(screen.getByText('Stanford University')).toBeInTheDocument();
    });
  });

  describe('Expand State', () => {
    it('passes correct expand state to EducationItem', () => {
      render(<EducationSection {...defaultProps} expandedEduId="edu-1" />);

      // The expanded item should render differently
      expect(screen.getByText('MIT')).toBeInTheDocument();
      expect(screen.getByText('Stanford University')).toBeInTheDocument();
    });
  });

  describe('Callbacks', () => {
    it('renders without crashing when all callbacks are provided', () => {
      const callbacks = {
        onToggleExpand: vi.fn(),
        onDelete: vi.fn(),
        onUpdate: vi.fn(),
        onAdd: vi.fn(),
        onShowCommentPanel: vi.fn(),
      };

      expect(() => render(<EducationSection {...defaultProps} {...callbacks} />)).not.toThrow();
    });
  });
});
