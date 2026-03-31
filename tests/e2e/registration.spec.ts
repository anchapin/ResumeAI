import { test, expect } from '@playwright/test';
import { testUser, registerUser } from './helpers';

test.describe('Registration Flow', () => {
  test('should display registration form', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1, h2')).toContainText(/register|sign up/i);
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('should register a new user successfully', async ({ page }) => {
    const user = {
      email: `newuser${Date.now()}@example.com`,
      username: `newuser${Date.now()}`,
      password: 'SecurePass123!',
      fullName: 'New User',
    };

    await page.goto('/register');
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="username"]', user.username);
    await page.fill('input[name="password"]', user.password);
    await page.fill('input[name="fullName"]', user.fullName);

    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await expect(page.locator('body')).toContainText(/dashboard/i);
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/register');

    await page.click('button[type="submit"]');

    const emailInput = page.locator('input[name="email"]');
    const usernameInput = page.locator('input[name="username"]');
    const passwordInput = page.locator('input[name="password"]');

    await expect(emailInput).toHaveAttribute('required', '');
    await expect(usernameInput).toHaveAttribute('required', '');
    await expect(passwordInput).toHaveAttribute('required', '');
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/register');

    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'TestPass123!');

    const isInvalid = await page.locator('input[name="email"]').evaluate((el) => {
      return el instanceof HTMLInputElement && !el.checkValidity();
    });

    expect(isInvalid).toBe(true);
  });

  test('should redirect to login page', async ({ page }) => {
    await page.goto('/register');

    const loginLink = page.locator('a:has-text("login"), a:has-text("Sign in")').first();
    if ((await loginLink.count()) > 0) {
      await loginLink.click();
      await expect(page).toHaveURL(/\/login/);
    }
  });
});
