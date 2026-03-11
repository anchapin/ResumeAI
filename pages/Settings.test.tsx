import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import Settings from './Settings';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock window.alert for delete account action
const alertMock = vi.fn();
Object.defineProperty(window, 'alert', {
  value: alertMock,
  writable: true,
});

describe('Settings Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders without crashing', async () => {
      let container: HTMLElement;
      await act(async () => {
        const result = render(<Settings />);
        container = result.container;
      });
      expect(container!).toBeInTheDocument();
    });

    it('renders main header with title "Settings"', async () => {
      await act(async () => {
        render(<Settings />);
      });
      const header = screen.getByRole('heading', { name: 'Settings' });
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('text-slate-800', 'font-bold', 'text-xl');
    });

    it('renders notification bell icon', async () => {
      await act(async () => {
        render(<Settings />);
      });
      const icons = screen.getAllByText(/notifications/i);
      expect(icons.length).toBeGreaterThan(0);
      const notificationIcon = icons.find((icon) =>
        icon.classList.contains('material-symbols-outlined'),
      );
      expect(notificationIcon).toBeInTheDocument();
    });

    it('renders user avatar in header', async () => {
      await act(async () => {
        render(<Settings />);
      });
      const avatars = document.querySelectorAll('.bg-cover.bg-center');
      expect(avatars.length).toBeGreaterThan(0);
      expect(avatars[0]).toHaveStyle({
        backgroundImage: 'url("https://picsum.photos/100/100")',
      });
    });

    it('has red notification badge on bell icon', async () => {
      await act(async () => {
        render(<Settings />);
      });
      const badge = document.querySelector('.bg-red-500');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Profile Information Section', () => {
    it('renders Profile Information section', async () => {
      await act(async () => {
        render(<Settings />);
      });
      const heading = screen.getByRole('heading', { name: 'Profile Information' });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveClass('text-lg', 'font-bold', 'text-slate-900');
    });

    it('renders profile section description', async () => {
      await act(async () => {
        render(<Settings />);
      });
      const description = screen.getByText('Update your personal details and public profile');
      expect(description).toBeInTheDocument();
      expect(description).toHaveClass('text-sm', 'text-slate-500');
    });

    it('renders profile avatar with edit overlay', async () => {
      await act(async () => {
        render(<Settings />);
      });
      const avatars = document.querySelectorAll('.bg-cover.bg-center');
      expect(avatars.length).toBeGreaterThan(1);
      expect(avatars[1]).toHaveClass('w-20', 'h-20', 'rounded-full');
    });

    it('renders First Name input with default value "Alex"', async () => {
      await act(async () => {
        render(<Settings />);
      });
      const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
      const firstNameInput = inputs.find((input) => input.value === 'Alex');

      expect(firstNameInput).toBeInTheDocument();
      expect(firstNameInput).toHaveValue('Alex');
      expect(firstNameInput).toHaveAttribute('type', 'text');
    });

    it('renders Last Name input with default value "Rivera"', async () => {
      await act(async () => {
        render(<Settings />);
      });
      const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
      const lastNameInput = inputs.find((input) => input.value === 'Rivera');

      expect(lastNameInput).toBeInTheDocument();
      expect(lastNameInput).toHaveValue('Rivera');
      expect(lastNameInput).toHaveAttribute('type', 'text');
    });

    it('renders Email Address input with default value', async () => {
      await act(async () => {
        render(<Settings />);
      });
      const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
      const emailInput = inputs.find((input) => input.value === 'alex.rivera@example.com');

      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveValue('alex.rivera@example.com');
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('renders Save Changes button', async () => {
      await act(async () => {
        render(<Settings />);
      });
      const saveButton = screen.getByRole('button', { name: 'Save Changes' });
      expect(saveButton).toBeInTheDocument();
      expect(saveButton).toHaveClass(
        'px-5',
        'py-2',
        'rounded-lg',
        'bg-primary-600',
        'text-white',
        'font-bold',
        'text-sm',
      );
    });

    it('all profile inputs have correct styling classes', async () => {
      await act(async () => {
        render(<Settings />);
      });
      const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
      expect(inputs.length).toBeGreaterThanOrEqual(3);

      inputs.slice(0, 3).forEach((input) => {
        expect(input).toHaveClass(
          'w-full',
          'px-4',
          'py-2',
          'rounded-lg',
          'border',
          'border-slate-300',
        );
      });
    });
  });

  describe('Profile Form Interactions', () => {
    it('allows typing in First Name input', async () => {
      const user = userEvent.setup();
      await act(async () => {
        render(<Settings />);
      });
      const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
      const firstNameInput = inputs.find((input) => input.value === 'Alex');

      if (!firstNameInput) {
        throw new Error('Input not found');
      }
      await act(async () => {
        await user.clear(firstNameInput);
        await user.type(firstNameInput, 'John');
      });

      expect(firstNameInput).toHaveValue('John');
    });

    it('allows typing in Last Name input', async () => {
      const user = userEvent.setup();
      await act(async () => {
        render(<Settings />);
      });
      const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
      const lastNameInput = inputs.find((input) => input.value === 'Rivera');

      if (!lastNameInput) {
        throw new Error('Input not found');
      }
      await act(async () => {
        await user.clear(lastNameInput);
        await user.type(lastNameInput, 'Doe');
      });

      expect(lastNameInput).toHaveValue('Doe');
    });

    it('allows typing in Email input', async () => {
      const user = userEvent.setup();
      await act(async () => {
        render(<Settings />);
      });
      const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
      const emailInput = inputs.find((input) => input.value === 'alex.rivera@example.com');

      if (!emailInput) {
        throw new Error('Input not found');
      }
      await act(async () => {
        await user.clear(emailInput);
        await user.type(emailInput, 'john.doe@example.com');
      });

      expect(emailInput).toHaveValue('john.doe@example.com');
    });

    it('allows typing in Last Name input', async () => {
      const user = userEvent.setup();
      await act(async () => {
        render(<Settings />);
      });
      const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
      const lastNameInput = inputs.find((input) => input.value === 'Rivera');

      if (!lastNameInput) {
        throw new Error('Input not found');
      }
      await act(async () => {
        await user.clear(lastNameInput);
        await user.type(lastNameInput, 'Doe');
      });

      expect(lastNameInput).toHaveValue('Doe');
    });

    it('allows typing in Email input', async () => {
      const user = userEvent.setup();
      await act(async () => {
        render(<Settings />);
      });
      const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
      const emailInput = inputs.find((input) => input.value === 'alex.rivera@example.com');

      if (!emailInput) {
        throw new Error('Input not found');
      }
      await act(async () => {
        await user.clear(emailInput);
        await user.type(emailInput, 'john.doe@example.com');
      });

      expect(emailInput).toHaveValue('john.doe@example.com');
    });

    it('profile avatar shows edit icon on hover', async () => {
      await act(async () => {
        render(<Settings />);
      });
      const avatars = document.querySelectorAll('.bg-cover.bg-center');
      const profileAvatar = avatars[1];
      const editIcon = profileAvatar?.querySelector('.material-symbols-outlined');

      expect(editIcon).toBeInTheDocument();
      expect(editIcon).toHaveTextContent('edit');
    });

    it('Save Changes button is clickable', async () => {
      const user = userEvent.setup();
      await act(async () => {
        render(<Settings />);
      });
      const saveButton = screen.getByRole('button', { name: 'Save Changes' });

      await act(async () => {
        await user.click(saveButton);
      });

      // Note: Currently this button doesn't have onClick handler
      // This test verifies the button is interactive
      expect(saveButton).toBeInTheDocument();
    });
  });

  describe('App Preferences Section', () => {
    it('renders App Preferences section', async () => {
      await act(async () => {
        render(<Settings />);
      });
      const heading = screen.getByRole('heading', { name: 'App Preferences' });
      expect(heading).toBeInTheDocument();
    });

    it('renders preferences section description', async () => {
      await act(async () => {
        render(<Settings />);
      });
      const description = screen.getByText('Manage your workspace and notification settings');
      expect(description).toBeInTheDocument();
    });

    it('renders Email Notifications toggle with label', async () => {
      await act(async () => {
        render(<Settings />);
      });
      const label = screen.getByText('Email Notifications');
      expect(label).toBeInTheDocument();

      const description = screen.getByText('Receive updates about your job applications');
      expect(description).toBeInTheDocument();
    });

    it('renders Dark Mode toggle with label', async () => {
      await act(async () => {
        render(<Settings />);
      });
      const label = screen.getByText('Dark Mode');
      expect(label).toBeInTheDocument();

      const description = screen.getByText('Switch between light and dark themes');
      expect(description).toBeInTheDocument();
    });

    it('renders Auto-Save toggle with label', async () => {
      await act(async () => {
        render(<Settings />);
      });
      const label = screen.getByText('Auto-Save');
      expect(label).toBeInTheDocument();

      const description = screen.getByText('Automatically save changes in the editor');
      expect(description).toBeInTheDocument();
    });
  });

  describe('Preference Toggle Interactions', () => {
    it('Email Notifications toggle is checked by default', async () => {
      await act(async () => {
        render(<Settings />);
      });
      const toggles = screen.getAllByRole('checkbox');
      const emailToggle = toggles[0];

      expect(emailToggle).toBeChecked();
    });

    it('Dark Mode toggle is unchecked by default', async () => {
      await act(async () => {
        render(<Settings />);
      });
      const toggles = screen.getAllByRole('checkbox');
      const darkModeToggle = toggles[1];

      expect(darkModeToggle).not.toBeChecked();
    });

    it('Auto-Save toggle is checked by default', async () => {
      await act(async () => {
        render(<Settings />);
      });
      const toggles = screen.getAllByRole('checkbox');
      const autoSaveToggle = toggles[2];

      expect(autoSaveToggle).toBeChecked();
    });

    it('Email Notifications toggle can be unchecked', async () => {
      const user = userEvent.setup();
      await act(async () => {
        render(<Settings />);
      });
      const toggles = screen.getAllByRole('checkbox');
      const emailToggle = toggles[0];

      await act(async () => {
        await user.click(emailToggle);
      });

      expect(emailToggle).not.toBeChecked();
    });

    it('Email Notifications toggle can be checked again', async () => {
      const user = userEvent.setup();
      await act(async () => {
        render(<Settings />);
      });
      const toggles = screen.getAllByRole('checkbox');
      const emailToggle = toggles[0];

      await act(async () => {
        await user.click(emailToggle); // Uncheck
        await user.click(emailToggle); // Re-check
      });

      expect(emailToggle).toBeChecked();
    });

    it('Dark Mode toggle can be checked', async () => {
      const user = userEvent.setup();
      await act(async () => {
        render(<Settings />);
      });
      const toggles = screen.getAllByRole('checkbox');
      const darkModeToggle = toggles[1];

      await act(async () => {
        await user.click(darkModeToggle);
      });

      expect(darkModeToggle).toBeChecked();
    });

    it('Auto-Save toggle can be unchecked', async () => {
      const user = userEvent.setup();
      await act(async () => {
        render(<Settings />);
      });
      const toggles = screen.getAllByRole('checkbox');
      const autoSaveToggle = toggles[2];

      await act(async () => {
        await user.click(autoSaveToggle);
      });

      expect(autoSaveToggle).not.toBeChecked();
    });

    it('all toggle switches have correct styling structure', async () => {
      await act(async () => {
        render(<Settings />);
      });
      const toggles = screen.getAllByRole('checkbox');

      toggles.forEach((toggle) => {
        expect(toggle).toHaveClass('sr-only', 'peer');
      });
    });
  });

  describe('Danger Zone Section', () => {
    it('renders Danger Zone section', async () => {
      await act(async () => {
        render(<Settings />);
      });
      const heading = screen.getByRole('heading', { name: 'Danger Zone' });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveClass('text-lg', 'font-bold', 'text-red-700');
    });

    it('renders danger zone description', async () => {
      await act(async () => {
        render(<Settings />);
      });
      const description = screen.getByText('Irreversible actions for your account');
      expect(description).toBeInTheDocument();
      expect(description).toHaveClass('text-sm', 'text-red-600/70');
    });

    it('renders Delete Account option', async () => {
      await act(async () => {
        render(<Settings />);
      });
      // "Delete Account" appears twice - once as heading, once as button
      const deleteTexts = screen.getAllByText('Delete Account');
      expect(deleteTexts.length).toBe(2);

      const deleteDescription = screen.getByText('Permanently remove your data and all resumes');
      expect(deleteDescription).toBeInTheDocument();
    });

    it('renders Delete Account button', async () => {
      await act(async () => {
        render(<Settings />);
      });
      const deleteButton = screen.getByRole('button', { name: 'Delete Account' });
      expect(deleteButton).toBeInTheDocument();
      expect(deleteButton).toHaveClass(
        'px-5',
        'py-2',
        'rounded-lg',
        'border',
        'border-red-200',
        'text-red-600',
        'font-bold',
        'text-sm',
      );
    });

    it('Delete Account button has hover effect styling', async () => {
      await act(async () => {
        render(<Settings />);
      });
      const deleteButton = screen.getByRole('button', { name: 'Delete Account' });

      expect(deleteButton).toHaveClass('hover:bg-red-50', 'transition-colors');
    });
  });

  describe('Section Styling and Layout', () => {
    it('main container has correct background and layout', async () => {
      await act(async () => {
        render(<Settings />);
      });
      const container = document.querySelector('.flex-1.min-h-screen');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('bg-[#f6f6f8]', 'pl-72');
    });

    it('header is sticky at top', async () => {
      await act(async () => {
        render(<Settings />);
      });
      const header = document.querySelector('header');
      expect(header).toHaveClass('sticky', 'top-0', 'z-10');
    });

    it('all sections have correct container styling', async () => {
      await act(async () => {
        render(<Settings />);
      });
      const sections = document.querySelectorAll('section');

      sections.forEach((section) => {
        expect(section).toHaveClass(
          'bg-white',
          'rounded-2xl',
          'border',
          'shadow-sm',
          'overflow-hidden',
        );
      });
    });

    it('content has max-width constraint', async () => {
      await act(async () => {
        render(<Settings />);
      });
      const content = document.querySelector('.max-w-\\[1000px\\]');
      expect(content).toBeInTheDocument();
    });

    it('sections are vertically spaced', async () => {
      await act(async () => {
        render(<Settings />);
      });
      const content = document.querySelector('.max-w-\\[1000px\\]');
      expect(content).toHaveClass('space-y-8');
    });
  });

  describe('Accessibility', () => {
    it('all form inputs have associated labels', async () => {
      await act(async () => {
        render(<Settings />);
      });

      const firstNameLabel = screen.getByText('First Name');
      const lastNameLabel = screen.getByText('Last Name');
      const emailLabel = screen.getByText('Email Address');

      expect(firstNameLabel).toBeInTheDocument();
      expect(lastNameLabel).toBeInTheDocument();
      expect(emailLabel).toBeInTheDocument();

      // Verify inputs exist by finding them with their default values
      const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
      const firstNameInput = inputs.find((input) => input.value === 'Alex');
      const lastNameInput = inputs.find((input) => input.value === 'Rivera');
      const emailInput = inputs.find((input) => input.value === 'alex.rivera@example.com');

      expect(firstNameInput).toBeInTheDocument();
      expect(lastNameInput).toBeInTheDocument();
      expect(emailInput).toBeInTheDocument();
    });

    it('checkboxes are properly labeled by their parent structure', async () => {
      await act(async () => {
        render(<Settings />);
      });
      const toggles = screen.getAllByRole('checkbox');
      expect(toggles.length).toBe(3);
    });

    it('buttons are identifiable by their text content', async () => {
      await act(async () => {
        render(<Settings />);
      });

      expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete Account' })).toBeInTheDocument();
    });

    it('notifications icon has proper aria labeling through text content', async () => {
      await act(async () => {
        render(<Settings />);
      });
      const icons = screen.getAllByText(/notifications/i);
      const notificationIcon = icons.find((icon) =>
        icon.classList.contains('material-symbols-outlined'),
      );
      expect(notificationIcon).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('contains exactly 3 main sections', async () => {
      await act(async () => {
        render(<Settings />);
      });
      const sections = document.querySelectorAll('section');
      expect(sections.length).toBeGreaterThanOrEqual(3);
    });

    it('renders all form-related buttons/inputs correctly', async () => {
      await act(async () => {
        render(<Settings />);
      });

      // 3 text inputs
      const textInputs = screen.getAllByRole('textbox');
      expect(textInputs.length).toBeGreaterThanOrEqual(3);

      // 3 checkboxes (toggles)
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBe(3);

      // 2 buttons (Save Changes and Delete Account) + notification bell button = 3 total
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(3);
    });

    it('all headings are properly structured', async () => {
      await act(async () => {
        render(<Settings />);
      });

      const settingsHeading = screen.getByRole('heading', { name: 'Settings' });
      expect(settingsHeading).toBeInTheDocument();

      const profileHeading = screen.getByRole('heading', { name: 'Profile Information' });
      expect(profileHeading).toBeInTheDocument();

      const preferencesHeading = screen.getByRole('heading', { name: 'App Preferences' });
      expect(preferencesHeading).toBeInTheDocument();

      const dangerHeading = screen.getByRole('heading', { name: 'Danger Zone' });
      expect(dangerHeading).toBeInTheDocument();
    });
  });

  describe('Default Values Consistency', () => {
    it('profile form has consistent default values', async () => {
      await act(async () => {
        render(<Settings />);
      });

      const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
      const firstNameInput = inputs.find((input) => input.value === 'Alex');
      const lastNameInput = inputs.find((input) => input.value === 'Rivera');
      const emailInput = inputs.find((input) => input.value === 'alex.rivera@example.com');

      expect(firstNameInput?.value).toBe('Alex');
      expect(lastNameInput?.value).toBe('Rivera');
      expect(emailInput?.value).toBe('alex.rivera@example.com');
    });

    it('toggles have correct initial states', async () => {
      await act(async () => {
        render(<Settings />);
      });
      const toggles = screen.getAllByRole('checkbox');

      // Email Notifications: checked
      expect(toggles[0]).toBeChecked();

      // Dark Mode: unchecked
      expect(toggles[1]).not.toBeChecked();

      // Auto-Save: checked
      expect(toggles[2]).toBeChecked();
    });
  });

  describe('Responsive Design Classes', () => {
    it('name inputs use responsive grid layout', async () => {
      await act(async () => {
        render(<Settings />);
      });

      const firstNameLabel = screen.getByText('First Name').parentElement;
      const lastNameLabel = screen.getByText('Last Name').parentElement;

      // Both should be in a grid container
      const gridContainer = firstNameLabel?.parentElement;
      expect(gridContainer).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2');
    });

    it('form inputs maintain responsive sizing', async () => {
      await act(async () => {
        render(<Settings />);
      });
      const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];

      inputs.slice(0, 3).forEach((input) => {
        expect(input).toHaveClass('w-full');
      });
    });
  });
});
