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
  'aria-describedby': ariaDescribedBy,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = `${inputId}-description`;
  const showValidMessage = valid && !error && validMessage;
  const describedBy =
    [error || showValidMessage || hint ? descriptionId : null, ariaDescribedBy]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div className={cn('space-y-1.5', containerClassName)}>
      <label
        htmlFor={inputId}
        className={cn(
          'block font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-700',
          hideLabel && 'sr-only',
        )}
      >
        {label}
      </label>
      <div className="relative">
        {leading ? (
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-ink-500">
            {leading}
          </span>
        ) : null}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'block h-11 w-full rounded-btn border-2 border-ink-900 bg-surface px-3.5 text-sm text-ink-900 shadow-hard-sm outline-none transition placeholder:text-ink-500/70 focus:border-cobalt focus:ring-4 focus:ring-cobalt/15 disabled:cursor-not-allowed disabled:bg-cream/60',
            leading ? 'pl-10' : undefined,
            trailing ? 'pr-11' : undefined,
            error && 'border-coral focus:border-coral focus:ring-coral/15',
            valid &&
              !error &&
              'border-green focus:border-green focus:ring-green/15',
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
        <p id={descriptionId} className="text-xs font-semibold text-coral-dark">
          {error}
        </p>
      ) : showValidMessage ? (
        <p id={descriptionId} className="text-xs font-semibold text-green">
          {validMessage}
        </p>
      ) : hint ? (
        <p id={descriptionId} className="text-xs text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
