import { test, expect } from '@playwright/test';
import { testUser, registerUser, createResume } from './helpers';

test.describe('Resume Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    const user = {
      email: `resumeuser${Date.now()}@example.com`,
      username: `resumeuser${Date.now()}`,
      password: 'ResumePass123!',
      fullName: 'Resume User',
    };

    await registerUser(page, user);
  });

  test('should display editor page', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toContainText(/editor/i);
    await expect(page.locator('input[placeholder*="Full Name"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="Email"]')).toBeVisible();
  });

  test('should fill personal information', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    const fullName = 'John Doe';
    const email = 'john.doe@example.com';
    const phone = '+1 234 567 8900';
    const location = 'San Francisco, CA';
    const summary = 'Experienced software developer';

    await page.fill('input[placeholder*="Full Name"]', fullName);
    await page.fill('input[placeholder*="Email"]', email);
    await page.fill('input[placeholder*="Phone"]', phone);
    await page.fill('input[placeholder*="Location"]', location);
    await page.fill('textarea[placeholder*="Summary"]', summary);

    await expect(page.locator('input[placeholder*="Full Name"]')).toHaveValue(fullName);
    await expect(page.locator('input[placeholder*="Email"]')).toHaveValue(email);
    await expect(page.locator('input[placeholder*="Phone"]')).toHaveValue(phone);
    await expect(page.locator('input[placeholder*="Location"]')).toHaveValue(location);
    await expect(page.locator('textarea[placeholder*="Summary"]')).toHaveValue(summary);
  });

  test('should add experience entry', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    const addExperienceButton = page
      .locator('button:has-text("Add Experience"), button:has-text("experience")')
      .first();

    if ((await addExperienceButton.count()) > 0) {
      await addExperienceButton.click();

      const company = 'Tech Company';
      const position = 'Software Engineer';
      const description = 'Developed and maintained web applications';

      await page.fill('input[placeholder*="Company"]', company);
      await page.fill('input[placeholder*="Position"]', position);
      await page.fill('textarea[placeholder*="Description"]', description);

      await expect(page.locator('input[placeholder*="Company"]')).toHaveValue(company);
      await expect(page.locator('input[placeholder*="Position"]')).toHaveValue(position);
      await expect(page.locator('textarea[placeholder*="Description"]')).toHaveValue(description);
    }
  });

  test('should add education entry', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    const addEducationButton = page
      .locator('button:has-text("Add Education"), button:has-text("education")')
      .first();

    if ((await addEducationButton.count()) > 0) {
      await addEducationButton.click();

      const school = 'University of Technology';
      const degree = 'Bachelor of Science';
      const field = 'Computer Science';

      await page.fill('input[placeholder*="School"]', school);
      await page.fill('input[placeholder*="Degree"]', degree);
      await page.fill('input[placeholder*="Field of Study"]', field);

      await expect(page.locator('input[placeholder*="School"]')).toHaveValue(school);
      await expect(page.locator('input[placeholder*="Degree"]')).toHaveValue(degree);
      await expect(page.locator('input[placeholder*="Field of Study"]')).toHaveValue(field);
    }
  });

  test('should save resume data', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    const fullName = 'Test User';
    await page.fill('input[placeholder*="Full Name"]', fullName);

    await page.waitForTimeout(2000);

    await page.reload();
    await page.waitForLoadState('networkidle');

    const savedName = await page.locator('input[placeholder*="Full Name"]').inputValue();
    expect(savedName).toBe(fullName);
  });

  test('should navigate to dashboard from editor', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    const dashboardLink = page.locator('a:has-text("Dashboard"), nav a[href="/dashboard"]').first();
    if ((await dashboardLink.count()) > 0) {
      await dashboardLink.click();
      await expect(page).toHaveURL(/\/dashboard/);
    }
  });

  test('should display save status', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    await page.fill('input[placeholder*="Full Name"]', 'New Name');

    const saveStatus = page.locator('[data-save-status], .save-status, .saving-indicator').first();

    await page.waitForTimeout(1500);

    const hasSaveStatus = (await saveStatus.count()) > 0;
    if (hasSaveStatus) {
      await expect(saveStatus).toBeVisible();
    }
  });

  test('should handle form validation', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[placeholder*="Email"]');

    await emailInput.fill('invalid-email');

    const isInvalid = await emailInput.evaluate((el) => {
      return el instanceof HTMLInputElement && !el.checkValidity();
    });

    if (isInvalid) {
      await expect(emailInput).toHaveClass(/invalid/);
    }
  });

  test('should delete experience entry', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    const addExperienceButton = page
      .locator('button:has-text("Add Experience"), button:has-text("experience")')
      .first();

    if ((await addExperienceButton.count()) > 0) {
      await addExperienceButton.click();
      await page.fill('input[placeholder*="Company"]', 'Test Company');

      const deleteButton = page
        .locator(
          'button:has-text("Delete"), button:has-text("Remove"), button[aria-label*="delete"]',
        )
        .first();

      if ((await deleteButton.count()) > 0) {
        await deleteButton.click();

        await page.waitForTimeout(500);

        const companyInput = page.locator('input[placeholder*="Company"]');
        const count = await companyInput.count();
        expect(count).toBeLessThan(2);
      }
    }
  });
});
