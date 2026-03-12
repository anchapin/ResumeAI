/**
 * GitHub Dialog Helper Functions
 * Extracted for complexity reduction in GitHubSyncDialog
 */

/**
 * Format date for display
 */
export const formatGitHubDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Updated today';
  if (diffDays === 1) return 'Updated yesterday';
  if (diffDays < 7) return `Updated ${diffDays} days ago`;
  if (diffDays < 30) return `Updated ${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `Updated ${Math.floor(diffDays / 30)} months ago`;
  return `Updated ${Math.floor(diffDays / 365)} years ago`;
};

/**
 * Format number (e.g., 1000 -> 1.0k)
 */
export const formatGitHubNumber = (num: number): string => {
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toString();
};
