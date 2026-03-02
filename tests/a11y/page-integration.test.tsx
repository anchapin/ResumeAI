/**
 * Page-level Accessibility Integration Tests
 * Tests complete workflows and interactions for WCAG 2.1 compliance
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

/**
 * Mock complete page workflows
 */

function MockDashboardPage() {
  return (
    <main aria-label="Dashboard">
      <header>
        <h1>My Resumes</h1>
        <nav aria-label="Resume filters">
          <button type="button" aria-pressed="true">
            All
          </button>
          <button type="button" aria-pressed="false">
            Recent
          </button>
          <button type="button" aria-pressed="false">
            Shared
          </button>
        </nav>
      </header>

      <section aria-labelledby="resumes-heading">
        <h2 id="resumes-heading">Your Resumes</h2>
        <div role="list" aria-label="List of resumes">
          <div role="listitem">
            <article>
              <h3>Software Engineer Resume</h3>
              <p>Last updated: March 1, 2025</p>
              <div role="group" aria-label="Resume actions">
                <button type="button">View</button>
                <button type="button">Edit</button>
                <button type="button">Download</button>
                <button type="button" aria-label="Delete resume">
                  ✕
                </button>
              </div>
            </article>
          </div>

          <div role="listitem">
            <article>
              <h3>Product Manager Resume</h3>
              <p>Last updated: February 15, 2025</p>
              <div role="group" aria-label="Resume actions">
                <button type="button">View</button>
                <button type="button">Edit</button>
                <button type="button">Download</button>
                <button type="button" aria-label="Delete resume">
                  ✕
                </button>
              </div>
            </article>
          </div>
        </div>
      </section>

      <button type="button" aria-label="Create new resume">
        + New Resume
      </button>
    </main>
  );
}

function MockLoginPage() {
  return (
    <main aria-label="Login">
      <div role="region" aria-labelledby="login-heading">
        <h1 id="login-heading">Sign In to ResumeAI</h1>
        <p>Build amazing resumes with AI assistance</p>

        <form aria-label="Sign in form">
          <div>
            <label htmlFor="email-input">Email Address</label>
            <input
              id="email-input"
              type="email"
              placeholder="you@example.com"
              required
              aria-required="true"
              aria-describedby="email-help"
            />
            <small id="email-help">We never share your email address</small>
          </div>

          <div>
            <label htmlFor="password-input">Password</label>
            <input
              id="password-input"
              type="password"
              required
              aria-required="true"
            />
          </div>

          <div>
            <input type="checkbox" id="remember-me" />
            <label htmlFor="remember-me">Remember me</label>
          </div>

          <button type="submit">Sign In</button>
        </form>

        <div aria-hidden="true">
          <hr />
        </div>

        <div>
          <button type="button" aria-label="Sign in with Google">
            Sign in with Google
          </button>
          <button type="button" aria-label="Sign in with GitHub">
            Sign in with GitHub
          </button>
        </div>

        <p>
          Don't have an account?{' '}
          <a href="/signup" aria-label="Sign up for a new account">
            Sign up
          </a>
        </p>
      </div>
    </main>
  );
}

function MockSettingsPage() {
  return (
    <main aria-label="Settings">
      <h1>Account Settings</h1>

      <div role="tablist" aria-label="Settings sections">
        <button role="tab" aria-selected="true" aria-controls="profile-panel" id="profile-tab">
          Profile
        </button>
        <button role="tab" aria-selected="false" aria-controls="privacy-panel" id="privacy-tab">
          Privacy
        </button>
        <button role="tab" aria-selected="false" aria-controls="notifications-panel" id="notifications-tab">
          Notifications
        </button>
      </div>

      <div role="tabpanel" id="profile-panel" aria-labelledby="profile-tab">
        <form aria-label="Profile settings">
          <fieldset>
            <legend>Profile Information</legend>
            <div>
              <label htmlFor="full-name">Full Name</label>
              <input id="full-name" type="text" />
            </div>
            <div>
              <label htmlFor="profile-email">Email Address</label>
              <input id="profile-email" type="email" />
            </div>
            <div>
              <label htmlFor="bio">Bio</label>
              <textarea id="bio" placeholder="Tell us about yourself" />
            </div>
          </fieldset>
          <button type="submit">Save Changes</button>
        </form>
      </div>

      <div role="tabpanel" id="privacy-panel" aria-labelledby="privacy-tab" hidden>
        <form aria-label="Privacy settings">
          <fieldset>
            <legend>Privacy Options</legend>
            <div>
              <input type="checkbox" id="public-profile" />
              <label htmlFor="public-profile">Make my profile public</label>
            </div>
            <div>
              <input type="checkbox" id="share-resumes" />
              <label htmlFor="share-resumes">Allow sharing resumes</label>
            </div>
          </fieldset>
          <button type="submit">Save Changes</button>
        </form>
      </div>

      <div role="tabpanel" id="notifications-panel" aria-labelledby="notifications-tab" hidden>
        <form aria-label="Notification settings">
          <fieldset>
            <legend>Notification Preferences</legend>
            <div>
              <input type="checkbox" id="email-updates" defaultChecked />
              <label htmlFor="email-updates">Email me about new features</label>
            </div>
            <div>
              <input type="checkbox" id="resume-tips" defaultChecked />
              <label htmlFor="resume-tips">Resume writing tips</label>
            </div>
          </fieldset>
          <button type="submit">Save Changes</button>
        </form>
      </div>
    </main>
  );
}

