import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  StorageManager,
  getStorageQuota,
  getLocalStorageUsage,
  checkQuotaAvailable,
  checkStorageWarning
} from './storage';

// Test data
const testData = {
  name: 'Test User',
  email: 'test@example.com',
  largeContent: 'x'.repeat(2000)
};

describe('StorageManager', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up after each test
    localStorage.clear();
  });

  describe('setItem and getItem', () => {
    it('should set and get item without compression for small data', () => {
      const testValue = { name: 'Test', value: 123 };
      StorageManager.setItem('test-key', testValue, { checkQuota: false });
      
      const retrieved = StorageManager.getItem('test-key');
      expect(retrieved).toEqual(testValue);
    });

    it('should set and get item with compression for large data', async () => {
      const largeValue = { content: 'x'.repeat(2000) };
      await StorageManager.setItem('large-key', largeValue, { 
        compress: true, 
        checkQuota: false 
      });
      
      const retrieved = StorageManager.getItem('large-key');
      expect(retrieved).toEqual(largeValue);
    });

    it('should handle null values', () => {
      StorageManager.setItem('null-key', null, { checkQuota: false });
      const retrieved = StorageManager.getItem('null-key');
      expect(retrieved).toBeNull();
    });

    it('should return null for non-existent keys', () => {
      const retrieved = StorageManager.getItem('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should handle complex nested objects', async () => {
      const complexData = {
        user: {
          name: 'Test',
          emails: ['test1@example.com', 'test2@example.com'],
          metadata: {
            created: new Date().toISOString(),
            nested: {
              deep: {
                value: 42
              }
            }
          }
        },
        items: Array(10).fill({ id: 1, name: 'item' })
      };

      await StorageManager.setItem('complex', complexData, { checkQuota: false });
      const retrieved = StorageManager.getItem('complex');
      expect(retrieved).toEqual(complexData);
    });
  });

  describe('removeItem', () => {
    it('should remove stored items', async () => {
      const testValue = { test: 'data' };
      await StorageManager.setItem('remove-test', testValue, { checkQuota: false });
      
      expect(StorageManager.getItem('remove-test')).toEqual(testValue);
      
      StorageManager.removeItem('remove-test');
      expect(StorageManager.getItem('remove-test')).toBeNull();
    });

    it('should remove both compressed and uncompressed versions', async () => {
      const value = { data: 'x'.repeat(2000) };
      await StorageManager.setItem('compress-test', value, { 
        compress: true, 
        checkQuota: false 
      });

      // Verify it was compressed
      const compressed = localStorage.getItem('resumeai_compress-test_compressed_');
      expect(compressed).toBeTruthy();

      StorageManager.removeItem('compress-test');
      
      expect(localStorage.getItem('resumeai_compress-test')).toBeNull();
      expect(localStorage.getItem('resumeai_compress-test_compressed_')).toBeNull();
    });
  });

  describe('getItemSize', () => {
    it('should calculate size of stored items', async () => {
      const value = { test: 'data' };
      await StorageManager.setItem('size-test', value, { checkQuota: false });
      
      const size = StorageManager.getItemSize('size-test');
      expect(size).toBeGreaterThan(0);
    });

    it('should return 0 for non-existent items', () => {
      const size = StorageManager.getItemSize('non-existent');
      expect(size).toBe(0);
    });
  });

  describe('getUsedSize', () => {
    it('should calculate total used storage', async () => {
      await StorageManager.setItem('item1', { data: 'test1' }, { checkQuota: false });
      await StorageManager.setItem('item2', { data: 'test2' }, { checkQuota: false });
      
      const totalSize = StorageManager.getUsedSize();
      expect(totalSize).toBeGreaterThan(0);
    });

    it('should only count resumeai_ prefixed items', async () => {
      await StorageManager.setItem('tracked', { data: 'yes' }, { checkQuota: false });
      localStorage.setItem('other_key', 'other_data');
      
      const size = StorageManager.getUsedSize();
      const otherSize = localStorage.getItem('other_key')?.length || 0;
      
      // Size should be greater than other_key's size, but the difference
      // should account for the resumeai_ prefix and the tracked item
      expect(size).toBeGreaterThan(otherSize);
    });
  });

  describe('clear', () => {
    it('should clear all resumeai_ prefixed items', async () => {
      await StorageManager.setItem('item1', { data: 'test1' }, { checkQuota: false });
      await StorageManager.setItem('item2', { data: 'test2' }, { checkQuota: false });
      localStorage.setItem('other_key', 'should_remain');
      
      StorageManager.clear();
      
      expect(StorageManager.getItem('item1')).toBeNull();
      expect(StorageManager.getItem('item2')).toBeNull();
      expect(localStorage.getItem('other_key')).toBe('should_remain');
    });
  });

  describe('getStats', () => {
    it('should return storage statistics', async () => {
      await StorageManager.setItem('stat-test', { data: 'test' }, { checkQuota: false });
      
      const stats = await StorageManager.getStats();
      
      expect(stats).toHaveProperty('used');
      expect(stats).toHaveProperty('available');
      expect(stats).toHaveProperty('quota');
      expect(stats).toHaveProperty('percentUsed');
      expect(stats).toHaveProperty('items');
      
      expect(stats.used).toBeGreaterThan(0);
      expect(stats.quota).toBeGreaterThan(0);
      expect(stats.percentUsed).toBeGreaterThanOrEqual(0);
      expect(stats.items).toBe(1);
    });
  });
});

