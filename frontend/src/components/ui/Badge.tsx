import type { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-surface text-ink-900',
  info: 'bg-info-soft text-ink-900',
  success: 'bg-success-soft text-ink-900',
  warning: 'bg-yellow text-on-accent',
  danger: 'bg-danger-soft text-ink-900',
};

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border-2 border-ink-900 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.06em] shadow-[1px_1px_0_var(--color-shadow)]',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
