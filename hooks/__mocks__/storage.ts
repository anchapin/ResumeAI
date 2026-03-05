export const saveToLocalStorage = vi.fn();
export const loadFromLocalStorage = vi.fn().mockReturnValue(null);
export const removeFromLocalStorage = vi.fn();

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}

export const StorageErrorType = {};
