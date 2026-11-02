import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

export function Chip({ active = false, className, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition',
        active
          ? 'border-brand-600 bg-brand-600 text-white'
          : 'border-line bg-white text-ink-700 hover:bg-surface',
        className,
      )}
      {...props}
    />
  );
}
