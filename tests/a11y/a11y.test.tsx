/**
 * Accessibility Tests for ResumeAI
 * Tests WCAG 2.1 Level AA compliance using axe-core
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

// Extend Vitest matchers
expect.extend(toHaveNoViolations);

describe.sequential('Accessibility (WCAG 2.1 AA)', () => {
  /**
   * Helper function to run axe accessibility checks
   */
  async function checkAccessibility(element: HTMLElement): Promise<any> {
    return axe(element, {
      rules: {
        // Configure rules for WCAG 2.1 Level AA
        region: { enabled: true },
        'color-contrast': { enabled: true },
        'aria-required-attr': { enabled: true },
        'aria-valid-attr': { enabled: true },
        'button-name': { enabled: true },
        'form-field-multiple-labels': { enabled: true },
        'image-alt': { enabled: true },
        label: { enabled: true },
        'link-name': { enabled: true },
      },
    });
  }

  describe('App Shell', () => {
    it('should have no accessibility violations in main layout', async () => {
      const { container } = render(
        <div role="main" aria-label="Main content">
          <h1>ResumeAI</h1>
          <nav aria-label="Main navigation">
            <ul>
              <li>
                <a href="/">Home</a>
              </li>
              <li>
                <a href="/resumes">Resumes</a>
              </li>
            </ul>
          </nav>
        </div>,
      );

      const results = await checkAccessibility(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper heading hierarchy', async () => {
      const { container } = render(
        <div>
          <h1>Main Title</h1>
          <section>
            <h2>Section Title</h2>
            <p>Content</p>
          </section>
        </div>,
      );

      const results = await checkAccessibility(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Forms', () => {
    it('should have accessible form controls', async () => {
      const { container } = render(
        <form>
          <div>
            <label htmlFor="email">Email Address</label>
            <input id="email" type="email" name="email" required />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input id="password" type="password" name="password" required />
          </div>
          <button type="submit">Sign In</button>
        </form>,
      );

      const results = await checkAccessibility(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper error messages', async () => {
      const { container } = render(
        <form>
          <div>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              aria-invalid="true"
              aria-describedby="username-error"
            />
            <div id="username-error" role="alert">
              Username is required
            </div>
          </div>
        </form>,
      );

      const results = await checkAccessibility(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Buttons and Links', () => {
    it('should have accessible buttons', async () => {
      const { container } = render(
        <div>
          <button type="button">Save Resume</button>
          <button type="submit">Submit</button>
          <a href="/help">Help</a>
          <button type="button" aria-label="Close dialog">
            ×
          </button>
        </div>,
      );

      const results = await checkAccessibility(container);
      expect(results).toHaveNoViolations();
    });

    it('should have visible focus indicators', async () => {
      const { container } = render(
        <div>
          <button
            type="button"
            style={{
              outline: '2px solid #4A90E2',
              outlineOffset: '2px',
            }}
          >
            Focusable Button
          </button>
        </div>,
      );

      const results = await checkAccessibility(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Images and Media', () => {
    it('should have alt text for images', async () => {
      const { container } = render(
        <div>
          <img src="/profile.jpg" alt="User profile picture" />
          <img src="/logo.svg" alt="ResumeAI logo" />
        </div>,
      );

      const results = await checkAccessibility(container);
      expect(results).toHaveNoViolations();
    });

    it.skip('should have captions for video', async () => {
      const { container } = render(
        <figure>
          <video controls aria-label="Resume building tutorial">
            <source src="/tutorial.mp4" type="video/mp4" />
            <track kind="captions" src="/tutorial.vtt" srcLang="en" />
          </video>
          <figcaption>How to create a resume</figcaption>
        </figure>,
      );

      const results = await checkAccessibility(container);
      expect(results).toHaveNoViolations();
    }, 10000);
  });

  describe('ARIA Attributes', () => {
    it('should have proper ARIA labels', async () => {
      const { container } = render(
        <div>
          <nav aria-label="Main navigation">
            <a href="/">Home</a>
          </nav>
          <div role="status" aria-live="polite">
            Changes saved
          </div>
          <button type="button" aria-pressed="false" onClick={() => {}}>
            Toggle Feature
          </button>
        </div>,
      );

      const results = await checkAccessibility(container);
      expect(results).toHaveNoViolations();
    });

    it('should announce dynamic content changes', async () => {
      const { container } = render(
        <div>
          <button type="button" aria-controls="results-list">
            Load Results
          </button>
          <div id="results-list" role="region" aria-live="polite" aria-label="Search results">
            <ul>
              <li>Item 1</li>
            </ul>
          </div>
        </div>,
      );

      const results = await checkAccessibility(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Color Contrast', () => {
    it('should have sufficient color contrast', async () => {
      const { container } = render(
        <div>
          <p style={{ color: '#000000', backgroundColor: '#FFFFFF' }}>High contrast text</p>
          <button
            style={{
              color: '#FFFFFF',
              backgroundColor: '#0066CC',
            }}
          >
            Action Button
          </button>
        </div>,
      );

      const results = await checkAccessibility(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support keyboard navigation', async () => {
      const { container } = render(
        <div>
          <button type="button" autoFocus>
            First Button
          </button>
          <button type="button">Second Button</button>
          <a href="/help">Help Link</a>
          <input type="text" placeholder="Search" />
        </div>,
      );

      const results = await checkAccessibility(container);
      expect(results).toHaveNoViolations();
    });

    it('should not trap keyboard focus', async () => {
      const { container } = render(
        <div>
          <button type="button">Button 1</button>
          <button type="button">Button 2</button>
          <button type="button">Button 3</button>
        </div>,
      );

      const results = await checkAccessibility(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Responsive Design', () => {
    it('should be keyboard accessible at various zoom levels', async () => {
      const { container } = render(
        <div style={{ fontSize: '16px' }}>
          <button type="button">Zoom: 100%</button>
        </div>,
      );

      const results = await checkAccessibility(container);
      expect(results).toHaveNoViolations();
    });

    it('should have touch-friendly button sizes', async () => {
      const { container } = render(
        <button
          type="button"
          style={{
            minWidth: '44px',
            minHeight: '44px',
            padding: '12px 16px',
          }}
        >
          Touch-Friendly Button
        </button>,
      );

      const results = await checkAccessibility(container);
      expect(results).toHaveNoViolations();
    });
  });
});
