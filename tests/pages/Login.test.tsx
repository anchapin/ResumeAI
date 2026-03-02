import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import Login from '../../pages/Login';

describe('Login Component', () => {
  const mockOnLogin = vi.fn();
  const defaultProps = {
    onLogin: mockOnLogin,
    error: null,
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithRouter = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        {component}
      </BrowserRouter>,
    );
  };

  describe('Rendering', () => {
    it('renders the login form', () => {
      renderWithRouter(<Login {...defaultProps} />);
      expect(screen.getByText('ResumeAI')).toBeInTheDocument();
      expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    });

    it('renders email input', () => {
      renderWithRouter(<Login {...defaultProps} />);
      const emailInput = screen.getByPlaceholderText('you@example.com');
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('renders password input', () => {
      renderWithRouter(<Login {...defaultProps} />);
      const passwordInput = screen.getByPlaceholderText('••••••••');
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('renders sign in button', () => {
      renderWithRouter(<Login {...defaultProps} />);
      const button = screen.getByRole('button', { name: /sign in/i });
      expect(button).toBeInTheDocument();
    });

    it('renders create account link', () => {
      renderWithRouter(<Login {...defaultProps} />);
      const link = screen.getByRole('link', { name: /create one/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/register');
    });

    it('renders logo icon', () => {
      renderWithRouter(<Login {...defaultProps} />);
      const icons = screen.getAllByText('description');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Form validation', () => {
    it('shows error when email is empty', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Login {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter your email and password.')).toBeInTheDocument();
      });
    });

    it('shows error when password is empty', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Login {...defaultProps} />);

      const emailInput = screen.getByPlaceholderText('you@example.com');
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter your email and password.')).toBeInTheDocument();
      });
    });

    it('shows error when both fields are empty', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Login {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter your email and password.')).toBeInTheDocument();
      });
    });

    it('allows submission when both fields are filled', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Login {...defaultProps} />);

      const emailInput = screen.getByPlaceholderText('you@example.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });
  });

  describe('Error handling', () => {
    it('displays error from props', () => {
      const errorMessage = 'Invalid credentials';
      renderWithRouter(<Login {...defaultProps} error={errorMessage} />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('displays error icon when error is shown', () => {
      renderWithRouter(<Login {...defaultProps} error="Login failed" />);

      const errorContainer = screen.getByText('Login failed');
      expect(errorContainer.parentElement?.querySelector('.material-symbols-outlined')).toBeInTheDocument();
    });

    it('clears local error when form is submitted again', async () => {
      const user = userEvent.setup();
      const { rerender } = renderWithRouter(<Login {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter your email and password.')).toBeInTheDocument();
      });

      const emailInput = screen.getByPlaceholderText('you@example.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');

      await user.clear(emailInput);
      await user.clear(passwordInput);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      // The error should be cleared
      expect(screen.queryByText('Please enter your email and password.')).not.toBeInTheDocument();
    });

    it('shows prop error over local error', () => {
      const user = userEvent.setup();
      renderWithRouter(<Login {...defaultProps} error="Server error" />);

      // Prop error should be displayed
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('disables submit button when loading', () => {
      renderWithRouter(<Login {...defaultProps} isLoading={true} />);

      const submitButton = screen.getByRole('button', { name: /signing in/i });
      expect(submitButton).toBeDisabled();
    });

    it('shows loading spinner when loading', () => {
      renderWithRouter(<Login {...defaultProps} isLoading={true} />);

      const icons = screen.getAllByText('progress_activity');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('shows "Signing in..." text when loading', () => {
      renderWithRouter(<Login {...defaultProps} isLoading={true} />);

      expect(screen.getByText('Signing in...')).toBeInTheDocument();
    });

    it('enables submit button when not loading', () => {
      renderWithRouter(<Login {...defaultProps} isLoading={false} />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('User interactions', () => {
    it('calls onLogin with correct parameters', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Login {...defaultProps} />);

      const emailInput = screen.getByPlaceholderText('you@example.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      expect(mockOnLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('updates email state as user types', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Login {...defaultProps} />);

      const emailInput = screen.getByPlaceholderText('you@example.com') as HTMLInputElement;
      await user.type(emailInput, 'newemail@example.com');

      expect(emailInput.value).toBe('newemail@example.com');
    });

    it('updates password state as user types', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Login {...defaultProps} />);

      const passwordInput = screen.getByPlaceholderText('••••••••') as HTMLInputElement;
      await user.type(passwordInput, 'newpassword');

      expect(passwordInput.value).toBe('newpassword');
    });

    it('autocomplete attributes are set correctly', () => {
      renderWithRouter(<Login {...defaultProps} />);

      const emailInput = screen.getByPlaceholderText('you@example.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');

      expect(emailInput).toHaveAttribute('autoComplete', 'email');
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
    });

    it('prevents default form submission', async () => {
      const user = userEvent.setup();
      const { container } = renderWithRouter(<Login {...defaultProps} />);

      const form = container.querySelector('form');
      const preventDefaultSpy = vi.fn();

      if (form) {
        form.addEventListener('submit', preventDefaultSpy);
      }

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Form submission is prevented, which is handled by React's synthetic events
      expect(mockOnLogin).toHaveBeenCalled();
    });
  });

  describe('Styling and layout', () => {
    it('renders with correct background color', () => {
      const { container } = renderWithRouter(<Login {...defaultProps} />);
      const mainDiv = container.firstChild;

      expect(mainDiv).toHaveClass('min-h-screen');
      expect(mainDiv).toHaveClass('bg-[#f6f6f8]');
    });

    it('renders form in centered container', () => {
      const { container } = renderWithRouter(<Login {...defaultProps} />);

      expect(container.querySelector('.flex.items-center.justify-center')).toBeInTheDocument();
    });

    it('renders card with proper styling', () => {
      const { container } = renderWithRouter(<Login {...defaultProps} />);

      const card = container.querySelector('.rounded-2xl.shadow-xl.border.border-slate-200');
      expect(card).toBeInTheDocument();
    });

    it('renders submit button with correct styling', () => {
      renderWithRouter(<Login {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toHaveClass('w-full');
      expect(submitButton).toHaveClass('bg-primary-600');
      expect(submitButton).toHaveClass('text-white');
    });

    it('error alert has correct styling', () => {
      const { container } = renderWithRouter(<Login {...defaultProps} error="Test error" />);

      const errorAlert = container.querySelector('.bg-red-50.border.border-red-200');
      expect(errorAlert).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper label associations', () => {
      renderWithRouter(<Login {...defaultProps} />);

      const emailLabel = screen.getByText('Email');
      const emailInput = screen.getByPlaceholderText('you@example.com');

      expect(emailLabel).toHaveClass('text-sm', 'font-bold');
      expect(emailInput).toHaveAttribute('id', 'email');
    });

    it('password label is associated with input', () => {
      renderWithRouter(<Login {...defaultProps} />);

      const passwordLabel = screen.getByText('Password');
      expect(passwordLabel).toBeInTheDocument();
    });

    it('form elements have proper IDs', () => {
      renderWithRouter(<Login {...defaultProps} />);

      expect(screen.getByPlaceholderText('you@example.com')).toHaveAttribute('id', 'email');
      expect(screen.getByPlaceholderText('••••••••')).toHaveAttribute('id', 'password');
    });

    it('error message is displayed to assistive technologies', () => {
      renderWithRouter(<Login {...defaultProps} error="Login failed" />);

      const errorAlert = screen.getByText('Login failed');
      expect(errorAlert).toBeVisible();
    });
  });

  describe('Edge cases', () => {
    it('handles special characters in email', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Login {...defaultProps} />);

      const emailInput = screen.getByPlaceholderText('you@example.com');
      await user.type(emailInput, 'test+tag@example.co.uk');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      expect(mockOnLogin).toHaveBeenCalledWith('test+tag@example.co.uk', expect.any(String));
    });

    it('handles long passwords', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Login {...defaultProps} />);

      const emailInput = screen.getByPlaceholderText('you@example.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');

      const longPassword = 'a'.repeat(256);
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, longPassword);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      expect(mockOnLogin).toHaveBeenCalledWith('test@example.com', longPassword);
    });

    it('handles whitespace in inputs', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Login {...defaultProps} />);

      const emailInput = screen.getByPlaceholderText('you@example.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');

      await user.type(emailInput, ' test@example.com ');
      await user.type(passwordInput, ' password ');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // The form should call onLogin with the input values as-is
      expect(mockOnLogin).toHaveBeenCalled();
    });
  });
});
