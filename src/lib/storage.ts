/**
 * Storage Management System with Quota Handling and Compression
 * Provides localStorage quota estimation, compression, and safe storage operations
 */

import LZString from 'lz-string';

/**
 * Compress data using LZString compression
 * Reduces data size by ~50% instead of increasing by 33% like base64
 */
function compressData(data: string): string {
  try {
    return LZString.compressToUTF16(data);
  } catch (error) {
    console.warn('Failed to compress data:', error);
    return data;
  }
}

/**
 * Decompress data that was encoded with LZString
 */
function decompressData(compressedData: string): string {
  try {
    return LZString.decompressFromUTF16(compressedData) || compressedData;
  } catch (error) {
    console.warn('Failed to decompress data:', error);
    return compressedData;
  }
}

/**
 * Estimate available storage quota
 * Returns object with estimatedQuota and estimatedUsage in bytes
 */
export async function getStorageQuota(): Promise<{
  estimatedQuota: number;
  estimatedUsage: number;
  percentUsed: number;
}> {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const percentUsed =
        estimate.usage && estimate.quota ? Math.round((estimate.usage / estimate.quota) * 100) : 0;

      return {
        estimatedQuota: estimate.quota || 0,
        estimatedUsage: estimate.usage || 0,
        percentUsed,
      };
    }
  } catch (error) {
    console.warn('Could not access storage quota:', error);
  }

  // Fallback: estimate based on localStorage size
  return {
    estimatedQuota: 5 * 1024 * 1024, // 5MB default for localStorage
    estimatedUsage: getLocalStorageUsage(),
    percentUsed: Math.round((getLocalStorageUsage() / (5 * 1024 * 1024)) * 100),
  };
}

/**
 * Calculate total localStorage usage in bytes
 */
export function getLocalStorageUsage(): number {
  if (!isStorageAvailable()) return 0;

  try {
    let totalSize = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += key.length + value.length;
        }
      }
    }
    return totalSize;
  } catch {
    return 0;
  }
}

/**
 * Check if there's enough space for the given data size
 */
export async function checkQuotaAvailable(sizeNeeded: number): Promise<{
  available: boolean;
  quotaInfo: Awaited<ReturnType<typeof getStorageQuota>>;
}> {
  const quotaInfo = await getStorageQuota();
  const spaceAvailable = quotaInfo.estimatedQuota - quotaInfo.estimatedUsage;
  const buffer = 1024; // 1KB buffer for metadata

  return {
    available: spaceAvailable > sizeNeeded + buffer,
    quotaInfo,
  };
}

// Cache storage availability check result to avoid redundant I/O operations
let isStorageAvailableCache: boolean | null = null;

/**
 * Check if storage is available
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
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    isStorageAvailableCache = true;
    return true;
  } catch {
    isStorageAvailableCache = false;
    return false;
  }
}

/**
 * StorageManager class for safe storage operations with quota handling
 */
export class StorageManager {
  private static PREFIX = 'resumeai_';
  private static COMPRESSION_PREFIX = 'compressed_';

