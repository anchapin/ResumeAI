import { test, expect } from '@playwright/test';

/**
 * Visual Regression Tests
 *
 * Uses Playwright's built-in screenshot comparison.
 * Run with: npx playwright test tests/visual --update-snapshots
 *
 * Screenshots are stored in tests/visual/__snapshots__/
 */
test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set consistent viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('Dashboard page renders correctly', async ({ page }) => {
    await page.goto('/');
    // Wait for page content to load - look for "Resume" in the header
    await expect(page.locator('text=Resume').first()).toBeVisible({ timeout: 10000 });

    await expect(page).toHaveScreenshot('dashboard.png', {
      maxDiffPixelRatio: 0.1, // Allow 10% pixel difference
    });
  });

  test('Editor page renders correctly', async ({ page }) => {
    await page.goto('/editor');
    // Wait for editor to load - look for "Resume Editor" or form elements
    await expect(page.locator('text=Resume Editor, Personal Info').first()).toBeVisible({
      timeout: 10000,
    });

    await expect(page).toHaveScreenshot('editor.png', {
      maxDiffPixelRatio: 0.1,
    });
  });

  test('Workspace page renders correctly', async ({ page }) => {
    await page.goto('/workspace');
    // Wait for workspace content
    await expect(page.locator('text=My Resumes').first()).toBeVisible({ timeout: 10000 });

    await expect(page).toHaveScreenshot('workspace.png', {
      maxDiffPixelRatio: 0.1,
    });
  });

  test('Settings page renders correctly', async ({ page }) => {
    await page.goto('/settings');
    // Wait for settings content
    await expect(page.locator('text=Settings').first()).toBeVisible({ timeout: 10000 });

    await expect(page).toHaveScreenshot('settings.png', {
      maxDiffPixelRatio: 0.1,
    });
  });

  test('Login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    // Wait for login form
    await expect(page.locator('text=Sign In').first()).toBeVisible({ timeout: 10000 });

    await expect(page).toHaveScreenshot('login.png', {
      maxDiffPixelRatio: 0.1,
    });
  });

  test('responsive: mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.locator('text=Resume').first()).toBeVisible({ timeout: 10000 });

    await expect(page).toHaveScreenshot('dashboard-mobile.png', {
      maxDiffPixelRatio: 0.15, // Allow more diff for mobile
    });
  });

  test('responsive: tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await expect(page.locator('text=Resume').first()).toBeVisible({ timeout: 10000 });

    await expect(page).toHaveScreenshot('dashboard-tablet.png', {
      maxDiffPixelRatio: 0.1,
    });
  });
});
