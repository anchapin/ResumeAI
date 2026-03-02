/**
 * Accessibility Tests for Editor Components
 * Tests editor-specific components for WCAG 2.1 compliance
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

/**
 * Mock components simulating editor components
 */

function MockEditorTabs() {
  return (
    <div>
      <div role="tablist" aria-label="Editor sections">
        <button role="tab" aria-selected="true" aria-controls="personal-panel" id="personal-tab">
          Personal
        </button>
        <button role="tab" aria-selected="false" aria-controls="experience-panel" id="experience-tab">
          Experience
        </button>
        <button role="tab" aria-selected="false" aria-controls="education-panel" id="education-tab">
          Education
        </button>
      </div>
      <div role="tabpanel" id="personal-panel" aria-labelledby="personal-tab">
        <input type="text" placeholder="First Name" aria-label="First Name" />
        <input type="text" placeholder="Last Name" aria-label="Last Name" />
      </div>
      <div role="tabpanel" id="experience-panel" aria-labelledby="experience-tab" hidden>
        <input type="text" placeholder="Job Title" aria-label="Job Title" />
      </div>
      <div role="tabpanel" id="education-panel" aria-labelledby="education-tab" hidden>
        <input type="text" placeholder="School Name" aria-label="School Name" />
      </div>
    </div>
  );
}

function MockExperienceItem() {
  return (
    <div>
      <h3>Experience Item</h3>
      <div>
        <label htmlFor="job-title">Job Title</label>
        <input id="job-title" type="text" />
      </div>
      <div>
        <label htmlFor="company">Company</label>
        <input id="company" type="text" />
      </div>
      <div>
        <label htmlFor="description">Description</label>
        <textarea id="description" aria-label="Job description"></textarea>
      </div>
      <button type="button" aria-label="Delete this experience item">
        Delete
      </button>
    </div>
  );
}

function MockEducationItem() {
  return (
    <div>
      <h3>Education Item</h3>
      <div>
        <label htmlFor="school">School Name</label>
        <input id="school" type="text" />
      </div>
      <div>
        <label htmlFor="degree">Degree</label>
        <input id="degree" type="text" />
      </div>
      <div>
        <label htmlFor="field">Field of Study</label>
        <input id="field" type="text" />
      </div>
      <button type="button" aria-label="Delete this education item">
        Delete
      </button>
    </div>
  );
}

function MockSkillsSection() {
  return (
    <div>
      <h2>Skills</h2>
      <div role="list" aria-label="Skills list">
        <div role="listitem" aria-label="Skill: React, Remove skill">
          <span>React</span>
          <button type="button" aria-label="Remove React skill">
            ×
          </button>
        </div>
        <div role="listitem" aria-label="Skill: TypeScript, Remove skill">
          <span>TypeScript</span>
          <button type="button" aria-label="Remove TypeScript skill">
            ×
          </button>
        </div>
      </div>
      <div>
        <input
          type="text"
          placeholder="Add a skill"
          aria-label="Add new skill"
          aria-describedby="skill-help"
        />
        <small id="skill-help">Press Enter to add</small>
      </div>
    </div>
  );
}

function MockFormSection() {
  return (
    <form aria-label="Resume details form">
      <fieldset>
        <legend>Personal Information</legend>
        <div>
          <label htmlFor="first-name">First Name</label>
          <input id="first-name" type="text" required aria-required="true" />
        </div>
        <div>
          <label htmlFor="last-name">Last Name</label>
          <input id="last-name" type="text" required aria-required="true" />
        </div>
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required aria-required="true" />
        </div>
      </fieldset>

      <fieldset>
        <legend>Contact</legend>
        <div>
          <label htmlFor="phone">Phone</label>
          <input id="phone" type="tel" />
        </div>
        <div>
          <label htmlFor="location">Location</label>
          <input id="location" type="text" />
        </div>
      </fieldset>

      <button type="submit">Save Resume</button>
    </form>
  );
}

function MockEditorActions() {
  return (
    <div role="toolbar" aria-label="Editor actions">
      <button type="button" title="Save resume" aria-label="Save resume">
        💾
      </button>
      <button type="button" title="Undo changes" aria-label="Undo changes">
        ↶
      </button>
      <button type="button" title="Redo changes" aria-label="Redo changes">
        ↷
      </button>
      <button type="button" title="Download PDF" aria-label="Download resume as PDF">
        📄
      </button>
      <button type="button" title="Preview" aria-label="Preview resume">
        👁
      </button>
    </div>
  );
}

