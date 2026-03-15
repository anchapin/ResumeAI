import React from 'react';
import { GitHubRepository } from '../utils/githubApi';

/**
 * Language color mapping for GitHub languages
 */
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Java: '#b07219',
  C: '#555555',
  Cpp: '#f34b7d',
  'C++': '#f34b7d',
  'C#': '#178600',
  Ruby: '#701516',
  Go: '#00ADD8',
  Rust: '#dea584',
  PHP: '#4F5D95',
  Swift: '#ffac45',
  Kotlin: '#F18E33',
  Scala: '#c22d40',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  Dart: '#00B4AB',
  Shell: '#89e051',
  'Jupyter Notebook': '#DA5B0B',
  Markdown: '#083fa1',
  JSON: '#292929',
  YAML: '#cb171e',
};

/**
 * Get color for a programming language
 */
function getLanguageColor(language: string | null): string {
  if (!language) return '#888888';
  return LANGUAGE_COLORS[language] || '#888888';
}

/**
 * Format number with K/M suffix for large numbers
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Format relative time (e.g., "2 days ago")
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  return `${Math.floor(diffInSeconds / 31536000)} years ago`;
}

/**
 * Props for GitHubRepoCard component
 */
export interface GitHubRepoCardProps {
  repo: GitHubRepository;
  isSelected: boolean;
  onToggle: () => void;
}

/**
 * GitHub Repository Card Component
 *
 * Displays repository information with selection checkbox
 */
export const GitHubRepoCard: React.FC<GitHubRepoCardProps> = ({
  repo,
  isSelected,
  onToggle,
}) => {
  const languageColor = getLanguageColor(repo.language);

  return (
    <div
      className={`repo-card border rounded-xl p-4 transition-all duration-200 ${
        isSelected
          ? 'border-primary-500 bg-primary-50 shadow-md'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
      }`}
      role="listitem"
    >
      {/* Header with checkbox and name */}
      <div className="flex items-start gap-3 mb-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          aria-label={`Select ${repo.name} for import`}
          className="mt-1 w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500 focus:ring-2 cursor-pointer"
        />
        <div className="flex-1 min-w-0">
          <a
            href={repo.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base font-bold text-slate-900 hover:text-primary-600 transition-colors truncate block"
            title={repo.full_name}
          >
            {repo.name}
          </a>
          {repo.owner?.login && (
            <p className="text-xs text-slate-500 mt-0.5">
              by{' '}
              <a
                href={repo.owner.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary-600"
              >
                @{repo.owner.login}
              </a>
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-slate-600 mb-3 line-clamp-2 min-h-[2.5rem]">
        {repo.description || 'No description'}
      </p>

      {/* Meta information */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-2">
        {/* Language */}
        {repo.language && (
          <span className="inline-flex items-center gap-1.5" title={repo.language}>
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: languageColor }}
              aria-hidden="true"
            />
            <span>{repo.language}</span>
          </span>
        )}

        {/* Stars */}
        <span className="inline-flex items-center gap-1" title={`${repo.stargazers_count} stars`}>
          <span className="material-symbols-outlined text-[14px]">star</span>
          <span>{formatNumber(repo.stargazers_count)}</span>
        </span>

        {/* Forks */}
        <span className="inline-flex items-center gap-1" title={`${repo.forks_count} forks`}>
          <span className="material-symbols-outlined text-[14px]">call_split</span>
          <span>{formatNumber(repo.forks_count)}</span>
        </span>

        {/* Issues */}
        {repo.open_issues_count > 0 && (
          <span
            className="inline-flex items-center gap-1"
            title={`${repo.open_issues_count} open issues`}
          >
            <span className="material-symbols-outlined text-[14px]">bug_report</span>
            <span>{formatNumber(repo.open_issues_count)}</span>
          </span>
        )}
      </div>

      {/* Topics/Tags */}
      {repo.topics && repo.topics.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {repo.topics.slice(0, 5).map((topic) => (
            <span
              key={topic}
              className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full"
            >
              {topic}
            </span>
          ))}
        </div>
      )}

      {/* Last updated */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        <span className="material-symbols-outlined text-[14px]">update</span>
        <span>Updated {formatRelativeTime(repo.updated_at)}</span>
      </div>

      {/* Additional badges */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
        {repo.fork && (
          <span
            className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full"
            title="This is a forked repository"
          >
            <span className="material-symbols-outlined text-[12px] mr-1">call_split</span>
            Fork
          </span>
        )}
        {repo.private && (
          <span
            className="inline-flex items-center px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full"
            title="Private repository"
          >
            <span className="material-symbols-outlined text-[12px] mr-1">lock</span>
            Private
          </span>
        )}
        {repo.archived && (
          <span
            className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full"
            title="Archived repository"
          >
            <span className="material-symbols-outlined text-[12px] mr-1">archive</span>
            Archived
          </span>
        )}
      </div>
    </div>
  );
};

export default GitHubRepoCard;
