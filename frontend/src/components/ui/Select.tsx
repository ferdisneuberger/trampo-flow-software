import { ChevronDown } from 'lucide-react';
import { useId, type SelectHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  containerClassName?: string;
};

export function Select({
  label,
  error,
  hint,
  options,
  id,
  className,
  containerClassName,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const descriptionId = `${selectId}-description`;

  return (
    <div className={cn('space-y-1.5', containerClassName)}>
      <label
        htmlFor={selectId}
        className="block text-sm font-medium text-ink-700"
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? descriptionId : undefined}
          className={cn(
            'block h-11 w-full appearance-none rounded-xl border border-line bg-white px-3.5 pr-10 text-sm text-ink-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-surface',
            error &&
              'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10',
            className,
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
          aria-hidden="true"
        />
      </div>
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
