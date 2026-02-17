import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { saveResumeData, clearResumeData } from '../../utils/storage';
import { SimpleResumeData } from '../../types';

describe('Storage Optimization', () => {
  let setItemSpy: any;
  let removeItemSpy: any;

  beforeEach(() => {
    // Clear mocks before each test
    vi.restoreAllMocks();

    // Spy on Storage methods
    // In jsdom environment, localStorage is available on window
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

    // Clear storage to start fresh
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('should cache storage availability check to reduce I/O operations', () => {
    const data = {
      name: 'test',
      email: 'test@example.com',
      phone: '123',
      location: 'Test',
      role: 'Role',
      experience: [],
      education: [],
      skills: [],
      projects: [],
      summary: ''
    } as SimpleResumeData;

    // First call - should trigger availability check (1 setItem, 1 removeItem) + actual save (1 setItem)
    // Total: 2 setItems, 1 removeItem
    try {
        saveResumeData(data);
    } catch (e) {}

    const initialSetItemCalls = setItemSpy.mock.calls.length;
    const initialRemoveItemCalls = removeItemSpy.mock.calls.length;

    // Reset spy counts to isolate the second call
    setItemSpy.mockClear();
    removeItemSpy.mockClear();

    // Second call - should use cached availability check
    // Expected: 0 setItems for check, 1 setItem for save
    // Total: 1 setItem, 0 removeItems
    try {
        saveResumeData(data);
    } catch (e) {}

    const secondSetItemCalls = setItemSpy.mock.calls.length;
    const secondRemoveItemCalls = removeItemSpy.mock.calls.length;

    console.log(`Initial Call - Set: ${initialSetItemCalls}, Remove: ${initialRemoveItemCalls}`);
    console.log(`Second Call - Set: ${secondSetItemCalls}, Remove: ${secondRemoveItemCalls}`);

    // This assertion will fail without optimization
    // Without optimization: second call does exactly what first call did (2 sets, 1 remove)
    // With optimization: second call does 1 set, 0 remove

    // We expect 1 setItem (the save itself)
    expect(secondSetItemCalls).toBe(1);

    // We expect 0 removeItems (no check)
    expect(secondRemoveItemCalls).toBe(0);
  });
});
