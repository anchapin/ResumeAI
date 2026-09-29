/**
 * Application Statistics Component
 * 
 * Displays job application statistics with status breakdown
 * and time-series visualization.
 */

import React, { useState, useMemo } from 'react';
import { AnalyticsApplication, ApplicationStatus, AnalyticsAPI } from '@/lib/db/analytics';

interface ApplicationStatsProps {
  userId: string;
  applications?: AnalyticsApplication[];
}

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  applied: '#3b82f6',
  viewed: '#8b5cf6',
  interviewing: '#f59e0b',
  rejected: '#ef4444',
  offer: '#10b981',
  accepted: '#10b981',
  withdrawn: '#6b7280',
};

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: 'Applied',
  viewed: 'Viewed',
  interviewing: 'Interviewing',
  rejected: 'Rejected',
  offer: 'Offer',
  accepted: 'Accepted',
  withdrawn: 'Withdrawn',
};

export function ApplicationStats({ userId, applications: initialApplications }: ApplicationStatsProps) {
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');
  const [dateRange, setDateRange] = useState<'30' | '90' | 'all'>('30');
  
  const applications = useMemo(() => {
    let data = initialApplications ?? AnalyticsAPI.getApplications(userId);
    
    // Filter by date range
    if (dateRange !== 'all') {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(dateRange));
      data = data.filter(a => new Date(a.applied_at) >= cutoffDate);
    }
    
    // Filter by status
    if (statusFilter !== 'all') {
      data = data.filter(a => a.status === statusFilter);
    }
    
    return data;
  }, [userId, initialApplications, statusFilter, dateRange]);
  
  const stats = useMemo(() => {
    const total = applications.length;
    const responded = applications.filter(a => a.response_at !== null).length;
    const interviewing = applications.filter(a => 
      a.status === 'interviewing' || a.status === 'offer'
    ).length;
    const offers = applications.filter(a => a.status === 'offer').length;
    const accepted = applications.filter(a => a.status === 'accepted').length;
    
    return {
      total,
      response_rate: total > 0 ? (responded / total) * 100 : 0,
      interview_rate: total > 0 ? (interviewing / total) * 100 : 0,
      offer_rate: total > 0 ? (offers / total) * 100 : 0,
      acceptance_rate: offers > 0 ? (accepted / offers) * 100 : 0,
    };
  }, [applications]);
  
  const statusBreakdown = useMemo(() => {
    const breakdown: Record<ApplicationStatus, number> = {
      applied: 0,
      viewed: 0,
      interviewing: 0,
      rejected: 0,
      offer: 0,
      accepted: 0,
      withdrawn: 0,
    };
    
    applications.forEach(app => {
      breakdown[app.status]++;
    });
    
    return Object.entries(breakdown)
      .map(([status, count]) => ({
        status: status as ApplicationStatus,
        count,
        percentage: stats.total > 0 ? (count / stats.total) * 100 : 0,
      }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [applications, stats.total]);
  
  const applicationsOverTime = useMemo(() => {
    const days: Record<string, number> = {};
    
    applications.forEach(app => {
      const date = new Date(app.applied_at).toISOString().split('T')[0];
      days[date] = (days[date] || 0) + 1;
    });
    
    return Object.entries(days)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14); // Last 14 data points
  }, [applications]);
  
  if (applications.length === 0) {
    return (
      <div className="application-stats-empty">
        <p>No application data yet. Track your job applications to see statistics.</p>
      </div>
    );
  }
  
  return (
    <div className="application-stats">
      <div className="application-stats-header">
        <h3>Application Statistics</h3>
        <div className="application-controls">
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as '30' | '90' | 'all')}
          >
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>
      
      <div className="stats-cards">
        <div className="stat-card">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Total Applications</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.response_rate.toFixed(0)}%</span>
          <span className="stat-label">Response Rate</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.interview_rate.toFixed(0)}%</span>
          <span className="stat-label">Interview Rate</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.offer_rate.toFixed(0)}%</span>
          <span className="stat-label">Offer Rate</span>
        </div>
      </div>
      
      <div className="status-breakdown">
        <h4>Status Breakdown</h4>
        <div className="status-bars">
          {statusBreakdown.map(({ status, count, percentage }) => (
            <div key={status} className="status-bar-item">
              <div className="status-bar-header">
                <span 
                  className="status-dot"
                  style={{ backgroundColor: STATUS_COLORS[status] }}
                />
                <span className="status-label">{STATUS_LABELS[status]}</span>
                <span className="status-count">{count}</span>
              </div>
              <div className="status-bar-track">
                <div 
                  className="status-bar-fill"
                  style={{ 
                    width: `${percentage}%`,
                    backgroundColor: STATUS_COLORS[status],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {applicationsOverTime.length > 1 && (
        <div className="applications-timeline">
          <h4>Applications Over Time</h4>
          <div className="timeline-chart">
            {applicationsOverTime.map(({ date, count }, index) => {
              const maxCount = Math.max(...applicationsOverTime.map(d => d.count));
              return (
                <div key={date} className="timeline-bar-container">
                  <div 
                    className="timeline-bar"
                    style={{ 
                      height: `${(count / maxCount) * 100}%`,
                    }}
                    title={`${date}: ${count} applications`}
                  />
                  <span className="timeline-label">
                    {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default ApplicationStats;
