const STORAGE_KEY = 'resumeai_master_profile';

/**
 * Error types for storage operations
 */
import type { SimpleResumeData } from '../types';
export enum StorageErrorType {
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  PARSE_ERROR = 'PARSE_ERROR',
  ACCESS_DENIED = 'ACCESS_DENIED',
  NOT_AVAILABLE = 'NOT_AVAILABLE',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Custom error class for storage operations
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly type: StorageErrorType,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Checks if localStorage is available in the current environment
 */
function isStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return false;
    }

    // Test write
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Saves resume data to localStorage
 * @param data - The resume data to save
 * @throws StorageError if saving fails
 */
export function saveResumeData(data: SimpleResumeData): void {
  if (!isStorageAvailable()) {
    throw new StorageError(
      'localStorage is not available in this environment',
      StorageErrorType.NOT_AVAILABLE
    );
  }

  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      throw new StorageError(
        'Storage quota exceeded. Please clear some data or reduce the size of your resume.',
        StorageErrorType.QUOTA_EXCEEDED,
        error
      );
    }

    if (error instanceof Error && error.name === 'SecurityError') {
      throw new StorageError(
        'Access to localStorage is denied. Please check your browser settings.',
        StorageErrorType.ACCESS_DENIED,
        error
      );
    }

    throw new StorageError(
      'Failed to save resume data',
      StorageErrorType.UNKNOWN,
      error
    );
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
      StorageErrorType.NOT_AVAILABLE
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
      throw new StorageError(
        'Invalid resume data structure',
        StorageErrorType.PARSE_ERROR
      );
    }

    return data;
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }

    throw new StorageError(
      'Failed to load resume data',
      StorageErrorType.PARSE_ERROR,
      error
    );
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
      StorageErrorType.NOT_AVAILABLE
    );
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    throw new StorageError(
      'Failed to clear resume data',
      StorageErrorType.UNKNOWN,
      error
    );
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
