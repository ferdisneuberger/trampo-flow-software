import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
  valid?: boolean;
  validMessage?: string;
  containerClassName?: string;
  trailing?: ReactNode;
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
  trailing,
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
        className="block text-sm font-medium text-ink-700"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'block h-11 w-full rounded-xl border border-line bg-white px-3.5 text-sm text-ink-900 outline-none transition placeholder:text-ink-500 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-surface',
            trailing ? 'pr-11' : undefined,
            error &&
              'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10',
            valid &&
              !error &&
              'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/10',
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
        <p id={descriptionId} className="text-xs font-medium text-rose-600">
          {error}
        </p>
      ) : showValidMessage ? (
        <p id={descriptionId} className="text-xs font-medium text-emerald-600">
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
