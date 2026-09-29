import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalyticsAPI, AnalyticsSkill, AnalyticsApplication, ResumeVariant, ApplicationStatus } from '@/lib/db/analytics';

// Mock the StorageManager
vi.mock('@/lib/storage', () => ({
  StorageManager: {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
  },
}));

describe('AnalyticsAPI', () => {
  const mockUserId = 'user-123';
  
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });
  
  describe('Skills', () => {
    it('should return empty array when no skills exist', () => {
      const skills = AnalyticsAPI.getSkills(mockUserId);
      expect(skills).toEqual([]);
    });
    
    it('should add a new skill', () => {
      const skill = AnalyticsAPI.addSkill({
        user_id: mockUserId,
        skill_name: 'TypeScript',
        category: 'technical',
        frequency: 1,
      });
      
      expect(skill.skill_name).toBe('TypeScript');
      expect(skill.category).toBe('technical');
      expect(skill.id).toBeDefined();
      expect(skill.created_at).toBeDefined();
    });
    
    it('should increment frequency for existing skill', () => {
      AnalyticsAPI.addSkill({
        user_id: mockUserId,
        skill_name: 'React',
        category: 'technical',
        frequency: 1,
      });
      
      const skill = AnalyticsAPI.addSkill({
        user_id: mockUserId,
        skill_name: 'React',
        category: 'technical',
        frequency: 1,
      });
      
      expect(skill.frequency).toBe(2);
    });
    
    it('should filter skills by user', () => {
      AnalyticsAPI.addSkill({
        user_id: mockUserId,
        skill_name: 'Python',
        category: 'technical',
        frequency: 1,
      });
      
      AnalyticsAPI.addSkill({
        user_id: 'other-user',
        skill_name: 'Java',
        category: 'technical',
        frequency: 1,
      });
      
      const userSkills = AnalyticsAPI.getSkills(mockUserId);
      expect(userSkills.length).toBe(1);
      expect(userSkills[0].skill_name).toBe('Python');
    });
  });
  
  describe('Applications', () => {
    it('should add a new application', () => {
      const app = AnalyticsAPI.addApplication({
        user_id: mockUserId,
        company: 'Google',
        title: 'Software Engineer',
        status: 'applied' as ApplicationStatus,
        applied_at: new Date().toISOString(),
        response_at: null,
      });
      
      expect(app.company).toBe('Google');
      expect(app.title).toBe('Software Engineer');
      expect(app.status).toBe('applied');
    });
    
    it('should update application status', () => {
      const app = AnalyticsAPI.addApplication({
        user_id: mockUserId,
        company: 'Meta',
        title: 'Frontend Developer',
        status: 'applied' as ApplicationStatus,
        applied_at: new Date().toISOString(),
        response_at: null,
      });
      
      const updated = AnalyticsAPI.updateApplication(app.id, mockUserId, {
        status: 'interviewing' as ApplicationStatus,
        response_at: new Date().toISOString(),
      });
      
      expect(updated?.status).toBe('interviewing');
      expect(updated?.response_at).not.toBeNull();
    });
    
    it('should calculate response rate in dashboard', () => {
      AnalyticsAPI.addApplication({
        user_id: mockUserId,
        company: 'Company 1',
        title: 'Job 1',
        status: 'applied' as ApplicationStatus,
        applied_at: new Date().toISOString(),
        response_at: null,
      });
      
      AnalyticsAPI.addApplication({
        user_id: mockUserId,
        company: 'Company 2',
        title: 'Job 2',
        status: 'applied' as ApplicationStatus,
        applied_at: new Date().toISOString(),
        response_at: new Date().toISOString(),
      });
      
      const dashboard = AnalyticsAPI.getDashboard(mockUserId);
      
      expect(dashboard.total_applications).toBe(2);
      expect(dashboard.response_rate).toBe(50);
    });
  });
  
  describe('Variants', () => {
    it('should create a new variant', () => {
      const variant = AnalyticsAPI.addVariant({
        user_id: mockUserId,
        name: 'Tech Resume',
        description: 'Resume for tech companies',
        content: JSON.stringify({ name: 'John' }),
        is_default: true,
      });
      
      expect(variant.name).toBe('Tech Resume');
      expect(variant.is_default).toBe(true);
    });
    
    it('should set new default when creating default variant', () => {
      AnalyticsAPI.addVariant({
        user_id: mockUserId,
        name: 'Resume A',
        content: '{}',
        is_default: true,
      });
      
      AnalyticsAPI.addVariant({
        user_id: mockUserId,
        name: 'Resume B',
        content: '{}',
        is_default: true,
      });
      
      const variants = AnalyticsAPI.getVariants(mockUserId);
      const defaults = variants.filter(v => v.is_default);
      
      expect(defaults.length).toBe(1);
      expect(defaults[0].name).toBe('Resume B');
    });
    
    it('should delete a variant', () => {
      const variant = AnalyticsAPI.addVariant({
        user_id: mockUserId,
        name: 'To Delete',
        content: '{}',
        is_default: false,
      });
      
      const result = AnalyticsAPI.deleteVariant(variant.id, mockUserId);
      expect(result).toBe(true);
      
      const variants = AnalyticsAPI.getVariants(mockUserId);
      expect(variants.length).toBe(0);
    });
  });
  
  describe('Dashboard', () => {
    it('should calculate skills by category', () => {
      AnalyticsAPI.addSkill({
        user_id: mockUserId,
        skill_name: 'React',
        category: 'technical',
        frequency: 3,
      });
      
      AnalyticsAPI.addSkill({
        user_id: mockUserId,
        skill_name: 'Vue',
        category: 'technical',
        frequency: 2,
      });
      
      AnalyticsAPI.addSkill({
        user_id: mockUserId,
        skill_name: 'Communication',
        category: 'soft',
        frequency: 1,
      });
      
      const dashboard = AnalyticsAPI.getDashboard(mockUserId);
      
      expect(dashboard.total_skills).toBe(3);
      expect(dashboard.skills_by_category.technical).toBe(5);
      expect(dashboard.skills_by_category.soft).toBe(1);
    });
    
    it('should handle empty dashboard', () => {
      const dashboard = AnalyticsAPI.getDashboard(mockUserId);
      
      expect(dashboard.total_skills).toBe(0);
      expect(dashboard.total_applications).toBe(0);
      expect(dashboard.total_variants).toBe(0);
      expect(dashboard.response_rate).toBe(0);
    });
  });
  
  describe('Timeline', () => {
    it('should add timeline entry', () => {
      const entry = AnalyticsAPI.addTimelineEntry({
        user_id: mockUserId,
        company: 'Acme Corp',
        title: 'Senior Developer',
        start_date: new Date('2020-01-01').toISOString(),
        end_date: new Date('2022-12-31').toISOString(),
        order_index: 0,
        is_current: false,
      });
      
      expect(entry.company).toBe('Acme Corp');
      expect(entry.title).toBe('Senior Developer');
    });
    
    it('should update timeline entry', () => {
      const entry = AnalyticsAPI.addTimelineEntry({
        user_id: mockUserId,
        company: 'Startup',
        title: 'Junior Dev',
        start_date: new Date('2018-01-01').toISOString(),
        end_date: null,
        order_index: 0,
        is_current: true,
      });
      
      const updated = AnalyticsAPI.updateTimelineEntry(entry.id, mockUserId, {
        title: 'Lead Developer',
      });
      
      expect(updated?.title).toBe('Lead Developer');
      expect(updated?.is_current).toBe(true);
    });
    
    it('should delete timeline entry', () => {
      const entry = AnalyticsAPI.addTimelineEntry({
        user_id: mockUserId,
        company: 'Company',
        title: 'Title',
        start_date: new Date().toISOString(),
        end_date: null,
        order_index: 0,
        is_current: false,
      });
      
      const result = AnalyticsAPI.deleteTimelineEntry(entry.id, mockUserId);
      expect(result).toBe(true);
      
      const timeline = AnalyticsAPI.getTimeline(mockUserId);
      expect(timeline.length).toBe(0);
    });
  });
  
  describe('Keywords', () => {
    it('should add keyword', () => {
      const keyword = AnalyticsAPI.addKeyword({
        user_id: mockUserId,
        keyword: 'leadership',
        density: 2.5,
        count: 1,
        is_high_value: true,
      });
      
      expect(keyword.keyword).toBe('leadership');
      expect(keyword.density).toBe(2.5);
      expect(keyword.is_high_value).toBe(true);
    });
    
    it('should increment keyword count', () => {
      AnalyticsAPI.addKeyword({
        user_id: mockUserId,
        keyword: 'agile',
        density: 1.0,
        count: 1,
        is_high_value: false,
      });
      
      const keyword = AnalyticsAPI.addKeyword({
        user_id: mockUserId,
        keyword: 'agile',
        density: 1.0,
        count: 1,
        is_high_value: false,
      });
      
      expect(keyword.count).toBe(2);
    });
  });
});
