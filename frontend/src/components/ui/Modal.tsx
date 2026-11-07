import { X } from 'lucide-react';
import { useEffect, useId, useRef, type PropsWithChildren } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';
import { Button } from './Button';

type ModalProps = PropsWithChildren<{
  isOpen: boolean;
  title: string;
  description?: string;
  size?: 'md' | 'lg';
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  onClose: () => void;
}>;

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function Modal({
  isOpen,
  title,
  description,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  onClose,
  children,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const closeOnEscapeRef = useRef(closeOnEscape);

  useEffect(() => {
    onCloseRef.current = onClose;
    closeOnEscapeRef.current = closeOnEscape;
  }, [onClose, closeOnEscape]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    const dialog = dialogRef.current;

    const getFocusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
      ).filter((element) => !element.hasAttribute('aria-hidden'));

    const focusFirst = () => {
      const [first] = getFocusable();

      if (first) {
        first.focus();
      } else {
        dialog?.focus();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeOnEscapeRef.current) {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();

        return;
      }

      if (event.key !== 'Tab' || !dialog) {
        return;
      }

      const focusable = getFocusable();

      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();

        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    queueMicrotask(focusFirst);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-overlay backdrop-blur-sm"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'relative max-h-[90vh] w-full overflow-y-auto rounded-2xl border-2 border-ink-900 bg-surface shadow-hard-lg outline-none',
          size === 'lg' ? 'max-w-3xl' : 'max-w-lg',
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b-2 border-ink-900 px-6 py-5">
          <div>
            <h2
              id={titleId}
              className="font-display text-xl font-bold tracking-[-0.04em] text-ink-900"
            >
              {title}
            </h2>
            {description && (
              <p
                id={descriptionId}
                className="mt-1 text-sm leading-6 text-ink-500"
              >
                {description}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Fechar modal"
            className="size-9 shrink-0 p-0"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
