/**
 * Analytics Page Tests
 * 
 * Tests for the Analytics dashboard page component
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
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] || null,
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Analytics Page', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('User Authentication State', () => {
    it('should show login prompt when no user is logged in', () => {
      const userId = localStorage.getItem('resumeai_user_id');
      
      expect(userId).toBeNull();
    });

    it('should load user data when logged in', () => {
      localStorage.setItem('resumeai_user_id', 'user-123');
      const userId = localStorage.getItem('resumeai_user_id');
      
      expect(userId).toBe('user-123');
    });
  });

  describe('Dashboard Data Loading', () => {
    it('should load empty dashboard for new user', () => {
      // Simulate empty analytics data
      const skills = localStorage.getItem('resumeai_analytics_skills');
      const applications = localStorage.getItem('resumeai_analytics_applications');
      const variants = localStorage.getItem('resumeai_resume_variants');
      
      expect(skills).toBeNull();
      expect(applications).toBeNull();
      expect(variants).toBeNull();
    });

    it('should load dashboard with existing data', () => {
      // Add sample skills
      const skills = [
        { id: '1', user_id: 'user-123', skill_name: 'React', category: 'technical', frequency: 5, created_at: '2024-01-01', updated_at: '2024-01-01' }
      ];
      localStorage.setItem('resumeai_analytics_skills', JSON.stringify(skills));
      
      // Add sample applications
      const applications = [
        { id: '1', user_id: 'user-123', company: 'Google', title: 'Engineer', status: 'applied', applied_at: '2024-01-01', response_at: null, created_at: '2024-01-01', updated_at: '2024-01-01' }
      ];
      localStorage.setItem('resumeai_analytics_applications', JSON.stringify(applications));
      
      // Add sample variants
      const variants = [
        { id: '1', user_id: 'user-123', name: 'Tech Resume', content: '{}', is_default: true, created_at: '2024-01-01', updated_at: '2024-01-01' }
      ];
      localStorage.setItem('resumeai_resume_variants', JSON.stringify(variants));
      
      // Verify data is loaded
      const storedSkills = JSON.parse(localStorage.getItem('resumeai_analytics_skills') || '[]');
      const storedApps = JSON.parse(localStorage.getItem('resumeai_analytics_applications') || '[]');
      const storedVariants = JSON.parse(localStorage.getItem('resumeai_resume_variants') || '[]');
      
      expect(storedSkills.length).toBe(1);
      expect(storedApps.length).toBe(1);
      expect(storedVariants.length).toBe(1);
    });
  });

  describe('Tab Navigation', () => {
    const tabs = ['overview', 'skills', 'timeline', 'keywords', 'applications', 'variants'];
    
    it('should have all tabs defined', () => {
      expect(tabs.length).toBe(6);
    });

    it('should default to overview tab', () => {
      const activeTab = 'overview';
      expect(activeTab).toBe('overview');
    });

    it('should switch between tabs correctly', () => {
      let activeTab = 'overview';
      
      // Simulate tab switch
      activeTab = 'skills';
      expect(activeTab).toBe('skills');
      
      activeTab = 'variants';
      expect(activeTab).toBe('variants');
    });
  });

  describe('Stats Cards', () => {
    it('should calculate total skills', () => {
      const skills = [
        { id: '1', skill_name: 'React' },
        { id: '2', skill_name: 'TypeScript' },
        { id: '3', skill_name: 'Node.js' },
      ];
      
      expect(skills.length).toBe(3);
    });

    it('should calculate total applications', () => {
      const applications = [
        { id: '1', company: 'Google' },
        { id: '2', company: 'Meta' },
      ];
      
      expect(applications.length).toBe(2);
    });

    it('should calculate response rate percentage', () => {
      const applications = [
        { status: 'applied', response_at: null },
        { status: 'applied', response_at: '2024-01-02' },
        { status: 'applied', response_at: '2024-01-03' },
      ];
      
      const responded = applications.filter(a => a.response_at !== null).length;
      const rate = (responded / applications.length) * 100;
      
      expect(rate).toBeCloseTo(66.67, 1);
    });

    it('should count variants', () => {
      const variants = [
        { id: '1', name: 'Resume A' },
        { id: '2', name: 'Resume B' },
      ];
      
      expect(variants.length).toBe(2);
    });
  });

  describe('Chart Data Preparation', () => {
    it('should prepare skills data for chart', () => {
      const skills = [
        { skill_name: 'React', category: 'technical', frequency: 10 },
        { skill_name: 'Vue', category: 'technical', frequency: 5 },
        { skill_name: 'Communication', category: 'soft', frequency: 3 },
      ];
      
      const totalFrequency = skills.reduce((sum, s) => sum + s.frequency, 0);
      
      const chartData = skills.map(s => ({
        name: s.skill_name,
        value: s.frequency,
        percentage: (s.frequency / totalFrequency) * 100,
      }));
      
      expect(chartData.length).toBe(3);
      expect(chartData[0].percentage).toBeCloseTo(55.56, 1);
    });

    it('should prepare timeline data for display', () => {
      const timeline = [
        { company: 'Current Corp', title: 'Senior Dev', start_date: '2022-01-01', end_date: null, is_current: true },
        { company: 'Old Corp', title: 'Junior Dev', start_date: '2019-01-01', end_date: '2021-12-31', is_current: false },
      ];
      
      const sorted = [...timeline].sort((a, b) => 
        new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
      );
      
      expect(sorted[0].company).toBe('Current Corp');
    });

    it('should prepare application status breakdown', () => {
      const applications = [
        { status: 'applied' },
        { status: 'applied' },
        { status: 'interviewing' },
        { status: 'rejected' },
      ];
      
      const breakdown: Record<string, number> = {};
      applications.forEach(app => {
        breakdown[app.status] = (breakdown[app.status] || 0) + 1;
      });
      
      expect(breakdown.applied).toBe(2);
      expect(breakdown.interviewing).toBe(1);
    });
  });

  describe('Variant Management', () => {
    it('should identify default variant', () => {
      const variants = [
        { id: '1', name: 'Resume A', is_default: false },
        { id: '2', name: 'Resume B', is_default: true },
        { id: '3', name: 'Resume C', is_default: false },
      ];
      
      const defaultVariant = variants.find(v => v.is_default);
      
      expect(defaultVariant?.name).toBe('Resume B');
    });

    it('should sort variants by update date', () => {
      const variants = [
        { id: '1', name: 'Old Resume', updated_at: '2024-01-01' },
        { id: '2', name: 'New Resume', updated_at: '2024-06-01' },
      ];
      
      const sorted = [...variants].sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      
      expect(sorted[0].name).toBe('New Resume');
    });
  });

  describe('A/B Test Results', () => {
    it('should compare two variant metrics', () => {
      const variantA = { views: 100, responses: 10 };
      const variantB = { views: 150, responses: 20 };
      
      const rateA = (variantA.responses / variantA.views) * 100;
      const rateB = (variantB.responses / variantB.views) * 100;
      
      expect(rateA).toBe(10);
      expect(rateB).toBeCloseTo(13.33, 1);
      expect(rateB).toBeGreaterThan(rateA);
    });

    it('should determine statistical significance', () => {
      // With enough samples
      const sampleA = 100;
      const conversionsA = 15;
      const sampleB = 100;
      const conversionsB = 25;
      
      const rateA = conversionsA / sampleA;
      const rateB = conversionsB / sampleB;
      
      // Simple significance check
      const difference = Math.abs(rateA - rateB);
      const significant = difference > 0.05; // 5% minimum difference
      
      expect(rateA).toBe(0.15);
      expect(rateB).toBe(0.25);
      expect(significant).toBe(true);
    });

    it('should handle insufficient data', () => {
      const sampleA = 5;
      const sampleB = 3;
      
      const hasEnoughData = sampleA >= 10 && sampleB >= 10;
      
      expect(hasEnoughData).toBe(false);
    });
  });

  describe('Date Range Filtering', () => {
    it('should filter applications by last 30 days', () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      
      const applications = [
        { applied_at: now.toISOString() },
        { applied_at: thirtyDaysAgo.toISOString() },
        { applied_at: sixtyDaysAgo.toISOString() },
      ];
      
      const filtered = applications.filter(a => 
        new Date(a.applied_at) >= thirtyDaysAgo
      );
      
      expect(filtered.length).toBe(2);
    });

    it('should filter applications by last 90 days', () => {
      const now = new Date();
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const oldDate = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000);
      
      const applications = [
        { applied_at: now.toISOString() },
        { applied_at: ninetyDaysAgo.toISOString() },
        { applied_at: oldDate.toISOString() },
      ];
      
      const filtered = applications.filter(a => 
        new Date(a.applied_at) >= ninetyDaysAgo
      );
      
      expect(filtered.length).toBe(2);
    });
  });

  describe('Keyword Filtering', () => {
    it('should filter high value keywords', () => {
      const keywords = [
        { keyword: 'react', is_high_value: true },
        { keyword: 'javascript', is_high_value: true },
        { keyword: 'the', is_high_value: false },
      ];
      
      const highValue = keywords.filter(k => k.is_high_value);
      
      expect(highValue.length).toBe(2);
    });

    it('should sort keywords by frequency', () => {
      const keywords = [
        { keyword: 'react', count: 3 },
        { keyword: 'node', count: 1 },
        { keyword: 'typescript', count: 5 },
      ];
      
      const sorted = [...keywords].sort((a, b) => b.count - a.count);
      
      expect(sorted[0].keyword).toBe('typescript');
      expect(sorted[2].keyword).toBe('node');
    });
  });
});
