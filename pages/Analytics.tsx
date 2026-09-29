/**
 * Analytics Dashboard Page
 * 
 * Main analytics dashboard that displays skills distribution,
 * career timeline, keyword analysis, and application statistics.
 */

import React, { useState, useEffect } from 'react';
import { SkillsChart } from '@/components/analytics/SkillsChart';
import { ExperienceTimeline } from '@/components/analytics/ExperienceTimeline';
import { KeywordAnalysis } from '@/components/analytics/KeywordAnalysis';
import { ApplicationStats } from '@/components/analytics/ApplicationStats';
import { VariantManager } from '@/components/analytics/VariantManager';
import { VariantComparison } from '@/components/analytics/VariantComparison';
import { ABTestingInsights } from '@/components/analytics/ABTestingInsights';
import { AnalyticsAPI, AnalyticsDashboard } from '@/lib/db/analytics';
import { StorageManager } from '@/lib/storage';

type TabId = 'overview' | 'skills' | 'timeline' | 'keywords' | 'applications' | 'variants';

export function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [userId, setUserId] = useState<string>('');
  const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null);
  
  useEffect(() => {
    // Get user ID from storage
    const storedUserId = StorageManager.getItem<string>('resumeai_user_id');
    if (storedUserId) {
      setUserId(storedUserId);
      const dash = AnalyticsAPI.getDashboard(storedUserId);
      setDashboard(dash);
    }
  }, []);
  
  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'skills', label: 'Skills', icon: '💼' },
    { id: 'timeline', label: 'Timeline', icon: '📅' },
    { id: 'keywords', label: 'Keywords', icon: '🔑' },
    { id: 'applications', label: 'Applications', icon: '📝' },
    { id: 'variants', label: 'Variants', icon: '📋' },
  ];
  
  if (!userId) {
    return (
      <div className="analytics-page analytics-page-unauthenticated">
        <h1>Analytics Dashboard</h1>
        <p>Please log in to view your analytics data.</p>
      </div>
    );
  }
  
  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <h1>Analytics Dashboard</h1>
        <p>Track your resume performance and job search progress</p>
      </header>
      
      <nav className="analytics-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id as TabId)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>
      
      <main className="analytics-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="overview-stats">
              <div className="stat-card large">
                <span className="stat-value">{dashboard?.total_skills ?? 0}</span>
                <span className="stat-label">Skills Tracked</span>
              </div>
              <div className="stat-card large">
                <span className="stat-value">{dashboard?.total_applications ?? 0}</span>
                <span className="stat-label">Applications</span>
              </div>
              <div className="stat-card large">
                <span className="stat-value">{(dashboard?.response_rate ?? 0).toFixed(0)}%</span>
                <span className="stat-label">Response Rate</span>
              </div>
              <div className="stat-card large">
                <span className="stat-value">{dashboard?.total_variants ?? 0}</span>
                <span className="stat-label">Variants</span>
              </div>
            </div>
            
            <div className="overview-charts">
              <div className="chart-section">
                <SkillsChart userId={userId} />
              </div>
              <div className="chart-section">
                <ApplicationStats userId={userId} />
              </div>
            </div>
            
            <div className="overview-actions">
              <button 
                className="action-card"
                onClick={() => setActiveTab('skills')}
              >
                <span className="action-icon">💼</span>
                <span className="action-title">Analyze Skills</span>
                <span className="action-desc">View skills distribution</span>
              </button>
              <button 
                className="action-card"
                onClick={() => setActiveTab('timeline')}
              >
                <span className="action-icon">📅</span>
                <span className="action-title">Career Timeline</span>
                <span className="action-desc">Track your experience</span>
              </button>
              <button 
                className="action-card"
                onClick={() => setActiveTab('variants')}
              >
                <span className="action-icon">📋</span>
                <span className="action-title">A/B Testing</span>
                <span className="action-desc">Compare resume variants</span>
              </button>
            </div>
          </div>
        )}
        
        {activeTab === 'skills' && (
          <div className="skills-tab">
            <h2>Skills Distribution</h2>
            <SkillsChart userId={userId} />
          </div>
        )}
        
        {activeTab === 'timeline' && (
          <div className="timeline-tab">
            <h2>Career Timeline</h2>
            <ExperienceTimeline userId={userId} editable />
          </div>
        )}
        
        {activeTab === 'keywords' && (
          <div className="keywords-tab">
            <h2>Keyword Analysis</h2>
            <KeywordAnalysis userId={userId} />
          </div>
        )}
        
        {activeTab === 'applications' && (
          <div className="applications-tab">
            <h2>Application Statistics</h2>
            <ApplicationStats userId={userId} />
          </div>
        )}
        
        {activeTab === 'variants' && (
          <div className="variants-tab">
            <h2>Resume Variants</h2>
            
            <div className="variants-section">
              <h3>Manage Variants</h3>
              <VariantManager userId={userId} />
            </div>
            
            <div className="variants-section">
              <h3>Compare</h3>
              <VariantComparison userId={userId} />
            </div>
            
            <div className="variants-section">
              <h3>Insights</h3>
              <ABTestingInsights userId={userId} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AnalyticsPage;
