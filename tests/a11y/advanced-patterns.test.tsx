/**
 * Advanced Accessibility Pattern Tests
 * Tests complex patterns like modals, popovers, dropdowns, and dynamic content
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

/**
 * Complex accessibility patterns
 */

function MockConfirmDialog({
  onConfirm = vi.fn(),
  onCancel = vi.fn(),
}: {
  onConfirm?: () => void;
  onCancel?: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
      aria-modal="true"
    >
      <h2 id="dialog-title">Confirm Action</h2>
      <p id="dialog-description">Are you sure you want to delete this resume?</p>
      <p>This action cannot be undone.</p>

      <div role="group" aria-label="Dialog actions">
        <button type="button" onClick={onConfirm} autoFocus>
          Delete
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function MockDropdown({ onSelect = vi.fn() }: { onSelect?: (value: string) => void }) {
  return (
    <div>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-controls="dropdown-list"
        aria-expanded="false"
        id="dropdown-button"
      >
        Select Template
      </button>
      <div id="dropdown-list" role="listbox" aria-labelledby="dropdown-button" hidden>
        <div role="option" aria-selected="false" onClick={() => onSelect('modern')} tabIndex={0}>
          Modern
        </div>
        <div role="option" aria-selected="false" onClick={() => onSelect('classic')} tabIndex={0}>
          Classic
        </div>
        <div role="option" aria-selected="false" onClick={() => onSelect('minimal')} tabIndex={0}>
          Minimal
        </div>
      </div>
    </div>
  );
}

function MockSearchableSelect() {
  return (
    <div role="combobox" aria-expanded="false" aria-haspopup="listbox">
      <label htmlFor="skill-search">Search Skills</label>
      <input
        id="skill-search"
        type="text"
        placeholder="Type to search..."
        role="searchbox"
        aria-controls="skill-list"
        aria-autocomplete="list"
      />
      <div id="skill-list" role="listbox" hidden aria-label="Available skills">
        <div role="option">React</div>
        <div role="option">TypeScript</div>
        <div role="option">Node.js</div>
      </div>
    </div>
  );
}

function MockPagination() {
  return (
    <nav aria-label="Pagination">
      <ul role="list">
        <li role="listitem">
          <button type="button" aria-label="Previous page" disabled>
            ← Previous
          </button>
        </li>
        <li role="listitem">
          <span aria-current="page">1</span>
        </li>
        <li role="listitem">
          <a href="?page=2">2</a>
        </li>
        <li role="listitem">
          <a href="?page=3">3</a>
        </li>
        <li role="listitem">
          <button type="button" aria-label="Next page">
            Next →
          </button>
        </li>
      </ul>
    </nav>
  );
}

function MockToast({
  type = 'success',
  message = 'Operation completed',
}: {
  type?: 'success' | 'error' | 'warning' | 'info';
  message?: string;
}) {
  const roleMap = {
    success: 'status',
    error: 'alert',
    warning: 'alert',
    info: 'status',
  };

  return (
    <div
      role={roleMap[type]}
      aria-live={type === 'error' || type === 'warning' ? 'assertive' : 'polite'}
      aria-atomic="true"
      className={`toast toast-${type}`}
    >
      <span aria-hidden="true">
        {type === 'success' && '✓'}
        {type === 'error' && '✕'}
        {type === 'warning' && '⚠'}
        {type === 'info' && 'ⓘ'}
      </span>
      {message}
    </div>
  );
}

function MockExpandableSection() {
  return (
    <section>
      <h2>
        <button
          type="button"
          aria-expanded="false"
          aria-controls="section-content"
          id="section-button"
        >
          Advanced Options
        </button>
      </h2>
      <div id="section-content" hidden aria-labelledby="section-button">
        <div>
          <label htmlFor="option-1">Option 1</label>
          <input id="option-1" type="checkbox" />
        </div>
        <div>
          <label htmlFor="option-2">Option 2</label>
          <input id="option-2" type="checkbox" />
        </div>
      </div>
    </section>
  );
}

function MockProgressIndicator() {
  return (
    <div aria-label="File upload progress">
      <span id="progress-label">Uploading resume...</span>
      <div
        role="progressbar"
        aria-valuenow={75}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Upload progress"
        aria-describedby="progress-label"
      >
        <div style={{ width: '75%' }}>75%</div>
      </div>
    </div>
  );
}

function MockTooltip() {
  return (
    <div>
      <button
        type="button"
        aria-label="Help"
        aria-describedby="tooltip-content"
        onMouseEnter={() => {
          const tooltip = document.getElementById('tooltip-content');
          if (tooltip) tooltip.style.display = 'block';
        }}
        onMouseLeave={() => {
          const tooltip = document.getElementById('tooltip-content');
          if (tooltip) tooltip.style.display = 'none';
        }}
      >
        ?
      </button>
      <div id="tooltip-content" role="tooltip" style={{ display: 'none' }}>
        This is helpful information about the action
      </div>
    </div>
  );
}

describe('Advanced Accessibility Patterns', () => {
  async function checkPatternA11y(element: HTMLElement): Promise<any> {
    return axe(element);
  }

  describe('Modal Dialog Pattern', () => {
    it('should be accessible', async () => {
      const { container } = render(<MockConfirmDialog />);
      const results = await checkPatternA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper dialog attributes', () => {
      const { container } = render(<MockConfirmDialog />);
      const dialog = container.querySelector('[role="dialog"]');

      expect(dialog?.getAttribute('aria-modal')).toBe('true');
      expect(dialog?.getAttribute('aria-labelledby')).toBeTruthy();
      expect(dialog?.getAttribute('aria-describedby')).toBeTruthy();
    });

    it('should have labeled title and description', () => {
      const { container } = render(<MockConfirmDialog />);
      const title = container.querySelector('#dialog-title');
      const description = container.querySelector('#dialog-description');

      expect(title?.textContent).toBeTruthy();
      expect(description?.textContent).toBeTruthy();
    });

    it('should have accessible action buttons', () => {
      const { container } = render(<MockConfirmDialog />);
      const buttons = container.querySelectorAll('button');

      expect(buttons.length).toBeGreaterThan(0);
      buttons.forEach((button) => {
        expect(button.textContent).toBeTruthy();
      });
    });

    it('should have accessible delete button', () => {
      const { container } = render(<MockConfirmDialog />);
      const deleteButton = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent === 'Delete',
      );

      expect(deleteButton).toBeTruthy();
      expect(deleteButton?.textContent).toBe('Delete');
    });
  });

  describe('Dropdown/Listbox Pattern', () => {
    it('should be accessible', async () => {
      const { container } = render(<MockDropdown />);
      const results = await checkPatternA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper button and listbox relationship', () => {
      const { container } = render(<MockDropdown />);
      const button = container.querySelector('button');
      const listbox = container.querySelector('[role="listbox"]');

      expect(button?.getAttribute('aria-haspopup')).toBe('listbox');
      expect(button?.getAttribute('aria-controls')).toBe(listbox?.id);
      expect(button?.getAttribute('aria-expanded')).toBeTruthy();
    });

    it('should have accessible options', () => {
      const { container } = render(<MockDropdown />);
      const options = container.querySelectorAll('[role="option"]');

      expect(options.length).toBeGreaterThan(0);
      options.forEach((option) => {
        expect(option.getAttribute('aria-selected')).toBeTruthy();
      });
    });
  });

  describe('Searchable Select Pattern', () => {
    it('should be accessible', async () => {
      const { container } = render(<MockSearchableSelect />);
      const results = await checkPatternA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper combobox attributes', () => {
      const { container } = render(<MockSearchableSelect />);
      const combobox = container.querySelector('[role="combobox"]');

      expect(combobox?.getAttribute('aria-expanded')).toBeTruthy();
      expect(combobox?.getAttribute('aria-haspopup')).toBe('listbox');
    });

    it('should have labeled searchbox input', () => {
      const { container } = render(<MockSearchableSelect />);
      const input = container.querySelector('input[role="searchbox"]');
      const label = container.querySelector('label');

      expect(input).toBeTruthy();
      expect(label?.textContent).toBeTruthy();
    });

    it('should have autocomplete attributes', () => {
      const { container } = render(<MockSearchableSelect />);
      const input = container.querySelector('input[role="searchbox"]');

      expect(input?.getAttribute('aria-autocomplete')).toBe('list');
      expect(input?.getAttribute('aria-controls')).toBeTruthy();
    });
  });

  describe('Pagination Pattern', () => {
    it('should be accessible', async () => {
      const { container } = render(<MockPagination />);
      const results = await checkPatternA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have navigation landmark', () => {
      const { container } = render(<MockPagination />);
      const nav = container.querySelector('nav');

      expect(nav?.getAttribute('aria-label')).toBe('Pagination');
    });

    it('should mark current page', () => {
      const { container } = render(<MockPagination />);
      const currentPage = container.querySelector('[aria-current="page"]');

      expect(currentPage?.textContent).toBe('1');
    });

    it('should have accessible page navigation buttons', () => {
      const { container } = render(<MockPagination />);
      const prevButton = Array.from(container.querySelectorAll('button')).find((b) =>
        b.getAttribute('aria-label')?.includes('Previous'),
      );

      expect(prevButton?.getAttribute('disabled')).not.toBeNull();
      expect(prevButton?.getAttribute('aria-label')).toBeTruthy();
    });
  });

  describe('Toast Notification Pattern', () => {
    it('success toast should be accessible', async () => {
      const { container } = render(<MockToast type="success" message="Saved successfully" />);
      const results = await checkPatternA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('error toast should use assertive aria-live', async () => {
      const { container } = render(<MockToast type="error" message="Error occurred" />);
      const toast = container.querySelector('[role="alert"]');

      expect(toast?.getAttribute('aria-live')).toBe('assertive');
      expect(toast?.getAttribute('aria-atomic')).toBe('true');
    });

    it('success toast should use polite aria-live', () => {
      const { container } = render(<MockToast type="success" message="Success" />);
      const toast = container.querySelector('[role="status"]');

      expect(toast?.getAttribute('aria-live')).toBe('polite');
    });

    it('should have hidden icon with aria-hidden', () => {
      const { container } = render(<MockToast type="success" />);
      const icon = container.querySelector('[aria-hidden]');

      expect(icon?.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('Expandable Section Pattern', () => {
    it('should be accessible', async () => {
      const { container } = render(<MockExpandableSection />);
      const results = await checkPatternA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper expanded state indicator', () => {
      const { container } = render(<MockExpandableSection />);
      const button = container.querySelector('button');

      expect(button?.getAttribute('aria-expanded')).toBeTruthy();
      expect(button?.getAttribute('aria-controls')).toBeTruthy();
    });

    it('should have content labeled by button', () => {
      const { container } = render(<MockExpandableSection />);
      const button = container.querySelector('button');
      const content = container.querySelector('#section-content');

      expect(content?.getAttribute('aria-labelledby')).toBe(button?.id);
    });

    it('should have accessible form controls in content', () => {
      const { container } = render(<MockExpandableSection />);
      const inputs = container.querySelectorAll('input[type="checkbox"]');

      inputs.forEach((input) => {
        const id = input.getAttribute('id');
        const label = container.querySelector(`label[for="${id}"]`);
        expect(label).toBeTruthy();
      });
    });
  });

  describe('Progress Indicator Pattern', () => {
    it('should be accessible', async () => {
      const { container } = render(<MockProgressIndicator />);
      const results = await checkPatternA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper progressbar role and attributes', () => {
      const { container } = render(<MockProgressIndicator />);
      const progressbar = container.querySelector('[role="progressbar"]');

      expect(progressbar?.getAttribute('aria-valuenow')).toBe('75');
      expect(progressbar?.getAttribute('aria-valuemin')).toBe('0');
      expect(progressbar?.getAttribute('aria-valuemax')).toBe('100');
    });

    it('should have descriptive label', () => {
      const { container } = render(<MockProgressIndicator />);
      const progressbar = container.querySelector('[role="progressbar"]');
      const label = container.querySelector('#progress-label');

      expect(progressbar?.getAttribute('aria-describedby')).toBe('progress-label');
      expect(label?.textContent).toBeTruthy();
    });
  });

  describe('Tooltip Pattern', () => {
    it('should be accessible', async () => {
      const { container } = render(<MockTooltip />);
      const results = await checkPatternA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have tooltip role', () => {
      const { container } = render(<MockTooltip />);
      const tooltip = container.querySelector('[role="tooltip"]');

      expect(tooltip).toBeTruthy();
    });

    it('should link button to tooltip via aria-describedby', () => {
      const { container } = render(<MockTooltip />);
      const button = container.querySelector('button');
      const tooltip = container.querySelector('[role="tooltip"]');

      expect(button?.getAttribute('aria-describedby')).toBe(tooltip?.id);
    });

    it('should have accessible trigger button label', () => {
      const { container } = render(<MockTooltip />);
      const button = container.querySelector('button');

      expect(button?.getAttribute('aria-label')).toBeTruthy();
    });
  });

  describe('Dynamic Content Updates', () => {
    it('should announce dynamic content with live region', async () => {
      const { container } = render(
        <div aria-live="polite" aria-atomic="true" role="status">
          Content added dynamically
        </div>,
      );

      const liveRegion = container.querySelector('[aria-live]');
      expect(liveRegion?.getAttribute('aria-live')).toBe('polite');
      expect(liveRegion?.getAttribute('aria-atomic')).toBe('true');
    });

    it('should handle content replacement with aria-atomic', () => {
      const { container, rerender } = render(
        <div aria-live="polite" aria-atomic="true">
          Step 1 of 3
        </div>,
      );

      rerender(
        <div aria-live="polite" aria-atomic="true">
          Step 2 of 3
        </div>,
      );

      const region = container.querySelector('[aria-live]');
      expect(region?.getAttribute('aria-atomic')).toBe('true');
    });
  });
});
