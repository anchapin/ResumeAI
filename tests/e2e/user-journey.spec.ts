import { test, expect } from '@playwright/test';
import { testUser, registerUser, loginUser, createResume, logout } from './helpers';

test.describe('Complete User Journey', () => {
  let userCredentials: { email: string; username: string; password: string; fullName: string };

  test.beforeEach(async ({ page }) => {
    userCredentials = {
      email: `journeyuser${Date.now()}@example.com`,
      username: `journeyuser${Date.now()}`,
      password: 'JourneyPass123!',
      fullName: 'Journey User',
    };
  });

  test('should complete full user flow: register -> create resume -> download PDF', async ({
    page,
  }) => {
    await test.step('Register new user', async () => {
      await registerUser(page, userCredentials);
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.locator('body')).toContainText(/dashboard/i);
    });

    await test.step('Navigate to editor', async () => {
      await page.goto('/editor');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('input[placeholder*="Full Name"]')).toBeVisible();
    });

    await test.step('Fill resume data', async () => {
      await createResume(page, {
        personalInfo: {
          fullName: 'Jane Smith',
          email: 'jane.smith@example.com',
          phone: '+1 555 123 4567',
          location: 'New York, NY',
          summary: 'Full-stack developer with 5 years of experience',
        },
        experience: [
          {
            company: 'Digital Solutions Inc',
            position: 'Senior Developer',
            startDate: '2021-06',
            endDate: 'Present',
            description: 'Led development of scalable web applications',
          },
          {
            company: 'StartUp Co',
            position: 'Developer',
            startDate: '2019-01',
            endDate: '2021-05',
            description: 'Built MVP products and maintained legacy systems',
          },
        ],
        education: [
          {
            school: 'MIT',
            degree: 'Master of Science',
            field: 'Computer Science',
            startDate: '2017-09',
            endDate: '2019-05',
          },
          {
            school: 'University of California',
            degree: 'Bachelor of Science',
            field: 'Computer Engineering',
            startDate: '2013-09',
            endDate: '2017-05',
          },
        ],
      });

      await expect(page.locator('input[placeholder*="Full Name"]')).toHaveValue('Jane Smith');
    });

    await test.step('Download PDF', async () => {
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Download PDF"), button:has-text("Export PDF")');

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    });

    await test.step('Verify data persistence', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');

      const fullName = await page.locator('input[placeholder*="Full Name"]').inputValue();
      expect(fullName).toBe('Jane Smith');
    });
  });

  test('should allow re-login after logout', async ({ page }) => {
    await test.step('Register and login', async () => {
      await registerUser(page, userCredentials);
      await expect(page).toHaveURL(/\/dashboard/);
    });

    await test.step('Logout', async () => {
      await logout(page);
      await expect(page).toHaveURL(/\/login/);
    });

    await test.step('Login again', async () => {
      await loginUser(page, userCredentials.email, userCredentials.password);
      await expect(page).toHaveURL(/\/dashboard/);
    });
  });

  test('should navigate between pages', async ({ page }) => {
    await registerUser(page, userCredentials);

    await test.step('Navigate to dashboard', async () => {
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.locator('body')).toContainText(/dashboard/i);
    });

    await test.step('Navigate to editor', async () => {
      await page.goto('/editor');
      await expect(page).toHaveURL(/\/editor/);
      await expect(page.locator('body')).toContainText(/editor/i);
    });

    await test.step('Navigate to applications', async () => {
      await page.goto('/applications');
      await expect(page).toHaveURL(/\/applications/);
    });

    await test.step('Navigate to settings', async () => {
      await page.goto('/settings');
      await expect(page).toHaveURL(/\/settings/);
    });
  });

  test('should handle multiple resume updates', async ({ page }) => {
    await registerUser(page, userCredentials);
    await page.goto('/editor');

    await test.step('Create initial resume', async () => {
      await createResume(page, {
        personalInfo: {
          fullName: 'User One',
          email: 'user.one@example.com',
          phone: '+1 111 111 1111',
          location: 'City One',
          summary: 'First version of resume',
        },
      });

      await expect(page.locator('input[placeholder*="Full Name"]')).toHaveValue('User One');
    });

    await test.step('Update resume', async () => {
      await page.fill('input[placeholder*="Full Name"]', 'User Two');
      await page.fill('input[placeholder*="Email"]', 'user.two@example.com');
      await page.fill('textarea[placeholder*="Summary"]', 'Updated resume summary');

      await page.waitForTimeout(1500);

      await expect(page.locator('input[placeholder*="Full Name"]')).toHaveValue('User Two');
      await expect(page.locator('input[placeholder*="Email"]')).toHaveValue('user.two@example.com');
    });

    await test.step('Verify persistence after reload', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');

      await expect(page.locator('input[placeholder*="Full Name"]')).toHaveValue('User Two');
    });
  });

  test('should validate form inputs', async ({ page }) => {
    await registerUser(page, userCredentials);
    await page.goto('/editor');

    await test.step('Test email validation', async () => {
      const emailInput = page.locator('input[placeholder*="Email"]');
      await emailInput.fill('invalid-email');

      const isInvalid = await emailInput.evaluate((el) => {
        return el instanceof HTMLInputElement && !el.checkValidity();
      });

      expect(isInvalid).toBe(true);
    });

    await test.step('Test phone validation', async () => {
      const phoneInput = page.locator('input[placeholder*="Phone"]');
      await phoneInput.fill('abc');

      await phoneInput.fill('+1 234 567 8900');
      const value = await phoneInput.inputValue();
      expect(value).toBe('+1 234 567 8900');
    });
  });

  test('should handle empty state gracefully', async ({ page }) => {
    await registerUser(page, userCredentials);
    await page.goto('/editor');

    await test.step('Attempt PDF download with empty resume', async () => {
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Download PDF"), button:has-text("Export PDF")');

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    });

    await test.step('Verify editor still functional', async () => {
      await page.fill('input[placeholder*="Full Name"]', 'Test User');
      await expect(page.locator('input[placeholder*="Full Name"]')).toHaveValue('Test User');
    });
  });

  test('should maintain authentication state', async ({ page }) => {
    await registerUser(page, userCredentials);

    await test.step('Access authenticated route', async () => {
      await page.goto('/editor');
      await expect(page).toHaveURL(/\/editor/);
      await expect(page.locator('input[placeholder*="Full Name"]')).toBeVisible();
    });

    await test.step('Access protected route after reload', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/editor/);
    });

    await test.step('Access another protected route', async () => {
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/dashboard/);
    });
  });
});