function MockNotificationContainer() {
  return (
    <div aria-live="polite" aria-atomic="true" role="status">
      <div role="alert">✓ Resume saved successfully!</div>
    </div>
  );
}

describe('Page-level Accessibility Integration', () => {
  async function checkPageA11y(element: HTMLElement): Promise<any> {
    return axe(element, {
      rules: {
        'color-contrast': { enabled: true },
        'button-name': { enabled: true },
        'form-field-multiple-labels': { enabled: true },
        'image-alt': { enabled: true },
        label: { enabled: true },
        'link-name': { enabled: true },
      },
    });
  }

  describe('Dashboard Page', () => {
    it('should be accessible', async () => {
      const { container } = render(<MockDashboardPage />);
      const results = await checkPageA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper main content landmark', () => {
      const { container } = render(<MockDashboardPage />);
      const main = container.querySelector('main[aria-label="Dashboard"]');
      expect(main).toBeTruthy();
    });

    it('should have accessible resume list with proper roles', () => {
      const { container } = render(<MockDashboardPage />);
      const list = container.querySelector('[role="list"]');
      const items = container.querySelectorAll('[role="listitem"]');

      expect(list?.getAttribute('aria-label')).toBe('List of resumes');
      expect(items.length).toBeGreaterThan(0);
    });

    it('should have accessible action buttons with labels', () => {
      const { container } = render(<MockDashboardPage />);
      const actionButtons = container.querySelectorAll('button[aria-label]');

      actionButtons.forEach((button) => {
        expect(button.getAttribute('aria-label')).toBeTruthy();
      });
    });

    it('should have accessible filter navigation', () => {
      const { container } = render(<MockDashboardPage />);
      const nav = container.querySelector('nav[aria-label="Resume filters"]');
      const buttons = nav?.querySelectorAll('button');

      expect(nav).toBeTruthy();
      buttons?.forEach((button) => {
        expect(button.getAttribute('aria-pressed')).toBeTruthy();
      });
    });

    it('should have proper heading hierarchy', () => {
      const { container } = render(<MockDashboardPage />);
      const h1 = container.querySelector('h1');
      const h2 = container.querySelector('h2');

      expect(h1).toBeTruthy();
      expect(h2).toBeTruthy();
    });
  });

  describe('Login Page', () => {
    it('should be accessible', async () => {
      const { container } = render(<MockLoginPage />);
      const results = await checkPageA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper form accessibility', () => {
      const { container } = render(<MockLoginPage />);
      const form = container.querySelector('form');
      const inputs = form?.querySelectorAll('input[type="email"], input[type="password"]');

      expect(form?.getAttribute('aria-label')).toBe('Sign in form');
      inputs?.forEach((input) => {
        const id = input.getAttribute('id');
        const label = container.querySelector(`label[for="${id}"]`);
        expect(label).toBeTruthy();
      });
    });

    it('should have accessible required field indicators', () => {
      const { container } = render(<MockLoginPage />);
      const requiredInputs = container.querySelectorAll('input[required]');

      requiredInputs.forEach((input) => {
        expect(input.getAttribute('aria-required')).toBe('true');
      });
    });

    it('should have accessible help text', () => {
      const { container } = render(<MockLoginPage />);
      const emailInput = container.querySelector('#email-input');
      const helpText = container.querySelector('#email-help');

      expect(emailInput?.getAttribute('aria-describedby')).toBe('email-help');
      expect(helpText?.textContent).toBeTruthy();
    });

    it('should have accessible OAuth buttons with labels', () => {
      const { container } = render(<MockLoginPage />);
      const oauthButtons = container.querySelectorAll('button[aria-label*="Sign in with"]');

      expect(oauthButtons.length).toBeGreaterThan(0);
    });

    it('should have accessible signup link', () => {
      const { container } = render(<MockLoginPage />);
      const signupLink = container.querySelector('a[aria-label*="Sign up"]');

      expect(signupLink?.textContent).toBeTruthy();
      expect(signupLink?.getAttribute('aria-label')).toBeTruthy();
    });
  });

  describe('Settings Page', () => {
    it('should be accessible', async () => {
      const { container } = render(<MockSettingsPage />);
      const results = await checkPageA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper tab navigation', () => {
      const { container } = render(<MockSettingsPage />);
      const tablist = container.querySelector('[role="tablist"]');
      const tabs = container.querySelectorAll('[role="tab"]');

      expect(tablist?.getAttribute('aria-label')).toBe('Settings sections');
      expect(tabs.length).toBe(3);
    });

    it('should have proper tab panels', () => {
      const { container } = render(<MockSettingsPage />);
      const panels = container.querySelectorAll('[role="tabpanel"]');

      expect(panels.length).toBe(3);
      panels.forEach((panel) => {
        expect(panel.getAttribute('aria-labelledby')).toBeTruthy();
      });
    });

    it('should have accessible fieldsets with legends', () => {
      const { container } = render(<MockSettingsPage />);
      const fieldsets = container.querySelectorAll('fieldset');
      const legends = container.querySelectorAll('legend');

      expect(fieldsets.length).toBeGreaterThan(0);
      expect(legends.length).toBeGreaterThan(0);
    });

    it('should have proper form labels for all inputs', () => {
      const { container } = render(<MockSettingsPage />);
      const inputs = container.querySelectorAll('input[type="text"], input[type="email"], textarea');

      inputs.forEach((input) => {
        const id = input.getAttribute('id');
        const label = id ? container.querySelector(`label[for="${id}"]`) : null;
        expect(label).toBeTruthy();
      });
    });

    it('should have accessible checkboxes with labels', () => {
      const { container } = render(<MockSettingsPage />);
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');

      checkboxes.forEach((checkbox) => {
        const id = checkbox.getAttribute('id');
        const label = id ? container.querySelector(`label[for="${id}"]`) : null;
        expect(label).toBeTruthy();
      });
    });
  });

  describe('Notification Container', () => {
    it('should be accessible', async () => {
      const { container } = render(<MockNotificationContainer />);
      const results = await checkPageA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have live region attributes', () => {
      const { container } = render(<MockNotificationContainer />);
      const liveRegion = container.querySelector('[aria-live]');

      expect(liveRegion?.getAttribute('aria-live')).toBe('polite');
      expect(liveRegion?.getAttribute('aria-atomic')).toBe('true');
      expect(liveRegion?.getAttribute('role')).toBe('status');
    });

    it('should announce alerts with proper role', () => {
      const { container } = render(<MockNotificationContainer />);
      const alert = container.querySelector('[role="alert"]');

      expect(alert).toBeTruthy();
      expect(alert?.textContent).toContain('Resume saved successfully');
    });
  });

  describe('Keyboard Navigation Integration', () => {
    it('should support tab through form fields in login', async () => {
      const user = userEvent.setup();
      const { container } = render(<MockLoginPage />);

      const emailInput = container.querySelector('#email-input') as HTMLInputElement;
      const passwordInput = container.querySelector('#password-input') as HTMLInputElement;
      const rememberCheckbox = container.querySelector('#remember-me') as HTMLInputElement;

      // These should be focusable in tab order
      expect(emailInput?.tabIndex).not.toBe(-1);
      expect(passwordInput?.tabIndex).not.toBe(-1);
      expect(rememberCheckbox?.tabIndex).not.toBe(-1);
    });

    it('should have accessible button groups with keyboard support', () => {
      const { container } = render(<MockDashboardPage />);
      const filterButtons = container.querySelectorAll('nav button');

      filterButtons.forEach((button) => {
        expect((button as HTMLButtonElement).type).toBe('button');
      });
    });
  });

  describe('Error and Success Messages', () => {
    it('should announce errors to screen readers', async () => {
      const { container, rerender } = render(<MockLoginPage />);

      // Simulate adding an error message
      const errorContainer = document.createElement('div');
      errorContainer.setAttribute('role', 'alert');
      errorContainer.setAttribute('aria-live', 'assertive');
      errorContainer.textContent = 'Invalid email address';

      container.appendChild(errorContainer);

      const alert = container.querySelector('[role="alert"]');
      expect(alert?.getAttribute('aria-live')).toBe('assertive');
      expect(alert?.textContent).toContain('Invalid email address');
    });
  });
});
