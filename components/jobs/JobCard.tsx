/**
 * JobCard Component
 * 
 * Displays a single job posting card.
 * 
 * @example
 * <JobCard
 *   job={job}
 *   onClick={handleClick}
 *   onSave={handleSave}
 * />
 */

import React from 'react';
import type { JobPosting } from '../../types/jobs';

export interface JobCardProps {
  job: JobPosting;
  isSaved?: boolean;
  onClick?: () => void;
  onSave?: () => void;
}

export function JobCard({
  job,
  isSaved = false,
  onClick,
  onSave,
}: JobCardProps) {
  /**
   * Format salary display.
   */
  const formatSalary = () => {
    if (!job.salaryMin && !job.salaryMax) return null;

    const min = job.salaryMin?.toLocaleString();
    const max = job.salaryMax?.toLocaleString();

    if (min && max) {
      return `$${min} - $${max}`;
    } else if (min) {
      return `From $${min}`;
    } else {
      return `Up to $${max}`;
    }
  };

  /**
   * Format posted date.
   */
  const formatPostedDate = () => {
    if (!job.postedDate) return null;

    const posted = new Date(job.postedDate);
    const now = new Date();
    const diffMs = now.getTime() - posted.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <div
      onClick={onClick}
      style={{
        padding: '16px',
        backgroundColor: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        e.currentTarget.style.borderColor = '#007bff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = '#e0e0e0';
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: '16px', color: '#333' }}>
            {job.title}
          </h3>
          <div style={{ fontSize: '14px', color: '#666' }}>
            {job.company}
          </div>
        </div>
        {onSave && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSave();
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: isSaved ? '#ffc107' : '#999',
              fontSize: '20px',
            }}
            title={isSaved ? 'Saved' : 'Save job'}
          >
            {isSaved ? '★' : '☆'}
          </button>
        )}
      </div>

      {/* Meta Info */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '8px', fontSize: '13px', color: '#666' }}>
        {job.location && (
          <span>📍 {job.location}</span>
        )}
        {job.remote && (
          <span style={{ color: '#28a745' }}>🏠 Remote</span>
        )}
        {formatSalary() && (
          <span>💰 {formatSalary()}</span>
        )}
        {formatPostedDate() && (
          <span>📅 {formatPostedDate()}</span>
        )}
      </div>

      {/* Skills */}
      {job.skills && job.skills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
          {job.skills.slice(0, 5).map((skill, index) => (
            <span
              key={index}
              style={{
                padding: '2px 8px',
                backgroundColor: '#e3f2fd',
                color: '#1976d2',
                borderRadius: '12px',
                fontSize: '12px',
              }}
            >
              {skill}
            </span>
          ))}
          {job.skills.length > 5 && (
            <span style={{ fontSize: '12px', color: '#666' }}>
              +{job.skills.length - 5} more
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #f0f0f0' }}>
        <span style={{ fontSize: '12px', color: '#999' }}>
          via {job.sourceId}
        </span>
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            color: '#007bff',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          View Job →
        </a>
      </div>
    </div>
  );
}

export default JobCard;
