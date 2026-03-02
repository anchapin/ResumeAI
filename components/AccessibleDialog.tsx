import React, { useEffect, useRef } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';

/**
 * Props for the AccessibleDialog component
 */
export interface DialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Dialog title (used for aria-labelledby) */
  title: React.ReactNode;
  /** Main content of the dialog */
  children: React.ReactNode;
  /** Optional footer content */
  footer?: React.ReactNode;
  /** Optional CSS class name */
  className?: string;
  /** Optional custom ID for header element (defaults to 'dialog-title') */
  headerId?: string;
  /** Optional custom ID for description element */
  descriptionId?: string;
}

/**
 * AccessibleDialog Component
 *
 * A fully accessible dialog component that implements:
 * - Focus trap with Tab key navigation
 * - Escape key to close
 * - ARIA attributes (role, aria-modal, aria-labelledby, aria-describedby)
 * - Backdrop click handling
 * - Body scroll prevention when open
 * - Focus return to trigger element when closed
 * - Semantic HTML structure with header/footer sections
 * - Full TypeScript support
 *
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 *
 * return (
 *   <>
 *     <button onClick={() => setIsOpen(true)}>Open Dialog</button>
 *     <AccessibleDialog
 *       isOpen={isOpen}
 *       onClose={() => setIsOpen(false)}
 *       title="Confirm Action"
 *       descriptionId="dialog-description"
 *     >
 *       <p id="dialog-description">Are you sure you want to proceed?</p>
 *       <button onClick={() => setIsOpen(false)}>Cancel</button>
 *     </AccessibleDialog>
 *   </>
 * );
 * ```
 */
const AccessibleDialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className = '',
  headerId = 'dialog-title',
  descriptionId,
}) => {
  // Use focus trap hook for Tab key navigation and focus management
  const { ref: dialogContentRef } = useFocusTrap<HTMLDivElement>({
    isActive: isOpen,
    returnFocusOnDeactivate: true,
  });

  // Track backdrop element for click handling
  const backdropRef = useRef<HTMLDivElement>(null);

  /**
   * Handle Escape key press to close dialog
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  /**
   * Prevent body scroll when dialog is open
   */
  useEffect(() => {
    if (!isOpen) return;

    // Store original overflow value to restore later
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  /**
   * Handle backdrop click to close dialog
   * Only closes if clicking directly on the backdrop, not on dialog content
   */
  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === backdropRef.current) {
      onClose();
    }
  };

  // Don't render if dialog is not open
  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={backdropRef}
      className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 ${className}`}
      onClick={handleBackdropClick}
      aria-hidden="false"
    >
      <div
        ref={dialogContentRef}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 outline-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headerId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
        {/* Dialog Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <header>
            <h2 id={headerId} className="text-xl font-bold text-slate-900">
              {title}
            </h2>
          </header>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="ml-4 p-2 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
            aria-label="Close dialog"
            type="button"
          >
            <svg
              className="w-6 h-6 text-slate-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Dialog Content */}
        <div className="px-6 py-4">
          <div
            {...(descriptionId && { id: descriptionId })}
            className="text-slate-700"
          >
            {children}
          </div>
        </div>

        {/* Dialog Footer */}
        {footer && (
          <footer className="px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex items-center justify-end gap-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
};

export default AccessibleDialog;
