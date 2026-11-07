import type { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-card border-2 border-ink-900 bg-surface shadow-hard',
        className,
      )}
      {...props}
    />
  );
}
