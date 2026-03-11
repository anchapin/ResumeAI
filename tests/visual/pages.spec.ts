import { test, expect } from '@playwright/test';
import { testUser, loginUser, registerUser } from '../e2e/helpers';

test.describe('Visual Regression Tests', () => {
  test.beforeAll(async ({ browser }) => {
    // Register the test user once for all tests in this file
    const page = await browser.newPage();
    try {
      await registerUser(page, testUser);
    } catch (e) {
      // User might already exist in some environments, ignore registration failure
      console.log('User registration might have failed or user already exists:', e.message);
    }
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginUser(page, testUser.email, testUser.password);
  });

  test('Dashboard page looks correct', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    // We expect the dashboard to match the snapshot.
    await expect(page).toHaveScreenshot('dashboard.png', {
      fullPage: true,
      mask: [page.locator('[data-testid="last-login-time"]')], // Mask dynamic content
    });
  });

  test('Resume Editor page looks correct', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('editor.png', {
      fullPage: true,
      mask: [page.locator('[data-testid="auto-save-status"]')],
    });
  });

  test('Settings page looks correct', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('settings.png', {
      fullPage: true,
    });
  });
});
