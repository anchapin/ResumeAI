/**
 * Custom hook for managing GitHub repositories state.
 *
 * Provides state management and actions for fetching, filtering,
 * and selecting GitHub repositories for import.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  fetchGitHubRepositories,
  checkGitHubConnection,
  GitHubRepository,
  GitHubRepoListParams,
} from '../utils/githubApi';

/**
 * State interface for GitHub repositories
 */
interface GitHubRepositoriesState {
  // Repository data
  repositories: GitHubRepository[];
  selectedRepoIds: number[];

  // UI state
  isFetchingRepos: boolean;
  reposError: string | null;
  searchQuery: string;
  filterType: 'all' | 'owner' | 'member';
  sortBy: 'updated' | 'full_name' | 'pushed' | 'created';
  sortDirection: 'asc' | 'desc';

  // Pagination
  currentPage: number;
  perPage: number;
  totalRepos: number;
  hasMoreRepos: boolean;

  // Connection status
  isConnected: boolean;
  isCheckingConnection: boolean;
}

/**
 * Actions interface for GitHub repositories
 */
interface GitHubRepositoriesActions {
  fetchGitHubRepositories: (page?: number) => Promise<void>;
  toggleRepoSelection: (repoId: number) => void;
  selectAllRepos: () => void;
  clearRepoSelection: () => void;
  setSearchQuery: (query: string) => void;
  setFilterType: (type: 'all' | 'owner' | 'member') => void;
  setSortBy: (sort: 'updated' | 'full_name' | 'pushed' | 'created') => void;
  setSortDirection: (dir: 'asc' | 'desc') => void;
  setCurrentPage: (page: number) => void;
  refreshConnection: () => Promise<void>;
  clearGitHubState: () => void;
}

export type UseGitHubRepositories = GitHubRepositoriesState & GitHubRepositoriesActions;

/**
 * Custom hook for managing GitHub repositories
 *
 * @example
 * ```tsx
 * const {
 *   repositories,
 *   selectedRepoIds,
 *   isFetchingRepos,
 *   fetchGitHubRepositories,
 *   toggleRepoSelection,
 * } = useGitHubRepositories();
 * ```
 */
export function useGitHubRepositories(): UseGitHubRepositories {
  // State
  const [state, setState] = useState<GitHubRepositoriesState>({
    repositories: [],
    selectedRepoIds: [],
    isFetchingRepos: false,
    reposError: null,
    searchQuery: '',
    filterType: 'all',
    sortBy: 'updated',
    sortDirection: 'desc',
    currentPage: 1,
    perPage: 30,
    totalRepos: 0,
    hasMoreRepos: false,
    isConnected: false,
    isCheckingConnection: true,
  });

  // Check GitHub connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const status = await checkGitHubConnection();
        setState((prev) => ({
          ...prev,
          isConnected: status.authenticated,
          isCheckingConnection: false,
          reposError: status.error || null,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isCheckingConnection: false,
          reposError: error instanceof Error ? error.message : 'Failed to check connection',
        }));
      }
    };

    checkConnection();
  }, []);

  // Fetch repositories
  const fetchRepos = useCallback(async (page: number = 1) => {
    setState((prev) => ({
      ...prev,
      isFetchingRepos: true,
      reposError: null,
      currentPage: page,
    }));

    try {
      const params: GitHubRepoListParams = {
        page,
        per_page: state.perPage,
        type: state.filterType,
        sort: state.sortBy,
        direction: state.sortDirection,
      };

      const response = await fetchGitHubRepositories(params);

      setState((prev) => ({
        ...prev,
        repositories: page === 1 ? response.repositories : [...prev.repositories, ...response.repositories],
        totalRepos: response.total_count,
        hasMoreRepos: response.has_more,
        isFetchingRepos: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isFetchingRepos: false,
        reposError: error instanceof Error ? error.message : 'Failed to fetch repositories',
      }));
    }
  }, [state.perPage, state.filterType, state.sortBy, state.sortDirection]);

  // Toggle repository selection
  const toggleRepoSelection = useCallback((repoId: number) => {
    setState((prev) => {
      const isSelected = prev.selectedRepoIds.includes(repoId);
      return {
        ...prev,
        selectedRepoIds: isSelected
          ? prev.selectedRepoIds.filter((id) => id !== repoId)
          : [...prev.selectedRepoIds, repoId],
      };
    });
  }, []);

  // Select all repositories
  const selectAllRepos = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedRepoIds: prev.repositories.map((repo) => repo.id),
    }));
  }, []);

  // Clear repository selection
  const clearRepoSelection = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedRepoIds: [],
    }));
  }, []);

  // Set search query
  const setSearchQuery = useCallback((query: string) => {
    setState((prev) => ({
      ...prev,
      searchQuery: query,
      currentPage: 1, // Reset to first page on search
    }));
  }, []);

  // Set filter type
  const setFilterType = useCallback((type: 'all' | 'owner' | 'member') => {
    setState((prev) => ({
      ...prev,
      filterType: type,
      currentPage: 1, // Reset to first page on filter change
    }));
  }, []);

  // Set sort by
  const setSortBy = useCallback((sort: 'updated' | 'full_name' | 'pushed' | 'created') => {
    setState((prev) => ({
      ...prev,
      sortBy: sort,
    }));
  }, []);

  // Set sort direction
  const setSortDirection = useCallback((dir: 'asc' | 'desc') => {
    setState((prev) => ({
      ...prev,
      sortDirection: dir,
    }));
  }, []);

  // Set current page
  const setCurrentPage = useCallback((page: number) => {
    setState((prev) => ({
      ...prev,
      currentPage: page,
    }));
  }, []);

  // Refresh connection status
  const refreshConnection = useCallback(async () => {
    try {
      const status = await checkGitHubConnection();
      setState((prev) => ({
        ...prev,
        isConnected: status.authenticated,
        reposError: status.error || null,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isConnected: false,
        reposError: error instanceof Error ? error.message : 'Failed to check connection',
      }));
    }
  }, []);

  // Clear all state
  const clearGitHubState = useCallback(() => {
    setState({
      repositories: [],
      selectedRepoIds: [],
      isFetchingRepos: false,
      reposError: null,
      searchQuery: '',
      filterType: 'all',
      sortBy: 'updated',
      sortDirection: 'desc',
      currentPage: 1,
      perPage: 30,
      totalRepos: 0,
      hasMoreRepos: false,
      isConnected: false,
      isCheckingConnection: true,
    });
  }, []);

  // Filter and sort repositories
  const filteredRepos = useMemo(() => {
    let result = [...state.repositories];

    // Apply search filter
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      result = result.filter(
        (repo) =>
          repo.name.toLowerCase().includes(query) ||
          (repo.description?.toLowerCase().includes(query) ?? false),
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;

      switch (state.sortBy) {
        case 'updated':
          comparison = new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
          break;
        case 'created':
          comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          break;
        case 'pushed':
          comparison = new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime();
          break;
        case 'full_name':
          comparison = a.full_name.localeCompare(b.full_name);
          break;
      }

      return state.sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [state.repositories, state.searchQuery, state.sortBy, state.sortDirection]);

  return {
    ...state,
    repositories: filteredRepos,
    fetchGitHubRepositories: fetchRepos,
    toggleRepoSelection,
    selectAllRepos,
    clearRepoSelection,
    setSearchQuery,
    setFilterType,
    setSortBy,
    setSortDirection,
    setCurrentPage,
    refreshConnection,
    clearGitHubState,
  };
}
