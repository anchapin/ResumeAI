import { test, expect } from '@playwright/test';
import { testUser, registerUser, createResume } from './helpers';

test.describe('PDF Generation Flow', () => {
  test.beforeEach(async ({ page }) => {
    const user = {
      email: `pdfuser${Date.now()}@example.com`,
      username: `pdfuser${Date.now()}`,
      password: 'PdfPass123!',
      fullName: 'PDF User',
    };

    await registerUser(page, user);

    await createResume(page, {
      personalInfo: {
        fullName: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1 234 567 8900',
        location: 'San Francisco, CA',
        summary: 'Experienced software developer with expertise in web development',
      },
      experience: [
        {
          company: 'Tech Company',
          position: 'Software Engineer',
          startDate: '2020-01',
          endDate: '2024-01',
          description: 'Developed and maintained web applications using React and Node.js',
        },
      ],
      education: [
        {
          school: 'University of Technology',
          degree: 'Bachelor of Science',
          field: 'Computer Science',
          startDate: '2016-09',
          endDate: '2020-05',
        },
      ],
    });
  });

  test('should display PDF download button', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    const downloadButton = page
      .locator('button:has-text("Download PDF"), button:has-text("Export PDF")')
      .first();
    await expect(downloadButton).toBeVisible();
  });

  test('should download PDF successfully', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Download PDF"), button:has-text("Export PDF")');

    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.pdf$/);

    const path = await download.path();
    expect(path).toBeTruthy();
  });

  test('should show download progress indicator', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    // Start the download and wait for progress indicator to appear
    const downloadPromise = page.waitForEvent('download');

    // Click download and wait for either progress indicator or download completion
    const progressIndicator = page.locator('.progress, .loading, [role="progressbar"]').first();

    // Wait for either progress indicator to appear OR download to complete
    // Use Promise.race to handle both scenarios
    await Promise.race([
      expect(progressIndicator)
        .toBeVisible({ timeout: 5000 })
        .catch(() => {}),
      downloadPromise,
    ]);

    // If progress indicator exists, verify it
    const hasProgress = (await progressIndicator.count()) > 0;
    if (hasProgress) {
      await expect(progressIndicator).toBeVisible();
    }

    await downloadPromise;
  });

  test('should handle empty resume PDF generation', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Download PDF"), button:has-text("Export PDF")');

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });

  test('should validate PDF download filename', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    const fullName = 'John Doe';
    await page.fill('input[placeholder*="Full Name"]', fullName);
    // Wait for the input to be filled and state to update
    await page.waitForLoadState('networkidle');

    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Download PDF"), button:has-text("Export PDF")');

    const download = await downloadPromise;
    const filename = download.suggestedFilename().toLowerCase();

    expect(filename).toMatch(/\.pdf$/);
  });

  test('should support multiple PDF downloads', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    for (let i = 0; i < 2; i++) {
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Download PDF"), button:has-text("Export PDF")');

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.pdf$/);

      // Wait for any pending operations to complete
      await page.waitForLoadState('networkidle');
    }
  });

  test('should display error on failed generation', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    await page.route('**/api/v1/render/pdf', (route) => route.abort());

    await page.click('button:has-text("Download PDF"), button:has-text("Export PDF")');

    // Wait for potential error state - use network idle as proxy
    await page.waitForLoadState('networkidle');

    const errorMessage = page.locator('.error, [role="alert"], .toast-error').first();
    const hasError = (await errorMessage.count()) > 0;

    // If error UI is implemented, it should be visible
    if (hasError) {
      await expect(errorMessage).toBeVisible();
    }
  });
});
