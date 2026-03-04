/**
 * Visual Regression Tests
 *
 * Uses Playwright's built-in screenshot comparison for visual regression testing.
 * Run with: npx playwright test tests/visual-regression/
 */
import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test('homepage visual snapshot', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveScreenshot('homepage.png', {
      maxDiffPixelRatio: 0.1,
    });
  });

  test('dashboard visual snapshot', async ({ page }) => {
    // Set up authenticated state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem(
        'RESUMEAI_USER',
        JSON.stringify({
          id: 'test-user',
          email: 'test@example.com',
          name: 'Test User',
        }),
      );
    });
    await page.goto('/#/dashboard');
    await expect(page).toHaveScreenshot('dashboard.png', {
      maxDiffPixelRatio: 0.1,
    });
  });

  test('editor page visual snapshot', async ({ page }) => {
    await page.goto('/#/editor');
    await expect(page).toHaveScreenshot('editor.png', {
      maxDiffPixelRatio: 0.1,
    });
  });

  test('login page visual snapshot', async ({ page }) => {
    await page.goto('/#/login');
    await expect(page).toHaveScreenshot('login.png', {
      maxDiffPixelRatio: 0.1,
    });
  });

  test('settings page visual snapshot', async ({ page }) => {
    await page.goto('/#/settings');
    await expect(page).toHaveScreenshot('settings.png', {
      maxDiffPixelRatio: 0.1,
    });
  });

  // Test responsive layouts
  test('mobile homepage', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      maxDiffPixelRatio: 0.1,
    });
  });

  test('tablet homepage', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await expect(page).toHaveScreenshot('homepage-tablet.png', {
      maxDiffPixelRatio: 0.1,
    });
  });
});
