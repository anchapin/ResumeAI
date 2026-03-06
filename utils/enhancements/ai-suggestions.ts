/**
 * AI-Powered Suggestions Module
 *
 * Provides smart recommendations based on job descriptions
 * and resume content analysis.
 *
 * Features:
 * - Job description keyword extraction
 * - Resume improvement suggestions
 * - Skills gap analysis
 * - ATS compatibility checks
 */

export interface JobDescription {
  title: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  experienceLevel: string;
}

export interface ResumeAnalysis {
  skills: string[];
  experience: ExperienceItem[];
  education: EducationItem[];
  overallScore: number;
  atsScore: number;
}

export interface ExperienceItem {
  title: string;
  company: string;
  highlights: string[];
}

export interface EducationItem {
  degree: string;
  field: string;
  institution: string;
}

export interface Suggestion {
  category: 'skills' | 'experience' | 'education' | 'formatting' | 'ats';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action?: string;
}

// Resume data structure for AI suggestions
export interface AIRecommendationData {
  basics?: {
    email?: string;
    phone?: string;
    summary?: string;
  };
  work?: Array<{
    summary?: string;
    highlights?: string[];
  }>;
  education?: unknown[];
  skills?: string[];
  [key: string]: unknown;
}

/**
 * Extract keywords from job description
 */
export function extractJobKeywords(jobDescription: string): string[] {
  const commonWords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'from',
    'as',
    'is',
    'was',
    'are',
    'were',
    'been',
    'be',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'must',
    'shall',
    'can',
    'need',
    'this',
    'that',
    'these',
    'those',
    'i',
    'you',
    'he',
    'she',
    'it',
    'we',
    'they',
  ]);

  const words = jobDescription
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !commonWords.has(word));

  // Count frequency
  const frequency: Record<string, number> = {};
  words.forEach((word) => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  // Return top keywords
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
}

/**
 * Analyze skills gap between resume and job description
 */
export function analyzeSkillsGap(
  resumeSkills: string[],
  jobRequirements: string[],
): { matched: string[]; missing: string[]; partial: string[] } {
  const resumeSkillsLower = resumeSkills.map((s) => s.toLowerCase());

  const matched: string[] = [];
  const missing: string[] = [];
  const partial: string[] = [];

  jobRequirements.forEach((req) => {
    const reqLower = req.toLowerCase();
    const found = resumeSkillsLower.find(
      (s) => s === reqLower || s.includes(reqLower) || reqLower.includes(s),
    );

    if (found) {
      matched.push(req);
    } else if (reqLower.split(' ').length > 1) {
      // Check for partial matches in multi-word skills
      const hasPartial = resumeSkillsLower.some((s) =>
        reqLower.split(' ').some((part) => part.length > 3 && s.includes(part)),
      );
      if (hasPartial) {
        partial.push(req);
      } else {
        missing.push(req);
      }
    } else {
      missing.push(req);
    }
  });

  return { matched, missing, partial };
}

/**
 * Calculate ATS (Applicant Tracking System) compatibility score
 */
export function calculateATSScore(resumeData: AIRecommendationData): number {
  let score = 0;
  const maxScore = 100;

  // Check for required sections (40 points)
  const requiredSections = ['basics', 'work', 'education', 'skills'];
  const hasAllSections = requiredSections.every((section) => resumeData[section]);
  if (hasAllSections) score += 40;

  // Check for contact info (20 points)
  if (resumeData.basics?.email) score += 10;
  if (resumeData.basics?.phone) score += 10;

  // Check for work experience details (20 points)
  if (resumeData.work && resumeData.work.length > 0) {
    const hasDetails = resumeData.work.every(
      (job: { summary?: string; highlights?: string[] }) =>
        job.summary || (job.highlights && job.highlights.length > 0),
    );
    if (hasDetails) score += 20;
  }

  // Check for skills section (10 points)
  if (resumeData.skills && resumeData.skills.length > 0) score += 10;

  return Math.min(score, maxScore);
}

/**
 * Generate improvement suggestions based on job description
 */
export function generateSuggestions(
  resumeData: AIRecommendationData,
  jobDescription: string,
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // Extract job keywords
  const jobKeywords = extractJobKeywords(jobDescription);

  // Analyze skills gap
  const resumeSkills = resumeData.skills || [];
  const skillsAnalysis = analyzeSkillsGap(resumeSkills, jobKeywords);

  // Add skills suggestions
  if (skillsAnalysis.missing.length > 0) {
    suggestions.push({
      category: 'skills',
      priority: 'high',
      title: 'Add missing skills',
      description: `Consider adding these skills mentioned in the job: ${skillsAnalysis.missing.slice(0, 5).join(', ')}`,
      action: 'Update your skills section',
    });
  }

  // Check ATS score
  const atsScore = calculateATSScore(resumeData);
  if (atsScore < 70) {
    suggestions.push({
      category: 'ats',
      priority: 'high',
      title: 'Improve ATS compatibility',
      description: `Your resume scores ${atsScore}/100 on ATS compatibility. Add more details to improve visibility.`,
      action: 'Review ATS checklist',
    });
  }

  // Check for quantifiable achievements
  const hasQuantifiedAchievements = resumeData.work?.some((job: { highlights?: string[] }) =>
    job.highlights?.some((h: string) => /\d+/.test(h)),
  );

  if (!hasQuantifiedAchievements) {
    suggestions.push({
      category: 'experience',
      priority: 'medium',
      title: 'Add quantified achievements',
      description:
        'Use numbers and metrics to describe your achievements (e.g., "Increased sales by 25%")',
      action: 'Update work experience',
    });
  }

  return suggestions.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

/**
 * Get formatting suggestions for better readability
 */
export function getFormattingSuggestions(resumeData: AIRecommendationData): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // Check summary length
  if (resumeData.basics?.summary && resumeData.basics.summary.length > 200) {
    suggestions.push({
      category: 'formatting',
      priority: 'low',
      title: 'Shorten summary',
      description: 'Your summary is quite long. Consider keeping it under 200 characters.',
    });
  }

  // Check bullet points
  const totalBullets =
    resumeData.work?.reduce(
      (sum: number, job: { highlights?: string[] }) => sum + (job.highlights?.length || 0),
      0,
    ) || 0;

  if (totalBullets < 5) {
    suggestions.push({
      category: 'formatting',
      priority: 'medium',
      title: 'Add more bullet points',
      description: `You have ${totalBullets} bullet points. Consider adding more to highlight your achievements.`,
    });
  }

  return suggestions;
}
