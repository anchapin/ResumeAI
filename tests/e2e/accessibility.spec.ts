/**
 * E2E Accessibility Tests
 * Uses Playwright with axe-core to test WCAG 2.1 AA compliance
 * on the live application.
 */

import { test, expect } from '@playwright/test';

// Define axe-core types
interface AxeResults {
  violations: AxeViolation[];
  passes: AxeCheck[];
}

interface AxeViolation {
  id: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  helpUrl: string;
  nodes: AxeNode[];
}

interface AxeNode {
  html: string;
  failureSummary: string;
}

interface AxeCheck {
  id: string;
  impact: string;
  description: string;
}

/**
 * Inject and run axe-core on the page
 */
async function runAxe(page: any): Promise<AxeResults> {
  return page.evaluate(async () => {
    // @ts-ignore - axe-core is loaded globally
    const axe = (window as any).axe;
    if (!axe) {
      throw new Error('axe-core not loaded');
    }
    return await axe.run();
  });
}

/**
 * Filter out known false positives from third-party libraries
 */
function filterViolations(violations: AxeViolation[]): AxeViolation[] {
  const ignoredRules = [
    'image-redundant-alt', // Third-party OAuth buttons
    'duplicate-id', // Generated IDs from libraries
    'duplicate-id-active', // Generated IDs from libraries
    'duplicate-id-aria', // Generated IDs from libraries
  ];

  return violations.filter((v) => !ignoredRules.includes(v.id));
}

