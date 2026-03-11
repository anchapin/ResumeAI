import { test, expect, Page } from '@playwright/test';
import { testUser, loginUser, registerUser, createResume } from '../e2e/helpers';

test.describe('Visual Regression Tests - Authenticated Pages', () => {
  let testUserInstance: typeof testUser;

  test.beforeAll(async ({ browser }) => {
    // Create a stable test user for visual tests
    testUserInstance = {
      email: 'visual-test-user@example.com',
      username: 'visualtestuser',
      password: 'VisualTest123!',
      fullName: 'Visual Test User',
    };

    const page = await browser.newPage();
    try {
      await registerUser(page, testUserInstance);
    } catch (e) {
      console.log('Test user registration skipped (may already exist)');
    }
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await loginUser(page, testUserInstance.email, testUserInstance.password);
  });

  test('Dashboard page - main layout', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // Wait for animations

    await expect(page).toHaveScreenshot('dashboard-main.png', {
      fullPage: true,
      mask: [
        page.locator('[data-testid="last-login-time"]'),
        page.locator('[class*="timestamp"]'),
        page.locator('[class*="updated"]'),
      ],
    });
  });

  test('Dashboard page - with resumes list', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Verify resumes list is visible
    const resumesList = page.locator('[data-testid="resumes-list"], [class*="resume"], .resume-card');
    if (await resumesList.count() > 0) {
      await expect(page).toHaveScreenshot('dashboard-with-resumes.png', {
        fullPage: true,
        mask: [page.locator('[data-testid="last-login-time"]')],
      });
    }
  });

  test('Resume Editor page - empty state', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('editor-empty.png', {
      fullPage: true,
      mask: [
        page.locator('[data-testid="auto-save-status"]'),
        page.locator('[class*="save-status"]'),
        page.locator('[class*="timestamp"]'),
      ],
    });
  });

  test('Resume Editor page - with content', async ({ page }) => {
    // Create sample resume data
    await createResume(page, {
      personalInfo: {
        fullName: 'John Doe',
        email: 'john@example.com',
        phone: '(555) 123-4567',
        location: 'San Francisco, CA',
        summary: 'Senior Software Engineer with 10+ years of experience',
      },
      experience: [
        {
          company: 'Tech Corp',
          position: 'Senior Engineer',
          startDate: '2020-01-01',
          endDate: '2024-01-01',
          description: 'Led frontend team and improved performance',
        },
      ],
    });

    await expect(page).toHaveScreenshot('editor-with-content.png', {
      fullPage: true,
      mask: [page.locator('[data-testid="auto-save-status"]')],
    });
  });

  test('Settings page - profile section', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('settings-profile.png', {
      fullPage: true,
    });
  });

  test('Settings page - preferences section', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Click on preferences if it's a tabbed interface
    const preferencesTab = page.locator('[role="tab"]:has-text("Preferences"), [data-testid="preferences-tab"]');
    if (await preferencesTab.count() > 0) {
      await preferencesTab.click();
      await page.waitForTimeout(300);
    }

    await expect(page).toHaveScreenshot('settings-preferences.png', {
      fullPage: true,
    });
  });

  test('Template selection page', async ({ page }) => {
    const templatesUrl = ['/templates', '/editor?template=select', '/dashboard?tab=templates'];
    
    for (const url of templatesUrl) {
      const response = await page.goto(url, { waitUntil: 'networkidle' });
      if (response?.status() === 200) {
        await page.waitForTimeout(500);
        await expect(page).toHaveScreenshot('templates-page.png', {
          fullPage: true,
        });
        return;
      }
    }
  });
});

test.describe('Visual Regression Tests - Public Pages', () => {
  test('Login page layout', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot('login-page.png', {
      fullPage: true,
    });
  });

  test('Registration page layout', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot('registration-page.png', {
      fullPage: true,
    });
  });

  test('Landing page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('landing-page.png', {
      fullPage: true,
    });
  });
});

test.describe('Visual Regression Tests - Responsive Design', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test('Dashboard - Desktop Large', async ({ page }) => {
    await loginUser(page, 'visual-test-user@example.com', 'VisualTest123!');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('dashboard-desktop-large.png', {
      fullPage: true,
      mask: [page.locator('[data-testid="last-login-time"]')],
    });
  });

  test.use({ viewport: { width: 768, height: 1024 } });

  test('Dashboard - Tablet', async ({ page }) => {
    await loginUser(page, 'visual-test-user@example.com', 'VisualTest123!');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('dashboard-tablet.png', {
      fullPage: true,
      mask: [page.locator('[data-testid="last-login-time"]')],
    });
  });

  test.use({ viewport: { width: 375, height: 667 } });

  test('Dashboard - Mobile', async ({ page }) => {
    await loginUser(page, 'visual-test-user@example.com', 'VisualTest123!');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('dashboard-mobile.png', {
      fullPage: true,
      mask: [page.locator('[data-testid="last-login-time"]')],
    });
  });
});
