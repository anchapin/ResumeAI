/**
 * Keyword Analysis Component
 * 
 * Displays keyword density analysis from resumes.
 */

import React, { useState, useMemo } from 'react';
import { AnalyticsKeyword, AnalyticsAPI } from '@/lib/db/analytics';

interface KeywordAnalysisProps {
  userId: string;
  keywords?: AnalyticsKeyword[];
}

export function KeywordAnalysis({ userId, keywords: initialKeywords }: KeywordAnalysisProps) {
  const [showHighValue, setShowHighValue] = useState(false);
  const [sortBy, setSortBy] = useState<'frequency' | 'density'>('frequency');
  
  const keywords = useMemo(() => {
    const data = initialKeywords ?? AnalyticsAPI.getKeywords(userId);
    let filtered = showHighValue 
      ? data.filter(k => k.is_high_value) 
      : data;
    
    return filtered.sort((a, b) => {
      if (sortBy === 'frequency') return b.count - a.count;
      return b.density - a.density;
    });
  }, [userId, initialKeywords, showHighValue, sortBy]);
  
  const maxDensity = useMemo(() => 
    Math.max(...keywords.map(k => k.density), 1),
    [keywords]
  );
  
  const topKeywords = useMemo(() => 
    keywords.slice(0, 15),
    [keywords]
  );
  
  if (keywords.length === 0) {
    return (
      <div className="keyword-analysis-empty">
        <p>No keyword data yet. Import a resume to analyze keywords.</p>
      </div>
    );
  }
  
  return (
    <div className="keyword-analysis">
      <div className="keyword-analysis-header">
        <h3>Keyword Analysis</h3>
        <div className="keyword-controls">
          <label className="high-value-toggle">
            <input
              type="checkbox"
              checked={showHighValue}
              onChange={(e) => setShowHighValue(e.target.checked)}
            />
            High Value Only
          </label>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as 'frequency' | 'density')}
          >
            <option value="frequency">Sort by Frequency</option>
            <option value="density">Sort by Density</option>
          </select>
        </div>
      </div>
      
      <div className="keyword-bars">
        {topKeywords.map(keyword => (
          <div key={keyword.id} className="keyword-bar-item">
            <div className="keyword-bar-header">
              <span className="keyword-text">
                {keyword.keyword}
                {keyword.is_high_value && (
                  <span className="high-value-badge">★</span>
                )}
              </span>
              <span className="keyword-stats">
                {keyword.count}x · {keyword.density.toFixed(1)}%
              </span>
            </div>
            <div className="keyword-bar-track">
              <div 
                className="keyword-bar-fill"
                style={{ 
                  width: `${(keyword.density / maxDensity) * 100}%`,
                  backgroundColor: keyword.is_high_value ? '#10b981' : '#3b82f6',
                }}
              />
            </div>
          </div>
        ))}
      </div>
      
      <div className="keyword-stats-summary">
        <div className="stat-item">
          <span className="stat-value">{keywords.length}</span>
          <span className="stat-label">Unique Keywords</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">
            {keywords.reduce((sum, k) => sum + k.count, 0)}
          </span>
          <span className="stat-label">Total Occurrences</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">
            {keywords.filter(k => k.is_high_value).length}
          </span>
          <span className="stat-label">High Value</span>
        </div>
      </div>
    </div>
  );
}

export default KeywordAnalysis;
