import type { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-card border border-line bg-white shadow-sm',
        className,
      )}
      {...props}
    />
  );
}
