import React, { useCallback, useMemo } from 'react';

/**
 * Props for GitHubRepoFilters component
 */
export interface GitHubRepoFiltersProps {
  searchQuery: string;
  filterType: 'all' | 'owner' | 'member';
  sortBy: 'updated' | 'full_name' | 'pushed' | 'created';
  sortDirection: 'asc' | 'desc';
  onSearchChange: (query: string) => void;
  onFilterTypeChange: (type: 'all' | 'owner' | 'member') => void;
  onSortByChange: (sort: 'updated' | 'full_name' | 'pushed' | 'created') => void;
  onSortDirectionChange: (dir: 'asc' | 'desc') => void;
}

/**
 * GitHub Repository Filters Component
 *
 * Provides search input and filter/sort controls
 */
export const GitHubRepoFilters: React.FC<GitHubRepoFiltersProps> = ({
  searchQuery,
  filterType,
  sortBy,
  sortDirection,
  onSearchChange,
  onFilterTypeChange,
  onSortByChange,
  onSortDirectionChange,
}) => {
  // Handle search input with debounce
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(e.target.value);
    },
    [onSearchChange],
  );

  // Sort options
  const sortOptions = useMemo(
    () => [
      { value: 'updated', label: 'Last Updated' },
      { value: 'pushed', label: 'Last Pushed' },
      { value: 'created', label: 'Oldest First' },
      { value: 'full_name', label: 'Name (A-Z)' },
    ],
    [],
  );

  // Filter type options
  const filterOptions = useMemo(
    () => [
      { value: 'all', label: 'All Repositories' },
      { value: 'owner', label: 'Owned' },
      { value: 'member', label: 'Contributed To' },
    ],
    [],
  );

  return (
    <div className="space-y-3 mb-4" role="search" aria-label="Search and filter repositories">
      {/* Search Input */}
      <div className="relative">
        <span
          className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]"
          aria-hidden="true"
        >
          search
        </span>
        <input
          type="search"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search repositories by name or description..."
          className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
          aria-label="Search repositories by name or description"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Clear search"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap gap-3">
        {/* Filter Type */}
        <div className="flex items-center gap-2">
          <label htmlFor="filter-type" className="text-sm font-medium text-slate-700 whitespace-nowrap">
            Filter:
          </label>
          <select
            id="filter-type"
            value={filterType}
            onChange={(e) => onFilterTypeChange(e.target.value as 'all' | 'owner' | 'member')}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all cursor-pointer"
            aria-label="Filter repositories by type"
          >
            {filterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort By */}
        <div className="flex items-center gap-2">
          <label htmlFor="sort-by" className="text-sm font-medium text-slate-700 whitespace-nowrap">
            Sort by:
          </label>
          <select
            id="sort-by"
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as 'updated' | 'full_name' | 'pushed' | 'created')}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all cursor-pointer"
            aria-label="Sort repositories"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Direction */}
        <button
          onClick={() => onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all flex items-center gap-1 cursor-pointer"
          aria-label={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
          title={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default GitHubRepoFilters;
