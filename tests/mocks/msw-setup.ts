import { beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import { setupWorker } from 'msw/browser';
import { worker, resetMockData, preloadResumes } from './handlers';

// Singleton worker instance
let workerInstance: ReturnType<typeof setupWorker> | null = null;

export async function startMSW() {
  if (workerInstance) {
    return workerInstance;
  }

  workerInstance = worker;

  // Start the worker
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
  });

  console.log('MSW started successfully');
  return workerInstance;
}

export function stopMSW() {
  if (workerInstance) {
    workerInstance.stop();
    workerInstance = null;
    console.log('MSW stopped');
  }
}

export { resetMockData, preloadResumes };

// Vitest hooks for automatic setup/teardown
beforeAll(async () => {
  await startMSW();
});

afterAll(async () => {
  stopMSW();
});

afterEach(() => {
  resetMockData();
});

// Re-export handlers for direct use in tests
export { worker };
