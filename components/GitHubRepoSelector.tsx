import React, { useEffect, useCallback } from 'react';
import { useGitHubRepositories } from '../hooks/useGitHubRepositories';
import { GitHubRepoCard } from './GitHubRepoCard';
import { GitHubRepoFilters } from './GitHubRepoFilters';
import Dialog from './ui/Dialog';
import Button from './ui/Button';

/**
 * Props for GitHubRepoSelector component
 */
export interface GitHubRepoSelectorProps {
  isOpen: boolean;
  onComplete: (selectedIds: number[]) => void;
  onCancel: () => void;
}

/**
 * Pagination Component
 */
const Pagination: React.FC<{
  currentPage: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
  onLoadMore: () => void;
}> = ({ currentPage, hasMore, onPageChange, onLoadMore }) => {
  return (
    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
      <div className="text-sm text-slate-600">
        Page {currentPage} {hasMore && '+ more'}
      </div>
      <div className="flex gap-2">
        {currentPage > 1 && (
          <Button
            variant="secondary"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <span className="material-symbols-outlined text-[18px] mr-1">chevron_left</span>
            Previous
          </Button>
        )}
        {hasMore && (
          <Button variant="primary" onClick={onLoadMore}>
            Load More
            <span className="material-symbols-outlined text-[18px] ml-1">chevron_right</span>
          </Button>
        )}
      </div>
    </div>
  );
};

/**
 * Loading Skeleton for Repository Cards
 */
const RepoCardSkeleton: React.FC = () => (
  <div className="border border-slate-200 rounded-xl p-4 animate-pulse bg-white">
    <div className="flex items-start gap-3 mb-3">
      <div className="w-4 h-4 bg-slate-200 rounded mt-1" />
      <div className="flex-1">
        <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />
        <div className="h-3 bg-slate-200 rounded w-1/4" />
      </div>
    </div>
    <div className="h-4 bg-slate-200 rounded w-full mb-2" />
    <div className="h-4 bg-slate-200 rounded w-2/3 mb-3" />
    <div className="flex gap-2 mb-3">
      <div className="h-5 w-16 bg-slate-200 rounded-full" />
      <div className="h-5 w-12 bg-slate-200 rounded-full" />
      <div className="h-5 w-20 bg-slate-200 rounded-full" />
    </div>
    <div className="h-3 bg-slate-200 rounded w-1/3" />
  </div>
);

/**
 * Empty State Component
 */
const EmptyState: React.FC<{
  hasSearchQuery: boolean;
  onRetry: () => void;
  isLoading: boolean;
}> = ({ hasSearchQuery, onRetry, isLoading }) => {
  if (isLoading) return null;

  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="material-symbols-outlined text-slate-400 text-[32px]">
          {hasSearchQuery ? 'search_off' : 'folder_open'}
        </span>
      </div>
      <h4 className="font-bold text-slate-900 mb-2">
        {hasSearchQuery ? 'No repositories found' : 'No repositories available'}
      </h4>
      <p className="text-slate-500 text-sm mb-4 max-w-md mx-auto">
        {hasSearchQuery
          ? 'Try adjusting your search query or filters to find what you\'re looking for.'
          : 'It looks like you don\'t have any repositories yet. Create a repository on GitHub and it will appear here.'}
      </p>
      {hasSearchQuery && (
        <Button variant="secondary" onClick={onRetry}>
          Clear Search
        </Button>
      )}
    </div>
  );
};

/**
 * Error State Component
 */
const ErrorState: React.FC<{
  error: string;
  onRetry: () => void;
  isConnectionError?: boolean;
}> = ({ error, onRetry, isConnectionError }) => (
  <div className="text-center py-12">
    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <span className="material-symbols-outlined text-red-600 text-[32px]">
        {isConnectionError ? 'link_off' : 'error'}
      </span>
    </div>
    <h4 className="font-bold text-slate-900 mb-2">
      {isConnectionError ? 'GitHub Not Connected' : 'Failed to Load Repositories'}
    </h4>
    <p className="text-slate-500 text-sm mb-4 max-w-md mx-auto">{error}</p>
    <Button variant="primary" onClick={onRetry}>
      {isConnectionError ? 'Connect GitHub' : 'Try Again'}
    </Button>
  </div>
);

/**
 * GitHub Repository Selector Component
 *
 * Main component for browsing and selecting GitHub repositories for import.
 */
