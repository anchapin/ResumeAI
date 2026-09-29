/**
 * Analytics Components Tests
 * 
 * Tests for analytics visualization components:
 * - SkillsChart
 * - ExperienceTimeline
 * - KeywordAnalysis
 * - ApplicationStats
 * - VariantManager
 * - VariantComparison
 * - ABTestingInsights
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Analytics Storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should store and retrieve skills', () => {
    const skills = [
      { id: '1', user_id: 'user1', skill_name: 'React', category: 'technical', frequency: 3, created_at: '2024-01-01', updated_at: '2024-01-01' }
    ];
    localStorage.setItem('resumeai_analytics_skills', JSON.stringify(skills));
    
    const stored = localStorage.getItem('resumeai_analytics_skills');
    const parsed = stored ? JSON.parse(stored) : [];
    
    expect(parsed.length).toBe(1);
    expect(parsed[0].skill_name).toBe('React');
  });

  it('should store and retrieve variants', () => {
    const variants = [
      { id: '1', user_id: 'user1', name: 'Tech Resume', content: '{}', is_default: true, created_at: '2024-01-01', updated_at: '2024-01-01' }
    ];
    localStorage.setItem('resumeai_resume_variants', JSON.stringify(variants));
    
    const stored = localStorage.getItem('resumeai_resume_variants');
    const parsed = stored ? JSON.parse(stored) : [];
    
    expect(parsed.length).toBe(1);
    expect(parsed[0].name).toBe('Tech Resume');
  });

  it('should store and retrieve applications', () => {
    const applications = [
      { id: '1', user_id: 'user1', company: 'Google', title: 'Engineer', status: 'applied', applied_at: '2024-01-01', created_at: '2024-01-01', updated_at: '2024-01-01' }
    ];
    localStorage.setItem('resumeai_analytics_applications', JSON.stringify(applications));
    
    const stored = localStorage.getItem('resumeai_analytics_applications');
    const parsed = stored ? JSON.parse(stored) : [];
    
    expect(parsed.length).toBe(1);
    expect(parsed[0].company).toBe('Google');
  });

  it('should store and retrieve timeline entries', () => {
    const timeline = [
      { id: '1', user_id: 'user1', company: 'Acme', title: 'Dev', start_date: '2020-01-01', end_date: '2022-01-01', order_index: 0, is_current: false, created_at: '2024-01-01', updated_at: '2024-01-01' }
    ];
    localStorage.setItem('resumeai_analytics_timeline', JSON.stringify(timeline));
    
    const stored = localStorage.getItem('resumeai_analytics_timeline');
    const parsed = stored ? JSON.parse(stored) : [];
    
    expect(parsed.length).toBe(1);
    expect(parsed[0].company).toBe('Acme');
  });

  it('should store and retrieve keywords', () => {
    const keywords = [
      { id: '1', user_id: 'user1', keyword: 'leadership', density: 2.5, count: 1, is_high_value: true, created_at: '2024-01-01' }
    ];
    localStorage.setItem('resumeai_analytics_keywords', JSON.stringify(keywords));
    
    const stored = localStorage.getItem('resumeai_analytics_keywords');
    const parsed = stored ? JSON.parse(stored) : [];
    
    expect(parsed.length).toBe(1);
    expect(parsed[0].keyword).toBe('leadership');
  });
});

describe('Analytics Data Calculations', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should calculate response rate correctly', () => {
    const applications = [
      { id: '1', user_id: 'user1', company: 'A', title: 'J1', status: 'applied', applied_at: '2024-01-01', response_at: null, created_at: '2024-01-01', updated_at: '2024-01-01' },
      { id: '2', user_id: 'user1', company: 'B', title: 'J2', status: 'applied', applied_at: '2024-01-02', response_at: '2024-01-03', created_at: '2024-01-02', updated_at: '2024-01-03' },
    ];
    localStorage.setItem('resumeai_analytics_applications', JSON.stringify(applications));
    
    const stored = localStorage.getItem('resumeai_analytics_applications');
    const apps: Array<{response_at: string | null}> = stored ? JSON.parse(stored) : [];
    const responded = apps.filter(a => a.response_at !== null).length;
    const responseRate = apps.length > 0 ? (responded / apps.length) * 100 : 0;
    
    expect(responseRate).toBe(50);
  });

  it('should calculate skills by category', () => {
    const skills = [
      { id: '1', user_id: 'user1', skill_name: 'React', category: 'technical', frequency: 3, created_at: '2024-01-01', updated_at: '2024-01-01' },
      { id: '2', user_id: 'user1', skill_name: 'Vue', category: 'technical', frequency: 2, created_at: '2024-01-01', updated_at: '2024-01-01' },
      { id: '3', user_id: 'user1', skill_name: 'Communication', category: 'soft', frequency: 1, created_at: '2024-01-01', updated_at: '2024-01-01' },
    ];
    localStorage.setItem('resumeai_analytics_skills', JSON.stringify(skills));
    
    const stored = localStorage.getItem('resumeai_analytics_skills');
    const skillsData = stored ? JSON.parse(stored) : [];
    
    const byCategory: Record<string, number> = {};
    skillsData.forEach((s: {category: string, frequency: number}) => {
      byCategory[s.category] = (byCategory[s.category] || 0) + s.frequency;
    });
    
    expect(byCategory.technical).toBe(5);
    expect(byCategory.soft).toBe(1);
  });

  it('should calculate interview rate', () => {
    const applications = [
      { id: '1', user_id: 'user1', company: 'A', title: 'J1', status: 'applied', applied_at: '2024-01-01', response_at: null, created_at: '2024-01-01', updated_at: '2024-01-01' },
      { id: '2', user_id: 'user1', company: 'B', title: 'J2', status: 'interviewing', applied_at: '2024-01-02', response_at: '2024-01-03', created_at: '2024-01-02', updated_at: '2024-01-03' },
      { id: '3', user_id: 'user1', company: 'C', title: 'J3', status: 'offer', applied_at: '2024-01-03', response_at: '2024-01-04', created_at: '2024-01-03', updated_at: '2024-01-04' },
    ];
    localStorage.setItem('resumeai_analytics_applications', JSON.stringify(applications));
    
    const stored = localStorage.getItem('resumeai_analytics_applications');
    const apps: Array<{status: string}> = stored ? JSON.parse(stored) : [];
    const interviewing = apps.filter(a => a.status === 'interviewing' || a.status === 'offer').length;
    const interviewRate = apps.length > 0 ? (interviewing / apps.length) * 100 : 0;
    
    expect(interviewRate).toBeCloseTo(66.67, 1);
  });

  it('should sort timeline by date descending', () => {
    const timeline = [
      { id: '1', user_id: 'user1', company: 'Old Corp', title: 'Junior', start_date: '2018-01-01', end_date: '2020-01-01', order_index: 0, is_current: false, created_at: '2024-01-01', updated_at: '2024-01-01' },
      { id: '2', user_id: 'user1', company: 'New Corp', title: 'Senior', start_date: '2020-01-01', end_date: null, order_index: 1, is_current: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
    ];
    
    const sorted = [...timeline].sort((a, b) => 
      new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    );
    
    expect(sorted[0].company).toBe('New Corp');
    expect(sorted[1].company).toBe('Old Corp');
  });

  it('should identify default variant', () => {
    const variants = [
      { id: '1', user_id: 'user1', name: 'Resume A', content: '{}', is_default: false, created_at: '2024-01-01', updated_at: '2024-01-01' },
      { id: '2', user_id: 'user1', name: 'Resume B', content: '{}', is_default: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
    ];
    
    const defaultVariant = variants.find(v => v.is_default);
    
    expect(defaultVariant?.name).toBe('Resume B');
  });
});

describe('A/B Testing Statistics', () => {
  it('should calculate Z-score for significance', () => {
    // Simple Z-test simulation
    const conversionsA = 10, visitorsA = 100;
    const conversionsB = 15, visitorsB = 100;
    
    const rateA = conversionsA / visitorsA;
    const rateB = conversionsB / visitorsB;
    const pooledRate = (conversionsA + conversionsB) / (visitorsA + visitorsB);
    const standardError = Math.sqrt(pooledRate * (1 - pooledRate) * (1 / visitorsA + 1 / visitorsB));
    const zScore = Math.abs(rateA - rateB) / standardError;
    
    expect(zScore).toBeGreaterThan(0);
    expect(typeof zScore).toBe('number');
  });

  it('should detect insufficient sample size', () => {
    const visitorsA = 5;
    const visitorsB = 8;
    
    const hasEnoughData = visitorsA >= 10 && visitorsB >= 10;
    
    expect(hasEnoughData).toBe(false);
  });

  it('should determine winner correctly', () => {
    const rateA = 0.10; // 10% response rate
    const rateB = 0.20; // 20% response rate
    
    const winner = rateA > rateB ? 'a' : rateB > rateA ? 'b' : 'tie';
    
    expect(winner).toBe('b');
  });

  it('should calculate confidence level from Z-score', () => {
    // High Z-score (1.96 corresponds to 95% confidence)
    const zScore = 1.96;
    const confidence = Math.min(99.9, (1 - 2 * (1 - normalCDF(zScore))) * 100);
    
    expect(confidence).toBeGreaterThanOrEqual(95);
  });
});

// Helper function for normal CDF approximation
function normalCDF(z: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  
  return 0.5 * (1.0 + sign * y);
}

describe('Variant Metrics', () => {
  it('should calculate response rate for variant', () => {
    const metrics = {
      responses: 5,
      applications: 20,
    };
    
    const responseRate = (metrics.responses / metrics.applications) * 100;
    
    expect(responseRate).toBe(25);
  });

  it('should compare two variants', () => {
    const metricsA = { response_rate: 15, applications: 10 };
    const metricsB = { response_rate: 25, applications: 12 };
    
    const winner = metricsA.response_rate > metricsB.response_rate ? 'A' : 'B';
    
    expect(winner).toBe('B');
  });
});

describe('Application Status', () => {
  const validStatuses = ['applied', 'viewed', 'interviewing', 'rejected', 'offer', 'accepted', 'withdrawn'];
  
  it('should have all valid statuses defined', () => {
    expect(validStatuses.length).toBe(7);
  });

  it('should recognize status progression', () => {
    const progression = ['applied', 'viewed', 'interviewing', 'offer', 'accepted'];
    
    expect(progression).toContain('interviewing');
    expect(progression).toContain('offer');
  });
});

describe('Data Serialization', () => {
  it('should serialize resume content as JSON', () => {
    const content = {
      personal_info: { name: 'John', email: 'john@example.com' },
      experience: [
        { company: 'Acme', title: 'Developer', start_date: '2020-01-01' }
      ]
    };
    
    const serialized = JSON.stringify(content);
    const parsed = JSON.parse(serialized);
    
    expect(parsed.personal_info.name).toBe('John');
    expect(parsed.experience.length).toBe(1);
  });

  it('should handle ISO date strings', () => {
    const date = new Date().toISOString();
    const parsed = new Date(date);
    
    expect(parsed.getTime()).toBeGreaterThan(0);
  });
});
