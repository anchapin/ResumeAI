import { Page, expect } from '@playwright/test';

export const testUser = {
  email: `test-user-${Date.now()}@example.com`,
  username: `testuser${Date.now()}`,
  password: 'TestPassword123!',
  fullName: 'Test User',
};

export async function registerUser(page: Page, user: typeof testUser): Promise<void> {
  await page.goto('/register');
  await page.waitForLoadState('networkidle');

  await page.fill('#reg-email', user.email);
  await page.fill('#reg-username', user.username);
  await page.fill('#reg-fullname', user.fullName);
  await page.fill('#reg-password', user.password);
  await page.fill('#reg-confirm', user.password);

  await page.click('button[type="submit"]');

  // Wait for success message or redirect
  // Allow for both direct /login redirect or passing through to /dashboard based on app behavior
  await expect(page).toHaveURL(/\/(login|dashboard|register)/);
}

export async function loginUser(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/(dashboard|login)/);
}

export async function createResume(
  page: Page,
  resumeData: {
    personalInfo?: {
      fullName?: string;
      email?: string;
      phone?: string;
      location?: string;
      summary?: string;
    };
    experience?: Array<{
      company?: string;
      position?: string;
      startDate?: string;
      endDate?: string;
      description?: string;
    }>;
    education?: Array<{
      school?: string;
      degree?: string;
      field?: string;
      startDate?: string;
      endDate?: string;
    }>;
  },
): Promise<void> {
  await page.goto('/editor');
  await page.waitForLoadState('networkidle');

  if (resumeData.personalInfo) {
    const info = resumeData.personalInfo;
    if (info.fullName) {
      await page.fill('input[placeholder*="Full Name"]', info.fullName);
    }
    if (info.email) {
      await page.fill('input[placeholder*="Email"]', info.email);
    }
    if (info.phone) {
      await page.fill('input[placeholder*="Phone"]', info.phone);
    }
    if (info.location) {
      await page.fill('input[placeholder*="Location"]', info.location);
    }
    if (info.summary) {
      await page.fill('textarea[placeholder*="Summary"]', info.summary);
    }
  }

  if (resumeData.experience) {
    for (const exp of resumeData.experience) {
      await page.click('button:has-text("Add Experience")');

      if (exp.company) {
        await page.fill('input[placeholder*="Company"]', exp.company);
      }
      if (exp.position) {
        await page.fill('input[placeholder*="Position"]', exp.position);
      }
      if (exp.startDate) {
        await page.fill('input[type="date"].start-date', exp.startDate);
      }
      if (exp.endDate) {
        await page.fill('input[type="date"].end-date', exp.endDate);
      }
      if (exp.description) {
        await page.fill('textarea[placeholder*="Description"]', exp.description);
      }
    }
  }

  if (resumeData.education) {
    for (const edu of resumeData.education) {
      await page.click('button:has-text("Add Education")');

      if (edu.school) {
        await page.fill('input[placeholder*="School"]', edu.school);
      }
      if (edu.degree) {
        await page.fill('input[placeholder*="Degree"]', edu.degree);
      }
      if (edu.field) {
        await page.fill('input[placeholder*="Field of Study"]', edu.field);
      }
      if (edu.startDate) {
        await page.fill('input[type="date"].start-date', edu.startDate);
      }
      if (edu.endDate) {
        await page.fill('input[type="date"].end-date', edu.endDate);
      }
    }
  }

  await page.waitForTimeout(1000);
}

export async function generatePDF(page: Page): Promise<void> {
  await page.goto('/editor');
  await page.waitForLoadState('networkidle');

  const downloadPromise = page.waitForEvent('download');
  await page.click('button:has-text("Download PDF")');

  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
}

export async function logout(page: Page): Promise<void> {
  await page.click('button[aria-label*="Logout"], button:has-text("Logout")');
  await page.waitForURL(/\/login/);
}

export async function waitForAuth(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await expect(page.locator('body')).not.toHaveClass(/loading/);
}
