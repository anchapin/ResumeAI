import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  saveResumeData,
  loadResumeData,
  clearResumeData,
  hasSavedResumeData,
  getStoredDataSize,
  StorageError,
} from '../utils/storage';
import { SimpleResumeData } from '../types';

// Test data
const testResumeData: SimpleResumeData = {
  name: 'Test User',
  email: 'test@example.com',
  phone: '+1 (555) 123-4567',
  location: 'Test City, TS',
  role: 'Test Role',
  experience: [
    {
      id: 'test-1',
      company: 'Test Company',
      role: 'Test Position',
      startDate: 'Jan 2020',
      endDate: 'Present',
      current: true,
      description: 'Test description',
      tags: ['Test', 'Skill'],
    },
  ],
  summary: 'Test summary',
  skills: ['Test skill'],
  education: [],
  projects: [],
};

describe('Storage Utilities', () => {
  beforeEach(() => {
    // Clear any existing data before each test
    try {
      clearResumeData();
    } catch (error) {
      // Ignore errors during cleanup if storage isn't available
    }
  });

  afterEach(() => {
    // Ensure cleanup after each test
    try {
      clearResumeData();
    } catch (error) {
      // Ignore errors during cleanup if storage isn't available
    }
  });

  it('should clear existing data', () => {
    // Initially should have no data
    const hasDataBefore = hasSavedResumeData();
    expect(hasDataBefore).toBe(false);
  });

  it('should detect when no data is saved', () => {
    const hasData = hasSavedResumeData();
    expect(hasData).toBe(false);
  });

  it('should save resume data', async () => {
    await expect(saveResumeData(testResumeData)).resolves.not.toThrow();

    const hasDataAfterSave = hasSavedResumeData();
    expect(hasDataAfterSave).toBe(true);
  });

  it('should load saved resume data', async () => {
    // Save data first
    await saveResumeData(testResumeData);

    // Then load it
    const loadedData = loadResumeData();

    expect(loadedData).toBeDefined();
    if (loadedData) {
      expect(loadedData.name).toBe(testResumeData.name);
      expect(loadedData.email).toBe(testResumeData.email);
      expect(loadedData.experience.length).toBe(testResumeData.experience.length);

      // Check first experience entry
      const firstOriginalExp = testResumeData.experience[0];
      const firstLoadedExp = loadedData.experience[0];
      expect(firstLoadedExp.company).toBe(firstOriginalExp.company);
      expect(firstLoadedExp.role).toBe(firstOriginalExp.role);
      expect(firstLoadedExp.description).toBe(firstOriginalExp.description);
    }
  });

  it('should return undefined when no data is saved', () => {
    const loadedData = loadResumeData();
    expect(loadedData).toBeNull();
  });

  it('should handle data updates correctly', async () => {
    // Save initial data
    await saveResumeData(testResumeData);

    // Update and save new data
    const updatedData = { ...testResumeData, name: 'Updated User' };
    await saveResumeData(updatedData);

    // Load and verify update
    const reloadedData = loadResumeData();
    expect(reloadedData?.name).toBe('Updated User');
    expect(reloadedData?.email).toBe(testResumeData.email); // Should remain unchanged
  });

  it('should return correct data size', async () => {
    // Initially should be 0
    const initialSize = getStoredDataSize();
    expect(initialSize).toBe(0);

    // After saving, should be > 0
    await saveResumeData(testResumeData);
    const sizeAfterSave = getStoredDataSize();
    expect(sizeAfterSave).toBeGreaterThan(0);
  });

  it('should clear data completely', async () => {
    // Save data
    await saveResumeData(testResumeData);
    expect(hasSavedResumeData()).toBe(true);

    // Clear data
    clearResumeData();

    // Verify it's gone
    expect(hasSavedResumeData()).toBe(false);
    const loadedData = loadResumeData();
    expect(loadedData).toBeNull();
  });

  it('should handle storage quota exceeded errors gracefully', async () => {
    const mockSetItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key) => {
      if (key !== '__storage_test__') {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      }
    });

    await expect(saveResumeData(testResumeData)).rejects.toThrow(StorageError);

    mockSetItem.mockRestore();
  });
});
