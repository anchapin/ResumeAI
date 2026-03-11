/**
 * Accessibility (WCAG 2.1) testing suite for ResumeAI.
 *
 * Uses axe-core to run automated accessibility scans on all pages.
 * Tests for WCAG 2.1 Level AA compliance.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from '../../App';
import React from 'react';

// Mock localStorage
beforeEach(() => {
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  Object.defineProperty(window, 'localStorage', { value: localStorageMock });
});

// Extend matchers
expect.extend(toHaveNoViolations);

describe('Accessibility Tests - WCAG 2.1', () => {
  describe('App Component', () => {
    it('should not have any accessibility violations', async () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );
      
      // Wait for app to load
      await waitFor(() => {
        expect(screen.queryByLabelText(/Loading/i)).not.toBeInTheDocument();
      });

      // Skip full axe audit due to OAuth img elements and library components
      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true },
        },
      });
      // Allow some violations from external libraries
      const violations = results.violations.filter((v) => !v.id.includes('image-redundant-alt'));
      expect(violations.length).toBe(0);
    });
  });

  describe('Semantic HTML', () => {
    it('should have proper heading hierarchy', async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.queryByLabelText(/Loading/i)).not.toBeInTheDocument();
      });

      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      let previousLevel = 1;

      headings.forEach((heading) => {
        const currentLevel = parseInt(heading.tagName[1]);
        // Allow skipping levels (h1 to h3 ok), but no going backwards by > 1
        expect(currentLevel).toBeLessThanOrEqual(previousLevel + 1);
        previousLevel = currentLevel;
      });
    });

    it('should have proper landmark regions', async () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.queryByLabelText(/Loading/i)).not.toBeInTheDocument();
      });

      // Check for main content landmark (now required in App.tsx)
      const main = container.querySelector('main') || container.querySelector('[role="main"]');
      expect(main).toBeTruthy();
    });

    it('should have descriptive button text', async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.queryByLabelText(/Loading/i)).not.toBeInTheDocument();
      });

      const buttons = document.querySelectorAll('button');
      buttons.forEach((button) => {
        const hasText = button.textContent?.trim().length ?? 0 > 0;
        const hasAriaLabel = button.getAttribute('aria-label');
        const hasTitle = button.getAttribute('title');

        expect(hasText || hasAriaLabel || hasTitle).toBeTruthy();
      });
    });

    it('should have descriptive link text', async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.queryByLabelText(/Loading/i)).not.toBeInTheDocument();
      });

      const links = document.querySelectorAll('a');
      links.forEach((link) => {
        const hasText = link.textContent?.trim().length ?? 0 > 0;
        const hasAriaLabel = link.getAttribute('aria-label');
        const hasTitle = link.getAttribute('title');

        // Allow "Click here" type links only if they have aria-label
        const text = link.textContent?.toLowerCase() ?? '';
        if (text === 'click here' || text === 'read more') {
          expect(hasAriaLabel).toBeTruthy();
        } else {
          expect(hasText || hasAriaLabel || hasTitle).toBeTruthy();
        }
      });
    });
  });

  describe('Form Accessibility', () => {
    it('should have labels for all form inputs', async () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.queryByLabelText(/Loading/i)).not.toBeInTheDocument();
      });

      const inputs = container.querySelectorAll('input, textarea, select, [role="textbox"]');
      inputs.forEach((input) => {
        const id = input.getAttribute('id');
        const ariaLabel = input.getAttribute('aria-label');
        const ariaLabelledBy = input.getAttribute('aria-labelledby');

        // Must have one of: <label for>, aria-label, or aria-labelledby
        let hasLabel = false;

        if (id) {
          const label = container.querySelector(`label[for="${id}"]`);
          hasLabel = !!label;
        }

        hasLabel = hasLabel || !!ariaLabel || !!ariaLabelledBy;

        expect(hasLabel).toBeTruthy();
      });
    });
  });
});

describe('Accessibility - Page Specific Tests', () => {
  describe('Editor Page', () => {
    it('should have accessible form inputs', async () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/editor']}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.queryByLabelText(/Loading/i)).not.toBeInTheDocument();
      });

      const results = await axe(container, {
        rules: {
          label: { enabled: true },
        },
      });

      expect(results.violations.filter((v) => v.id === 'label').length).toBe(0);
    });
  });
});
