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
  options: SelectOption[];
  containerClassName?: string;
};

export function Select({
  label,
  error,
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
        className="block font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-700"
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? descriptionId : undefined}
          className={cn(
            'block h-11 w-full appearance-none rounded-btn border-2 border-ink-900 bg-surface px-3.5 pr-10 text-sm text-ink-900 shadow-hard-sm outline-none transition focus:border-cobalt focus:ring-4 focus:ring-cobalt/15 disabled:cursor-not-allowed disabled:bg-cream/60',
            error && 'border-coral focus:border-coral focus:ring-coral/15',
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
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-700"
          aria-hidden="true"
        />
      </div>
      {error ? (
        <p id={descriptionId} className="text-xs font-semibold text-coral-dark">
          {error}
        </p>
      ) : null}
    </div>
  );
}