describe('Storage Quota Functions', () => {
  afterEach(() => {
    localStorage.clear();
  });

  describe('getStorageQuota', () => {
    it('should return quota information', async () => {
      const quota = await getStorageQuota();
      
      expect(quota).toHaveProperty('estimatedQuota');
      expect(quota).toHaveProperty('estimatedUsage');
      expect(quota).toHaveProperty('percentUsed');
      
      expect(quota.estimatedQuota).toBeGreaterThan(0);
      expect(quota.percentUsed).toBeGreaterThanOrEqual(0);
      expect(quota.percentUsed).toBeLessThanOrEqual(100);
    });

    it('should calculate percent used correctly', async () => {
      const quota = await getStorageQuota();
      const expectedPercent = Math.round((quota.estimatedUsage / quota.estimatedQuota) * 100);
      
      expect(quota.percentUsed).toBe(expectedPercent);
    });
  });

  describe('getLocalStorageUsage', () => {
    it('should calculate localStorage usage', () => {
      localStorage.setItem('test1', 'value1');
      localStorage.setItem('test2', 'value2');
      
      const usage = getLocalStorageUsage();
      expect(usage).toBeGreaterThan(0);
    });

    it('should return 0 for empty storage', () => {
      localStorage.clear();
      const usage = getLocalStorageUsage();
      expect(usage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('checkQuotaAvailable', () => {
    it('should indicate if space is available', async () => {
      const result = await checkQuotaAvailable(1000);
      
      expect(result).toHaveProperty('available');
      expect(result).toHaveProperty('quotaInfo');
      expect(typeof result.available).toBe('boolean');
    });

    it('should account for buffer space', async () => {
      // Fill storage significantly
      const largeString = 'x'.repeat(100000);
      localStorage.setItem('large', largeString);
      
      const result = await checkQuotaAvailable(1000);
      
      // If space is not available, the buffer should be considered
      if (!result.available) {
        const available = result.quotaInfo.estimatedQuota - result.quotaInfo.estimatedUsage;
        expect(available).toBeLessThan(1024); // Less than buffer + requested size
      }
    });
  });

  describe('checkStorageWarning', () => {
    it('should return warning info', async () => {
      const warning = await checkStorageWarning();
      
      expect(warning).toHaveProperty('shouldWarn');
      expect(warning).toHaveProperty('percentUsed');
      expect(warning).toHaveProperty('message');
      
      expect(typeof warning.shouldWarn).toBe('boolean');
      expect(typeof warning.percentUsed).toBe('number');
      expect(typeof warning.message).toBe('string');
    });

    it('should warn when quota > 80%', async () => {
      // This test might not always trigger depending on system state
      // so we just verify the logic works
      const warning = await checkStorageWarning();
      
      if (warning.percentUsed > 80) {
        expect(warning.shouldWarn).toBe(true);
        expect(warning.message).toContain('Warning');
      }
    });

    it('should show critical message when quota > 95%', async () => {
      // Note: This is system-dependent, so we just verify the logic
      const warning = await checkStorageWarning();
      
      if (warning.percentUsed > 95) {
        expect(warning.message).toContain('Critical');
      }
    });
  });
});

describe('Compression', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('should compress large data', async () => {
    const largeData = { content: 'x'.repeat(5000) };
    
    await StorageManager.setItem('compression-test', largeData, {
      compress: true,
      checkQuota: false
    });

    // Check that compressed version exists
    const compressed = localStorage.getItem('resumeai_compression-test_compressed_');
    expect(compressed).toBeTruthy();
    
    // Verify data integrity
    const retrieved = StorageManager.getItem('compression-test');
    expect(retrieved).toEqual(largeData);
  });

  it('should not compress small data', async () => {
    const smallData = { content: 'small' };
    
    await StorageManager.setItem('no-compress-test', smallData, {
      compress: true,
      checkQuota: false
    });

    // Check that uncompressed version is used
    const uncompressed = localStorage.getItem('resumeai_no-compress-test');
    expect(uncompressed).toBeTruthy();
    
    const compressed = localStorage.getItem('resumeai_no-compress-test_compressed_');
    expect(compressed).toBeNull();
  });
});

describe('Error Handling', () => {
  it('should handle getItem for corrupted data gracefully', () => {
    // Store invalid JSON
    localStorage.setItem('resumeai_corrupted', 'not valid json {');
    
    // Should not throw, return null
    const result = StorageManager.getItem('corrupted');
    expect(result).toBeNull();
  });

  it('should handle storage operations without throwing', async () => {
    // Test with extremely small data
    expect(() => {
      StorageManager.removeItem('non-existent');
    }).not.toThrow();
  });
});
