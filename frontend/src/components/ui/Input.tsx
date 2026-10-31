import { useId, type InputHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
};

export function Input({
  label,
  error,
  hint,
  id,
  className,
  containerClassName,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = `${inputId}-description`;

  return (
    <div className={cn('space-y-1.5', containerClassName)}>
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-ink-700"
      >
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? descriptionId : undefined}
        className={cn(
          'block h-11 w-full rounded-xl border border-line bg-white px-3.5 text-sm text-ink-900 shadow-sm outline-none transition placeholder:text-ink-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-surface',
          error &&
            'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10',
          className,
        )}
        {...props}
      />
      {error ? (
        <p
          id={descriptionId}
          className="text-xs font-medium text-rose-600"
        >
          {error}
        </p>
      ) : hint ? (
        <p id={descriptionId} className="text-xs text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
