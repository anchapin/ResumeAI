/**
 * Tests for ProjectsSection component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ProjectsSection } from '../../../components/editor/ProjectsSection';
import { ProjectEntry } from '../../../types';

describe('ProjectsSection', () => {
  const mockProjects: ProjectEntry[] = [
    {
      id: 'proj-1',
      name: 'Resume Builder',
      description: 'A modern resume builder with AI-powered features',
      url: 'https://github.com/user/resume-builder',
      tags: ['React', 'TypeScript', 'AI'],
    },
    {
      id: 'proj-2',
      name: 'E-commerce Platform',
      description: 'Full-stack e-commerce solution with payment integration',
      url: 'https://github.com/user/ecommerce',
      tags: ['Node.js', 'PostgreSQL', 'Stripe'],
    },
  ];

  const defaultProps = {
    projects: mockProjects,
    expandedProjId: null,
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
      render(<ProjectsSection {...defaultProps} />);

      expect(screen.getByText('Projects')).toBeInTheDocument();
    });

    it('renders projects count', () => {
      render(<ProjectsSection {...defaultProps} />);

      expect(screen.getByText('2 projects listed')).toBeInTheDocument();
    });

    it('renders add comment button', () => {
      render(<ProjectsSection {...defaultProps} />);

      expect(screen.getByText('Add Comment')).toBeInTheDocument();
    });

    it('renders add project button', () => {
      render(<ProjectsSection {...defaultProps} />);

      expect(screen.getByText('Add Project')).toBeInTheDocument();
    });

    it('renders empty state correctly', () => {
      render(<ProjectsSection {...defaultProps} projects={[]} />);

      expect(screen.getByText('0 projects listed')).toBeInTheDocument();
      expect(screen.getByText('Add Project')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onAdd when add button is clicked', async () => {
      const onAdd = vi.fn();
      const user = userEvent.setup();
      render(<ProjectsSection {...defaultProps} onAdd={onAdd} />);

      await user.click(screen.getByText('Add Project'));

      expect(onAdd).toHaveBeenCalledTimes(1);
    });

    it('calls onShowCommentPanel when comment button is clicked', async () => {
      const onShowCommentPanel = vi.fn();
      const user = userEvent.setup();
      render(<ProjectsSection {...defaultProps} onShowCommentPanel={onShowCommentPanel} />);

      await user.click(screen.getByText('Add Comment'));

      expect(onShowCommentPanel).toHaveBeenCalledTimes(1);
    });

    it('renders ProjectItem components for each project', () => {
      render(<ProjectsSection {...defaultProps} />);

      expect(screen.getByText('Resume Builder')).toBeInTheDocument();
      expect(screen.getByText('E-commerce Platform')).toBeInTheDocument();
    });
  });

  describe('Expand State', () => {
    it('passes correct expand state to ProjectItem', () => {
      render(<ProjectsSection {...defaultProps} expandedProjId="proj-1" />);

      // The expanded item should render differently
      expect(screen.getByText('Resume Builder')).toBeInTheDocument();
      expect(screen.getByText('E-commerce Platform')).toBeInTheDocument();
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

      expect(() => render(<ProjectsSection {...defaultProps} {...callbacks} />)).not.toThrow();
    });
  });
});