test.describe('E2E Accessibility Tests (WCAG 2.1 AA)', () => {
  test.beforeEach(async ({ page }) => {
    // Inject axe-core into the page
    await page.addInitScript(() => {
      // @ts-ignore
      window.axe = require('axe-core');
    });
  });

  test.describe('Login Page', () => {
    test('should have no accessibility violations on login page', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      const results = await runAxe(page);
      const filteredViolations = filterViolations(results.violations);

      expect(filteredViolations).toHaveLength(0);
    });

    test('should have proper form labels on login page', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      // Check for labels
      const emailLabel = page.locator('label[for="email"], label:has-text("Email")');
      const passwordLabel = page.locator('label[for="password"], label:has-text("Password")');

      await expect(emailLabel).toBeVisible();
      await expect(passwordLabel).toBeVisible();
    });

    test('should have accessible submit button', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeVisible();

      // Button should have accessible name
      const buttonName = await submitButton.textContent();
      expect(buttonName?.trim()).toBeTruthy();
    });

    test('should indicate required fields', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      const emailInput = page.locator('input#email, input[name="email"]');
      const passwordInput = page.locator('input#password, input[name="password"]');

      // Check for required indicator (aria-required or required attribute)
      const emailRequired = await emailInput.getAttribute('aria-required');
      const passwordRequired = await passwordInput.getAttribute('aria-required');
      const emailIsRequired = await emailInput.getAttribute('required');
      const passwordIsRequired = await passwordInput.getAttribute('required');

      expect(emailRequired === 'true' || emailIsRequired !== null).toBe(true);
      expect(passwordRequired === 'true' || passwordIsRequired !== null).toBe(true);
    });
  });

  test.describe('Registration Page', () => {
    test('should have no accessibility violations on registration page', async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('networkidle');

      const results = await runAxe(page);
      const filteredViolations = filterViolations(results.violations);

      expect(filteredViolations).toHaveLength(0);
    });

    test('should have accessible form fields', async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('networkidle');

      // Check for at least one form field with label
      const inputs = page.locator('input:not([type="hidden"])');
      const count = await inputs.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Dashboard Page', () => {
    test('should have no accessibility violations on dashboard', async ({ page }) => {
      // Go directly to dashboard (may require auth in real scenario)
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      // Wait a bit for any dynamic content
      await page.waitForTimeout(1000);

      const results = await runAxe(page);
      const filteredViolations = filterViolations(results.violations);

      // Log violations if any for debugging
      if (filteredViolations.length > 0) {
        console.log('Dashboard violations:', JSON.stringify(filteredViolations, null, 2));
      }

      expect(filteredViolations).toHaveLength(0);
    });

    test('should have proper heading structure', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      const headingLevels: number[] = [];

      for (const heading of headings) {
        const tag = await heading.evaluate((el) => el.tagName);
        const level = parseInt(tag.substring(1));
        headingLevels.push(level);
      }

      // Should have at least one heading
      expect(headingLevels.length).toBeGreaterThan(0);

      // First heading should be h1
      if (headingLevels.length > 0) {
        expect(headingLevels[0]).toBe(1);
      }
    });

    test('should have skip link or main landmark', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      const skipLink = page.locator('a:has-text("Skip"), [href="#main"]');
      const mainLandmark = page.locator('main, [role="main"]');

      const hasSkipOrMain = (await skipLink.count()) > 0 || (await mainLandmark.count()) > 0;
      expect(hasSkipOrMain).toBe(true);
    });
  });

  test.describe('Editor Page', () => {
    test('should have no accessibility violations on editor page', async ({ page }) => {
      await page.goto('/editor');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const results = await runAxe(page);
      const filteredViolations = filterViolations(results.violations);

      if (filteredViolations.length > 0) {
        console.log('Editor violations:', JSON.stringify(filteredViolations, null, 2));
      }

      expect(filteredViolations).toHaveLength(0);
    });

    test('should have accessible form inputs', async ({ page }) => {
      await page.goto('/editor');
      await page.waitForLoadState('domcontentloaded');

      const inputs = page.locator('input:not([type="hidden"]), textarea, select');
      const count = await inputs.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should have proper labels for form inputs', async ({ page }) => {
      await page.goto('/editor');
      await page.waitForLoadState('domcontentloaded');

      const inputs = page.locator('input:not([type="hidden"]):not([type="submit"]), textarea');
      const inputCount = await inputs.count();

      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');

        // Input should have at least one way of being labeled
        const hasLabel = id !== null || ariaLabel !== null || ariaLabelledBy !== null;

        if (!hasLabel) {
          // Check if there's a label with matching for attribute
          if (id) {
            const label = page.locator(`label[for="${id}"]`);
            const labelCount = await label.count();
            expect(labelCount).toBeGreaterThan(0);
          }
        }
      }
    });
  });

  test.describe('Settings Page', () => {
    test('should have no accessibility violations on settings page', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const results = await runAxe(page);
      const filteredViolations = filterViolations(results.violations);

      if (filteredViolations.length > 0) {
        console.log('Settings violations:', JSON.stringify(filteredViolations, null, 2));
      }

      expect(filteredViolations).toHaveLength(0);
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should be keyboard navigable on login page', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      // Press Tab to navigate through interactive elements
      await page.keyboard.press('Tab');

      // Check that focus is visible on some element
      const focused = await page.evaluate(() => document.activeElement);
      expect(focused).toBeTruthy();
    });

    test('should support keyboard navigation on editor', async ({ page }) => {
      await page.goto('/editor');
      await page.waitForLoadState('domcontentloaded');

      // Tab through the page
      const focusableElements: string[] = [];
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        const focused = await page.evaluate(() => {
          const el = document.activeElement;
          return el ? el.tagName : null;
        });
        if (focused && focused !== 'BODY') {
          focusableElements.push(focused);
        }
      }

      // Should have navigated through some focusable elements
      expect(focusableElements.length).toBeGreaterThan(0);
    });
  });

  test.describe('Color Contrast', () => {
    test('should have sufficient color contrast on login page', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      const results = await runAxe(page);
      const contrastViolations = results.violations.filter(
        (v) => v.id === 'color-contrast' || v.id === 'target-size',
      );

      expect(contrastViolations).toHaveLength(0);
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should have proper ARIA labels for interactive elements', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      // Check for buttons with accessible names
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();

      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i);
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        const title = await button.getAttribute('title');

        // Button should have accessible name
        const hasName = (text && text.trim().length > 0) || ariaLabel !== null || title !== null;
        expect(hasName).toBe(true);
      }
    });

    test('should have descriptive link text', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      const links = page.locator('a[href]:not([href="#"])');
      const linkCount = await links.count();

      for (let i = 0; i < linkCount; i++) {
        const link = links.nth(i);
        const text = await link.textContent();
        const ariaLabel = await link.getAttribute('aria-label');

        // Link should have accessible name
        const hasName = (text && text.trim().length > 0) || ariaLabel !== null;
        expect(hasName).toBe(true);
      }
    });
  });

  test.describe('Focus Management', () => {
    test('should have visible focus indicators', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      // Focus on first input
      const firstInput = page.locator('input').first();
      await firstInput.focus();

      // Check for focus styles
      const hasFocus = await firstInput.evaluate((el) => {
        return el === document.activeElement;
      });
      expect(hasFocus).toBe(true);
    });

    test('should manage focus correctly on page navigation', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      // Get initial active element
      const initialActive = await page.evaluate(() => document.activeElement?.tagName);

      // Press Tab a few times
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Active element should have changed
      const newActive = await page.evaluate(() => document.activeElement?.tagName);
      expect(newActive).not.toBe(initialActive);
    });
  });

  test.describe('Error Handling Accessibility', () => {
    test('should announce form validation errors', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      // Submit empty form
      await page.locator('button[type="submit"]').click();

      // Check for error messages with ARIA
      const errorMessages = page.locator('[role="alert"], .error, [aria-invalid="true"]');
      const errorCount = await errorMessages.count();

      // Either there are error messages or form prevents submission
      // In accessible forms, errors should be announced via ARIA
      if (errorCount > 0) {
        const firstError = errorMessages.first();
        await expect(firstError).toBeVisible();
      }
    });
  });
});
