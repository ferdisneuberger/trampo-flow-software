import { Sparkles } from 'lucide-react';
import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
  valid?: boolean;
  validMessage?: string;
  containerClassName?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  hideLabel?: boolean;
  /** Etiqueta discreta ao lado do rótulo, por exemplo "do link". */
  tag?: string;
};

export function Input({
  label,
  error,
  hint,
  valid,
  validMessage,
  id,
  className,
  containerClassName,
  leading,
  trailing,
  hideLabel = false,
  tag,
  'aria-describedby': ariaDescribedBy,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = `${inputId}-description`;
  const tagId = `${inputId}-tag`;
  const showValidMessage = valid && !error && validMessage;
  const describedBy =
    [
      tag && !hideLabel ? tagId : null,
      error || showValidMessage || hint ? descriptionId : null,
      ariaDescribedBy,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div className={cn('space-y-1.5', containerClassName)}>
      <div className={cn('flex items-center gap-2', hideLabel && 'sr-only')}>
        <label
          htmlFor={inputId}
          className="block text-[13px] font-medium text-muted"
        >
          {label}
        </label>
        {tag && !hideLabel ? (
          <span
            id={tagId}
            className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-1.5 py-px text-[11px] font-medium text-fg-soft dark:bg-canvas"
          >
            <Sparkles className="size-3" aria-hidden="true" />
            {tag}
          </span>
        ) : null}
      </div>
      <div className="relative">
        {leading ? (
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted">
            {leading}
          </span>
        ) : null}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'block h-[42px] w-full rounded-btn border border-line bg-surface px-3.5 text-sm text-fg outline-none transition dark:bg-surface-2 placeholder:text-muted/70 focus:border-fg/50 focus:ring-2 focus:ring-fg/15 disabled:cursor-not-allowed disabled:opacity-60',
            leading ? 'pl-10' : undefined,
            trailing ? 'pr-11' : undefined,
            error && 'border-danger focus:border-danger focus:ring-danger/20',
            valid &&
              !error &&
              'border-success focus:border-success focus:ring-success/20',
            className,
          )}
          {...props}
        />
        {trailing ? (
          <div className="absolute inset-y-0 right-0 flex items-center pr-1">
            {trailing}
          </div>
        ) : null}
      </div>
      {error ? (
        <p id={descriptionId} className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : showValidMessage ? (
        <p id={descriptionId} className="text-xs font-medium text-success">
          {validMessage}
        </p>
      ) : hint ? (
        <p id={descriptionId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
