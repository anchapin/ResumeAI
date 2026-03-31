import { test, expect } from '@playwright/test';
import { testUser, registerUser } from './helpers';

test.describe('Registration Flow', () => {
  test('should display registration form', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toContainText(/Create your account/i);
    await expect(page.locator('#reg-email')).toBeVisible();
    await expect(page.locator('#reg-username')).toBeVisible();
    await expect(page.locator('#reg-password')).toBeVisible();
  });

  test('should register a new user successfully', async ({ page }) => {
    const user = {
      email: `newuser${Date.now()}@example.com`,
      username: `newuser${Date.now()}`,
      password: 'SecurePass123!',
      fullName: 'New User',
    };

    await page.goto('/register');
    await page.fill('#reg-email', user.email);
    await page.fill('#reg-username', user.username);
    await page.fill('#reg-password', user.password);
    await page.fill('#reg-fullname', user.fullName);
    await page.fill('#reg-confirm', user.password);

    await page.click('button[type="submit"]');

    await expect(page.getByText('Account Created!')).toBeVisible({ timeout: 10000 });
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/register');

    await page.click('button[type="submit"]');

    // The registration component uses custom validation logic rather than native required attributes
    await expect(page.getByText('Please fill in all required fields.')).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/register');

    await page.fill('#reg-email', 'invalid-email');
    await page.fill('#reg-username', 'testuser');
    await page.fill('#reg-password', 'TestPass123!');

    const isInvalid = await page.locator('#reg-email').evaluate((el) => {
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
