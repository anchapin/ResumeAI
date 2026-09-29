/**
 * Analytics Database Schema and Types
 * 
 * Provides TypeScript interfaces for analytics data models.
 * These types support skills distribution, keyword analysis,
 * career timeline, application tracking, and resume variants.
 * 
 * Uses localStorage for persistence (MVP approach).
 */

import { StorageManager } from './storage';

// ============================================================================
// Analytics Skills - Track skills from parsed resumes
// ============================================================================

export interface AnalyticsSkill {
  id: string;
  user_id: string;
  skill_name: string;
  category: 'technical' | 'soft' | 'domain' | 'tool' | 'language' | 'other';
  frequency: number;
  proficiency_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Analytics Keywords - Track keyword density in resumes
// ============================================================================

export interface AnalyticsKeyword {
  id: string;
  user_id: string;
  keyword: string;
  density: number;
  position?: number;
  count: number;
  is_high_value: boolean;
  created_at: string;
}

// ============================================================================
// Analytics Timeline - Career experience timeline
// ============================================================================

export interface AnalyticsTimelineEntry {
  id: string;
  user_id: string;
  company: string;
  title: string;
  start_date: string;
  end_date: string | null;
  description?: string;
  order_index: number;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Analytics Applications - Track job applications
// ============================================================================

export type ApplicationStatus = 
  | 'applied' 
  | 'viewed' 
  | 'interviewing' 
  | 'rejected' 
  | 'offer' 
  | 'accepted' 
  | 'withdrawn';

export interface AnalyticsApplication {
  id: string;
  user_id: string;
  job_id?: string;
  variant_id?: string;
  company: string;
  title: string;
  status: ApplicationStatus;
  source?: string;
  applied_at: string;
  response_at: string | null;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Resume Variants - Store multiple resume versions
// ============================================================================

export interface ResumeVariant {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  content: string; // JSON stringified resume content
  is_default: boolean;
  target_job_title?: string;
  target_company?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Variant Metrics - Track performance of each variant
// ============================================================================

export interface VariantMetric {
  id: string;
  variant_id: string;
  views: number;
  downloads: number;
  applications: number;
  responses: number;
  interviews: number;
  response_rate: number;
  period_start: string;
  period_end: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Dashboard Summary - Aggregated analytics data
// ============================================================================

export interface AnalyticsDashboard {
  total_skills: number;
  skills_by_category: Record<string, number>;
  total_applications: number;
  response_rate: number;
  interview_rate: number;
  applications_by_status: Record<ApplicationStatus, number>;
  applications_over_time: { date: string; count: number }[];
  total_variants: number;
  top_performing_variant?: ResumeVariant;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

// ============================================================================
// Query Types
// ============================================================================

export interface SkillsQueryParams {
  category?: string;
  min_frequency?: number;
  limit?: number;
  sort_by?: 'frequency' | 'name' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

export interface TimelineQueryParams {
  limit?: number;
  include_current?: boolean;
}

export interface ApplicationsQueryParams {
  status?: ApplicationStatus;
  variant_id?: string;
  company?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export interface VariantsQueryParams {
  is_default?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface MetricsQueryParams {
  variant_id: string;
  period_start?: string;
  period_end?: string;
}

// ============================================================================
// Statistics Types
// ============================================================================

export interface ABTestResult {
  variant_a_id: string;
  variant_b_id: string;
  metric_name: string;
  variant_a_value: number;
  variant_b_value: number;
  winner: 'a' | 'b' | 'insufficient_data';
  confidence_level: number;
  sample_size_a: number;
  sample_size_b: number;
  recommendation: string;
}

export interface VariantComparison {
  variant_a: ResumeVariant;
  variant_b: ResumeVariant;
  metrics_a: VariantMetric;
  metrics_b: VariantMetric;
  differences: {
    field: string;
    value_a: string | number;
    value_b: string | number;
  }[];
}

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
  SKILLS: 'resumeai_analytics_skills',
  KEYWORDS: 'resumeai_analytics_keywords',
  TIMELINE: 'resumeai_analytics_timeline',
  APPLICATIONS: 'resumeai_analytics_applications',
  VARIANTS: 'resumeai_resume_variants',
  METRICS: 'resumeai_variant_metrics',
};

// ============================================================================
// Helper Functions
// ============================================================================

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

// ============================================================================
// Skills API
// ============================================================================

export const AnalyticsAPI = {
  // Skills
  getSkills(userId: string): AnalyticsSkill[] {
    const data = StorageManager.getItem<string>(STORAGE_KEYS.SKILLS);
    if (!data) return [];
    try {
      const skills: AnalyticsSkill[] = JSON.parse(data);
      return skills.filter(s => s.user_id === userId);
    } catch {
      return [];
    }
  },

  addSkill(skill: Omit<AnalyticsSkill, 'id' | 'created_at' | 'updated_at'>): AnalyticsSkill {
    const skills = this.getSkills(skill.user_id);
    const existing = skills.find(s => s.skill_name === skill.skill_name);
    
    if (existing) {
      existing.frequency += 1;
      existing.updated_at = now();
      this.saveSkills(skills);
      return existing;
    }
    
    const newSkill: AnalyticsSkill = {
      ...skill,
      id: generateId(),
      created_at: now(),
      updated_at: now(),
    };
    skills.push(newSkill);
    this.saveSkills(skills);
    return newSkill;
  },

  saveSkills(skills: AnalyticsSkill[]): void {
    StorageManager.setItem(STORAGE_KEYS.SKILLS, JSON.stringify(skills), {
      compress: false,
      checkQuota: true,
    });
  },

  // Keywords
  getKeywords(userId: string): AnalyticsKeyword[] {
    const data = StorageManager.getItem<string>(STORAGE_KEYS.KEYWORDS);
    if (!data) return [];
    try {
      const keywords: AnalyticsKeyword[] = JSON.parse(data);
      return keywords.filter(k => k.user_id === userId);
    } catch {
      return [];
    }
  },

  addKeyword(keyword: Omit<AnalyticsKeyword, 'id' | 'created_at'>): AnalyticsKeyword {
    const keywords = this.getKeywords(keyword.user_id);
    const existing = keywords.find(k => k.keyword === keyword.keyword);
    
    if (existing) {
      existing.count += 1;
      this.saveKeywords(keywords);
      return existing;
    }
    
    const newKeyword: AnalyticsKeyword = {
      ...keyword,
      id: generateId(),
      created_at: now(),
    };
    keywords.push(newKeyword);
    this.saveKeywords(keywords);
    return newKeyword;
  },

  saveKeywords(keywords: AnalyticsKeyword[]): void {
    StorageManager.setItem(STORAGE_KEYS.KEYWORDS, JSON.stringify(keywords), {
      compress: false,
      checkQuota: true,
    });
  },

  // Timeline
  getTimeline(userId: string): AnalyticsTimelineEntry[] {
    const data = StorageManager.getItem<string>(STORAGE_KEYS.TIMELINE);
    if (!data) return [];
    try {
      const entries: AnalyticsTimelineEntry[] = JSON.parse(data);
      return entries
        .filter(t => t.user_id === userId)
        .sort((a, b) => a.order_index - b.order_index);
    } catch {
      return [];
    }
  },

  addTimelineEntry(entry: Omit<AnalyticsTimelineEntry, 'id' | 'created_at' | 'updated_at'>): AnalyticsTimelineEntry {
    const timeline = this.getTimeline(entry.user_id);
    const newEntry: AnalyticsTimelineEntry = {
      ...entry,
      id: generateId(),
      created_at: now(),
      updated_at: now(),
    };
    timeline.push(newEntry);
    this.saveTimeline(timeline);
    return newEntry;
  },

  updateTimelineEntry(id: string, userId: string, updates: Partial<AnalyticsTimelineEntry>): AnalyticsTimelineEntry | null {
    const timeline = this.getTimeline(userId);
    const index = timeline.findIndex(t => t.id === id);
    if (index === -1) return null;
    
    timeline[index] = { ...timeline[index], ...updates, updated_at: now() };
    this.saveTimeline(timeline);
    return timeline[index];
  },

  deleteTimelineEntry(id: string, userId: string): boolean {
    const timeline = this.getTimeline(userId);
    const filtered = timeline.filter(t => t.id !== id);
    if (filtered.length === timeline.length) return false;
    this.saveTimeline(filtered);
    return true;
  },

  saveTimeline(timeline: AnalyticsTimelineEntry[]): void {
    StorageManager.setItem(STORAGE_KEYS.TIMELINE, JSON.stringify(timeline), {
      compress: false,
      checkQuota: true,
    });
  },

  // Applications
  getApplications(userId: string): AnalyticsApplication[] {
    const data = StorageManager.getItem<string>(STORAGE_KEYS.APPLICATIONS);
    if (!data) return [];
    try {
      const applications: AnalyticsApplication[] = JSON.parse(data);
      return applications
        .filter(a => a.user_id === userId)
        .sort((a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime());
    } catch {
      return [];
    }
  },

  addApplication(application: Omit<AnalyticsApplication, 'id' | 'created_at' | 'updated_at'>): AnalyticsApplication {
    const applications = this.getApplications(application.user_id);
    const newApplication: AnalyticsApplication = {
      ...application,
      id: generateId(),
      created_at: now(),
      updated_at: now(),
    };
    applications.push(newApplication);
    this.saveApplications(applications);
    return newApplication;
  },

  updateApplication(id: string, userId: string, updates: Partial<AnalyticsApplication>): AnalyticsApplication | null {
    const applications = this.getApplications(userId);
    const index = applications.findIndex(a => a.id === id);
    if (index === -1) return null;
    
    applications[index] = { ...applications[index], ...updates, updated_at: now() };
    this.saveApplications(applications);
    return applications[index];
  },

  saveApplications(applications: AnalyticsApplication[]): void {
    StorageManager.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(applications), {
      compress: false,
      checkQuota: true,
    });
  },

  // Variants
  getVariants(userId: string): ResumeVariant[] {
    const data = StorageManager.getItem<string>(STORAGE_KEYS.VARIANTS);
    if (!data) return [];
    try {
      const variants: ResumeVariant[] = JSON.parse(data);
      return variants.filter(v => v.user_id === userId);
    } catch {
      return [];
    }
  },

  getVariant(id: string, userId: string): ResumeVariant | null {
    const variants = this.getVariants(userId);
    return variants.find(v => v.id === id) || null;
  },

  addVariant(variant: Omit<ResumeVariant, 'id' | 'created_at' | 'updated_at'>): ResumeVariant {
    const variants = this.getVariants(variant.user_id);
    
    // If this is set as default, unset other defaults
    if (variant.is_default) {
      variants.forEach(v => v.is_default = false);
    }
    
    const newVariant: ResumeVariant = {
      ...variant,
      id: generateId(),
      created_at: now(),
      updated_at: now(),
    };
    variants.push(newVariant);
    this.saveVariants(variants);
    return newVariant;
  },

  updateVariant(id: string, userId: string, updates: Partial<ResumeVariant>): ResumeVariant | null {
    const variants = this.getVariants(userId);
    const index = variants.findIndex(v => v.id === id);
    if (index === -1) return null;
    
    // If setting as default, unset other defaults
    if (updates.is_default) {
      variants.forEach(v => v.is_default = false);
    }
    
    variants[index] = { ...variants[index], ...updates, updated_at: now() };
    this.saveVariants(variants);
    return variants[index];
  },

  deleteVariant(id: string, userId: string): boolean {
    const variants = this.getVariants(userId);
    const filtered = variants.filter(v => v.id !== id);
    if (filtered.length === variants.length) return false;
    this.saveVariants(filtered);
    return true;
  },

  saveVariants(variants: ResumeVariant[]): void {
    StorageManager.setItem(STORAGE_KEYS.VARIANTS, JSON.stringify(variants), {
      compress: false,
      checkQuota: true,
    });
  },

  // Metrics
  getMetrics(variantId: string): VariantMetric[] {
    const data = StorageManager.getItem<string>(STORAGE_KEYS.METRICS);
    if (!data) return [];
    try {
      const metrics: VariantMetric[] = JSON.parse(data);
      return metrics.filter(m => m.variant_id === variantId);
    } catch {
      return [];
    }
  },

  addMetric(metric: Omit<VariantMetric, 'id' | 'created_at' | 'updated_at'>): VariantMetric {
    const data = StorageManager.getItem<string>(STORAGE_KEYS.METRICS);
    const metrics: VariantMetric[] = data ? JSON.parse(data) : [];
    
    const newMetric: VariantMetric = {
      ...metric,
      id: generateId(),
      created_at: now(),
      updated_at: now(),
    };
    metrics.push(newMetric);
    
    StorageManager.setItem(STORAGE_KEYS.METRICS, JSON.stringify(metrics), {
      compress: false,
      checkQuota: true,
    });
    
    return newMetric;
  },

  updateMetric(id: string, updates: Partial<VariantMetric>): VariantMetric | null {
    const data = StorageManager.getItem<string>(STORAGE_KEYS.METRICS);
    if (!data) return null;
    
    const metrics: VariantMetric[] = JSON.parse(data);
    const index = metrics.findIndex(m => m.id === id);
    if (index === -1) return null;
    
    metrics[index] = { ...metrics[index], ...updates, updated_at: now() };
    
    StorageManager.setItem(STORAGE_KEYS.METRICS, JSON.stringify(metrics), {
      compress: false,
      checkQuota: true,
    });
    
    return metrics[index];
  },

  // Dashboard
  getDashboard(userId: string): AnalyticsDashboard {
    const skills = this.getSkills(userId);
    const applications = this.getApplications(userId);
    const variants = this.getVariants(userId);
    
    const skillsByCategory = skills.reduce((acc, skill) => {
      acc[skill.category] = (acc[skill.category] || 0) + skill.frequency;
      return acc;
    }, {} as Record<string, number>);
    
    const applicationsByStatus = applications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {} as Record<ApplicationStatus, number>);
    
    const responded = applications.filter(a => a.response_at !== null).length;
    const interviewing = applications.filter(a => a.status === 'interviewing' || a.status === 'offer').length;
    
    // Get top performing variant
    let topPerforming: ResumeVariant | undefined;
    if (variants.length > 0) {
      const variantMetrics = variants.map(v => ({
        variant: v,
        metrics: this.getMetrics(v.id),
      }));
      
      const withMetrics = variantMetrics.filter(vm => vm.metrics.length > 0);
      if (withMetrics.length > 0) {
        const best = withMetrics.reduce((best, current) => {
          const bestRate = current.metrics[0]?.response_rate || 0;
          const currentRate = best.metrics[0]?.response_rate || 0;
          return currentRate > bestRate ? current : best;
        });
        topPerforming = best.variant;
      }
    }
    
    return {
      total_skills: skills.length,
      skills_by_category: skillsByCategory,
      total_applications: applications.length,
      response_rate: applications.length > 0 ? (responded / applications.length) * 100 : 0,
      interview_rate: applications.length > 0 ? (interviewing / applications.length) * 100 : 0,
      applications_by_status: applicationsByStatus,
      applications_over_time: [], // Can be computed from applications
      total_variants: variants.length,
      top_performing_variant: topPerforming,
    };
  },
};
