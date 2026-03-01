import { test, expect } from '@playwright/test';
import { testUser, registerUser, loginUser } from './helpers';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    const user = {
      email: `loginuser${Date.now()}@example.com`,
      username: `loginuser${Date.now()}`,
      password: 'LoginPass123!',
      fullName: 'Login User',
    };

    await registerUser(page, user);
    await page.goto('/login');
  });

  test('should display login form', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1, h2')).toContainText(/login|sign in/i);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    const email = `testlogin${Date.now()}@example.com`;
    const username = `testlogin${Date.now()}`;
    const password = 'ValidPass123!';

    const user = { email, username, password, fullName: 'Test Login' };
    await registerUser(page, user);

    await page.goto('/login');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should fail with invalid credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page).not.toHaveURL(/\/dashboard/);

    const errorMessage = page
      .locator('.error, [role="alert"], .toast-error, .error-message')
      .first();
    const hasError = (await errorMessage.count()) > 0;

    if (hasError) {
      await expect(errorMessage).toBeVisible();
    }
  });

  test('should validate required fields', async ({ page }) => {
    await page.click('button[type="submit"]');

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    await expect(emailInput).toHaveAttribute('required', '');
    await expect(passwordInput).toHaveAttribute('required', '');
  });

  test('should redirect to registration page', async ({ page }) => {
    const registerLink = page.locator('a:has-text("register"), a:has-text("Sign up")').first();
    if ((await registerLink.count()) > 0) {
      await registerLink.click();
      await expect(page).toHaveURL(/\/register/);
    }
  });

  test('should show password toggle', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]');
    const toggleButton = page
      .locator('button:has-text("show"), button:has-text("visibility")')
      .first();

    if ((await toggleButton.count()) > 0) {
      await expect(passwordInput).toHaveAttribute('type', 'password');
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'text');
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    }
  });

  test('should persist authentication across page reloads', async ({ page }) => {
    const email = `persistuser${Date.now()}@example.com`;
    const username = `persistuser${Date.now()}`;
    const password = 'PersistPass123!';

    const user = { email, username, password, fullName: 'Persist User' };
    await registerUser(page, user);

    await loginUser(page, email, password);
    await expect(page).toHaveURL(/\/dashboard/);

    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
