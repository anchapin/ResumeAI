/**
 * Utility functions for resume versioning and history management
 */

import { ResumeVersion } from '../types';

/**
 * Compare two resume versions to detect changes
 * @param version1 - First version
 * @param version2 - Second version
 * @returns Array of changed sections
 */
export function detectVersionChanges(version1: ResumeVersion, version2: ResumeVersion): string[] {
  const changes: string[] = [];
  const data1 = version1.data;
  const data2 = version2.data;

  // Check basic info
  if (JSON.stringify(data1.basics) !== JSON.stringify(data2.basics)) {
    changes.push('basics');
  }

  // Check work experience
  const work1 = JSON.stringify(data1.work);
  const work2 = JSON.stringify(data2.work);
  if (work1 !== work2) {
    changes.push('work');
  }

  // Check education
  const edu1 = JSON.stringify(data1.education);
  const edu2 = JSON.stringify(data2.education);
  if (edu1 !== edu2) {
    changes.push('education');
  }

  // Check skills
  const skills1 = JSON.stringify(data1.skills);
  const skills2 = JSON.stringify(data2.skills);
  if (skills1 !== skills2) {
    changes.push('skills');
  }

  // Check projects
  const projects1 = JSON.stringify(data1.projects);
  const projects2 = JSON.stringify(data2.projects);
  if (projects1 !== projects2) {
    changes.push('projects');
  }

  return changes;
}

/**
 * Format version number for display
 * @param versionNumber - Version number
 * @returns Formatted version string
 */
export function formatVersionNumber(versionNumber: number): string {
  return `v${versionNumber}`;
}

/**
 * Get time difference string for version timestamps
 * @param createdAt - ISO timestamp string
 * @returns Human-readable time difference
 */
export function getVersionTimeAgo(createdAt: string): string {
  const date = new Date(createdAt);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Generate a change description based on detected changes
 * @param changes - Array of changed sections
 * @returns Descriptive change text
 */
export function generateChangeDescription(changes: string[]): string {
  if (changes.length === 0) {
    return 'No changes';
  }

  if (changes.length === 1) {
    return `Updated ${changes[0]}`;
  }

  if (changes.length === 2) {
    return `Updated ${changes.join(' and ')}`;
  }

  const last = changes.pop();
  return `Updated ${changes.join(', ')}, and ${last}`;
}
