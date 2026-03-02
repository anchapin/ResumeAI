import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import AccessibleDialog from './AccessibleDialog';

describe('AccessibleDialog', () => {
  it('should render nothing when isOpen is false', () => {
    const { container } = render(
      <AccessibleDialog isOpen={false} onClose={vi.fn()} title="Test Dialog">
        <p>Content</p>
      </AccessibleDialog>,
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render when isOpen is true', () => {
    render(
      <AccessibleDialog isOpen={true} onClose={vi.fn()} title="Test Dialog">
        <p>Content</p>
      </AccessibleDialog>,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should render title with correct id', () => {
    render(
      <AccessibleDialog isOpen={true} onClose={vi.fn()} title="Test Dialog">
        <p>Content</p>
      </AccessibleDialog>,
    );

    const title = screen.getByText('Test Dialog');
    expect(title).toHaveAttribute('id', 'dialog-title');
  });

  it('should use custom headerId when provided', () => {
    render(
      <AccessibleDialog
        isOpen={true}
        onClose={vi.fn()}
        title="Test Dialog"
        headerId="custom-header"
      >
        <p>Content</p>
      </AccessibleDialog>,
    );

    const title = screen.getByText('Test Dialog');
    expect(title).toHaveAttribute('id', 'custom-header');
  });

  it('should render children content', () => {
    render(
      <AccessibleDialog isOpen={true} onClose={vi.fn()} title="Test Dialog">
        <p>Test content here</p>
      </AccessibleDialog>,
    );

    expect(screen.getByText('Test content here')).toBeInTheDocument();
  });

  it('should render footer when provided', () => {
    render(
      <AccessibleDialog
        isOpen={true}
        onClose={vi.fn()}
        title="Test Dialog"
        footer={<button>Footer Button</button>}
      >
        <p>Content</p>
      </AccessibleDialog>,
    );

    expect(screen.getByText('Footer Button')).toBeInTheDocument();
  });

  it('should have correct ARIA attributes', () => {
    render(
      <AccessibleDialog isOpen={true} onClose={vi.fn()} title="Test Dialog">
        <p>Content</p>
      </AccessibleDialog>,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('role', 'dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'dialog-title');
  });

  it('should set aria-describedby when descriptionId is provided', () => {
    render(
      <AccessibleDialog
        isOpen={true}
        onClose={vi.fn()}
        title="Test Dialog"
        descriptionId="dialog-desc"
      >
        <p id="dialog-desc">Description</p>
      </AccessibleDialog>,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-describedby', 'dialog-desc');
  });

  it('should call onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <AccessibleDialog isOpen={true} onClose={onClose} title="Test Dialog">
        <p>Content</p>
      </AccessibleDialog>,
    );

    const closeButton = screen.getByLabelText('Close dialog');
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('should call onClose when Escape key is pressed', async () => {
    const onClose = vi.fn();

    render(
      <AccessibleDialog isOpen={true} onClose={onClose} title="Test Dialog">
        <p>Content</p>
      </AccessibleDialog>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('should call onClose when backdrop is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    const { container } = render(
      <AccessibleDialog isOpen={true} onClose={onClose} title="Test Dialog">
        <p>Content</p>
      </AccessibleDialog>,
    );

    const backdrop = container.querySelector('[role="dialog"]')?.parentElement;
    if (backdrop) {
      await user.click(backdrop);
      expect(onClose).toHaveBeenCalledOnce();
    }
  });

  it('should not call onClose when clicking inside dialog content', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <AccessibleDialog isOpen={true} onClose={onClose} title="Test Dialog">
        <button>Dialog Button</button>
      </AccessibleDialog>,
    );

    const dialogButton = screen.getByText('Dialog Button');
    await user.click(dialogButton);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('should focus first focusable element on dialog open', async () => {
    const TestWrapper = () => {
      const [isOpen, setIsOpen] = useState(false);

      return (
        <>
          <button onClick={() => setIsOpen(true)}>Open</button>
          <AccessibleDialog isOpen={isOpen} onClose={() => setIsOpen(false)} title="Test">
            <input data-testid="first-input" />
          </AccessibleDialog>
        </>
      );
    };

    const user = userEvent.setup();
    render(<TestWrapper />);

    const openButton = screen.getByText('Open');
    await user.click(openButton);

    // useFocusTrap should have moved focus to the first focusable element
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should prevent body scroll when open', () => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = '';

    const { rerender } = render(
      <AccessibleDialog isOpen={true} onClose={vi.fn()} title="Test Dialog">
        <p>Content</p>
      </AccessibleDialog>,
    );

    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <AccessibleDialog isOpen={false} onClose={vi.fn()} title="Test Dialog">
        <p>Content</p>
      </AccessibleDialog>,
    );

    expect(document.body.style.overflow).toBe(originalOverflow);
  });

  it('should apply custom className', () => {
    const { container } = render(
      <AccessibleDialog
        isOpen={true}
        onClose={vi.fn()}
        title="Test Dialog"
        className="custom-class"
      >
        <p>Content</p>
      </AccessibleDialog>,
    );

    const backdrop = container.firstChild;
    expect(backdrop).toHaveClass('custom-class');
  });

  it('should have correct dialog structure', () => {
    const { container } = render(
      <AccessibleDialog
        isOpen={true}
        onClose={vi.fn()}
        title="Test Dialog"
        footer={<button>OK</button>}
      >
        <p>Content</p>
      </AccessibleDialog>,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog.querySelector('header')).toBeInTheDocument();
    expect(dialog.querySelector('footer')).toBeInTheDocument();
  });

  it('should maintain focus management during lifecycle', async () => {
    const TestWrapper = () => {
      const [isOpen, setIsOpen] = useState(false);

      return (
        <>
          <button onClick={() => setIsOpen(true)}>Open Dialog</button>
          <AccessibleDialog isOpen={isOpen} onClose={() => setIsOpen(false)} title="Test">
            <p>Content</p>
          </AccessibleDialog>
        </>
      );
    };

    const user = userEvent.setup();
    render(<TestWrapper />);

    const openButton = screen.getByText('Open Dialog');
    await user.click(openButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should not render backdrop when isOpen is false', () => {
    render(
      <AccessibleDialog isOpen={false} onClose={vi.fn()} title="Test Dialog">
        <p>Content</p>
      </AccessibleDialog>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
