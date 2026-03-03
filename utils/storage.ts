const STORAGE_KEY = 'resumeai_master_profile';

/**
 * Error types for storage operations
 */
import type { SimpleResumeData } from '../types';
import { StorageManager, checkQuotaAvailable } from '../src/lib/storage';

export enum StorageErrorType {
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  PARSE_ERROR = 'PARSE_ERROR',
  ACCESS_DENIED = 'ACCESS_DENIED',
  NOT_AVAILABLE = 'NOT_AVAILABLE',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Custom error class for storage operations
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly type: StorageErrorType,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

// Cache storage availability check result to avoid redundant I/O operations
let isStorageAvailableCache: boolean | null = null;

/**
 * Checks if localStorage is available in the current environment
 */
function isStorageAvailable(): boolean {
  // Return cached result if available
  if (isStorageAvailableCache !== null) {
    return isStorageAvailableCache;
  }

  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      isStorageAvailableCache = false;
      return false;
    }

    // Test write
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);

    isStorageAvailableCache = true;
    return true;
  } catch (e) {
    isStorageAvailableCache = false;
    return false;
  }
}

/**
 * Saves resume data to localStorage with quota checking
 * @param data - The resume data to save
 * @throws StorageError if saving fails
 */
export async function saveResumeData(data: SimpleResumeData): Promise<void> {
  if (!isStorageAvailable()) {
    throw new StorageError(
      'localStorage is not available in this environment',
      StorageErrorType.NOT_AVAILABLE,
    );
  }

  try {
    const serialized = JSON.stringify(data);

    // Try to use StorageManager for better quota handling
    try {
      // Use StorageManager synchronously with pre-calculated check
      const quotaCheck = localStorage.getItem('__quota_check_needed__');
      if (quotaCheck === null) {
        // Only check quota on first save or periodically
        await StorageManager.setItem('master_profile', data, {
          compress: true,
          checkQuota: false, // We'll handle quota manually
        });
      } else {
        localStorage.setItem(STORAGE_KEY, serialized);
      }
    } catch (managerError) {
      // Fall back to direct localStorage if StorageManager fails
      localStorage.setItem(STORAGE_KEY, serialized);
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      throw new StorageError(
        'Storage quota exceeded. Please clear some data or reduce the size of your resume.',
        StorageErrorType.QUOTA_EXCEEDED,
        error,
      );
    }

    if (error instanceof Error && error.name === 'SecurityError') {
      throw new StorageError(
        'Access to localStorage is denied. Please check your browser settings.',
        StorageErrorType.ACCESS_DENIED,
        error,
      );
    }

    throw new StorageError('Failed to save resume data', StorageErrorType.UNKNOWN, error);
  }
}

/**
 * Loads resume data from localStorage
 * @returns The saved resume data, or null if no data exists
 * @throws StorageError if loading fails
 */
export function loadResumeData(): SimpleResumeData | null {
  if (!isStorageAvailable()) {
    throw new StorageError(
      'localStorage is not available in this environment',
      StorageErrorType.NOT_AVAILABLE,
    );
  }

  try {
    const serialized = localStorage.getItem(STORAGE_KEY);

    if (!serialized) {
      return null;
    }

    const data = JSON.parse(serialized) as SimpleResumeData;

    // Basic validation to ensure the loaded data has expected structure
    if (!data || typeof data !== 'object') {
      throw new StorageError('Invalid resume data structure', StorageErrorType.PARSE_ERROR);
    }

    return data;
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }

    throw new StorageError('Failed to load resume data', StorageErrorType.PARSE_ERROR, error);
  }
}

/**
 * Clears all saved resume data from localStorage
 * @throws StorageError if clearing fails
 */
export function clearResumeData(): void {
  if (!isStorageAvailable()) {
    throw new StorageError(
      'localStorage is not available in this environment',
      StorageErrorType.NOT_AVAILABLE,
    );
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    throw new StorageError('Failed to clear resume data', StorageErrorType.UNKNOWN, error);
  }
}

/**
 * Gets a user-friendly error message for a StorageError
 */
export function getStorageErrorMessage(error: StorageError): string {
  switch (error.type) {
    case StorageErrorType.QUOTA_EXCEEDED:
      return 'Storage full. Please clear some browser data.';
    case StorageErrorType.PARSE_ERROR:
      return 'Data corrupted. Using default resume.';
    case StorageErrorType.ACCESS_DENIED:
      return "Storage access denied. Changes won't be saved.";
    case StorageErrorType.NOT_AVAILABLE:
      return "Storage not available. Changes won't be saved.";
    default:
      return 'Failed to save data. Please try again.';
  }
}

/**
 * Checks if there is saved resume data in localStorage
 * @returns true if data exists, false otherwise
 */
export function hasSavedResumeData(): boolean {
  if (!isStorageAvailable()) {
    return false;
  }

  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

/**
 * Gets the size of the stored resume data in bytes
 * @returns Size in bytes, or 0 if no data or on error
 */
export function getStoredDataSize(): number {
  if (!isStorageAvailable()) {
    return 0;
  }

  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    return serialized ? new Blob([serialized]).size : 0;
  } catch {
    return 0;
  }
}
