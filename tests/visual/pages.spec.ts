import { test, expect } from '@playwright/test';
import { testUser, loginUser } from '../e2e/helpers';

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    // For visual tests, we want consistent data.
    // In a real scenario, we might use a mock user or consistent seed data.
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

  test('Template Selector looks correct', async ({ page }) => {
    await page.goto('/templates');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('templates.png', {
      fullPage: true,
    });
  });
});
