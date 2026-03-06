/**
 * Tests for ActivityFeed component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import ActivityFeed from '../../components/ActivityFeed';
import { TeamActivity } from '../../types';

describe('ActivityFeed', () => {
  const mockActivities: TeamActivity[] = [
    {
      id: 'act-1',
      teamId: 'team-1',
      userId: 'user-1',
      userName: 'John Doe',
      action: 'created_team',
      type: 'team_created',
      description: 'Created the team',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'act-2',
      teamId: 'team-1',
      userId: 'user-2',
      userName: 'Jane Smith',
      action: 'member_joined',
      type: 'member_joined',
      description: 'Joined the team',
      createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    },
    {
      id: 'act-3',
      teamId: 'team-1',
      userId: 'user-3',
      userName: 'Bob Wilson',
      action: 'resume_shared',
      type: 'resume_shared',
      description: 'Shared a resume',
      createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    },
  ];

  const defaultProps = {
    activities: mockActivities,
    loading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders activity list correctly', () => {
      render(<ActivityFeed {...defaultProps} />);

      expect(screen.getByText('John Doe created the team')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith joined the team')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson shared a resume')).toBeInTheDocument();
    });

    it('renders user initials correctly', () => {
      render(<ActivityFeed {...defaultProps} />);

      expect(screen.getByText('JD')).toBeInTheDocument();
      expect(screen.getByText('JS')).toBeInTheDocument();
      expect(screen.getByText('BW')).toBeInTheDocument();
    });

    it('renders empty state when no activities', () => {
      render(<ActivityFeed activities={[]} loading={false} />);

      expect(screen.queryByText(/created the team/)).not.toBeInTheDocument();
    });

    it('renders loading state', () => {
      render(<ActivityFeed activities={[]} loading={true} />);

      // Should render a spinner when loading
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Time Formatting', () => {
    it('formats "just now" for recent activities', () => {
      const recentActivity: TeamActivity[] = [
        {
          id: 'act-recent',
          teamId: 'team-1',
          userId: 'user-1',
          userName: 'Test User',
          action: 'test',
          type: 'team_updated',
          createdAt: new Date().toISOString(),
        },
      ];

      render(<ActivityFeed activities={recentActivity} loading={false} />);

      expect(screen.getByText(/just now/i)).toBeInTheDocument();
    });

    it('formats minutes ago correctly', () => {
      const minuteActivity: TeamActivity[] = [
        {
          id: 'act-minute',
          teamId: 'team-1',
          userId: 'user-1',
          userName: 'Test User',
          action: 'test',
          type: 'team_updated',
          createdAt: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
        },
      ];

      render(<ActivityFeed activities={minuteActivity} loading={false} />);

      expect(screen.getByText(/5 minutes ago/i)).toBeInTheDocument();
    });

    it('formats hours ago correctly', () => {
      const hourActivity: TeamActivity[] = [
        {
          id: 'act-hour',
          teamId: 'team-1',
          userId: 'user-1',
          userName: 'Test User',
          action: 'test',
          type: 'team_updated',
          createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        },
      ];

      render(<ActivityFeed activities={hourActivity} loading={false} />);

      expect(screen.getByText(/2 hours ago/i)).toBeInTheDocument();
    });

    it('formats days ago correctly', () => {
      const dayActivity: TeamActivity[] = [
        {
          id: 'act-day',
          teamId: 'team-1',
          userId: 'user-1',
          userName: 'Test User',
          action: 'test',
          type: 'team_updated',
          createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        },
      ];

      render(<ActivityFeed activities={dayActivity} loading={false} />);

      expect(screen.getByText(/2 days ago/i)).toBeInTheDocument();
    });
  });

  describe('Activity Types', () => {
    it('renders team_created activity correctly', () => {
      const activity: TeamActivity[] = [
        {
          id: 'act-1',
          teamId: 'team-1',
          userId: 'user-1',
          userName: 'Alice',
          action: 'team_created',
          type: 'team_created',
          createdAt: new Date().toISOString(),
        },
      ];

      render(<ActivityFeed activities={activity} loading={false} />);

      expect(screen.getByText(/Alice created the team/)).toBeInTheDocument();
    });

    it('renders member_left activity correctly', () => {
      const activity: TeamActivity[] = [
        {
          id: 'act-1',
          teamId: 'team-1',
          userId: 'user-1',
          userName: 'Bob',
          action: 'member_left',
          type: 'member_left',
          createdAt: new Date().toISOString(),
        },
      ];

      render(<ActivityFeed activities={activity} loading={false} />);

      expect(screen.getByText(/Bob left the team/)).toBeInTheDocument();
    });

    it('renders role_changed activity correctly', () => {
      const activity: TeamActivity[] = [
        {
          id: 'act-1',
          teamId: 'team-1',
          userId: 'user-1',
          userName: 'Charlie',
          action: 'role_changed',
          type: 'role_changed',
          createdAt: new Date().toISOString(),
        },
      ];

      render(<ActivityFeed activities={activity} loading={false} />);

      expect(screen.getByText(/Charlie changed a member's role/)).toBeInTheDocument();
    });

    it('renders resume_unshared activity correctly', () => {
      const activity: TeamActivity[] = [
        {
          id: 'act-1',
          teamId: 'team-1',
          userId: 'user-1',
          userName: 'Diana',
          action: 'resume_unshared',
          type: 'resume_unshared',
          createdAt: new Date().toISOString(),
        },
      ];

      render(<ActivityFeed activities={activity} loading={false} />);

      expect(screen.getByText(/Diana unshared a resume/)).toBeInTheDocument();
    });

    it('renders team_deleted activity correctly', () => {
      const activity: TeamActivity[] = [
        {
          id: 'act-1',
          teamId: 'team-1',
          userId: 'user-1',
          userName: 'Eve',
          action: 'team_deleted',
          type: 'team_deleted',
          createdAt: new Date().toISOString(),
        },
      ];

      render(<ActivityFeed activities={activity} loading={false} />);

      expect(screen.getByText(/Eve deleted the team/)).toBeInTheDocument();
    });

    it('renders unknown activity type correctly', () => {
      const activity: TeamActivity[] = [
        {
          id: 'act-1',
          teamId: 'team-1',
          userId: 'user-1',
          userName: 'Frank',
          action: 'unknown_action',
          type: 'unknown_type',
          description: 'Custom description',
          createdAt: new Date().toISOString(),
        },
      ];

      render(<ActivityFeed activities={activity} loading={false} />);

      // There are two elements with "Custom description" - use getAllByText
      expect(screen.getAllByText(/Custom description/).length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('handles missing userName gracefully', () => {
      const activity: TeamActivity[] = [
        {
          id: 'act-1',
          teamId: 'team-1',
          userId: 'user-1',
          userName: '',
          action: 'test',
          type: 'team_updated',
          createdAt: new Date().toISOString(),
        },
      ];

      render(<ActivityFeed activities={activity} loading={false} />);

      expect(screen.getByText(/Someone updated team details/)).toBeInTheDocument();
    });

    it('renders multiple activities in correct order', () => {
      const activities: TeamActivity[] = [
        {
          id: 'act-1',
          teamId: 'team-1',
          userId: 'user-1',
          userName: 'First',
          action: 'test1',
          type: 'team_created',
          createdAt: new Date(Date.now() - 100000).toISOString(),
        },
        {
          id: 'act-2',
          teamId: 'team-1',
          userId: 'user-2',
          userName: 'Second',
          action: 'test2',
          type: 'member_joined',
          createdAt: new Date(Date.now() - 50000).toISOString(),
        },
      ];

      render(<ActivityFeed activities={activities} loading={false} />);

      // Check that both activities are rendered
      expect(screen.getByText(/First created the team/)).toBeInTheDocument();
      expect(screen.getByText(/Second joined the team/)).toBeInTheDocument();
    });
  });
});