export const GitHubRepoSelector: React.FC<GitHubRepoSelectorProps> = ({
  isOpen,
  onComplete,
  onCancel,
}) => {
  const {
    repositories,
    selectedRepoIds,
    isFetchingRepos,
    reposError,
    searchQuery,
    filterType,
    sortBy,
    sortDirection,
    currentPage,
    hasMoreRepos,
    isConnected,
    isCheckingConnection,
    fetchGitHubRepositories,
    toggleRepoSelection,
    selectAllRepos,
    clearRepoSelection,
    setSearchQuery,
    setFilterType,
    setSortBy,
    setSortDirection,
    setCurrentPage,
    refreshConnection,
  } = useGitHubRepositories();

  // Fetch repositories on mount
  useEffect(() => {
    if (isOpen && isConnected && !isCheckingConnection) {
      fetchGitHubRepositories(1);
    }
  }, [isOpen, isConnected, isCheckingConnection, fetchGitHubRepositories]);

  // Handle loading more repositories
  const handleLoadMore = useCallback(() => {
    fetchGitHubRepositories(currentPage + 1);
  }, [fetchGitHubRepositories, currentPage]);

  // Handle completion
  const handleComplete = useCallback(() => {
    onComplete(selectedRepoIds);
  }, [onComplete, selectedRepoIds]);

  // Handle retry
  const handleRetry = useCallback(() => {
    if (!isConnected) {
      refreshConnection();
    } else {
      fetchGitHubRepositories(1);
    }
  }, [isConnected, refreshConnection, fetchGitHubRepositories]);

  // Calculate selected count from filtered repositories
  const selectedCount = selectedRepoIds.length;
  const hasSelectedRepos = selectedCount > 0;

  // Render loading state for connection check
  if (isCheckingConnection) {
    return (
      <Dialog isOpen={isOpen} onClose={onCancel} title="Import GitHub Projects">
        <div className="flex items-center justify-center py-12">
          <span className="material-symbols-outlined animate-spin text-primary-600 text-[48px]">
            progress_activity
          </span>
        </div>
      </Dialog>
    );
  }

  // Render error state if not connected
  if (!isConnected && reposError) {
    return (
      <Dialog isOpen={isOpen} onClose={onCancel} title="Import GitHub Projects">
        <ErrorState
          error={reposError}
          onRetry={handleRetry}
          isConnectionError={reposError.includes('not connected') || reposError.includes('Not authenticated')}
        />
      </Dialog>
    );
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onCancel}
      title="Import GitHub Projects"
      aria-describedby="repo-selector-description"
    >
      <div className="space-y-4">
        {/* Description */}
        <p id="repo-selector-description" className="text-sm text-slate-600">
          Select repositories to import into your resume. You can filter, search, and sort to find
          the projects you want to showcase.
        </p>

        {/* Search and Filters */}
        <GitHubRepoFilters
          searchQuery={searchQuery}
          filterType={filterType}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSearchChange={setSearchQuery}
          onFilterTypeChange={setFilterType}
          onSortByChange={setSortBy}
          onSortDirectionChange={setSortDirection}
        />

        {/* Selection Controls */}
        {repositories.length > 0 && (
          <div className="flex items-center justify-between py-2 border-b border-slate-200">
            <div className="text-sm text-slate-600">
              {selectedCount > 0 ? (
                <span className="font-medium text-primary-600">
                  {selectedCount} repository{selectedCount !== 1 ? 'ies' : 'y'} selected
                </span>
              ) : (
                <span>Select repositories to import</span>
              )}
            </div>
            <div className="flex gap-2">
              {selectedCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearRepoSelection}>
                  Clear Selection
                </Button>
              )}
              {repositories.length > selectedCount && (
                <Button variant="ghost" size="sm" onClick={selectAllRepos}>
                  Select All ({repositories.length})
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Repository Grid */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto pr-2"
          role="list"
          aria-label="GitHub repositories"
          aria-busy={isFetchingRepos}
        >
          {isFetchingRepos && repositories.length === 0 ? (
            // Initial loading skeletons
            Array.from({ length: 6 }).map((_, i) => <RepoCardSkeleton key={i} />)
          ) : repositories.length === 0 ? (
            // Empty state
            <div className="col-span-full">
              <EmptyState
                hasSearchQuery={searchQuery.length > 0}
                onRetry={() => setSearchQuery('')}
                isLoading={isFetchingRepos}
              />
            </div>
          ) : (
            // Repository cards
            repositories.map((repo) => (
              <GitHubRepoCard
                key={repo.id}
                repo={repo}
                isSelected={selectedRepoIds.includes(repo.id)}
                onToggle={() => toggleRepoSelection(repo.id)}
              />
            ))
          )}
        </div>

        {/* Loading More Indicator */}
        {isFetchingRepos && repositories.length > 0 && (
          <div className="flex items-center justify-center py-4">
            <span className="material-symbols-outlined animate-spin text-primary-600 text-[24px]">
              progress_activity
            </span>
            <span className="ml-2 text-sm text-slate-600">Loading more repositories...</span>
          </div>
        )}

        {/* Pagination */}
        {repositories.length > 0 && (
          <Pagination
            currentPage={currentPage}
            hasMore={hasMoreRepos}
            onPageChange={setCurrentPage}
            onLoadMore={handleLoadMore}
          />
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleComplete}
            disabled={!hasSelectedRepos || isFetchingRepos}
          >
            Next: Review Selection ({selectedCount})
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default GitHubRepoSelector;
