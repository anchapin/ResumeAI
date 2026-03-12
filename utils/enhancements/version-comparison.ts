/* eslint-disable complexity */
/**
 * Version Comparison Module
 *
 * Provides side-by-side comparison of resume versions
 * to track changes between versions.
 *
 * Features:
 * - Diff visualization between versions
 * - Change tracking and highlighting
 * - Change statistics
 */

export interface ResumeVersion {
  id: string;
  version: number;
  timestamp: string;
  data: ResumeData;
  changeDescription?: string;
}

export interface ResumeData {
  basics?: {
    name?: string;
    email?: string;
    phone?: string;
    summary?: string;
    location?: string | LocationObject;
    profiles?: Profile[];
  };
  work?: WorkExperience[];
  education?: Education[];
  skills?: Skill[];
  projects?: Project[];
  awards?: Award[];
}

export interface LocationObject {
  address?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  countryCode?: string;
}

export interface Profile {
  network?: string;
  username?: string;
  url?: string;
}

export interface WorkExperience {
  company?: string;
  position?: string;
  startDate?: string;
  endDate?: string;
  summary?: string;
  highlights?: string[];
  location?: string;
}

export interface Education {
  institution?: string;
  area?: string;
  studyType?: string;
  startDate?: string;
  endDate?: string;
  courses?: string[];
  gpa?: string;
}

export interface Skill {
  name?: string;
  level?: string;
  keywords?: string[];
}

export interface Project {
  name?: string;
  description?: string;
  highlights?: string[];
  keywords?: string[];
  startDate?: string;
  endDate?: string;
}

export interface Award {
  title?: string;
  date?: string;
  awarder?: string;
  summary?: string;
}

export interface DiffResult {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  changeType: 'added' | 'removed' | 'modified';
}

export interface ComparisonStats {
  totalChanges: number;
  additions: number;
  removals: number;
  modifications: number;
  sectionsChanged: string[];
}

/**
 * Compare two resume versions and return differences
 */
export function compareVersions(
  oldVersion: ResumeVersion,
  newVersion: ResumeVersion,
): DiffResult[] {
  const differences: DiffResult[] = [];

  // Compare basics section
  if (oldVersion.data.basics || newVersion.data.basics) {
    const basicsDiff = compareObjects(
      oldVersion.data.basics || {},
      newVersion.data.basics || {},
      'basics',
    );
    differences.push(...basicsDiff);
  }

  // Compare work experience
  if (oldVersion.data.work || newVersion.data.work) {
    const workDiff = compareArrays(
      oldVersion.data.work || [],
      newVersion.data.work || [],
      'work',
      (item: WorkExperience) => item.company + (item.position || ''),
    );
    differences.push(...workDiff);
  }

  // Compare education
  if (oldVersion.data.education || newVersion.data.education) {
    const eduDiff = compareArrays(
      oldVersion.data.education || [],
      newVersion.data.education || [],
      'education',
      (item: Education) => item.institution + (item.area || ''),
    );
    differences.push(...eduDiff);
  }

  // Compare skills
  if (oldVersion.data.skills || newVersion.data.skills) {
    const skillsDiff = compareArrays(
      oldVersion.data.skills || [],
      newVersion.data.skills || [],
      'skills',
      (item: Skill) => item.name || '',
    );
    differences.push(...skillsDiff);
  }

  // Compare projects
  if (oldVersion.data.projects || newVersion.data.projects) {
    const projectDiff = compareArrays(
      oldVersion.data.projects || [],
      newVersion.data.projects || [],
      'projects',
      (item: Project) => item.name || '',
    );
    differences.push(...projectDiff);
  }

  return differences;
}

/**
 * Compare two objects and return differences
 */