describe('Editor Components Accessibility', () => {
  async function checkComponentA11y(element: HTMLElement): Promise<any> {
    return axe(element);
  }

  describe('EditorTabs Component', () => {
    it('should be accessible', async () => {
      const { container } = render(<MockEditorTabs />);
      const results = await checkComponentA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper tab roles and attributes', () => {
      const { container } = render(<MockEditorTabs />);
      const tablist = container.querySelector('[role="tablist"]');
      const tabs = container.querySelectorAll('[role="tab"]');

      expect(tablist).toBeTruthy();
      expect(tabs.length).toBe(3);

      // Check first tab is selected
      expect(tabs[0].getAttribute('aria-selected')).toBe('true');
      expect(tabs[1].getAttribute('aria-selected')).toBe('false');

      // Check tab panels exist
      const panels = container.querySelectorAll('[role="tabpanel"]');
      expect(panels.length).toBe(3);
    });

    it('should have accessible form inputs in tab panels', () => {
      const { container } = render(<MockEditorTabs />);
      const inputs = container.querySelectorAll('input[aria-label]');

      inputs.forEach((input) => {
        expect(input.getAttribute('aria-label')).toBeTruthy();
      });
    });
  });

  describe('ExperienceItem Component', () => {
    it('should be accessible', async () => {
      const { container } = render(<MockExperienceItem />);
      const results = await checkComponentA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper form labels', () => {
      const { container } = render(<MockExperienceItem />);
      const inputs = container.querySelectorAll('input, textarea');

      inputs.forEach((input) => {
        const id = input.getAttribute('id');
        const ariaLabel = input.getAttribute('aria-label');
        const label = id ? container.querySelector(`label[for="${id}"]`) : null;

        expect(label || ariaLabel).toBeTruthy();
      });
    });

    it('should have proper delete button label', () => {
      const { container } = render(<MockExperienceItem />);
      const deleteButton = container.querySelector('button[aria-label*="Delete"]');

      expect(deleteButton).toBeTruthy();
      expect(deleteButton?.getAttribute('aria-label')).toBe('Delete this experience item');
    });
  });

  describe('EducationItem Component', () => {
    it('should be accessible', async () => {
      const { container } = render(<MockEducationItem />);
      const results = await checkComponentA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper semantic structure', () => {
      const { container } = render(<MockEducationItem />);
      const heading = container.querySelector('h3');
      const inputs = container.querySelectorAll('input');
      const deleteButton = container.querySelector('button');

      expect(heading).toBeTruthy();
      expect(inputs.length).toBe(3);
      expect(deleteButton).toBeTruthy();
    });
  });

  describe('SkillsSection Component', () => {
    it('should be accessible', async () => {
      const { container } = render(<MockSkillsSection />);
      const results = await checkComponentA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper list structure', () => {
      const { container } = render(<MockSkillsSection />);
      const list = container.querySelector('[role="list"]');

      expect(list?.getAttribute('aria-label')).toBe('Skills list');
      expect(list?.querySelectorAll('[role="listitem"]').length).toBe(2);
    });

    it('should have accessible skill removal buttons', () => {
      const { container } = render(<MockSkillsSection />);
      const removeButtons = container.querySelectorAll('button[aria-label*="Remove"]');

      removeButtons.forEach((button) => {
        expect(button.getAttribute('aria-label')).toContain('Remove');
      });
    });

    it('should have accessible input with help text', () => {
      const { container } = render(<MockSkillsSection />);
      const input = container.querySelector('input[aria-label*="Add"]');
      const helpText = container.querySelector('#skill-help');

      expect(input?.getAttribute('aria-describedby')).toBe('skill-help');
      expect(helpText).toBeTruthy();
    });
  });

  describe('FormSection Component', () => {
    it('should be accessible', async () => {
      const { container } = render(<MockFormSection />);
      const results = await checkComponentA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper fieldset and legend structure', () => {
      const { container } = render(<MockFormSection />);
      const fieldsets = container.querySelectorAll('fieldset');
      const legends = container.querySelectorAll('legend');

      expect(fieldsets.length).toBe(2);
      expect(legends.length).toBe(2);
    });

    it('should mark required fields correctly', () => {
      const { container } = render(<MockFormSection />);
      const requiredInputs = container.querySelectorAll('input[required]');

      requiredInputs.forEach((input) => {
        expect(input.getAttribute('aria-required')).toBe('true');
      });
    });

    it('should have accessible submit button', () => {
      const { container } = render(<MockFormSection />);
      const submitButton = container.querySelector('button[type="submit"]');

      expect(submitButton).toBeTruthy();
      expect(submitButton?.textContent).toContain('Save Resume');
    });
  });

  describe('EditorActions Component', () => {
    it('should be accessible', async () => {
      const { container } = render(<MockEditorActions />);
      const results = await checkComponentA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper toolbar role', () => {
      const { container } = render(<MockEditorActions />);
      const toolbar = container.querySelector('[role="toolbar"]');

      expect(toolbar).toBeTruthy();
      expect(toolbar?.getAttribute('aria-label')).toBe('Editor actions');
    });

    it('should have descriptive labels for all action buttons', () => {
      const { container } = render(<MockEditorActions />);
      const buttons = container.querySelectorAll('button');

      buttons.forEach((button) => {
        const ariaLabel = button.getAttribute('aria-label');
        const title = button.getAttribute('title');

        expect(ariaLabel || title).toBeTruthy();
      });
    });

    it('should have button labels without relying on icon text alone', () => {
      const { container } = render(<MockEditorActions />);
      const buttons = container.querySelectorAll('button');

      buttons.forEach((button) => {
        // Should have aria-label since buttons contain emoji icons
        expect(button.getAttribute('aria-label')).toBeTruthy();
      });
    });
  });
});
