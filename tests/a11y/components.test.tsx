/**
 * Accessibility Tests for React Components
 * Tests individual components for WCAG 2.1 compliance
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import type { AxeResults } from 'jest-axe';

expect.extend(toHaveNoViolations);

/**
 * Mock components for testing
 * In real usage, import actual components from components/
 */

function MockResumeCard({ title, description }: { title: string; description: string }) {
  return (
    <div role="article" aria-labelledby="resume-title">
      <h3 id="resume-title">{title}</h3>
      <p>{description}</p>
      <button type="button">View Resume</button>
      <button type="button">Edit</button>
    </div>
  );
}

function MockModal({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div role="dialog" aria-labelledby="modal-title" aria-modal="true">
      <h2 id="modal-title">{title}</h2>
      <p>Modal content here</p>
      <button type="button" onClick={onClose} aria-label="Close modal">
        Close
      </button>
    </div>
  );
}

function MockTabs() {
  return (
    <div>
      <div role="tablist" aria-label="Content tabs">
        <button role="tab" aria-selected="true" aria-controls="panel1" id="tab1">
          Tab 1
        </button>
        <button role="tab" aria-selected="false" aria-controls="panel2" id="tab2">
          Tab 2
        </button>
      </div>
      <div role="tabpanel" id="panel1" aria-labelledby="tab1">
        Content 1
      </div>
      <div role="tabpanel" id="panel2" aria-labelledby="tab2" hidden>
        Content 2
      </div>
    </div>
  );
}

describe('Component Accessibility', () => {
  async function checkComponentA11y(element: HTMLElement): Promise<AxeResults> {
    return axe(element);
  }

  describe('ResumeCard Component', () => {
    it('should be accessible', async () => {
      const { container } = render(
        <MockResumeCard
          title="Software Engineer Resume"
          description="A resume for engineering positions"
        />,
      );

      const results = await checkComponentA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper semantic structure', async () => {
      const { container } = render(
        <MockResumeCard
          title="Product Manager Resume"
          description="A resume for product management roles"
        />,
      );

      const article = container.querySelector('[role="article"]');
      expect(article).toBeTruthy();
      expect(article?.querySelector('h3')).toBeTruthy();
      expect(article?.querySelector('button')).toBeTruthy();
    });
  });

  describe('Modal Component', () => {
    it('should be accessible', async () => {
      const { container } = render(<MockModal title="Confirm Action" onClose={() => {}} />);

      const results = await checkComponentA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA attributes', async () => {
      const { container } = render(<MockModal title="Delete Resume" onClose={() => {}} />);

      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog?.getAttribute('aria-modal')).toBe('true');
      expect(dialog?.getAttribute('aria-labelledby')).toBeTruthy();
    });
  });

  describe('Tabs Component', () => {
    it('should be accessible', async () => {
      const { container } = render(<MockTabs />);

      const results = await checkComponentA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper tab roles and attributes', async () => {
      const { container } = render(<MockTabs />);

      const tablist = container.querySelector('[role="tablist"]');
      const tabs = container.querySelectorAll('[role="tab"]');

      expect(tablist).toBeTruthy();
      expect(tabs.length).toBe(2);

      // Check first tab is selected
      expect(tabs[0].getAttribute('aria-selected')).toBe('true');
      expect(tabs[1].getAttribute('aria-selected')).toBe('false');

      // Check tab panels
      const panels = container.querySelectorAll('[role="tabpanel"]');
      expect(panels.length).toBe(2);
    });
  });

  describe('List Accessibility', () => {
    it('should have properly marked lists', async () => {
      const { container } = render(
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
          <li>Item 3</li>
        </ul>,
      );

      const results = await checkComponentA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should support aria-label for custom lists', async () => {
      const { container } = render(
        <div role="list" aria-label="Available resumes">
          <div role="listitem">Resume 1</div>
          <div role="listitem">Resume 2</div>
        </div>,
      );

      const results = await checkComponentA11y(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Form Components', () => {
    it('checkbox should be accessible', async () => {
      const { container } = render(
        <label>
          <input type="checkbox" defaultChecked={false} />I agree to terms
        </label>,
      );

      const results = await checkComponentA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('select should be accessible', async () => {
      const { container } = render(
        <div>
          <label htmlFor="select-resume">Choose Resume</label>
          <select id="select-resume" name="resume">
            <option value="">-- Select --</option>
            <option value="1">Resume 1</option>
            <option value="2">Resume 2</option>
          </select>
        </div>,
      );

      const results = await checkComponentA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('file input should be accessible', async () => {
      const { container } = render(
        <div>
          <label htmlFor="file-input">Upload Resume</label>
          <input
            id="file-input"
            type="file"
            accept=".pdf,.doc,.docx"
            aria-describedby="file-help"
          />
          <small id="file-help">Supported: PDF, DOC, DOCX</small>
        </div>,
      );

      const results = await checkComponentA11y(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Alert and Status Messages', () => {
    it('should announce success messages', async () => {
      const { container } = render(
        <div role="status" aria-live="polite" aria-atomic="true">
          ✓ Resume saved successfully
        </div>,
      );

      const results = await checkComponentA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should announce error messages', async () => {
      const { container } = render(
        <div role="alert" aria-live="assertive" aria-atomic="true">
          ✗ File upload failed. Please try again.
        </div>,
      );

      const results = await checkComponentA11y(container);
      expect(results).toHaveNoViolations();
    });
  });
});