  /**
   * Set item with quota checking and optional compression
   */
  static async setItem(
    key: string,
    value: unknown,
    options: {
      compress?: boolean;
      checkQuota?: boolean;
    } = {},
  ): Promise<void> {
    if (!isStorageAvailable()) {
      throw new Error('Storage not available');
    }

    const { compress = true, checkQuota = true } = options;
    const fullKey = this.PREFIX + key;
    const jsonValue = JSON.stringify(value);

    // Check quota if requested
    if (checkQuota) {
      const canStore = await checkQuotaAvailable(jsonValue.length);
      if (!canStore.available) {
        throw new Error(
          `Storage quota exceeded. Used: ${Math.round(canStore.quotaInfo.percentUsed)}%`,
        );
      }
    }

    try {
      let dataToStore = jsonValue;
      let actualKey = fullKey;

      // Compress if requested
      if (compress && jsonValue.length > 1024) {
        dataToStore = compressData(jsonValue);
        actualKey = fullKey + '_' + this.COMPRESSION_PREFIX;
      }

      localStorage.setItem(actualKey, dataToStore);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new Error('Storage quota exceeded');
      }
      throw error;
    }
  }

  /**
   * Get item with automatic decompression
   */
  static getItem<T = unknown>(key: string): T | null {
    if (!isStorageAvailable()) {
      return null;
    }

    const fullKey = this.PREFIX + key;
    const compressedKey = fullKey + '_' + this.COMPRESSION_PREFIX;

    try {
      // Try to get compressed version first
      let data = localStorage.getItem(compressedKey);
      if (data) {
        data = decompressData(data);
      } else {
        // Fall back to uncompressed version
        data = localStorage.getItem(fullKey);
      }

      if (!data) {
        return null;
      }

      return JSON.parse(data) as T;
    } catch (error) {
      console.warn('Failed to get item:', error);
      return null;
    }
  }

  /**
   * Remove item (both compressed and uncompressed versions)
   */
  static removeItem(key: string): void {
    if (!isStorageAvailable()) {
      return;
    }

    const fullKey = this.PREFIX + key;
    const compressedKey = fullKey + '_' + this.COMPRESSION_PREFIX;

    try {
      localStorage.removeItem(fullKey);
      localStorage.removeItem(compressedKey);
    } catch (error) {
      console.warn('Failed to remove item:', error);
    }
  }

  /**
   * Get total size of stored data for a key
   */
  static getItemSize(key: string): number {
    if (!isStorageAvailable()) {
      return 0;
    }

    const fullKey = this.PREFIX + key;
    const compressedKey = fullKey + '_' + this.COMPRESSION_PREFIX;

    try {
      const compressedData = localStorage.getItem(compressedKey);
      if (compressedData) {
        return compressedData.length;
      }

      const data = localStorage.getItem(fullKey);
      return data ? data.length : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get total used storage (all resumeai_ prefixed items)
   */
  static getUsedSize(): number {
    if (!isStorageAvailable()) {
      return 0;
    }

    try {
      let totalSize = 0;
      for (const key in localStorage) {
        if (key.startsWith(this.PREFIX)) {
          const value = localStorage.getItem(key);
          if (value) {
            totalSize += key.length + value.length;
          }
        }
      }
      return totalSize;
    } catch {
      return 0;
    }
  }

  /**
   * Clear all storage (all resumeai_ prefixed items)
   */
  static clear(): void {
    if (!isStorageAvailable()) {
      return;
    }

    try {
      const keysToRemove: string[] = [];
      for (const key in localStorage) {
        if (key.startsWith(this.PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to clear storage:', error);
    }
  }

  /**
   * Get storage stats
   */
  static async getStats(): Promise<{
    used: number;
    available: number;
    quota: number;
    percentUsed: number;
    items: number;
  }> {
    const quotaInfo = await getStorageQuota();
    const itemCount = this.getItemCount();

    return {
      used: this.getUsedSize(),
      available: quotaInfo.estimatedQuota - quotaInfo.estimatedUsage,
      quota: quotaInfo.estimatedQuota,
      percentUsed: quotaInfo.percentUsed,
      items: itemCount,
    };
  }

  /**
   * Count total items in storage
   */
  private static getItemCount(): number {
    if (!isStorageAvailable()) {
      return 0;
    }

    try {
      let count = 0;
      for (const key in localStorage) {
        if (key.startsWith(this.PREFIX)) {
          count++;
        }
      }
      return count;
    } catch {
      return 0;
    }
  }
}

/**
 * Helper hook to manage storage quota warnings
 */
export async function checkStorageWarning(): Promise<{
  shouldWarn: boolean;
  percentUsed: number;
  message: string;
}> {
  const quotaInfo = await getStorageQuota();
  const threshold = 80;

  return {
    shouldWarn: quotaInfo.percentUsed > threshold,
    percentUsed: quotaInfo.percentUsed,
    message:
      quotaInfo.percentUsed > 95
        ? `Critical: Storage is ${quotaInfo.percentUsed}% full. Please clear some data.`
        : `Warning: Storage is ${quotaInfo.percentUsed}% full.`,
  };
}
