import { test, expect } from '@playwright/test';

test.describe('Offline Support (PWA)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard and wait for it to load
    await page.goto('/dashboard');
    await page.waitForSelector('h2:has-text("Job Search Overview")');
  });

  test('should show offline indicator when network goes down', async ({ page, context }) => {
    // 1. Simulate offline mode
    await context.setOffline(true);

    // 2. Check for offline indicator
    const offlineIndicator = page.locator("text=You're Offline");
    await expect(offlineIndicator).toBeVisible();

    // 3. Simulate online mode
    await context.setOffline(false);

    // 4. Indicator should disappear
    await expect(offlineIndicator).toBeHidden();
  });

  test('should cache dashboard for offline access', async ({ page, context }) => {
    // 1. Ensure page is fully loaded and PWA is registered
    // Wait for the service worker to be registered by checking if the page has finished loading
    await page.waitForLoadState('networkidle');

    // 2. Go offline
    await context.setOffline(true);

    // 3. Reload the page while offline
    await page.reload();

    // 4. Dashboard should still be visible (cached)
    const header = page.locator('h2:has-text("Job Search Overview")');
    await expect(header).toBeVisible();

    // 5. Offline indicator should be visible
    const offlineIndicator = page.locator("text=You're Offline");
    await expect(offlineIndicator).toBeVisible();

    // Clean up
    await context.setOffline(false);
  });
});