function compareObjects(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
  prefix: string,
): DiffResult[] {
  const differences: DiffResult[] = [];
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  allKeys.forEach((key) => {
    const oldValue = oldObj[key];
    const newValue = newObj[key];

    if (oldValue === undefined && newValue !== undefined) {
      differences.push({
        field: `${prefix}.${key}`,
        oldValue: null,
        newValue,
        changeType: 'added',
      });
    } else if (oldValue !== undefined && newValue === undefined) {
      differences.push({
        field: `${prefix}.${key}`,
        oldValue,
        newValue: null,
        changeType: 'removed',
      });
    } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      differences.push({
        field: `${prefix}.${key}`,
        oldValue,
        newValue,
        changeType: 'modified',
      });
    }
  });

  return differences;
}

/**
 * Compare two arrays and return differences
 */
function compareArrays<T>(
  oldArray: T[],
  newArray: T[],
  prefix: string,
  keyExtractor: (item: T) => string,
): DiffResult[] {
  const differences: DiffResult[] = [];

  const oldMap = new Map(oldArray.map((item) => [keyExtractor(item), item]));
  const newMap = new Map(newArray.map((item) => [keyExtractor(item), item]));

  // Find removed and modified items
  oldMap.forEach((oldItem, key) => {
    const newItem = newMap.get(key);
    if (!newItem) {
      differences.push({
        field: `${prefix}[${key}]`,
        oldValue: oldItem,
        newValue: null,
        changeType: 'removed',
      });
    } else if (JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
      differences.push({
        field: `${prefix}[${key}]`,
        oldValue: oldItem,
        newValue: newItem,
        changeType: 'modified',
      });
    }
  });

  // Find added items
  newMap.forEach((newItem, key) => {
    if (!oldMap.has(key)) {
      differences.push({
        field: `${prefix}[${key}]`,
        oldValue: null,
        newValue: newItem,
        changeType: 'added',
      });
    }
  });

  return differences;
}

/**
 * Get comparison statistics
 */
export function getComparisonStats(differences: DiffResult[]): ComparisonStats {
  const stats: ComparisonStats = {
    totalChanges: differences.length,
    additions: 0,
    removals: 0,
    modifications: 0,
    sectionsChanged: [],
  };

  differences.forEach((diff) => {
    switch (diff.changeType) {
      case 'added':
        stats.additions++;
        break;
      case 'removed':
        stats.removals++;
        break;
      case 'modified':
        stats.modifications++;
        break;
    }

    // Extract section name
    const section = diff.field.split('.')[0].split('[')[0];
    if (!stats.sectionsChanged.includes(section)) {
      stats.sectionsChanged.push(section);
    }
  });

  return stats;
}

/**
 * Generate a human-readable summary of changes
 */
export function generateChangeSummary(stats: ComparisonStats): string {
  const parts: string[] = [];

  if (stats.additions > 0) {
    parts.push(`${stats.additions} addition${stats.additions > 1 ? 's' : ''}`);
  }
  if (stats.removals > 0) {
    parts.push(`${stats.removals} removal${stats.removals > 1 ? 's' : ''}`);
  }
  if (stats.modifications > 0) {
    parts.push(`${stats.modifications} modification${stats.modifications > 1 ? 's' : ''}`);
  }

  return `Total: ${stats.totalChanges} change${stats.totalChanges !== 1 ? 's' : ''} (${parts.join(', ')})`;
}

/**
 * Get highlighted changes for display
 */
export function getHighlightedChanges(
  differences: DiffResult[],
  maxChanges: number = 10,
): { field: string; display: string }[] {
  return differences.slice(0, maxChanges).map((diff) => {
    let display = '';

    switch (diff.changeType) {
      case 'added':
        display = `+ ${diff.field}: ${JSON.stringify(diff.newValue)}`;
        break;
      case 'removed':
        display = `- ${diff.field}: ${JSON.stringify(diff.oldValue)}`;
        break;
      case 'modified':
        display = `~ ${diff.field}: ${JSON.stringify(diff.oldValue)} → ${JSON.stringify(diff.newValue)}`;
        break;
    }

    return {
      field: diff.field,
      display,
    };
  });
}
