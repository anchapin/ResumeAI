/**
 * Simple manual test for storage utilities
 * This can be run in the browser console to verify functionality
 */

import { saveResumeData, loadResumeData, clearResumeData, hasSavedResumeData, getStoredDataSize } from './storage';
import { SimpleResumeData } from '../types';

// Test data
const testResumeData: SimpleResumeData = {
  name: "Test User",
  email: "test@example.com",
  phone: "+1 (555) 123-4567",
  location: "Test City, TS",
  role: "Test Role",
  experience: [
    {
      id: 'test-1',
      company: 'Test Company',
      role: 'Test Position',
      startDate: 'Jan 2020',
      endDate: 'Present',
      current: true,
      description: 'Test description',
      tags: ['Test', 'Skill']
    }
  ]
};

/**
 * Run all storage tests
 */
export function runStorageTests() {
  console.log('=== Running Storage Tests ===\n');

  // Test 1: Clear any existing data
  console.log('Test 1: Clearing existing data...');
  try {
    clearResumeData();
    console.log('✓ Data cleared successfully');
  } catch (error) {
    console.error('✗ Failed to clear data:', error);
  }

  // Test 2: Check if data exists (should be false)
  console.log('\nTest 2: Checking for saved data...');
  const hasData = hasSavedResumeData();
  console.log(hasData ? '✗ Found data when expected none' : '✓ No data found as expected');

  // Test 3: Save resume data
  console.log('\nTest 3: Saving resume data...');
  try {
    saveResumeData(testResumeData);
    console.log('✓ Data saved successfully');
  } catch (error) {
    console.error('✗ Failed to save data:', error);
    return;
  }

  // Test 4: Check if data exists (should be true)
  console.log('\nTest 4: Checking for saved data...');
  const hasDataAfterSave = hasSavedResumeData();
  console.log(hasDataAfterSave ? '✓ Data found as expected' : '✗ No data found after save');

  // Test 5: Load resume data
  console.log('\nTest 5: Loading resume data...');
  try {
    const loadedData = loadResumeData();
    if (!loadedData) {
      console.error('✗ No data loaded');
      return;
    }

    // Verify data integrity
    const nameMatch = loadedData.name === testResumeData.name;
    const emailMatch = loadedData.email === testResumeData.email;
    const expCountMatch = loadedData.experience?.length === testResumeData.experience.length;

    console.log(nameMatch ? '✓ Name matches' : '✗ Name mismatch');
    console.log(emailMatch ? '✓ Email matches' : '✗ Email mismatch');
    console.log(expCountMatch ? '✓ Experience count matches' : '✗ Experience count mismatch');

    console.log('\nLoaded data:', JSON.stringify(loadedData, null, 2));
  } catch (error) {
    console.error('✗ Failed to load data:', error);
  }

  // Test 6: Check data size
  console.log('\nTest 6: Checking stored data size...');
  const size = getStoredDataSize();
  console.log(`✓ Data size: ${size} bytes (${(size / 1024).toFixed(2)} KB)`);

  // Test 7: Update and reload
  console.log('\nTest 7: Updating and reloading...');
  const updatedData = { ...testResumeData, name: "Updated User" };
  try {
    saveResumeData(updatedData);
    const reloadedData = loadResumeData();
    const nameMatches = reloadedData?.name === "Updated User";
    console.log(nameMatches ? '✓ Update persisted correctly' : '✗ Update failed to persist');
  } catch (error) {
    console.error('✗ Update test failed:', error);
  }

  // Cleanup
  console.log('\nTest 8: Cleanup - clearing test data...');
  try {
    clearResumeData();
    console.log('✓ Cleanup complete');
  } catch (error) {
    console.error('✗ Cleanup failed:', error);
  }

  console.log('\n=== Storage Tests Complete ===');
}

// Export for manual testing in browser console
if (typeof window !== 'undefined') {
  (window as any).runStorageTests = runStorageTests;
  console.log('Storage tests loaded. Run runStorageTests() to execute.');
}
